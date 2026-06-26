package com.hiresmart.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.entity.Assessment;
import com.hiresmart.entity.Enums;
import com.hiresmart.repository.AssessmentRepository;
import com.hiresmart.security.UserPrincipal;
import com.hiresmart.service.AIInterviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@Slf4j
@RequiredArgsConstructor
public class AssessmentController {

    private static final int MAX_QUESTIONS   = 10;
    private static final int TIME_LIMIT_MINS = 45;

    private final AssessmentRepository assessmentRepository;
    private final AIInterviewService   interviewService;
    private final ObjectMapper         objectMapper;

    // ══════════════════════════════════════════════════════════════════════════
    // HR authenticated — create / list
    // ══════════════════════════════════════════════════════════════════════════

    @PostMapping("/api/v1/assessments")
    @Transactional
    public ResponseEntity<Map<String, Object>> createAssessment(
            @RequestBody Map<String, Object> req,
            @AuthenticationPrincipal UserPrincipal user) {

        String orgId         = user.getOrganizationId().toString();
        String jobId         = (String) req.get("jobId");
        String jobTitle      = (String) req.getOrDefault("jobTitle", "");
        String jobDesc       = (String) req.getOrDefault("jobDescription", "");
        List<String> skills  = safeList(req.get("skills"));
        String candidateId   = (String) req.get("candidateId");
        String candidateName = (String) req.getOrDefault("candidateName", "");
        String candidateEmail= (String) req.getOrDefault("candidateEmail", "");
        String candidatePhone= (String) req.getOrDefault("candidatePhone", "");
        String candidateRole = (String) req.getOrDefault("candidateRole", "");

        Assessment assessment = Assessment.builder()
                .token(UUID.randomUUID().toString())
                .organizationId(orgId)
                .jobId(jobId)
                .candidateId(candidateId)
                .jobTitle(jobTitle)
                .jobDescription(jobDesc)
                .requiredSkillsJson(toJson(skills))
                .candidateName(candidateName)
                .candidateEmail(candidateEmail)
                .candidatePhone(candidatePhone)
                .candidateRole(candidateRole)
                .status(Enums.AssessmentStatus.PENDING)
                .createdBy(user.getUsername())
                .build();
        assessmentRepository.save(assessment);

        String path          = "/assessment/" + assessment.getToken();
        String emailTemplate = buildEmailTemplate(candidateName, jobTitle, path);

        return ResponseEntity.ok(Map.of(
                "token",          assessment.getToken(),
                "assessmentPath", path,
                "expiresAt",      assessment.getExpiresAt().toString(),
                "emailSubject",   "Skills Assessment Invitation – " + jobTitle,
                "emailBody",      emailTemplate
        ));
    }

    @GetMapping("/api/v1/assessments")
    public ResponseEntity<List<Map<String, Object>>> listAssessments(
            @RequestParam String jobId,
            @RequestParam(required = false) String candidateId,
            @AuthenticationPrincipal UserPrincipal user) {

        String orgId = user.getOrganizationId().toString();
        List<Assessment> list = (candidateId != null && !candidateId.isBlank())
                ? assessmentRepository.findByOrganizationIdAndJobIdAndCandidateIdOrderByCreatedAtDesc(orgId, jobId, candidateId)
                : assessmentRepository.findByOrganizationIdAndJobIdOrderByCreatedAtDesc(orgId, jobId);

        return ResponseEntity.ok(list.stream().map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("token",         a.getToken());
            m.put("status",        a.getStatus().name());
            m.put("candidateName", a.getCandidateName());
            m.put("candidateId",   a.getCandidateId());
            m.put("createdAt",     a.getCreatedAt());
            m.put("completedAt",   a.getCompletedAt());
            if (a.getEvaluationJson() != null) {
                try {
                    Map<String, Object> ev = parseMap(a.getEvaluationJson());
                    m.put("overallScore",   ev.get("overallScore"));
                    m.put("recommendation", ev.get("recommendation"));
                } catch (Exception ignored) {}
            }
            return m;
        }).collect(Collectors.toList()));
    }

    @GetMapping("/api/v1/assessments/{token}/results")
    public ResponseEntity<Map<String, Object>> hrResults(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal user) {

        Assessment a = assessmentRepository.findByToken(token).orElse(null);
        if (a == null || !a.getOrganizationId().equals(user.getOrganizationId().toString()))
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(buildResultsMap(a));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Public — candidate-facing
    // ══════════════════════════════════════════════════════════════════════════

    @GetMapping("/api/v1/public/assessment/{token}")
    @Transactional
    public ResponseEntity<Map<String, Object>> getAssessment(@PathVariable String token) {
        Optional<Assessment> opt = assessmentRepository.findByToken(token);
        if (opt.isEmpty()) return completedResponse();

        Assessment a = opt.get();

        // Auto-expire IN_PROGRESS sessions past their 45-min window
        if (a.getStatus() == Enums.AssessmentStatus.IN_PROGRESS
                && a.getExpiresAt() != null
                && LocalDateTime.now().isAfter(a.getExpiresAt())) {
            forceExpire(a);
            return completedResponse();
        }

        if (a.getStatus() == Enums.AssessmentStatus.COMPLETED
                || a.getStatus() == Enums.AssessmentStatus.EXPIRED) {
            return completedResponse();
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("expired",          false);
        resp.put("jobTitle",         a.getJobTitle());
        resp.put("candidateName",    a.getCandidateName());
        resp.put("candidateEmail",   a.getCandidateEmail());
        resp.put("candidatePhone",   a.getCandidatePhone());
        resp.put("candidateRole",    a.getCandidateRole());
        resp.put("status",           a.getStatus().name());
        resp.put("totalQuestions",   MAX_QUESTIONS);
        resp.put("timeLimitMinutes", TIME_LIMIT_MINS);
        resp.put("alreadyCompleted", false);

        // If already in progress — return resume info so frontend skips confirm screen
        if (a.getStatus() == Enums.AssessmentStatus.IN_PROGRESS) {
            int curIdx = a.getCurrentQuestionIndex();
            List<Map<String, Object>> qa = parseQA(a.getQuestionsAnswersJson());
            String curQuestion = qa.stream()
                    .filter(q -> Integer.valueOf(curIdx).equals(q.get("index")))
                    .map(q -> (String) q.get("question"))
                    .findFirst().orElse(null);
            long remainingSecs = a.getExpiresAt() != null
                    ? Math.max(0, ChronoUnit.SECONDS.between(LocalDateTime.now(), a.getExpiresAt()))
                    : (long) TIME_LIMIT_MINS * 60;

            resp.put("resuming",         true);
            resp.put("questionIndex",    curIdx);
            resp.put("currentQuestion",  curQuestion);
            resp.put("remainingSeconds", remainingSecs);
        }

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/api/v1/public/assessment/{token}/start")
    @Transactional
    public ResponseEntity<Map<String, Object>> startAssessment(@PathVariable String token) {
        Assessment a = assessmentRepository.findByToken(token).orElse(null);
        if (a == null || a.getStatus() == Enums.AssessmentStatus.COMPLETED
                      || a.getStatus() == Enums.AssessmentStatus.EXPIRED)
            return completedResponse();

        // Already in progress — idempotent resume
        if (a.getStatus() == Enums.AssessmentStatus.IN_PROGRESS) {
            int curIdx = a.getCurrentQuestionIndex();
            List<Map<String, Object>> qa = parseQA(a.getQuestionsAnswersJson());
            String curQ = qa.stream()
                    .filter(q -> Integer.valueOf(curIdx).equals(q.get("index")))
                    .map(q -> (String) q.get("question"))
                    .findFirst().orElse("Please continue your assessment.");
            long remainingSecs = a.getExpiresAt() != null
                    ? Math.max(0, ChronoUnit.SECONDS.between(LocalDateTime.now(), a.getExpiresAt()))
                    : (long) TIME_LIMIT_MINS * 60;
            return ResponseEntity.ok(Map.of(
                    "question", curQ, "questionIndex", curIdx,
                    "totalQuestions", MAX_QUESTIONS, "remainingSeconds", remainingSecs));
        }

        // First start — pre-generate all 10 questions in one Claude call
        List<String> skills = parseSkills(a.getRequiredSkillsJson());
        List<String> questions;
        try {
            questions = interviewService.generateAllQuestions(
                    a.getJobTitle(), a.getJobDescription(), skills, a.getCandidateName());
        } catch (Exception e) {
            log.warn("Bulk generation failed, using fallbacks: {}", e.getMessage());
            questions = new ArrayList<>();
            for (int i = 0; i < MAX_QUESTIONS; i++)
                questions.add(interviewService.getFallbackQuestion(i, a.getJobTitle()));
        }

        // Store all questions upfront (answers empty)
        List<Map<String, Object>> qa = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++)
            qa.add(qaEntry(i, questions.get(i), null, null));

        LocalDateTime now      = LocalDateTime.now();
        LocalDateTime expireAt = now.plusMinutes(TIME_LIMIT_MINS);

        a.setStatus(Enums.AssessmentStatus.IN_PROGRESS);
        a.setStartedAt(now);
        a.setExpiresAt(expireAt);
        a.setCurrentQuestionIndex(0);
        saveQA(a, qa);
        assessmentRepository.save(a);

        return ResponseEntity.ok(Map.of(
                "question",         questions.get(0),
                "questionIndex",    0,
                "totalQuestions",   MAX_QUESTIONS,
                "remainingSeconds", (long) TIME_LIMIT_MINS * 60));
    }

    @PostMapping("/api/v1/public/assessment/{token}/answer")
    @Transactional
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) {

        Assessment a = assessmentRepository.findByToken(token).orElse(null);
        if (a == null || a.getStatus() != Enums.AssessmentStatus.IN_PROGRESS)
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid state"));

        // Check session time expiry
        if (a.getExpiresAt() != null && LocalDateTime.now().isAfter(a.getExpiresAt())) {
            forceExpire(a);
            return completedResponse();
        }

        String answer      = (String) body.getOrDefault("answer", "");
        String inputMethod = (String) body.getOrDefault("inputMethod", "text");
        int    curIdx      = a.getCurrentQuestionIndex();

        List<Map<String, Object>> qa = parseQA(a.getQuestionsAnswersJson());

        // Save answer to current question entry
        for (int i = 0; i < qa.size(); i++) {
            if (Integer.valueOf(curIdx).equals(qa.get(i).get("index"))) {
                Map<String, Object> entry = new LinkedHashMap<>(qa.get(i));
                entry.put("answer",      answer);
                entry.put("inputMethod", inputMethod);
                entry.put("answeredAt",  LocalDateTime.now().toString());
                qa.set(i, entry);
                break;
            }
        }

        int nextIdx = curIdx + 1;
        if (nextIdx >= MAX_QUESTIONS) return doComplete(a, qa);

        // Next question is pre-stored — return it instantly (no Claude call)
        String nextQ = qa.stream()
                .filter(q -> Integer.valueOf(nextIdx).equals(q.get("index")))
                .map(q -> (String) q.get("question"))
                .findFirst().orElse(interviewService.getFallbackQuestion(nextIdx, a.getJobTitle()));

        saveQA(a, qa);
        a.setCurrentQuestionIndex(nextIdx);
        assessmentRepository.save(a);

        long remainingSecs = a.getExpiresAt() != null
                ? Math.max(0, ChronoUnit.SECONDS.between(LocalDateTime.now(), a.getExpiresAt()))
                : 0;

        return ResponseEntity.ok(Map.of(
                "isComplete",       false,
                "nextQuestion",     nextQ,
                "questionIndex",    nextIdx,
                "remainingSeconds", remainingSecs));
    }

    @PostMapping("/api/v1/public/assessment/{token}/timeout")
    @Transactional
    public ResponseEntity<Map<String, Object>> timeout(@PathVariable String token) {
        Assessment a = assessmentRepository.findByToken(token).orElse(null);
        if (a == null || a.getStatus() != Enums.AssessmentStatus.IN_PROGRESS)
            return ResponseEntity.ok(Map.of("isComplete", true));
        return doComplete(a, parseQA(a.getQuestionsAnswersJson()));
    }

    @GetMapping("/api/v1/public/assessment/{token}/results")
    public ResponseEntity<Map<String, Object>> publicResults(@PathVariable String token) {
        Assessment a = assessmentRepository.findByToken(token).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(buildResultsMap(a));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> doComplete(Assessment a, List<Map<String, Object>> qa) {
        List<String> skills = parseSkills(a.getRequiredSkillsJson());
        Map<String, Object> eval;
        try {
            eval = interviewService.evaluateInterview(
                    a.getJobTitle(), a.getJobDescription(), skills, qa, a.getCandidateName());
        } catch (Exception e) {
            log.error("Evaluation failed: {}", e.getMessage());
            eval = Map.of("overallScore", 60, "recommendation", "CONSIDER",
                    "summary", "Assessment completed.", "strengths", List.of(), "gaps", List.of());
        }
        a.setStatus(Enums.AssessmentStatus.COMPLETED);
        a.setCompletedAt(LocalDateTime.now());
        a.setCurrentQuestionIndex(MAX_QUESTIONS);
        saveQA(a, qa);
        try { a.setEvaluationJson(objectMapper.writeValueAsString(eval)); } catch (Exception ignored) {}
        assessmentRepository.save(a);
        return ResponseEntity.ok(Map.of("isComplete", true, "evaluation", eval));
    }

    private void forceExpire(Assessment a) {
        a.setStatus(Enums.AssessmentStatus.EXPIRED);
        a.setCompletedAt(LocalDateTime.now());
        assessmentRepository.save(a);
    }

    private Map<String, Object> buildResultsMap(Assessment a) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("token",          a.getToken());
        resp.put("status",         a.getStatus().name());
        resp.put("candidateName",  a.getCandidateName());
        resp.put("candidateEmail", a.getCandidateEmail());
        resp.put("candidatePhone", a.getCandidatePhone());
        resp.put("candidateRole",  a.getCandidateRole());
        resp.put("jobTitle",       a.getJobTitle());
        resp.put("completedAt",    a.getCompletedAt());
        if (a.getQuestionsAnswersJson() != null)
            resp.put("questionsAnswers", parseQA(a.getQuestionsAnswersJson()));
        if (a.getEvaluationJson() != null)
            resp.put("evaluation", parseMap(a.getEvaluationJson()));
        return resp;
    }

    private ResponseEntity<Map<String, Object>> completedResponse() {
        return ResponseEntity.ok(Map.of(
                "expired",   true,
                "submitted", true,
                "message",   "Assessment response already submitted. Thank you!"
        ));
    }

    private Map<String, Object> qaEntry(int idx, String q, String ans, String method) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("index",       idx);
        e.put("question",    q);
        e.put("answer",      ans != null ? ans : "");
        e.put("inputMethod", method != null ? method : "");
        e.put("timestamp",   LocalDateTime.now().toString());
        return e;
    }

    private void saveQA(Assessment a, List<Map<String, Object>> qa) {
        try { a.setQuestionsAnswersJson(objectMapper.writeValueAsString(qa)); } catch (Exception ignored) {}
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

    @SuppressWarnings("unchecked")
    private List<String> safeList(Object obj) {
        return obj instanceof List ? (List<String>) obj : List.of();
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return "[]"; }
    }

    private String buildEmailTemplate(String candidateName, String jobTitle, String path) {
        return "Dear " + candidateName + ",\n\n"
             + "We would like to invite you to complete a skills assessment for the " + jobTitle + " position.\n\n"
             + "Your assessment link:\n{ASSESSMENT_URL}\n\n"
             + "Details:\n"
             + "• 10 AI-generated questions tailored to this role\n"
             + "• 45 minutes time limit\n"
             + "• Answers evaluated by AI\n"
             + "• Link expires after use\n\n"
             + "Your profile information has been pre-filled — you can begin immediately.\n"
             + "Please do not share this link as it is uniquely generated for you.\n\n"
             + "Best regards,\nHiring Team";
    }
}
