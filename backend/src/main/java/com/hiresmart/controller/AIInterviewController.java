package com.hiresmart.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.entity.AIInterviewSession;
import com.hiresmart.entity.Enums;
import com.hiresmart.repository.AIInterviewSessionRepository;
import com.hiresmart.service.AIInterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Publicly accessible interview endpoints — no JWT required.
 * Already covered by SecurityConfig's .requestMatchers("/api/v1/public/**").permitAll()
 */
@RestController
@RequestMapping("/api/v1/public/interview")
@RequiredArgsConstructor
@Slf4j
public class AIInterviewController {

    private static final int MAX_QUESTIONS = 10;

    private final AIInterviewSessionRepository sessionRepository;
    private final AIInterviewService interviewService;
    private final ObjectMapper objectMapper;

    // ── GET session info (landing page) ──────────────────────────────────────

    @GetMapping("/{token}")
    public ResponseEntity<Map<String, Object>> getSession(@PathVariable String token) {
        Optional<AIInterviewSession> opt = sessionRepository.findByToken(token);
        if (opt.isEmpty()) return expiredResponse();

        AIInterviewSession session = opt.get();

        // Check 7-day TTL
        if (LocalDateTime.now().isAfter(session.getExpiresAt())
                && session.getStatus() == Enums.AIInterviewStatus.PENDING) {
            markExpired(session);
        }

        if (session.getStatus() == Enums.AIInterviewStatus.EXPIRED) return expiredResponse();

        Map<String, Object> info = new HashMap<>();
        info.put("expired", false);
        info.put("jobTitle", session.getJobTitle());
        info.put("status", session.getStatus().name());
        info.put("totalQuestions", MAX_QUESTIONS);
        info.put("timeLimitMinutes", 30);
        info.put("alreadyCompleted", session.getStatus() == Enums.AIInterviewStatus.COMPLETED);
        return ResponseEntity.ok(info);
    }

    // ── POST start — submit candidate info, get first question ───────────────

    @PostMapping("/{token}/start")
    @Transactional
    public ResponseEntity<Map<String, Object>> startInterview(
            @PathVariable String token,
            @RequestBody Map<String, String> body) {

        AIInterviewSession session = findPendingSession(token);
        if (session == null) return expiredResponse();

        if (session.getStatus() != Enums.AIInterviewStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Interview has already been started or completed."));
        }

        // Persist candidate info
        session.setCandidateFirstName(trim(body.get("firstName")));
        session.setCandidateLastName(trim(body.get("lastName")));
        session.setCandidateEmail(trim(body.get("email")));
        session.setCandidatePhone(trim(body.get("phone")));
        session.setStatus(Enums.AIInterviewStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        session.setCurrentQuestionIndex(0);

        String candidateName = session.getCandidateFirstName();
        List<String> skills  = parseSkills(session.getRequiredSkillsJson());

        // Generate first question
        String firstQuestion;
        try {
            firstQuestion = interviewService.generateFirstQuestion(
                    session.getJobTitle(), session.getJobDescription(), skills, candidateName);
        } catch (Exception e) {
            log.warn("[{}] First question fallback: {}", token, e.getMessage());
            firstQuestion = "Hello " + candidateName + "! Could you please start by telling me about yourself and what excites you about this " + session.getJobTitle() + " opportunity?";
        }

        // Store as first QA entry (answer is empty until user submits)
        List<Map<String, Object>> qa = new ArrayList<>();
        qa.add(buildQAEntry(0, firstQuestion, null, null));
        saveQA(session, qa);
        sessionRepository.save(session);

        Map<String, Object> resp = new HashMap<>();
        resp.put("question", firstQuestion);
        resp.put("questionIndex", 0);
        resp.put("totalQuestions", MAX_QUESTIONS);
        resp.put("timeLimitMinutes", 30);
        return ResponseEntity.ok(resp);
    }

    // ── POST answer — submit answer, get next question or evaluation ──────────

    @PostMapping("/{token}/answer")
    @Transactional
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) {

        Optional<AIInterviewSession> opt = sessionRepository.findByToken(token);
        if (opt.isEmpty()) return expiredResponse();
        AIInterviewSession session = opt.get();

        if (session.getStatus() != Enums.AIInterviewStatus.IN_PROGRESS) {
            return ResponseEntity.badRequest().body(Map.of("error", "Session not in progress"));
        }

        String answer      = (String) body.getOrDefault("answer", "");
        String inputMethod = (String) body.getOrDefault("inputMethod", "text");
        int currentIndex   = session.getCurrentQuestionIndex();

        // Write answer into the current QA entry
        List<Map<String, Object>> qa = parseQA(session.getQuestionsAnswersJson());
        if (!qa.isEmpty()) {
            Map<String, Object> cur = new HashMap<>(qa.get(qa.size() - 1));
            cur.put("answer", answer);
            cur.put("inputMethod", inputMethod);
            cur.put("answeredAt", LocalDateTime.now().toString());
            qa.set(qa.size() - 1, cur);
        }

        int nextIndex  = currentIndex + 1;
        boolean isDone = nextIndex >= MAX_QUESTIONS;

        if (isDone) {
            return completeInterview(session, qa);
        }

        // Generate next question
        List<String> skills = parseSkills(session.getRequiredSkillsJson());
        String nextQuestion;
        try {
            nextQuestion = interviewService.generateNextQuestion(
                    session.getJobTitle(), session.getJobDescription(),
                    skills, qa, nextIndex, session.getCandidateFirstName());
        } catch (Exception e) {
            log.warn("[{}] Next question fallback: {}", token, e.getMessage());
            nextQuestion = interviewService.getFallbackQuestion(nextIndex, session.getJobTitle());
        }

        qa.add(buildQAEntry(nextIndex, nextQuestion, null, null));
        saveQA(session, qa);
        session.setCurrentQuestionIndex(nextIndex);
        sessionRepository.save(session);

        Map<String, Object> resp = new HashMap<>();
        resp.put("isComplete", false);
        resp.put("nextQuestion", nextQuestion);
        resp.put("questionIndex", nextIndex);
        return ResponseEntity.ok(resp);
    }

    // ── POST timeout — 30-min timer expired in browser ───────────────────────

    @PostMapping("/{token}/timeout")
    @Transactional
    public ResponseEntity<Map<String, Object>> handleTimeout(@PathVariable String token) {
        Optional<AIInterviewSession> opt = sessionRepository.findByToken(token);
        if (opt.isEmpty()) return expiredResponse();
        AIInterviewSession session = opt.get();

        if (session.getStatus() != Enums.AIInterviewStatus.IN_PROGRESS) {
            return ResponseEntity.ok(Map.of("isComplete", true));
        }

        List<Map<String, Object>> qa = parseQA(session.getQuestionsAnswersJson());
        return completeInterview(session, qa);
    }

    // ── GET results (for completion page) ────────────────────────────────────

    @GetMapping("/{token}/results")
    public ResponseEntity<Map<String, Object>> getResults(@PathVariable String token) {
        Optional<AIInterviewSession> opt = sessionRepository.findByToken(token);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        AIInterviewSession session = opt.get();

        Map<String, Object> eval = session.getEvaluationJson() != null
                ? parseMap(session.getEvaluationJson()) : Map.of();

        Map<String, Object> resp = new HashMap<>();
        resp.put("candidateName", session.getCandidateFirstName() + " " + session.getCandidateLastName());
        resp.put("jobTitle", session.getJobTitle());
        resp.put("evaluation", eval);
        resp.put("completedAt", session.getCompletedAt());
        resp.put("totalAnswered", session.getCurrentQuestionIndex());
        return ResponseEntity.ok(resp);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> completeInterview(
            AIInterviewSession session, List<Map<String, Object>> qa) {

        List<String> skills = parseSkills(session.getRequiredSkillsJson());
        Map<String, Object> evaluation;
        try {
            evaluation = interviewService.evaluateInterview(
                    session.getJobTitle(), session.getJobDescription(), skills, qa,
                    session.getCandidateFirstName() + " " + session.getCandidateLastName());
        } catch (Exception e) {
            log.error("[{}] Evaluation failed: {}", session.getToken(), e.getMessage());
            evaluation = Map.of(
                    "overallScore", 60,
                    "recommendation", "CONSIDER",
                    "summary", "Interview completed successfully.",
                    "strengths", List.of("Completed all interview questions"),
                    "gaps", List.of()
            );
        }

        session.setStatus(Enums.AIInterviewStatus.COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        session.setCurrentQuestionIndex(MAX_QUESTIONS);
        saveQA(session, qa);
        try { session.setEvaluationJson(objectMapper.writeValueAsString(evaluation)); }
        catch (Exception ignored) {}
        sessionRepository.save(session);

        Map<String, Object> resp = new HashMap<>();
        resp.put("isComplete", true);
        resp.put("evaluation", evaluation);
        return ResponseEntity.ok(resp);
    }

    private AIInterviewSession findPendingSession(String token) {
        Optional<AIInterviewSession> opt = sessionRepository.findByToken(token);
        if (opt.isEmpty()) return null;
        AIInterviewSession s = opt.get();
        if (s.getStatus() == Enums.AIInterviewStatus.EXPIRED
                || s.getStatus() == Enums.AIInterviewStatus.COMPLETED) return null;
        if (s.getStatus() == Enums.AIInterviewStatus.PENDING
                && LocalDateTime.now().isAfter(s.getExpiresAt())) {
            markExpired(s);
            return null;
        }
        return s;
    }

    private void markExpired(AIInterviewSession s) {
        s.setStatus(Enums.AIInterviewStatus.EXPIRED);
        sessionRepository.save(s);
    }

    private ResponseEntity<Map<String, Object>> expiredResponse() {
        return ResponseEntity.ok(Map.of(
                "expired", true,
                "message", "This interview link has expired or has already been completed."));
    }

    private Map<String, Object> buildQAEntry(int index, String question, String answer, String method) {
        Map<String, Object> e = new HashMap<>();
        e.put("index", index);
        e.put("question", question);
        e.put("answer", answer != null ? answer : "");
        e.put("inputMethod", method != null ? method : "");
        e.put("timestamp", LocalDateTime.now().toString());
        return e;
    }

    private void saveQA(AIInterviewSession session, List<Map<String, Object>> qa) {
        try { session.setQuestionsAnswersJson(objectMapper.writeValueAsString(qa)); }
        catch (Exception ignored) {}
    }

    @SuppressWarnings("unchecked")
    private List<String> parseSkills(String json) {
        try { return json != null ? objectMapper.readValue(json, new TypeReference<>() {}) : List.of(); }
        catch (Exception e) { return List.of(); }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseQA(String json) {
        try { return json != null ? objectMapper.readValue(json, new TypeReference<>() {}) : new ArrayList<>(); }
        catch (Exception e) { return new ArrayList<>(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseMap(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return Map.of(); }
    }

    private String trim(String s) { return s != null ? s.trim() : ""; }
}
