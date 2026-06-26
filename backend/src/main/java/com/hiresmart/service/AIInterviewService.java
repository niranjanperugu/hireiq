package com.hiresmart.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.entity.AIInterviewSession;
import com.hiresmart.entity.Enums;
import com.hiresmart.repository.AIInterviewSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
public class AIInterviewService {

    private static final int MAX_QUESTIONS    = 10;
    private static final int TIME_LIMIT_MINS  = 30;

    private final AIInterviewSessionRepository sessionRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.base-url:https://api.anthropic.com}")
    private String baseUrl;

    @Value("${anthropic.api.model:claude-sonnet-4-6}")
    private String model;

    public AIInterviewService(AIInterviewSessionRepository sessionRepository,
                               ObjectMapper objectMapper,
                               @Qualifier("interviewRestTemplate") RestTemplate restTemplate) {
        this.sessionRepository = sessionRepository;
        this.objectMapper      = objectMapper;
        this.restTemplate      = restTemplate;
    }

    // ── Session management ────────────────────────────────────────────────────

    @Transactional
    public AIInterviewSession createSession(String orgId, String jobId,
                                             String jobTitle, String jobDescription,
                                             List<String> skills, String createdBy) {
        AIInterviewSession session = AIInterviewSession.builder()
                .token(UUID.randomUUID().toString())
                .organizationId(orgId)
                .jobId(jobId)
                .jobTitle(jobTitle)
                .jobDescription(jobDescription)
                .requiredSkillsJson(toJson(skills))
                .status(Enums.AIInterviewStatus.PENDING)
                .createdBy(createdBy)
                .build();
        return sessionRepository.save(session);
    }

    // ── Question generation ───────────────────────────────────────────────────

    public String generateFirstQuestion(String jobTitle, String jd,
                                         List<String> skills, String candidateName) {
        String prompt =
            "You are an expert AI interviewer conducting an AI-powered interview for a " + jobTitle + " position.\n\n" +
            "Job Description:\n" + jd + "\n\n" +
            "Required Skills: " + String.join(", ", skills) + "\n\n" +
            "Candidate Name: " + candidateName + "\n\n" +
            "Generate ONE warm, professional opening interview question that:\n" +
            "- Greets the candidate by first name\n" +
            "- Invites them to introduce themselves and relevant background\n" +
            "- Sets a professional but friendly tone\n\n" +
            "Return ONLY the question text. No preamble, no numbering.";
        return callClaude(prompt, 300);
    }

    public String generateNextQuestion(String jobTitle, String jd,
                                        List<String> skills,
                                        List<Map<String, Object>> qaHistory,
                                        int nextIndex, String candidateName) {
        StringBuilder history = new StringBuilder();
        for (Map<String, Object> qa : qaHistory) {
            history.append("Q: ").append(qa.get("question")).append("\n");
            Object ans = qa.get("answer");
            history.append("A: ").append(ans != null ? ans : "(no answer)").append("\n\n");
        }

        String focus;
        if (nextIndex <= 2)      focus = "technical skills and hands-on experience";
        else if (nextIndex <= 4) focus = "behavioral questions — past challenges, teamwork, leadership";
        else if (nextIndex <= 6) focus = "situational questions — how they'd handle role-specific scenarios";
        else if (nextIndex <= 8) focus = "depth of knowledge in the job's core technical areas";
        else                     focus = "motivation, career goals, and why this role";

        String prompt =
            "You are an expert AI interviewer for a " + jobTitle + " position.\n\n" +
            "Required Skills: " + String.join(", ", skills) + "\n\n" +
            "Job Description:\n" + jd + "\n\n" +
            "Conversation so far:\n" + history +
            "This is question " + (nextIndex + 1) + " of " + MAX_QUESTIONS + ".\n" +
            "Theme for this question: " + focus + "\n\n" +
            "Generate ONE follow-up interview question that:\n" +
            "- If the candidate's last answer was interesting or incomplete, probe deeper into it\n" +
            "- Otherwise, explores a key skill or scenario from the JD not yet discussed\n" +
            "- Is specific and directly relevant to the role\n" +
            "- Feels like a natural continuation of the conversation\n\n" +
            "Return ONLY the question text. No numbering, no preamble.";
        return callClaude(prompt, 300);
    }

    // ── Interview evaluation ──────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> evaluateInterview(String jobTitle, String jd,
                                                  List<String> skills,
                                                  List<Map<String, Object>> qaHistory,
                                                  String candidateName) {
        StringBuilder history = new StringBuilder();
        int i = 1;
        for (Map<String, Object> qa : qaHistory) {
            Object ans = qa.get("answer");
            if (ans == null || ans.toString().isBlank()) continue;
            history.append("Q").append(i++).append(": ").append(qa.get("question")).append("\n");
            history.append("Answer: ").append(ans).append("\n\n");
        }

        String prompt =
            "You are an expert hiring manager evaluating an AI interview.\n\n" +
            "Position: " + jobTitle + "\n" +
            "Required Skills: " + String.join(", ", skills) + "\n\n" +
            "Job Description:\n" + jd + "\n\n" +
            "Candidate: " + candidateName + "\n\n" +
            "Interview Q&A:\n" + history +
            "\nEvaluate and return ONLY strict JSON (no markdown, no code fences):\n" +
            "{\n" +
            "  \"overallScore\": 75,\n" +
            "  \"technicalScore\": 80,\n" +
            "  \"communicationScore\": 70,\n" +
            "  \"problemSolvingScore\": 75,\n" +
            "  \"recommendation\": \"HIRE\",\n" +
            "  \"strengths\": [\"strength1\", \"strength2\", \"strength3\"],\n" +
            "  \"gaps\": [\"gap1\", \"gap2\"],\n" +
            "  \"summary\": \"2-3 sentence executive summary for the hiring manager\",\n" +
            "  \"questionInsights\": [\n" +
            "    {\"questionNumber\": 1, \"score\": 80, \"insight\": \"brief insight\"}\n" +
            "  ]\n" +
            "}\n\n" +
            "recommendation must be: STRONG_HIRE, HIRE, CONSIDER, or REJECT\n" +
            "All scores are 0-100.";

        String raw = callClaude(prompt, 2000);
        try {
            // Strip any accidental markdown fences
            String json = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse evaluation JSON, returning default: {}", e.getMessage());
            return Map.of(
                    "overallScore", 60,
                    "technicalScore", 60,
                    "communicationScore", 60,
                    "problemSolvingScore", 60,
                    "recommendation", "CONSIDER",
                    "strengths", List.of("Completed the interview"),
                    "gaps", List.of("Evaluation parsing failed"),
                    "summary", "The candidate completed all interview questions.",
                    "questionInsights", List.of()
            );
        }
    }

    // ── Bulk question generation (pre-generate all at start) ─────────────────

    public List<String> generateAllQuestions(String jobTitle, String jd,
                                              List<String> skills, String candidateName) {
        String first = candidateName != null && !candidateName.isBlank()
                ? candidateName.split("\\s+")[0] : "there";
        String prompt =
            "You are an expert AI interviewer. Generate exactly 10 interview questions for a " + jobTitle + " position.\n\n" +
            "Job Description:\n" + (jd != null ? jd : "Not provided") + "\n\n" +
            "Required Skills: " + String.join(", ", skills) + "\n\n" +
            "Candidate first name: " + first + "\n\n" +
            "Question themes (follow this order):\n" +
            "1. Warm greeting + background introduction (use candidate's first name)\n" +
            "2. Core technical skill depth (based on JD)\n" +
            "3. Technical problem-solving scenario\n" +
            "4. System design or architecture thinking\n" +
            "5. Behavioral — teamwork/collaboration\n" +
            "6. Behavioral — handling challenges or failure\n" +
            "7. Role-specific deep-dive (key responsibility from JD)\n" +
            "8. Situational judgement question\n" +
            "9. Career growth and learning approach\n" +
            "10. Closing — motivation for this role / questions for the team\n\n" +
            "Return ONLY a valid JSON array of exactly 10 strings. No markdown, no numbering, no explanation.\n" +
            "Format: [\"question 1\", \"question 2\", ..., \"question 10\"]";

        try {
            String raw = callClaude(prompt, 1800);
            int start = raw.indexOf('[');
            int end   = raw.lastIndexOf(']') + 1;
            if (start >= 0 && end > start) {
                List<String> qs = objectMapper.readValue(raw.substring(start, end), new TypeReference<>() {});
                if (qs.size() >= 10) return qs.subList(0, 10);
                while (qs.size() < 10) qs.add(getFallbackQuestion(qs.size(), jobTitle));
                return qs;
            }
        } catch (Exception e) {
            log.warn("Bulk question generation failed, using fallbacks: {}", e.getMessage());
        }
        List<String> fb = new ArrayList<>();
        for (int i = 0; i < 10; i++) fb.add(getFallbackQuestion(i, jobTitle));
        return fb;
    }

    // ── Fallback questions (when Claude is unavailable) ───────────────────────

    public String getFallbackQuestion(int index, String jobTitle) {
        String[] fallbacks = {
            "Can you walk me through a challenging technical project you've worked on and how you overcame obstacles?",
            "What are the technical skills you feel strongest about for this " + jobTitle + " role?",
            "Tell me about a time you had to quickly learn an unfamiliar technology. How did you approach it?",
            "How do you approach debugging a complex issue you've never encountered before?",
            "Describe a situation where you had to meet a tight deadline. How did you manage priorities?",
            "What do you consider your most significant professional achievement, and why?",
            "How do you stay current with trends and best practices in your field?",
            "Describe a situation where you disagreed with a team member or manager. How did you handle it?",
            "What kind of work environment do you thrive in, and why?"
        };
        return fallbacks[Math.min(index, fallbacks.length - 1)];
    }

    // ── HTTP ──────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callClaude(String prompt, int maxTokens) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Anthropic API key not configured");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", "2023-06-01");

        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl + "/v1/messages", new HttpEntity<>(body, headers), Map.class);

        List<Map<String, Object>> content =
                (List<Map<String, Object>>) response.getBody().get("content");
        return ((String) content.get(0).get("text")).trim();
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }
}
