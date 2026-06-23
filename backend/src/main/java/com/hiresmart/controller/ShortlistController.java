package com.hiresmart.controller;

import com.hiresmart.entity.ShortlistRecord;
import com.hiresmart.repository.ShortlistRecordRepository;
import com.hiresmart.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/shortlist")
@RequiredArgsConstructor
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
            return ResponseEntity.ok(Map.of(
                    "id",                saved.getId(),
                    "resumeAnalysisId",  saved.getResumeAnalysisId(),
                    "jobId",             saved.getJobId(),
                    "shortlistedBy",     saved.getShortlistedBy(),
                    "shortlistedByRole", saved.getShortlistedByRole(),
                    "method",            saved.getMethod().name(),
                    "atsScore",          saved.getAtsScore(),
                    "notes",             saved.getNotes(),
                    "shortlistedAt",     saved.getShortlistedAt().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
