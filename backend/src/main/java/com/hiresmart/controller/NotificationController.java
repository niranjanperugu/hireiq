package com.hiresmart.controller;

import com.hiresmart.entity.EmailLog;
import com.hiresmart.repository.EmailLogRepository;
import com.hiresmart.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final EmailService emailService;
    private final EmailLogRepository emailLogRepository;

    @PostMapping("/shortlist")
    public ResponseEntity<Map<String, Object>> sendShortlist(@RequestBody Map<String, String> body) {
        return sendEmail(body, "shortlist");
    }

    @PostMapping("/reject")
    public ResponseEntity<Map<String, Object>> sendReject(@RequestBody Map<String, String> body) {
        return sendEmail(body, "reject");
    }

    @PostMapping("/interview")
    public ResponseEntity<Map<String, Object>> sendInterview(@RequestBody Map<String, String> body) {
        return sendEmail(body, "interview");
    }

    @PostMapping("/offer")
    public ResponseEntity<Map<String, Object>> sendOffer(@RequestBody Map<String, String> body) {
        return sendEmail(body, "offer");
    }

    @GetMapping("/logs")
    public ResponseEntity<List<EmailLog>> getLogs() {
        return ResponseEntity.ok(emailLogRepository.findAllByOrderBySentAtDesc());
    }

    private ResponseEntity<Map<String, Object>> sendEmail(Map<String, String> body, String type) {
        try {
            String email    = body.getOrDefault("email", "");
            String name     = body.getOrDefault("name", "Candidate");
            String jobTitle = body.getOrDefault("jobTitle", "the position");

            switch (type) {
                case "shortlist"  -> emailService.sendShortlistNotification(email, name, jobTitle);
                case "reject"     -> emailService.sendRejectionNotification(email, name, jobTitle);
                case "offer"      -> emailService.sendOfferLetter(email, name, jobTitle);
                case "interview"  -> emailService.sendInterviewInvitation(
                    email, name, jobTitle,
                    body.getOrDefault("dateTime", ""),
                    body.getOrDefault("mode", "VIDEO"),
                    body.getOrDefault("meetingLink", "")
                );
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Notification error type={}: {}", type, e.getMessage());
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
