package com.hiresmart.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.entity.AIInterviewSession;
import com.hiresmart.repository.AIInterviewSessionRepository;
import com.hiresmart.security.UserPrincipal;
import com.hiresmart.service.AIInterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * HR-only endpoints for creating and viewing AI interview links.
 * Requires JWT authentication.
 */
@RestController
@RequestMapping("/api/v1/interview-links")
@RequiredArgsConstructor
@Slf4j
public class InterviewLinkController {

    private final AIInterviewSessionRepository sessionRepository;
    private final AIInterviewService interviewService;
    private final ObjectMapper objectMapper;

    /**
     * Create a new interview link for a job.
     * Body: { jobId, jobTitle, jobDescription, skills: [] }
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createLink(
            @RequestBody Map<String, Object> req,
            @AuthenticationPrincipal UserPrincipal user) {

        String jobId       = (String) req.get("jobId");
        String jobTitle    = (String) req.getOrDefault("jobTitle", "");
        String jobDesc     = (String) req.getOrDefault("jobDescription", "");
        List<String> skills = safeList(req.get("skills"));

        AIInterviewSession session = interviewService.createSession(
                user.getOrganizationId().toString(), jobId, jobTitle, jobDesc, skills, user.getUsername());

        return ResponseEntity.ok(Map.of(
                "token", session.getToken(),
                "interviewPath", "/interview/" + session.getToken(),
                "expiresAt", session.getExpiresAt().toString(),
                "createdAt", session.getCreatedAt().toString()
        ));
    }

    /**
     * List all sessions for a given job.
     * GET /api/v1/interview-links?jobId=xxx
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listLinks(
            @RequestParam String jobId,
            @AuthenticationPrincipal UserPrincipal user) {

        List<AIInterviewSession> sessions = sessionRepository
                .findByOrganizationIdAndJobIdOrderByCreatedAtDesc(user.getOrganizationId().toString(), jobId);

        List<Map<String, Object>> result = sessions.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("token", s.getToken());
            m.put("status", s.getStatus().name());
            m.put("candidateName", fullName(s));
            m.put("candidateEmail", s.getCandidateEmail());
            m.put("createdAt", s.getCreatedAt());
            m.put("startedAt", s.getStartedAt());
            m.put("completedAt", s.getCompletedAt());
            m.put("expiresAt", s.getExpiresAt());
            // Include score from evaluation if complete
            if (s.getEvaluationJson() != null) {
                try {
                    Map<String, Object> eval = objectMapper.readValue(
                            s.getEvaluationJson(), new TypeReference<>() {});
                    m.put("overallScore", eval.get("overallScore"));
                    m.put("recommendation", eval.get("recommendation"));
                } catch (Exception ignored) {}
            }
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Full interview results for a single session.
     */
    @GetMapping("/{token}/results")
    public ResponseEntity<Map<String, Object>> getResults(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal user) {

        AIInterviewSession session = sessionRepository.findByToken(token)
                .orElse(null);
        if (session == null || !session.getOrganizationId().equals(user.getOrganizationId().toString()))
            return ResponseEntity.notFound().build();

        Map<String, Object> resp = new HashMap<>();
        resp.put("token", session.getToken());
        resp.put("status", session.getStatus().name());
        resp.put("candidateName", fullName(session));
        resp.put("candidateEmail", session.getCandidateEmail());
        resp.put("candidatePhone", session.getCandidatePhone());
        resp.put("jobTitle", session.getJobTitle());
        resp.put("startedAt", session.getStartedAt());
        resp.put("completedAt", session.getCompletedAt());

        // Parse and attach Q&A
        if (session.getQuestionsAnswersJson() != null) {
            try {
                resp.put("questionsAnswers",
                        objectMapper.readValue(session.getQuestionsAnswersJson(), new TypeReference<>() {}));
            } catch (Exception ignored) {}
        }

        // Parse and attach evaluation
        if (session.getEvaluationJson() != null) {
            try {
                resp.put("evaluation",
                        objectMapper.readValue(session.getEvaluationJson(), new TypeReference<>() {}));
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(resp);
    }

    @SuppressWarnings("unchecked")
    private List<String> safeList(Object obj) {
        if (obj instanceof List<?> l) return (List<String>) l;
        return List.of();
    }

    private String fullName(AIInterviewSession s) {
        String f = s.getCandidateFirstName();
        String l = s.getCandidateLastName();
        if (f == null && l == null) return null;
        return ((f != null ? f : "") + " " + (l != null ? l : "")).trim();
    }
}
