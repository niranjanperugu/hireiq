package com.hiresmart.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.dto.ResumeAnalysisDTO;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.repository.ResumeAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ResumeAnalysisService {

    private final ResumeAnalysisRepository repository;
    private final S3Service s3Service;
    private final ObjectMapper objectMapper;
    private final DocumentTextExtractorService documentExtractor;
    private final ClaudeResumeAnalysisService claudeService;
    private final NLPResumePreprocessorService nlpPreprocessor;

    private static final List<String> COMMON_SKILLS = List.of(
        "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue",
        "Spring", "Spring Boot", "Node.js", "SQL", "PostgreSQL", "MySQL", "MongoDB",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "REST API",
        "GraphQL", "Microservices", "CI/CD", "Linux", "Agile", "Scrum"
    );

    public List<ResumeAnalysisDTO> analyzeResumes(
            String organizationId,
            String jobId,
            String jobTitle,
            String jobDescription,
            List<String> requiredSkills,
            List<MultipartFile> resumeFiles,
            Integer minExperience,
            Integer maxExperience) {
        return analyzeResumes(organizationId, jobId, jobTitle, jobDescription, requiredSkills, resumeFiles, minExperience, maxExperience, false);
    }

    public List<ResumeAnalysisDTO> analyzeResumes(
            String organizationId,
            String jobId,
            String jobTitle,
            String jobDescription,
            List<String> requiredSkills,
            List<MultipartFile> resumeFiles,
            Integer minExperience,
            Integer maxExperience,
            boolean isApplied) {

        List<ResumeAnalysisDTO> results = new ArrayList<>();

        for (MultipartFile file : resumeFiles) {
            try {
                // Step 1: Extract plain text (PDFBox/POI/raw)
                String resumeText = documentExtractor.extractText(file);

                if (resumeText.isBlank()) {
                    log.warn("Could not extract text from {}, skipping", file.getOriginalFilename());
                    continue;
                }

                // Step 2: NLP pre-processing
                String filename = file.getOriginalFilename();
                NLPExtractedData nlpData;
                try {
                    nlpData = nlpPreprocessor.extract(resumeText);
                    // If NLP couldn't find a valid name, try filename
                    if (nlpData.getCandidateName() == null) {
                        String filenameName = nlpPreprocessor.nameFromFilename(filename);
                        if (filenameName != null) {
                            nlpData = NLPExtractedData.builder()
                                .candidateName(filenameName)
                                .email(nlpData.getEmail())
                                .phone(nlpData.getPhone())
                                .currentRole(nlpData.getCurrentRole())
                                .yearsOfExperience(nlpData.getYearsOfExperience())
                                .education(nlpData.getEducation())
                                .extractedSkills(nlpData.getExtractedSkills())
                                .workHistory(nlpData.getWorkHistory())
                                .structuredContext(nlpData.getStructuredContext())
                                .build();
                        }
                    }
                    log.info("NLP extracted: name={}, exp={}yr, skills={}",
                        nlpData.getCandidateName(), nlpData.getYearsOfExperience(),
                        nlpData.getExtractedSkills().size());
                } catch (Exception e) {
                    log.warn("NLP preprocessing failed for {}: {}", filename, e.getMessage());
                    nlpData = null;
                }

                // Duplicate detection: skip analysis if email+jobId already exists
                if (nlpData != null && nlpData.getEmail() != null && !nlpData.getEmail().isBlank()) {
                    if (repository.existsByOrganizationIdAndEmailIgnoreCaseAndJobId(
                            organizationId, nlpData.getEmail(), jobId)) {
                        log.info("Duplicate resume rejected: email={}, jobId={}", nlpData.getEmail(), jobId);
                        results.add(ResumeAnalysisDTO.builder()
                            .candidateName(nlpData.getCandidateName() != null
                                ? nlpData.getCandidateName() : file.getOriginalFilename())
                            .email(nlpData.getEmail())
                            .jobId(jobId)
                            .jobTitle(jobTitle)
                            .isDuplicate(true)
                            .rating("DUPLICATE")
                            .atsScore(0.0)
                            .matchedSkills(List.of())
                            .missingSkills(List.of())
                            .build());
                        continue;
                    }
                }

                // Step 3: AI analysis with NLP hints, fallback to rule-based
                String filenameFallbackName = nlpPreprocessor.nameFromFilename(filename);
                ResumeData resumeData;
                try {
                    if (claudeService.isEnabled()) {
                        Map<String, Object> aiResult = claudeService.analyzeResume(
                            resumeText, jobTitle, requiredSkills,
                            minExperience, maxExperience, jobDescription, nlpData);
                        resumeData = mapAiResultToResumeData(aiResult, requiredSkills, nlpData, filenameFallbackName, resumeText);
                        log.info("AI+NLP analysis complete for: {}", filename);
                    } else {
                        log.info("Claude AI disabled, using NLP rule-based for: {}", filename);
                        resumeData = parseResumeFallback(resumeText, requiredSkills, nlpData, filenameFallbackName);
                        resumeData.setAtsScore(calculateATSScore(resumeData, requiredSkills, minExperience, maxExperience));
                    }
                } catch (Exception e) {
                    log.warn("Claude API failed for {}, using NLP fallback: {}",
                             filename, e.getMessage());
                    resumeData = parseResumeFallback(resumeText, requiredSkills, nlpData, filenameFallbackName);
                    resumeData.setAtsScore(calculateATSScore(resumeData, requiredSkills, minExperience, maxExperience));
                }

                // Step 3: Determine rating
                ResumeAnalysis.ATSRating rating = getRating(resumeData.getAtsScore());

                // Step 4: Upload to S3
                String s3Url = uploadResumeToS3(organizationId, jobId, file);

                // Step 5: Persist and return DTO
                ResumeAnalysis analysis = ResumeAnalysis.builder()
                    .organizationId(organizationId)
                    .jobId(jobId)
                    .jobTitle(jobTitle)
                    .candidateName(resumeData.getCandidateName())
                    .currentRole(resumeData.getCurrentRole())
                    .email(resumeData.getEmail())
                    .phone(resumeData.getPhone())
                    .atsScore(resumeData.getAtsScore())
                    .matchedSkillsJson(toJson(resumeData.getMatchedSkills()))
                    .missingSkillsJson(toJson(resumeData.getMissingSkills()))
                    .yearsOfExperience(resumeData.getYearsOfExperience())
                    .education(resumeData.getEducation())
                    .professionalSummary(resumeData.getProfessionalSummary())
                    .resumeFileName(file.getOriginalFilename())
                    .resumeS3Url(s3Url)
                    .rating(rating)
                    .analyzedAt(LocalDateTime.now())
                    .isApplied(isApplied)
                    .source(isApplied ? "PUBLIC_APPLY" : "HR_ANALYZED")
                    .projectsJson(toJsonObject(resumeData.getProjects()))
                    .scoreBreakdownJson(toJsonObject(resumeData.getScoreBreakdown()))
                    .keyStrengthsJson(toJson(resumeData.getKeyStrengths()))
                    .areasForImprovementJson(toJson(resumeData.getAreasForImprovement()))
                    .hiringRecommendation(resumeData.getHiringRecommendation())
                    .jdAlignment(resumeData.getJdAlignment())
                    .fullAnalysisJson(toJsonObject(resumeData.getFullAnalysis()))
                    .build();

                ResumeAnalysis saved = repository.save(analysis);
                results.add(ResumeAnalysisDTO.fromEntity(saved, objectMapper));

            } catch (Exception e) {
                log.error("Error processing resume: {}", file.getOriginalFilename(), e);
            }
        }

        return results;
    }

    /** True only if the string looks like a real person's name (1–4 words, proper case, no punctuation) */
    private boolean isValidPersonName(String name) {
        if (name == null || name.isBlank() || name.equals("Unknown")) return false;
        if (name.length() > 55) return false;
        if (name.contains(".") || name.contains(",") || name.contains(";")) return false;
        String lower = name.toLowerCase();
        if (lower.contains("expertise") || lower.contains("experience") || lower.contains("proven")
                || lower.contains("summary") || lower.contains("project") || lower.contains("developer")
                || lower.contains("engineer") || lower.contains("manager") || lower.contains("software")
                || lower.contains("consultant") || lower.contains("analyst") || lower.contains("architect")
                || lower.contains("lead") || lower.contains("senior") || lower.contains("junior")
                || lower.contains("technical") || lower.contains("stack") || lower.contains("java")
                || lower.contains("python") || lower.contains("full ") || lower.contains("data "))
            return false;
        String[] words = name.trim().split("\\s+");
        if (words.length < 1 || words.length > 5) return false;
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (!Character.isUpperCase(w.charAt(0)) && w.length() > 2) return false;
        }
        return name.matches("[A-Za-z .'-]+");
    }

    /** Convert ALL_CAPS name to Title Case; pass through mixed-case as-is */
    private String normalizeNameCase(String name) {
        if (name == null || !name.equals(name.toUpperCase())) return name;
        StringBuilder sb = new StringBuilder();
        for (String w : name.split("\\s+")) {
            if (sb.length() > 0) sb.append(' ');
            if (!w.isEmpty()) sb.append(w.substring(0, 1)).append(w.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private ResumeData mapAiResultToResumeData(Map<String, Object> ai, List<String> requiredSkills,
                                                NLPExtractedData nlp, String filenameName,
                                                String resumeText) {
        ResumeData data = new ResumeData();

        log.info("Claude response keys: {}", ai.keySet());
        log.info("Claude overall_score={}, recommendation={}, recruiter_summary_len={}",
            ai.get("overall_score"), ai.get("recommendation"),
            ai.get("recruiter_summary") != null ? ai.get("recruiter_summary").toString().length() : 0);

        // Pull candidate_info sub-object
        Map<String, Object> candidateInfo = mapVal(ai, "candidate_info");

        // ── Candidate identity — Claude is primary, NLP fills truly-empty gaps ──
        String aiName  = stringVal(candidateInfo, "name", stringVal(ai, "candidateName", null));
        String nlpName = nlp != null ? nlp.getCandidateName() : null;
        String name;
        if (isValidPersonName(aiName)) {
            name = normalizeNameCase(aiName);
        } else if (isValidPersonName(nlpName)) {
            name = normalizeNameCase(nlpName);
        } else if (filenameName != null && isValidPersonName(filenameName)) {
            name = filenameName;
        } else {
            name = firstNonNull(filenameName, nlpName, aiName, "Unknown");
        }
        data.setCandidateName(name);

        // All contact/role fields: Claude first, NLP as last-resort backup only
        String aiRole  = stringVal(candidateInfo, "current_title", null);
        String aiEmail = stringVal(candidateInfo, "email", null);
        String aiPhone = stringVal(candidateInfo, "phone", null);
        data.setCurrentRole(aiRole  != null ? aiRole  : (nlp != null ? nlp.getCurrentRole() : null));
        data.setEmail      (aiEmail != null ? aiEmail : (nlp != null ? nlp.getEmail()        : null));
        data.setPhone      (aiPhone != null ? aiPhone : (nlp != null ? nlp.getPhone()        : null));

        int aiExp  = intVal(candidateInfo, "years_of_experience",
                        intVal(mapVal(ai, "experience_match"), "candidate_years", 0));
        int nlpExp = (nlp != null && nlp.getYearsOfExperience() != null) ? nlp.getYearsOfExperience() : 0;
        data.setYearsOfExperience(aiExp > 0 ? Math.min(aiExp, 50) : Math.min(nlpExp, 50));

        String aiEdu = stringVal(candidateInfo, "education", null);
        data.setEducation(aiEdu != null ? aiEdu : (nlp != null ? nlp.getEducation() : "High School"));

        // ── Professional summary: ALWAYS use Claude's recruiter_summary ──────────
        // NLP fallback is only used if Claude is completely disabled (parseResumeFallback path)
        String recruiterSummary = stringVal(ai, "recruiter_summary", null);
        data.setProfessionalSummary(recruiterSummary);

        // ── Skills: ALL from Claude, NLP only adds any skills Claude missed ──────
        List<String> rawAiSkills = new ArrayList<>(listVal(candidateInfo, "all_skills"));
        if (rawAiSkills.isEmpty()) rawAiSkills = new ArrayList<>(listVal(ai, "skills"));
        final List<String> aiSkills = rawAiSkills;
        data.setSkills(aiSkills);

        // ── Matched/missing: ALWAYS from Claude's required_skills_match ──────────
        Map<String, Object> skillsMatch = mapVal(ai, "required_skills_match");
        data.setMatchedSkills(new ArrayList<>(listVal(skillsMatch, "matched_skills")));
        data.setMissingSkills(new ArrayList<>(listVal(skillsMatch, "missing_skills")));

        // ── ATS score from Claude's overall_score ────────────────────────────────
        double rawScore = doubleVal(ai, "overall_score", -1.0);
        data.setAtsScore(rawScore >= 0 ? Math.min(rawScore, 100.0) : 50.0);

        // ── Rich analysis fields ─────────────────────────────────────────────────
        data.setKeyStrengths(listVal(ai, "top_strengths"));
        data.setAreasForImprovement(listVal(ai, "high_priority_gaps"));
        data.setHiringRecommendation(stringVal(ai, "recommendation", null));
        data.setJdAlignment(stringVal(ai, "hiring_manager_summary", null));

        // ── Component score snapshot ─────────────────────────────────────────────
        Map<String, Object> breakdown = new java.util.HashMap<>();
        breakdown.put("jdMatch",        doubleVal(mapVal(ai, "job_description_match"), "score", 0));
        breakdown.put("skillsMatch",    doubleVal(skillsMatch, "score", 0));
        breakdown.put("experience",     doubleVal(mapVal(ai, "experience_match"), "score", 0));
        breakdown.put("jobTitle",       doubleVal(mapVal(ai, "job_title_match"), "score", 0));
        breakdown.put("location",       doubleVal(mapVal(ai, "location_match"), "score", 0));
        breakdown.put("seniority",      doubleVal(mapVal(ai, "seniority_match"), "score", 0));
        breakdown.put("achievements",   doubleVal(mapVal(ai, "achievement_impact"), "score", 0));
        breakdown.put("education",      doubleVal(mapVal(ai, "education_certifications"), "score", 0));
        breakdown.put("atsReadability", doubleVal(mapVal(ai, "ats_readability"), "score", 0));
        breakdown.put("total", data.getAtsScore());
        data.setScoreBreakdown(breakdown);

        // ── Full Claude JSON stored verbatim for frontend rich view ───────────────
        data.setFullAnalysis(ai);
        log.info("fullAnalysis set with {} keys; jdMatch score={}",
            ai.size(), doubleVal(mapVal(ai, "job_description_match"), "score", -1));

        return data;
    }

    // ─── Fallback: rule-based parsing on properly extracted text ───────────────

    private ResumeData parseResumeFallback(String text, List<String> requiredSkills,
                                            NLPExtractedData nlp, String filenameName) {
        ResumeData data = new ResumeData();

        String nlpName = nlp != null ? nlp.getCandidateName() : null;
        String regexName = extractName(text);
        String name;
        if (isValidPersonName(nlpName)) name = normalizeNameCase(nlpName);
        else if (isValidPersonName(regexName)) name = normalizeNameCase(regexName);
        else if (filenameName != null && isValidPersonName(filenameName)) name = filenameName;
        else name = firstNonNull(filenameName, nlpName, regexName, "Unknown");
        data.setCandidateName(name);
        data.setCurrentRole(nlp != null ? nlp.getCurrentRole() : null);
        data.setEmail(nlp != null && nlp.getEmail() != null ? nlp.getEmail() : extractEmail(text));
        data.setPhone(nlp != null && nlp.getPhone() != null ? nlp.getPhone() : extractPhone(text));

        int nlpExp = (nlp != null && nlp.getYearsOfExperience() != null) ? nlp.getYearsOfExperience() : 0;
        data.setYearsOfExperience(nlpExp > 0 ? nlpExp : extractExperience(text));
        data.setEducation(nlp != null && nlp.getEducation() != null
            ? nlp.getEducation() : extractEducation(text));
        data.setProfessionalSummary(buildProfessionalSummary(text, nlp));

        // Merge gazetteer-matched skills from NLP with regex skills
        List<String> nlpSkills = (nlp != null && nlp.getExtractedSkills() != null)
            ? nlp.getExtractedSkills() : List.of();
        List<String> regexSkills = extractSkills(text);
        List<String> skills = new ArrayList<>(nlpSkills);
        regexSkills.stream().filter(s -> skills.stream().noneMatch(n -> n.equalsIgnoreCase(s)))
            .forEach(skills::add);
        data.setSkills(skills);

        String lowerText = text.toLowerCase();
        List<String> matched = requiredSkills.stream()
            .filter(req -> skills.stream().anyMatch(s -> s.equalsIgnoreCase(req))
                || lowerText.contains(req.toLowerCase()))
            .toList();
        data.setMatchedSkills(matched);
        data.setMissingSkills(requiredSkills.stream()
            .filter(req -> matched.stream().noneMatch(m -> m.equalsIgnoreCase(req)))
            .toList());
        return data;
    }

    /**
     * Finds the text beneath a Summary / Profile / Objective section header.
     * Returns null when no recognisable heading is present.
     */
    private String extractSummarySection(String text) {
        String[] lines = text.split("[\\n\\r]+");
        String[] headers = {
            "PROFESSIONAL SUMMARY", "CAREER SUMMARY", "EXECUTIVE SUMMARY",
            "PROFESSIONAL PROFILE", "CAREER OBJECTIVE", "PROFILE SUMMARY",
            "SUMMARY OF QUALIFICATIONS", "CAREER PROFILE",
            "PROFILE", "SUMMARY", "OBJECTIVE", "ABOUT ME"
        };
        for (int i = 0; i < lines.length; i++) {
            String upper = lines[i].trim().replaceAll("[:\\-]+$", "").trim().toUpperCase();
            for (String h : headers) {
                if (upper.equals(h) || upper.startsWith(h + " ") || upper.startsWith(h + ":")) {
                    StringBuilder sb = new StringBuilder();
                    for (int j = i + 1; j < Math.min(lines.length, i + 20); j++) {
                        String ln = lines[j].trim();
                        if (ln.isEmpty()) continue;
                        // Stop when we hit a new ALL-CAPS section heading
                        if (ln.equals(ln.toUpperCase()) && ln.length() < 50
                                && !ln.matches(".*\\d.*") && ln.split("\\s+").length <= 5) break;
                        if (sb.length() > 0) sb.append(" ");
                        sb.append(ln);
                        if (sb.length() >= 700) break;
                    }
                    if (sb.length() >= 40) return sb.toString().trim();
                }
            }
        }
        return null;
    }

    /**
     * Build a meaningful professional summary by:
     * 1. Extracting the resume's own summary section (if present), then appending key facts
     * 2. Constructing one from NLP-extracted role, experience, skills, and education
     */
    private String buildProfessionalSummary(String resumeText, NLPExtractedData nlp) {
        String role      = nlp != null ? nlp.getCurrentRole()      : null;
        Integer exp      = nlp != null ? nlp.getYearsOfExperience() : null;
        List<String> skills = (nlp != null && nlp.getExtractedSkills() != null)
                ? nlp.getExtractedSkills() : List.of();
        String education = nlp != null ? nlp.getEducation() : null;

        // 1. Try to find the resume's own summary section
        String existing = extractSummarySection(resumeText);
        if (existing != null) {
            String trimmed = existing.length() > 650
                    ? existing.substring(0, 647).replaceAll("\\s+\\S+$", "") + "..."
                    : existing;

            // Append structured highlights as a second sentence
            List<String> facts = new ArrayList<>();
            if (exp != null && exp > 0)
                facts.add(exp + "+ years of hands-on experience");
            if (skills.size() >= 3)
                facts.add("proficient in " + String.join(", ", skills.subList(0, Math.min(6, skills.size()))));
            if (education != null && !education.equalsIgnoreCase("High School")
                    && !education.equalsIgnoreCase("Unknown"))
                facts.add("holds a " + education + " degree");

            if (!facts.isEmpty()) {
                String highlights = facts.get(0).substring(0, 1).toUpperCase() + facts.get(0).substring(1);
                for (int i = 1; i < facts.size(); i++) highlights += "; " + facts.get(i);
                return trimmed + " " + highlights + ".";
            }
            return trimmed;
        }

        // 2. Construct summary from NLP entities
        StringBuilder sb = new StringBuilder();
        if (role != null && !role.isBlank()) {
            sb.append(role);
        } else if (!skills.isEmpty()) {
            sb.append(inferDomain(skills)).append(" professional");
        } else {
            sb.append("Experienced professional");
        }

        if (exp != null && exp > 0) {
            sb.append(" with ").append(exp).append(exp == 1 ? " year" : " years")
              .append(" of hands-on experience");
        }
        sb.append(".");

        if (!skills.isEmpty()) {
            sb.append(" Core competencies include ")
              .append(String.join(", ", skills.subList(0, Math.min(8, skills.size()))))
              .append(".");
        }

        if (education != null && !education.equalsIgnoreCase("High School")
                && !education.equalsIgnoreCase("Unknown")) {
            sb.append(" Holds a ").append(education).append(" degree.");
        }

        String result = sb.toString().trim();
        return result.length() > 20 ? result : null;
    }

    private String inferDomain(List<String> skills) {
        String haystack = String.join(" ", skills).toLowerCase();
        long java     = countKeywords(haystack, "java", "spring boot", "spring", "hibernate", "jpa");
        long frontend = countKeywords(haystack, "react", "angular", "vue", "typescript", "html", "css");
        long cloud    = countKeywords(haystack, "aws", "azure", "gcp", "docker", "kubernetes", "terraform");
        long data     = countKeywords(haystack, "python", "machine learning", "tensorflow", "pandas", "spark");
        long dotnet   = countKeywords(haystack, ".net", "c#", "asp.net", "blazor");
        long mobile   = countKeywords(haystack, "android", "ios", "flutter", "react native", "swift", "kotlin");

        if (data >= 2)             return "Data Science / ML";
        if (cloud >= 2)            return "Cloud / DevOps";
        if (mobile >= 2)           return "Mobile";
        if (java >= 2 && frontend >= 2) return "Full Stack (Java + Frontend)";
        if (java >= 2)             return "Java Backend";
        if (frontend >= 2)         return "Frontend";
        if (dotnet >= 2)           return ".NET";
        return "Software Engineering";
    }

    private long countKeywords(String text, String... keywords) {
        return Arrays.stream(keywords).filter(text::contains).count();
    }

    private double calculateATSScore(ResumeData data, List<String> requiredSkills,
                                     Integer minExp, Integer maxExp) {
        double score = 0.0;

        // Skill match (40%)
        if (requiredSkills != null && !requiredSkills.isEmpty()) {
            double matchPct = (double) data.getMatchedSkills().size() / requiredSkills.size();
            score += matchPct * 40.0;
        } else {
            score += 40.0;
        }

        // Experience fit (30%)
        int exp = data.getYearsOfExperience() != null ? data.getYearsOfExperience() : 0;
        if (minExp != null && minExp > 0) {
            if (maxExp != null && exp > maxExp) {
                score += 20.0; // overqualified penalty
            } else if (exp >= minExp) {
                score += 30.0;
            } else {
                score += ((double) exp / minExp) * 30.0;
            }
        } else {
            score += 30.0;
        }

        // Education (15%)
        String edu = data.getEducation() != null ? data.getEducation().toLowerCase() : "";
        if (edu.contains("phd") || edu.contains("doctorate")) score += 15.0;
        else if (edu.contains("master")) score += 15.0;
        else if (edu.contains("bachelor")) score += 10.0;
        else if (edu.contains("diploma")) score += 5.0;
        else score += 2.0;

        // Resume quality (15%)
        if (data.getProfessionalSummary() != null && data.getProfessionalSummary().length() > 50) score += 10.0;
        if (data.getEmail() != null) score += 3.0;
        if (data.getPhone() != null) score += 2.0;

        return Math.min(score, 100.0);
    }

    // ─── Regex extractors ──────────────────────────────────────────────────────

    private String extractName(String text) {
        String[] lines = text.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && trimmed.length() <= 60 && !trimmed.contains("@")) {
                return trimmed;
            }
        }
        return "Unknown";
    }

    private String extractEmail(String text) {
        Matcher m = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}").matcher(text);
        return m.find() ? m.group() : null;
    }

    private String extractPhone(String text) {
        Matcher m = Pattern.compile("(\\+?1[\\s.-]?)?(\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4})").matcher(text);
        return m.find() ? m.group().trim() : null;
    }

    private Integer extractExperience(String text) {
        int currentYear = java.time.Year.now().getValue();

        // First try: explicit "X years of experience" statement
        Matcher explicit = Pattern.compile("(\\d+)\\s*(?:\\+\\s*)?years?\\s*(?:of\\s+)?(?:IT\\s+|work\\s+|professional\\s+)?experience",
            Pattern.CASE_INSENSITIVE).matcher(text);
        int maxExplicit = 0;
        while (explicit.find()) {
            try { maxExplicit = Math.max(maxExplicit, Integer.parseInt(explicit.group(1))); } catch (NumberFormatException ignored) {}
        }
        if (maxExplicit > 0) return maxExplicit;

        // Second try: sum date ranges from work history (e.g. "2018 – 2022" or "Jan 2018 - Present")
        int totalMonths = 0;
        Matcher range = Pattern.compile(
            "(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+)?(\\d{4})\\s*[-–—]\\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+)?(\\d{4}|Present|Current|Now|Till date|Till Date)",
            Pattern.CASE_INSENSITIVE).matcher(text);
        while (range.find()) {
            try {
                int start = Integer.parseInt(range.group(1));
                String endStr = range.group(2);
                int end = (endStr.matches("(?i)present|current|now|till.?date")) ? currentYear : Integer.parseInt(endStr);
                if (start >= 1980 && start <= currentYear && end >= start && end <= currentYear + 1) {
                    totalMonths += (end - start) * 12;
                }
            } catch (NumberFormatException ignored) {}
        }
        if (totalMonths > 0) return Math.max(1, totalMonths / 12);

        return 0;
    }

    private String extractEducation(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("phd") || lower.contains("ph.d") || lower.contains("doctorate")) return "PhD";
        if (lower.contains("master")) return "Master's";
        if (lower.contains("bachelor") || lower.contains("b.s") || lower.contains("b.e") || lower.contains("b.tech")) return "Bachelor's";
        if (lower.contains("diploma")) return "Diploma";
        return "High School";
    }

    private List<String> extractSkills(String text) {
        String lower = text.toLowerCase();
        return COMMON_SKILLS.stream()
            .filter(skill -> lower.contains(skill.toLowerCase()))
            .toList();
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private ResumeAnalysis.ATSRating getRating(Double score) {
        if (score >= 80) return ResumeAnalysis.ATSRating.EXCELLENT;
        if (score >= 60) return ResumeAnalysis.ATSRating.GOOD;
        if (score >= 40) return ResumeAnalysis.ATSRating.FAIR;
        return ResumeAnalysis.ATSRating.POOR;
    }

    private String uploadResumeToS3(String organizationId, String jobId, MultipartFile file) {
        try {
            String fileName = String.format("%s/%s/%s-%s",
                organizationId, jobId, System.currentTimeMillis(), file.getOriginalFilename());
            return s3Service.uploadFile(file, "resumes/" + fileName);
        } catch (Exception e) {
            log.warn("S3 upload failed for {}: {}", file.getOriginalFilename(), e.getMessage());
            return null;
        }
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list != null ? list : List.of());
        } catch (Exception e) {
            return "[]";
        }
    }

    private String toJsonObject(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("JSON serialization failed: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> listVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof List) return (List<String>) val;
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> listOfMaps(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map) {
            return (List<Map<String, Object>>) val;
        }
        return new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Map) return (Map<String, Object>) val;
        return new java.util.HashMap<>();
    }

    private String stringVal(Map<String, Object> map, String key, String defaultVal) {
        Object val = map.get(key);
        if (val instanceof String s && !s.isBlank()) return s;
        return defaultVal;
    }

    private int intVal(Map<String, Object> map, String key, int defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number n) return n.intValue();
        return defaultVal;
    }

    private double doubleVal(Map<String, Object> map, String key, double defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number n) return n.doubleValue();
        return defaultVal;
    }

    // ─── Read operations ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ResumeAnalysisDTO> getAnalysesByJob(String organizationId, String jobId, Pageable pageable) {
        return repository.findByOrganizationIdAndJobId(organizationId, jobId, pageable)
            .map(e -> ResumeAnalysisDTO.fromEntity(e, objectMapper));
    }

    @Transactional(readOnly = true)
    public List<ResumeAnalysisDTO> getTopCandidates(String organizationId, String jobId, int limit) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        return repository.findTopCandidatesForJob(organizationId, jobId, pageable)
            .stream()
            .map(e -> ResumeAnalysisDTO.fromEntity(e, objectMapper))
            .toList();
    }

    @Transactional(readOnly = true)
    public ResumeAnalysisDTO getById(String organizationId, String analysisId) {
        ResumeAnalysis analysis = repository.findById(analysisId)
            .orElseThrow(() -> new RuntimeException("Analysis not found"));
        if (!analysis.getOrganizationId().equals(organizationId))
            throw new RuntimeException("Unauthorized");
        return ResumeAnalysisDTO.fromEntity(analysis, objectMapper);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ResumeAnalysisDTO> searchByOrganization(
            String organizationId, String query, Pageable pageable) {
        return repository.searchByOrganization(organizationId, query == null ? "" : query, pageable)
            .map(e -> ResumeAnalysisDTO.fromEntity(e, objectMapper));
    }

    public ResumeAnalysisDTO updateAnalysis(String organizationId, String analysisId,
                                             java.util.Map<String, Object> updates) {
        ResumeAnalysis analysis = repository.findById(analysisId)
            .orElseThrow(() -> new RuntimeException("Analysis not found"));
        if (!analysis.getOrganizationId().equals(organizationId))
            throw new RuntimeException("Unauthorized");

        if (updates.containsKey("candidateName") && updates.get("candidateName") != null)
            analysis.setCandidateName((String) updates.get("candidateName"));
        if (updates.containsKey("email"))
            analysis.setEmail((String) updates.get("email"));
        if (updates.containsKey("phone"))
            analysis.setPhone((String) updates.get("phone"));
        if (updates.containsKey("currentRole"))
            analysis.setCurrentRole((String) updates.get("currentRole"));
        if (updates.containsKey("yearsOfExperience") && updates.get("yearsOfExperience") != null)
            analysis.setYearsOfExperience(((Number) updates.get("yearsOfExperience")).intValue());
        if (updates.containsKey("education"))
            analysis.setEducation((String) updates.get("education"));
        if (updates.containsKey("atsScore") && updates.get("atsScore") != null)
            analysis.setAtsScore(((Number) updates.get("atsScore")).doubleValue());

        return ResumeAnalysisDTO.fromEntity(repository.save(analysis), objectMapper);
    }

    public void deleteAnalysis(String organizationId, String analysisId) {
        ResumeAnalysis analysis = repository.findById(analysisId)
            .orElseThrow(() -> new RuntimeException("Analysis not found"));
        if (!analysis.getOrganizationId().equals(organizationId)) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(analysis);
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T v : values) { if (v != null) return v; }
        return null;
    }

    // ─── Inner ResumeData ──────────────────────────────────────────────────────

    @lombok.Data
    @lombok.NoArgsConstructor
    private static class ResumeData {
        private String candidateName;
        private String currentRole;
        private String email;
        private String phone;
        private Integer yearsOfExperience;
        private String education;
        private String professionalSummary;
        private double atsScore;
        private List<String> skills = new ArrayList<>();
        private List<String> matchedSkills = new ArrayList<>();
        private List<String> missingSkills = new ArrayList<>();
        private List<Map<String, Object>> projects = new ArrayList<>();
        private Map<String, Object> scoreBreakdown = new java.util.HashMap<>();
        private List<String> keyStrengths = new ArrayList<>();
        private List<String> areasForImprovement = new ArrayList<>();
        private String hiringRecommendation;
        private String jdAlignment;
        private Map<String, Object> fullAnalysis;
    }
}
