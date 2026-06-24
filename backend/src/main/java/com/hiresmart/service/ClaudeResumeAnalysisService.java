package com.hiresmart.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ClaudeResumeAnalysisService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.base-url:https://api.anthropic.com}")
    private String baseUrl;

    @Value("${anthropic.api.model:claude-sonnet-4-6}")
    private String model;

    @Value("${anthropic.api.max-tokens:4000}")
    private int maxTokens;

    private static final String PROMPT_TEMPLATE =
        "You are an Enterprise ATS, Technical Recruiter, and Hiring Manager.\n" +
        "Analyze the Resume against the Job Description exactly as a modern ATS screening system would.\n" +
        "Return ONLY strict JSON - no markdown, no code fences, no explanation.\n\n" +

        "=== JOB INFORMATION ===\n" +
        "Job Title: {jobTitle}\n" +
        "Known Required Skills: {requiredSkillsCsv}\n" +
        "Min Experience: {minExperience} yrs | Max Experience: {maxExperience} yrs\n" +
        "Job Description:\n{jobDescription}\n\n" +

        "{nlpContext}" +
        "=== RESUME ===\n" +
        "{resumeText}\n\n" +

        "=== SCORING FORMULA ===\n" +
        "Each component score is 0-100. overall_score = (\n" +
        "  job_description_match.score * 0.50 +\n" +
        "  required_skills_match.score * 0.10 +\n" +
        "  experience_match.score      * 0.10 +\n" +
        "  job_title_match.score       * 0.05 +\n" +
        "  location_match.score        * 0.05 +\n" +
        "  seniority_match.score       * 0.05 +\n" +
        "  achievement_impact.score    * 0.05 +\n" +
        "  education_certifications.score * 0.03 +\n" +
        "  ats_readability.score       * 0.02\n" +
        ")\n\n" +

        "NLP HINTS (if provided above): Use NLP-extracted name/email/phone as first priority for candidate_info.\n" +
        "Use NLP experience as starting point; compute from work history dates if 0. Today = {currentYear}.\n\n" +

        "JD MATCH (50%): Evaluate responsibilities alignment, role/domain/industry relevance, project relevance,\n" +
        "required qualifications, preferred qualifications. Score 0-100.\n\n" +

        "SKILLS (10%): Extract ALL required skills from the JD. For each assign evidence level:\n" +
        "0=Missing, 1=Mentioned, 2=Demonstrated, 3=Strong Experience, 4=Expert/Lead Level.\n" +
        "Score = (sum_of_levels / (4 * total_required)) * 100.\n\n" +

        "EXPERIENCE (10%): Compare required vs actual years. Weight project complexity and scope.\n\n" +

        "JOB TITLE (5%): Exact=100, Very Similar=80, Related=60, Weak=30.\n\n" +

        "LOCATION (5%): Same City/State=100, Remote Eligible=100, Relocation Possible=70, Mismatch=20.\n\n" +

        "SENIORITY (5%): Map candidate vs required level (Entry/Junior/Mid/Senior/Lead/Staff/Principal/Architect/Manager/Director).\n\n" +

        "ACHIEVEMENTS (5%): Revenue impact, cost reduction, performance improvements, team leadership, quantified achievements.\n\n" +

        "EDUCATION (3%): PhD/Masters=100, Bachelors=70, Diploma=40, Other=20.\n\n" +

        "ATS READABILITY (2%): Parsing friendliness, clear sections, keyword placement.\n\n" +

        "RECOMMENDATION thresholds:\n" +
        "  overall_score >= 80 -> Top Candidate\n" +
        "  overall_score >= 70 -> Strong Interview\n" +
        "  overall_score >= 55 -> Interview\n" +
        "  overall_score >= 40 -> Consider\n" +
        "  overall_score <  40 -> Reject\n\n" +

        "=== RETURN THIS EXACT JSON (use empty string for missing strings, 0 for missing numbers, [] for missing arrays) ===\n" +
        "{\n" +
        "  \"candidate_info\": {\n" +
        "    \"name\": \"\",\n" +
        "    \"email\": \"\",\n" +
        "    \"phone\": \"\",\n" +
        "    \"current_title\": \"\",\n" +
        "    \"years_of_experience\": 0,\n" +
        "    \"education\": \"PhD|Masters|Bachelors|Diploma|High School\",\n" +
        "    \"location\": \"\",\n" +
        "    \"all_skills\": []\n" +
        "  },\n" +
        "  \"overall_score\": 0,\n" +
        "  \"recommendation\": \"Reject|Consider|Interview|Strong Interview|Top Candidate\",\n" +
        "  \"job_description_match\": {\n" +
        "    \"score\": 0,\n" +
        "    \"matched_responsibilities\": [],\n" +
        "    \"missing_responsibilities\": [],\n" +
        "    \"matched_qualifications\": [],\n" +
        "    \"missing_qualifications\": []\n" +
        "  },\n" +
        "  \"required_skills_match\": {\n" +
        "    \"score\": 0,\n" +
        "    \"required_skills_count\": 0,\n" +
        "    \"matched_skills_count\": 0,\n" +
        "    \"matched_skills\": [],\n" +
        "    \"partially_matched_skills\": [],\n" +
        "    \"missing_skills\": [],\n" +
        "    \"skill_evidence\": [{\"skill\": \"\", \"evidence_level\": 0, \"evidence\": \"\"}]\n" +
        "  },\n" +
        "  \"experience_match\": {\"score\": 0, \"required_years\": 0, \"candidate_years\": 0},\n" +
        "  \"job_title_match\": {\"score\": 0, \"candidate_title\": \"\", \"target_title\": \"\"},\n" +
        "  \"location_match\": {\"score\": 0, \"candidate_location\": \"\", \"job_location\": \"\", \"match_type\": \"\"},\n" +
        "  \"seniority_match\": {\"score\": 0, \"candidate_level\": \"\", \"required_level\": \"\"},\n" +
        "  \"achievement_impact\": {\"score\": 0, \"achievements\": []},\n" +
        "  \"education_certifications\": {\"score\": 0},\n" +
        "  \"ats_readability\": {\"score\": 0},\n" +
        "  \"critical_missing_requirements\": [],\n" +
        "  \"top_strengths\": [],\n" +
        "  \"high_priority_gaps\": [],\n" +
        "  \"improvement_recommendations\": [],\n" +
        "  \"interview_probability\": {\"percentage\": 0, \"assessment\": \"\"},\n" +
        "  \"recruiter_summary\": \"\",\n" +
        "  \"hiring_manager_summary\": \"\"\n" +
        "}";

    public ClaudeResumeAnalysisService(
            @Qualifier("anthropicRestTemplate") RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> analyzeResume(
            String resumeText,
            String jobTitle,
            List<String> requiredSkills,
            Integer minExperience,
            Integer maxExperience,
            String jobDescription,
            NLPExtractedData nlpData) {

        String prompt = buildPrompt(resumeText, jobTitle, requiredSkills,
                                    minExperience, maxExperience, jobDescription, nlpData);

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", "2023-06-01");
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "model", model,
            "max_tokens", maxTokens,
            "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        log.info("Calling Claude API ({}) to analyze resume for job: {}", model, jobTitle);
        ResponseEntity<Map> response = restTemplate.exchange(
            baseUrl + "/v1/messages",
            HttpMethod.POST,
            request,
            Map.class
        );

        return extractJsonFromResponse(response.getBody());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractJsonFromResponse(Map<?, ?> responseBody) {
        try {
            List<Map<String, Object>> content =
                (List<Map<String, Object>>) responseBody.get("content");
            String text = (String) content.get(0).get("text");
            log.debug("Claude raw response: {}", text);
            text = text.trim();
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)^```[a-z]*\\n?", "").replaceAll("```\\s*$", "").trim();
            }
            return objectMapper.readValue(text, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Claude API response: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String resumeText, String jobTitle, List<String> requiredSkills,
                                Integer minExperience, Integer maxExperience, String jobDescription,
                                NLPExtractedData nlpData) {
        String truncatedResume = resumeText.length() > 6000
            ? resumeText.substring(0, 6000) : resumeText;

        String nlpSection = (nlpData != null && nlpData.getStructuredContext() != null)
            ? "\n" + nlpData.getStructuredContext() + "\n\n"
            : "";

        List<String> allSkills = new ArrayList<>(requiredSkills);
        if (nlpData != null && nlpData.getExtractedSkills() != null) {
            nlpData.getExtractedSkills().stream()
                .filter(s -> !allSkills.contains(s))
                .forEach(allSkills::add);
        }

        return PROMPT_TEMPLATE
            .replace("{jobTitle}", nullSafe(jobTitle))
            .replace("{requiredSkillsCsv}", String.join(", ", requiredSkills))
            .replace("{minExperience}", String.valueOf(minExperience != null ? minExperience : 0))
            .replace("{maxExperience}", String.valueOf(maxExperience != null ? maxExperience : 20))
            .replace("{jobDescription}", nullSafe(jobDescription))
            .replace("{currentYear}", String.valueOf(java.time.Year.now().getValue()))
            .replace("{nlpContext}", nlpSection)
            .replace("{resumeText}", truncatedResume);
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }
}
