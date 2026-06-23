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

    @Value("${anthropic.api.model:claude-haiku-4-5-20251001}")
    private String model;

    @Value("${anthropic.api.max-tokens:1500}")
    private int maxTokens;

    private static final String PROMPT_TEMPLATE =
        "You are an expert ATS (Applicant Tracking System) and resume analyst.\n\n" +
        "Your task: deeply analyze the resume against the job requirements and produce an accurate ATS score.\n" +
        "Return ONLY a valid JSON object — no markdown, no code fences, no explanation.\n\n" +
        "=== JOB REQUIREMENTS ===\n" +
        "Job Title: {jobTitle}\n" +
        "Required Skills: {requiredSkillsCsv}\n" +
        "Min Experience: {minExperience} years\n" +
        "Max Experience: {maxExperience} years\n" +
        "Job Description:\n{jobDescription}\n" +
        "{nlpContext}\n" +
        "=== RESUME TEXT ===\n" +
        "{resumeText}\n\n" +
        "=== INSTRUCTIONS ===\n" +
        "1. NLP HINTS: If NLP PRE-EXTRACTED ENTITIES are provided above, use them as high-confidence anchors:\n" +
        "   - Prefer the NLP-extracted name, email, phone over your own extraction.\n" +
        "   - Use the NLP-computed experience as the starting point; adjust only if the resume text clearly contradicts it.\n" +
        "   - NLP-identified skills are confirmed present — include them in matchedSkills if they are in the required list.\n\n" +
        "2. EXPERIENCE: If NLP experience is 0 or not provided, scan ALL work history entries, " +
        "compute each job's duration from its start/end dates (use today = {currentYear} for current roles), and SUM them. " +
        "Return the total as an integer in yearsOfExperience. Never return 0 if there is visible work history.\n\n" +
        "3. SKILLS: Extract every technical skill, framework, tool, language, or platform mentioned anywhere in the resume. " +
        "For matchedSkills, check each required skill against the full resume text — " +
        "include a skill if the resume demonstrates it even if the exact keyword differs (e.g. 'Spring Boot' matches 'SpringBoot'). " +
        "missingSkills = required skills genuinely absent from the resume.\n\n" +
        "3. ATS SCORE — use this formula, integer 0–100:\n" +
        "   a) Skill match (35%): matchedSkills.size / max(requiredSkills.size, 1) × 35\n" +
        "   b) Experience fit (25%): if exp >= minExp → 25; if exp > maxExp → 18 (overqualified); else (exp / max(minExp,1)) × 25\n" +
        "   c) Job description relevance (25%): read the job description carefully. How well does the candidate's background, " +
        "      domain, responsibilities, and achievements align with what the JD asks for? Award 0–25 points.\n" +
        "   d) Education (10%): PhD/Master's = 10, Bachelor's = 7, Diploma = 4, other = 1\n" +
        "   e) Resume quality (5%): contact info present, quantified achievements, clear structure → 0–5 pts\n" +
        "   Final atsScore = sum of a+b+c+d+e, capped at 100.\n\n" +
        "=== OUTPUT ===\n" +
        "Return exactly this JSON (use empty string for missing strings, 0 for missing numbers, [] for missing arrays):\n" +
        "{\n" +
        "  \"candidateName\": \"full name\",\n" +
        "  \"currentRole\": \"most recent job title\",\n" +
        "  \"email\": \"email address\",\n" +
        "  \"phone\": \"phone number\",\n" +
        "  \"yearsOfExperience\": 0,\n" +
        "  \"education\": \"PhD or Master's or Bachelor's or Diploma or High School\",\n" +
        "  \"skills\": [\"every technical skill found in resume\"],\n" +
        "  \"matchedSkills\": [\"required skills present in resume\"],\n" +
        "  \"missingSkills\": [\"required skills absent from resume\"],\n" +
        "  \"professionalSummary\": \"3-4 sentence summary highlighting fit for this specific role\",\n" +
        "  \"atsScore\": 0\n" +
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

        log.info("Calling Claude API to analyze resume for job: {}", jobTitle);
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
            return objectMapper.readValue(text, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Claude API response: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String resumeText, String jobTitle, List<String> requiredSkills,
                                Integer minExperience, Integer maxExperience, String jobDescription,
                                NLPExtractedData nlpData) {
        String truncatedResume = resumeText.length() > 4000
            ? resumeText.substring(0, 4000) : resumeText;

        String nlpSection = (nlpData != null && nlpData.getStructuredContext() != null)
            ? "\n" + nlpData.getStructuredContext() + "\n"
            : "";

        // Boost required skills with NLP-found skills for better coverage
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
