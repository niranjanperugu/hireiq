package com.hiresmart.service;

import com.hiresmart.dto.AiChatRequest;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.repository.JobRepository;
import com.hiresmart.repository.ResumeAnalysisRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AiChatService {

    private final RestTemplate restTemplate;
    private final JobRepository jobRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.base-url:https://api.anthropic.com}")
    private String baseUrl;

    @Value("${anthropic.api.model:claude-sonnet-4-6}")
    private String model;

    @Value("${anthropic.api.max-tokens:2048}")
    private int maxTokens;

    public AiChatService(
            @Qualifier("anthropicRestTemplate") RestTemplate restTemplate,
            JobRepository jobRepository,
            ResumeAnalysisRepository resumeAnalysisRepository) {
        this.restTemplate = restTemplate;
        this.jobRepository = jobRepository;
        this.resumeAnalysisRepository = resumeAnalysisRepository;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    public String ask(AiChatRequest req) {
        if (!isEnabled()) {
            return "AI chat is not configured. Please add your ANTHROPIC_API_KEY to .env.docker and restart the backend.";
        }

        String context = buildContext(req.getOrganizationId());
        String systemPrompt = buildSystemPrompt(context);

        // Build messages array: history + current question
        List<Map<String, String>> messages = new ArrayList<>();
        if (req.getHistory() != null) {
            messages.addAll(req.getHistory());
        }
        messages.add(Map.of("role", "user", "content", req.getQuestion()));

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", "2023-06-01");
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("system", systemPrompt);
        requestBody.put("messages", messages);

        HttpEntity<Map<String, Object>> httpRequest = new HttpEntity<>(requestBody, headers);

        try {
            log.info("AiChat: calling Claude for org={} question={}", req.getOrganizationId(), req.getQuestion());
            ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/v1/messages", HttpMethod.POST, httpRequest, Map.class
            );
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.getBody().get("content");
            return (String) content.get(0).get("text");
        } catch (Exception e) {
            log.error("AiChat: Claude API error", e);
            return "Sorry, I couldn't get an answer right now. Please try again.";
        }
    }

    // ── Build live context from the database ─────────────────────────────────

    private String buildContext(String organizationId) {
        if (organizationId == null || organizationId.isBlank() || "local".equals(organizationId)) {
            return "No organization context available.";
        }

        StringBuilder sb = new StringBuilder();

        // --- Jobs ---
        try {
            UUID orgUuid = UUID.fromString(organizationId);
            var jobPage  = jobRepository.findByOrganizationId(
                orgUuid, PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt"))
            );
            var jobs = jobPage.getContent();

            sb.append("=== OPEN JOBS (").append(jobs.size()).append(") ===\n");
            jobs.forEach(j -> {
                sb.append("• [").append(j.getJobCode() != null ? j.getJobCode() : j.getId()).append("] ")
                  .append(j.getTitle())
                  .append(" | Status: ").append(j.getStatus())
                  .append(" | Mode: ").append(j.getWorkMode())
                  .append(" | Type: ").append(j.getEmploymentType())
                  .append(" | Location: ").append(j.getLocation());
                if (j.getMinExperienceYears() != null) {
                    sb.append(" | Exp: ").append(j.getMinExperienceYears()).append("+yrs");
                }
                sb.append("\n");
            });
            sb.append("\n");
        } catch (Exception e) {
            log.warn("AiChat: could not load jobs - {}", e.getMessage());
        }

        // --- Candidates / Resume Analyses ---
        try {
            var analyses = resumeAnalysisRepository.findAllByOrganization(organizationId);

            long excellent = analyses.stream().filter(a -> a.getAtsScore() >= 80).count();
            long good      = analyses.stream().filter(a -> a.getAtsScore() >= 65 && a.getAtsScore() < 80).count();
            long fair      = analyses.stream().filter(a -> a.getAtsScore() >= 50 && a.getAtsScore() < 65).count();
            long low       = analyses.stream().filter(a -> a.getAtsScore() < 50).count();

            sb.append("=== CANDIDATE SUMMARY (").append(analyses.size()).append(" total) ===\n");
            sb.append("Score bands: Excellent(≥80)=").append(excellent)
              .append(", Good(65-80)=").append(good)
              .append(", Fair(50-65)=").append(fair)
              .append(", Below threshold(<50)=").append(low).append("\n\n");

            sb.append("=== CANDIDATE LIST ===\n");
            analyses.stream().limit(150).forEach(a -> {
                sb.append("• ").append(a.getCandidateName())
                  .append(" | Job: ").append(a.getJobTitle() != null ? a.getJobTitle() : a.getJobId())
                  .append(" | ATS Score: ").append(String.format("%.0f", a.getAtsScore()))
                  .append(" | Rating: ").append(a.getRating())
                  .append(" | Experience: ").append(a.getYearsOfExperience() != null ? a.getYearsOfExperience() + " yrs" : "N/A");
                if (a.getEmail() != null) sb.append(" | Email: ").append(a.getEmail());
                if (a.getCurrentRole() != null) sb.append(" | Role: ").append(a.getCurrentRole());
                if (a.getMatchedSkillsJson() != null && !a.getMatchedSkillsJson().isBlank()
                        && !a.getMatchedSkillsJson().equals("[]")) {
                    sb.append(" | Matched skills: ").append(
                        a.getMatchedSkillsJson().replaceAll("[\\[\\]\"]", "").trim()
                    );
                }
                sb.append("\n");
            });
        } catch (Exception e) {
            log.warn("AiChat: could not load candidates - {}", e.getMessage());
        }

        return sb.toString();
    }

    private String buildSystemPrompt(String context) {
        return "You are HireIQ, an intelligent AI recruitment assistant embedded in an enterprise ATS platform.\n" +
               "You have access to real-time data from the organization's hiring database shown below.\n\n" +
               "Your capabilities:\n" +
               "- Answer questions about candidates, their ATS scores, skills, and job fit\n" +
               "- Provide hiring insights and statistics from the data\n" +
               "- Help compare candidates or shortlist recommendations\n" +
               "- Answer questions about open job positions and requirements\n" +
               "- Give pipeline summaries and hiring progress updates\n\n" +
               "Guidelines:\n" +
               "- Be concise and professional\n" +
               "- Use markdown for formatting (bullet points, bold for names/scores)\n" +
               "- When listing candidates, always show their ATS score and key skills\n" +
               "- If asked something outside your data, say so clearly\n" +
               "- Keep answers focused and actionable for HR professionals\n\n" +
               "=== LIVE DATABASE CONTEXT ===\n" +
               context + "\n" +
               "=== END OF CONTEXT ===\n\n" +
               "Answer the user's question using the data above. Today's date: " +
               java.time.LocalDate.now() + ".";
    }
}
