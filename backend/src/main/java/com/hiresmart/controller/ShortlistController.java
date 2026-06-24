package com.hiresmart.controller;

import com.hiresmart.entity.ShortlistRecord;
import com.hiresmart.repository.ShortlistRecordRepository;
import com.hiresmart.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/shortlist")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('HR_ADMINISTRATOR') or hasRole('RECRUITER') or hasRole('HIRING_MANAGER')")
public class ShortlistController {

    private final ShortlistRecordRepository repository;

    /**
     * Record a shortlist action for a candidate.
     * POST /api/v1/shortlist
     */
    @PostMapping
    public ResponseEntity<?> shortlistCandidate(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String resumeAnalysisId = (String) body.get("resumeAnalysisId");
            String jobId            = (String) body.get("jobId");
            String organizationId   = body.containsKey("organizationId")
                    ? (String) body.get("organizationId")
                    : principal.getOrganizationId().toString();

            // Only one shortlist record per candidate+job
            repository.findByResumeAnalysisIdAndJobId(resumeAnalysisId, jobId)
                    .ifPresent(existing -> repository.delete(existing));

            String methodStr = (String) body.getOrDefault("method", "MANUAL");
            ShortlistRecord.ShortlistMethod method;
            try {
                method = ShortlistRecord.ShortlistMethod.valueOf(methodStr);
            } catch (IllegalArgumentException e) {
                method = ShortlistRecord.ShortlistMethod.MANUAL;
            }

            Double atsScore = body.get("atsScore") instanceof Number n ? n.doubleValue() : null;

            ShortlistRecord record = ShortlistRecord.builder()
                    .resumeAnalysisId(resumeAnalysisId)
                    .jobId(jobId)
                    .organizationId(organizationId)
                    .candidateName((String) body.getOrDefault("candidateName", "Unknown"))
                    .candidateEmail((String) body.get("candidateEmail"))
                    .shortlistedBy(principal.getUsername())     // email as fallback
                    .shortlistedByRole(principal.getRole())
                    .shortlistedByEmail(principal.getUsername())
                    .method(method)
                    .atsScore(atsScore)
                    .notes((String) body.get("notes"))
                    .build();

            // Enrich display name from request body (frontend passes full name)
            if (body.containsKey("shortlistedBy")) {
                record.setShortlistedBy((String) body.get("shortlistedBy"));
            }

            ShortlistRecord saved = repository.save(record);
            Map<String, Object> result = new HashMap<>();
            result.put("id",                saved.getId());
            result.put("resumeAnalysisId",  saved.getResumeAnalysisId());
            result.put("jobId",             saved.getJobId());
            result.put("shortlistedBy",     saved.getShortlistedBy());
            result.put("shortlistedByRole", saved.getShortlistedByRole() != null ? saved.getShortlistedByRole() : "");
            result.put("method",            saved.getMethod().name());
            result.put("atsScore",          saved.getAtsScore());
            result.put("notes",             saved.getNotes() != null ? saved.getNotes() : "");
            result.put("shortlistedAt",     saved.getShortlistedAt().toString());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Shortlist save failed", e);
            Map<String, Object> err = new HashMap<>();
            err.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /**
     * Get shortlist record for a specific candidate + job.
     * GET /api/v1/shortlist/candidate/{resumeAnalysisId}?jobId=...
     */
    @GetMapping("/candidate/{resumeAnalysisId}")
    public ResponseEntity<?> getForCandidate(
            @PathVariable String resumeAnalysisId,
            @RequestParam String jobId
    ) {
        return repository.findByResumeAnalysisIdAndJobId(resumeAnalysisId, jobId)
                .map(r -> ResponseEntity.ok(Map.of(
                        "id",                r.getId(),
                        "resumeAnalysisId",  r.getResumeAnalysisId(),
                        "jobId",             r.getJobId(),
                        "shortlistedBy",     r.getShortlistedBy(),
                        "shortlistedByRole", r.getShortlistedByRole() != null ? r.getShortlistedByRole() : "",
                        "method",            r.getMethod().name(),
                        "atsScore",          r.getAtsScore(),
                        "notes",             r.getNotes() != null ? r.getNotes() : "",
                        "shortlistedAt",     r.getShortlistedAt().toString()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List all shortlisted candidates for a job.
     * GET /api/v1/shortlist/job/{jobId}
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ShortlistRecord>> getByJob(@PathVariable String jobId) {
        return ResponseEntity.ok(repository.findByJobIdOrderByShortlistedAtDesc(jobId));
    }
}
