package com.hiresmart.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.dto.ResumeAnalysisDTO;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.repository.ResumeAnalysisRepository;
import com.hiresmart.util.ByteArrayMultipartFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ResumeAnalysisService {

    private final ResumeAnalysisRepository repository;
    private final ObjectMapper objectMapper;
    private final ResumeFileProcessor fileProcessor;
    private final ExecutorService resumeAnalysisExecutor;

    private static final List<String> COMMON_SKILLS = List.of(
        "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue",
        "Spring", "Spring Boot", "Node.js", "SQL", "PostgreSQL", "MySQL", "MongoDB",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "REST API",
        "GraphQL", "Microservices", "CI/CD", "Linux", "Agile", "Scrum"
    );

    // ── Public API ─────────────────────────────────────────────────────────────

    public List<ResumeAnalysisDTO> analyzeResumes(
            String organizationId, String jobId, String jobTitle, String jobDescription,
            List<String> requiredSkills, List<MultipartFile> resumeFiles,
            Integer minExperience, Integer maxExperience) {
        return analyzeResumes(organizationId, jobId, jobTitle, jobDescription,
                requiredSkills, resumeFiles, minExperience, maxExperience, false);
    }

    /**
     * Processes all uploaded resumes in parallel using virtual threads.
     * Each file gets its own transaction (REQUIRES_NEW in ResumeFileProcessor)
     * so failures are isolated and commits don't block each other.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public List<ResumeAnalysisDTO> analyzeResumes(
            String organizationId, String jobId, String jobTitle, String jobDescription,
            List<String> requiredSkills, List<MultipartFile> resumeFiles,
            Integer minExperience, Integer maxExperience, boolean isApplied) {

        // Pre-read all file bytes in the calling thread.
        // MultipartFile's underlying InputStream is NOT safe to read across threads.
        List<ByteArrayMultipartFile> files = new ArrayList<>();
        for (MultipartFile f : resumeFiles) {
            try {
                files.add(new ByteArrayMultipartFile(
                        f.getName(), f.getOriginalFilename(), f.getContentType(), f.getBytes()));
            } catch (Exception e) {
                log.error("Failed to read file bytes for {}: {}", f.getOriginalFilename(), e.getMessage());
            }
        }

        if (files.isEmpty()) return List.of();

        // Shared set tracks emails already claimed in this batch (ConcurrentHashMap.add is atomic).
        // Prevents duplicate passes even when two files arrive with the same email simultaneously.
        Set<String> batchEmails = ConcurrentHashMap.newKeySet();

        log.info("Submitting {} resume(s) for parallel analysis", files.size());
        long start = System.currentTimeMillis();

        // Fan out: one virtual thread per file
        List<CompletableFuture<Optional<ResumeAnalysisDTO>>> futures = files.stream()
                .map(file -> CompletableFuture.supplyAsync(
                        () -> fileProcessor.process(
                                file, organizationId, jobId, jobTitle, jobDescription,
                                requiredSkills, minExperience, maxExperience, isApplied, batchEmails),
                        resumeAnalysisExecutor))
                .toList();

        // Collect results preserving submission order
        List<ResumeAnalysisDTO> results = futures.stream()
                .map(f -> {
                    try {
                        return f.get();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        log.error("Analysis interrupted", e);
                        return Optional.<ResumeAnalysisDTO>empty();
                    } catch (ExecutionException e) {
                        log.error("Analysis execution failed", e.getCause());
                        return Optional.<ResumeAnalysisDTO>empty();
                    }
                })
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(java.util.stream.Collectors.toList());

        log.info("Parallel analysis complete: {}/{} resumes processed in {}ms",
                results.size(), files.size(), System.currentTimeMillis() - start);

        return results;
    }

    // ── Read operations ────────────────────────────────────────────────────────

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
    public Page<ResumeAnalysisDTO> searchByOrganization(String organizationId, String query, Pageable pageable) {
        return repository.searchByOrganization(organizationId, query == null ? "" : query, pageable)
                .map(e -> ResumeAnalysisDTO.fromEntity(e, objectMapper));
    }

    public ResumeAnalysisDTO updateAnalysis(String organizationId, String analysisId,
                                             Map<String, Object> updates) {
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
        if (!analysis.getOrganizationId().equals(organizationId))
            throw new RuntimeException("Unauthorized");
        repository.delete(analysis);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Package-private static helpers — used by both this class and
    // ResumeFileProcessor (which runs on virtual threads). No instance state.
    // ══════════════════════════════════════════════════════════════════════════

    @SuppressWarnings("unchecked")
    static ResumeData mapAiResult(Map<String, Object> ai, List<String> requiredSkills,
                                   NLPExtractedData nlp, String filenameName,
                                   String resumeText) {
        ResumeData data = new ResumeData();

        Map<String, Object> candidateInfo = mapVal(ai, "candidate_info");

        String aiName  = stringVal(candidateInfo, "name", stringVal(ai, "candidateName", null));
        String nlpName = nlp != null ? nlp.getCandidateName() : null;
        String name;
        if      (isValidPersonName(aiName))    name = normalizeNameCase(aiName);
        else if (isValidPersonName(nlpName))   name = normalizeNameCase(nlpName);
        else if (isValidPersonName(filenameName)) name = filenameName;
        else                                   name = firstNonNull(filenameName, nlpName, aiName, "Unknown");
        data.setCandidateName(name);

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

        data.setProfessionalSummary(stringVal(ai, "recruiter_summary", null));

        List<String> rawAiSkills = new ArrayList<>(listVal(candidateInfo, "all_skills"));
        if (rawAiSkills.isEmpty()) rawAiSkills = new ArrayList<>(listVal(ai, "skills"));
        data.setSkills(rawAiSkills);

        Map<String, Object> skillsMatch = mapVal(ai, "required_skills_match");
        data.setMatchedSkills(new ArrayList<>(listVal(skillsMatch, "matched_skills")));
        data.setMissingSkills(new ArrayList<>(listVal(skillsMatch, "missing_skills")));

        double rawScore = doubleVal(ai, "overall_score", -1.0);
        data.setAtsScore(rawScore >= 0 ? Math.min(rawScore, 100.0) : 50.0);

        data.setKeyStrengths(listVal(ai, "top_strengths"));
        data.setAreasForImprovement(listVal(ai, "high_priority_gaps"));
        data.setHiringRecommendation(stringVal(ai, "recommendation", null));
        data.setJdAlignment(stringVal(ai, "hiring_manager_summary", null));

        Map<String, Object> breakdown = new HashMap<>();
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
        data.setFullAnalysis(ai);
        return data;
    }

    static ResumeData parseFallback(String text, List<String> requiredSkills,
                                     NLPExtractedData nlp, String filenameName) {
        ResumeData data = new ResumeData();

        String nlpName   = nlp != null ? nlp.getCandidateName() : null;
        String regexName = extractName(text);
        String name;
        if      (isValidPersonName(nlpName))      name = normalizeNameCase(nlpName);
        else if (isValidPersonName(regexName))     name = normalizeNameCase(regexName);
        else if (isValidPersonName(filenameName))  name = filenameName;
        else                                       name = firstNonNull(filenameName, nlpName, regexName, "Unknown");
        data.setCandidateName(name);
        data.setCurrentRole(nlp != null ? nlp.getCurrentRole() : null);
        data.setEmail(nlp != null && nlp.getEmail() != null ? nlp.getEmail() : extractEmail(text));
        data.setPhone(nlp != null && nlp.getPhone() != null ? nlp.getPhone() : extractPhone(text));

        int nlpExp = (nlp != null && nlp.getYearsOfExperience() != null) ? nlp.getYearsOfExperience() : 0;
        data.setYearsOfExperience(nlpExp > 0 ? nlpExp : extractExperience(text));
        data.setEducation(nlp != null && nlp.getEducation() != null ? nlp.getEducation() : extractEducation(text));
        data.setProfessionalSummary(buildProfessionalSummary(text, nlp));

        List<String> nlpSkills   = (nlp != null && nlp.getExtractedSkills() != null) ? nlp.getExtractedSkills() : List.of();
        List<String> regexSkills = extractSkills(text);
        List<String> skills      = new ArrayList<>(nlpSkills);
        regexSkills.stream().filter(s -> skills.stream().noneMatch(n -> n.equalsIgnoreCase(s))).forEach(skills::add);
        data.setSkills(skills);

        String lower = text.toLowerCase();
        List<String> matched = requiredSkills.stream()
                .filter(req -> skills.stream().anyMatch(s -> s.equalsIgnoreCase(req)) || lower.contains(req.toLowerCase()))
                .toList();
        data.setMatchedSkills(matched);
        data.setMissingSkills(requiredSkills.stream()
                .filter(req -> matched.stream().noneMatch(m -> m.equalsIgnoreCase(req))).toList());
        return data;
    }

    static double calcATSScore(ResumeData data, List<String> requiredSkills,
                                Integer minExp, Integer maxExp) {
        double score = 0.0;
        if (requiredSkills != null && !requiredSkills.isEmpty()) {
            score += ((double) data.getMatchedSkills().size() / requiredSkills.size()) * 40.0;
        } else {
            score += 40.0;
        }
        int exp = data.getYearsOfExperience() != null ? data.getYearsOfExperience() : 0;
        if (minExp != null && minExp > 0) {
            if (maxExp != null && exp > maxExp)  score += 20.0;
            else if (exp >= minExp)              score += 30.0;
            else                                 score += ((double) exp / minExp) * 30.0;
        } else {
            score += 30.0;
        }
        String edu = data.getEducation() != null ? data.getEducation().toLowerCase() : "";
        if      (edu.contains("phd") || edu.contains("doctorate")) score += 15.0;
        else if (edu.contains("master"))                            score += 15.0;
        else if (edu.contains("bachelor"))                          score += 10.0;
        else if (edu.contains("diploma"))                           score += 5.0;
        else                                                        score += 2.0;
        if (data.getProfessionalSummary() != null && data.getProfessionalSummary().length() > 50) score += 10.0;
        if (data.getEmail() != null) score += 3.0;
        if (data.getPhone() != null) score += 2.0;
        return Math.min(score, 100.0);
    }

    // ── Text extraction helpers ────────────────────────────────────────────────

    private static String extractSummarySection(String text) {
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

    static String buildProfessionalSummary(String resumeText, NLPExtractedData nlp) {
        String role      = nlp != null ? nlp.getCurrentRole()       : null;
        Integer exp      = nlp != null ? nlp.getYearsOfExperience() : null;
        List<String> skills = (nlp != null && nlp.getExtractedSkills() != null) ? nlp.getExtractedSkills() : List.of();
        String education = nlp != null ? nlp.getEducation() : null;

        String existing = extractSummarySection(resumeText);
        if (existing != null) {
            String trimmed = existing.length() > 650
                    ? existing.substring(0, 647).replaceAll("\\s+\\S+$", "") + "..." : existing;
            List<String> facts = new ArrayList<>();
            if (exp != null && exp > 0) facts.add(exp + "+ years of hands-on experience");
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

        StringBuilder sb = new StringBuilder();
        if (role != null && !role.isBlank()) sb.append(role);
        else if (!skills.isEmpty())          sb.append(inferDomain(skills)).append(" professional");
        else                                 sb.append("Experienced professional");
        if (exp != null && exp > 0)
            sb.append(" with ").append(exp).append(exp == 1 ? " year" : " years").append(" of hands-on experience");
        sb.append(".");
        if (!skills.isEmpty())
            sb.append(" Core competencies include ")
              .append(String.join(", ", skills.subList(0, Math.min(8, skills.size())))).append(".");
        if (education != null && !education.equalsIgnoreCase("High School")
                && !education.equalsIgnoreCase("Unknown"))
            sb.append(" Holds a ").append(education).append(" degree.");
        String result = sb.toString().trim();
        return result.length() > 20 ? result : null;
    }

    private static String inferDomain(List<String> skills) {
        String h = String.join(" ", skills).toLowerCase();
        long java     = countKeywords(h, "java", "spring boot", "spring", "hibernate", "jpa");
        long frontend = countKeywords(h, "react", "angular", "vue", "typescript", "html", "css");
        long cloud    = countKeywords(h, "aws", "azure", "gcp", "docker", "kubernetes", "terraform");
        long data     = countKeywords(h, "python", "machine learning", "tensorflow", "pandas", "spark");
        long dotnet   = countKeywords(h, ".net", "c#", "asp.net", "blazor");
        long mobile   = countKeywords(h, "android", "ios", "flutter", "react native", "swift", "kotlin");
        if (data >= 2)                       return "Data Science / ML";
        if (cloud >= 2)                      return "Cloud / DevOps";
        if (mobile >= 2)                     return "Mobile";
        if (java >= 2 && frontend >= 2)      return "Full Stack (Java + Frontend)";
        if (java >= 2)                       return "Java Backend";
        if (frontend >= 2)                   return "Frontend";
        if (dotnet >= 2)                     return ".NET";
        return "Software Engineering";
    }

    private static long countKeywords(String text, String... keywords) {
        return Arrays.stream(keywords).filter(text::contains).count();
    }

    static boolean isValidPersonName(String name) {
        if (name == null || name.isBlank() || name.equals("Unknown")) return false;
        if (name.length() > 55) return false;
        if (name.contains(".") || name.contains(",") || name.contains(";")) return false;
        String lower = name.toLowerCase();
        if (lower.contains("expertise") || lower.contains("experience") || lower.contains("proven")
                || lower.contains("summary")  || lower.contains("project")   || lower.contains("developer")
                || lower.contains("engineer") || lower.contains("manager")   || lower.contains("software")
                || lower.contains("consultant") || lower.contains("analyst") || lower.contains("architect")
                || lower.contains("lead")     || lower.contains("senior")    || lower.contains("junior")
                || lower.contains("technical") || lower.contains("stack")    || lower.contains("java")
                || lower.contains("python")   || lower.contains("full ")     || lower.contains("data "))
            return false;
        String[] words = name.trim().split("\\s+");
        if (words.length < 1 || words.length > 5) return false;
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (!Character.isUpperCase(w.charAt(0)) && w.length() > 2) return false;
        }
        return name.matches("[A-Za-z .'-]+");
    }

    static String normalizeNameCase(String name) {
        if (name == null || !name.equals(name.toUpperCase())) return name;
        StringBuilder sb = new StringBuilder();
        for (String w : name.split("\\s+")) {
            if (sb.length() > 0) sb.append(' ');
            if (!w.isEmpty()) sb.append(w.substring(0, 1)).append(w.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    private static String extractName(String text) {
        for (String line : text.split("\n")) {
            String t = line.trim();
            if (!t.isEmpty() && t.length() <= 60 && !t.contains("@")) return t;
        }
        return "Unknown";
    }

    private static String extractEmail(String text) {
        Matcher m = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}").matcher(text);
        return m.find() ? m.group() : null;
    }

    private static String extractPhone(String text) {
        Matcher m = Pattern.compile("(\\+?1[\\s.-]?)?(\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4})").matcher(text);
        return m.find() ? m.group().trim() : null;
    }

    private static Integer extractExperience(String text) {
        int currentYear = java.time.Year.now().getValue();
        Matcher explicit = Pattern.compile(
                "(\\d+)\\s*(?:\\+\\s*)?years?\\s*(?:of\\s+)?(?:IT\\s+|work\\s+|professional\\s+)?experience",
                Pattern.CASE_INSENSITIVE).matcher(text);
        int maxExplicit = 0;
        while (explicit.find()) {
            try { maxExplicit = Math.max(maxExplicit, Integer.parseInt(explicit.group(1))); }
            catch (NumberFormatException ignored) {}
        }
        if (maxExplicit > 0) return maxExplicit;

        int totalMonths = 0;
        Matcher range = Pattern.compile(
            "(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+)?(\\d{4})\\s*[-–—]\\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+)?(\\d{4}|Present|Current|Now|Till date|Till Date)",
            Pattern.CASE_INSENSITIVE).matcher(text);
        while (range.find()) {
            try {
                int start  = Integer.parseInt(range.group(1));
                String endStr = range.group(2);
                int end = endStr.matches("(?i)present|current|now|till.?date") ? currentYear : Integer.parseInt(endStr);
                if (start >= 1980 && start <= currentYear && end >= start && end <= currentYear + 1)
                    totalMonths += (end - start) * 12;
            } catch (NumberFormatException ignored) {}
        }
        return totalMonths > 0 ? Math.max(1, totalMonths / 12) : 0;
    }

    private static String extractEducation(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("phd") || lower.contains("ph.d") || lower.contains("doctorate")) return "PhD";
        if (lower.contains("master"))                                                         return "Master's";
        if (lower.contains("bachelor") || lower.contains("b.s") || lower.contains("b.e") || lower.contains("b.tech")) return "Bachelor's";
        if (lower.contains("diploma"))                                                        return "Diploma";
        return "High School";
    }

    private static List<String> extractSkills(String text) {
        String lower = text.toLowerCase();
        return COMMON_SKILLS.stream().filter(s -> lower.contains(s.toLowerCase())).toList();
    }

    // ── Map accessors ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    static List<String> listVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof List ? (List<String>) val : new ArrayList<>();
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> mapVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof Map ? (Map<String, Object>) val : new HashMap<>();
    }

    static String stringVal(Map<String, Object> map, String key, String def) {
        Object val = map.get(key);
        return val instanceof String s && !s.isBlank() ? s : def;
    }

    static int intVal(Map<String, Object> map, String key, int def) {
        Object val = map.get(key);
        return val instanceof Number n ? n.intValue() : def;
    }

    static double doubleVal(Map<String, Object> map, String key, double def) {
        Object val = map.get(key);
        return val instanceof Number n ? n.doubleValue() : def;
    }

    @SafeVarargs
    static <T> T firstNonNull(T... values) {
        for (T v : values) { if (v != null) return v; }
        return null;
    }

    // ── Inner ResumeData (package-private so ResumeFileProcessor can use it) ──

    @lombok.Data
    @lombok.NoArgsConstructor
    static class ResumeData {
        private String candidateName;
        private String currentRole;
        private String email;
        private String phone;
        private Integer yearsOfExperience;
        private String education;
        private String professionalSummary;
        private double atsScore;
        private List<String> skills             = new ArrayList<>();
        private List<String> matchedSkills      = new ArrayList<>();
        private List<String> missingSkills      = new ArrayList<>();
        private List<Map<String, Object>> projects = new ArrayList<>();
        private Map<String, Object> scoreBreakdown = new HashMap<>();
        private List<String> keyStrengths       = new ArrayList<>();
        private List<String> areasForImprovement = new ArrayList<>();
        private String hiringRecommendation;
        private String jdAlignment;
        private Map<String, Object> fullAnalysis;
    }
}
