package com.hiresmart.controller;

import com.hiresmart.dto.ResumeAnalysisDTO;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.repository.ResumeAnalysisRepository;
import com.hiresmart.service.ResumeAnalysisService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/resume-analysis")
@RequiredArgsConstructor
@PreAuthorize("hasRole('HR_ADMINISTRATOR') or hasRole('RECRUITER') or hasRole('HIRING_MANAGER')")
public class ResumeAnalysisController {

    private final ResumeAnalysisService service;
    private final ResumeAnalysisRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * Analyze multiple resumes against job requirements
     * POST /api/v1/resume-analysis/analyze
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeResumes(
        @RequestParam String organizationId,
        @RequestParam String jobId,
        @RequestParam(required = false, defaultValue = "") String jobTitle,
        @RequestParam(required = false, defaultValue = "") String jobDescription,
        @RequestParam(required = false) Integer minExperience,
        @RequestParam(required = false) Integer maxExperience,
        @RequestParam(required = false) List<String> requiredSkills,
        @RequestPart("files") List<MultipartFile> resumeFiles
    ) {
        try {
            // Validate input
            if (resumeFiles == null || resumeFiles.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "At least one resume file is required"));
            }

            if (requiredSkills == null) requiredSkills = List.of();

            // Analyze resumes
            List<ResumeAnalysisDTO> results = service.analyzeResumes(
                organizationId,
                jobId,
                jobTitle,
                jobDescription,
                requiredSkills,
                resumeFiles,
                minExperience,
                maxExperience
            );

            // Calculate statistics
            Map<String, Object> response = new HashMap<>();
            response.put("results", results);
            response.put("totalAnalyzed", results.size());
            response.put("averageScore", results.stream()
                .mapToDouble(ResumeAnalysisDTO::getAtsScore)
                .average()
                .orElse(0.0));
            response.put("excellentMatches", results.stream()
                .filter(r -> r.getAtsScore() >= 80)
                .count());
            response.put("goodMatches", results.stream()
                .filter(r -> r.getAtsScore() >= 60 && r.getAtsScore() < 80)
                .count());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error analyzing resumes: " + e.getMessage()));
        }
    }

    /**
     * Search/list all analyses for an organization with optional text filter
     * GET /api/v1/resume-analysis/org?organizationId=...&q=...&page=...&size=...
     */
    @GetMapping("/org")
    public ResponseEntity<?> searchByOrganization(
        @RequestParam String organizationId,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            return ResponseEntity.ok(service.searchByOrganization(organizationId, q, pageable));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get a single analysis by ID
     * GET /api/v1/resume-analysis/{analysisId}
     */
    @GetMapping("/{analysisId}")
    public ResponseEntity<?> getById(
        @RequestParam String organizationId,
        @PathVariable String analysisId
    ) {
        try {
            return ResponseEntity.ok(service.getById(organizationId, analysisId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update an analysis record (correct extracted data)
     * PUT /api/v1/resume-analysis/{analysisId}
     */
    @PutMapping("/{analysisId}")
    public ResponseEntity<?> updateAnalysis(
        @RequestParam String organizationId,
        @PathVariable String analysisId,
        @RequestBody Map<String, Object> updates
    ) {
        try {
            return ResponseEntity.ok(service.updateAnalysis(organizationId, analysisId, updates));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all analyses for a specific job
     * GET /api/v1/resume-analysis/job/{jobId}
     */
    @GetMapping("/job/{jobId}")
    public ResponseEntity<Page<ResumeAnalysisDTO>> getAnalysesByJob(
        @RequestParam String organizationId,
        @PathVariable String jobId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ResumeAnalysisDTO> result = service.getAnalysesByJob(organizationId, jobId, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * Get top candidates for a job
     * GET /api/v1/resume-analysis/job/{jobId}/top
     */
    @GetMapping("/job/{jobId}/top")
    public ResponseEntity<List<ResumeAnalysisDTO>> getTopCandidates(
        @RequestParam String organizationId,
        @PathVariable String jobId,
        @RequestParam(defaultValue = "10") int limit
    ) {
        List<ResumeAnalysisDTO> result = service.getTopCandidates(organizationId, jobId, limit);
        return ResponseEntity.ok(result);
    }

    /**
     * Delete analysis record
     * DELETE /api/v1/resume-analysis/{analysisId}
     */
    @DeleteMapping("/{analysisId}")
    public ResponseEntity<Map<String, String>> deleteAnalysis(
        @RequestParam String organizationId,
        @PathVariable String analysisId
    ) {
        try {
            service.deleteAnalysis(organizationId, analysisId);
            return ResponseEntity.ok(Map.of("message", "Analysis deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Mark a batch of resume-analysis records as imported (isApplied = true).
     * Called when HR explicitly clicks "Import Selected" in the analysis popup.
     * PATCH /api/v1/resume-analysis/bulk-import
     */
    @PatchMapping("/bulk-import")
    public ResponseEntity<?> bulkImport(@RequestBody Map<String, Object> body) {
        try {
            @SuppressWarnings("unchecked")
            List<String> ids = (List<String>) body.get("ids");
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "ids list is required"));
            }
            List<String> updated = new java.util.ArrayList<>();
            for (String id : ids) {
                repository.findById(id).ifPresent(ra -> {
                    ra.setApplied(true);
                    repository.save(ra);
                    updated.add(id);
                });
            }
            return ResponseEntity.ok(Map.of("imported", updated.size(), "ids", updated));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get applied candidates for a specific job
     * GET /api/v1/resume-analysis/job/{jobId}/applied
     */
    @GetMapping("/job/{jobId}/applied")
    public ResponseEntity<List<ResumeAnalysisDTO>> getAppliedCandidates(
        @PathVariable String jobId
    ) {
        try {
            List<ResumeAnalysis> applied = repository.findByJobIdAndIsApplied(jobId, true);
            List<ResumeAnalysisDTO> dtos = applied.stream()
                .map(e -> ResumeAnalysisDTO.fromEntity(e, objectMapper))
                .toList();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get ALL applied candidates for an organization in a single query.
     * Each row is one application (job+candidate pair).  Each row also carries
     * otherApplications — the count of other jobs the same email applied for,
     * so the UI can show "also applied to N other jobs" without extra calls.
     *
     * GET /api/v1/resume-analysis/org/{organizationId}/applied
     */
    @GetMapping("/org/{organizationId}/applied")
    public ResponseEntity<?> getAllAppliedForOrg(
        @PathVariable String organizationId
    ) {
        try {
            List<ResumeAnalysis> all = repository.findAppliedByOrganization(organizationId);

            // Build a count map: email (lower) -> number of applications
            java.util.Map<String, Long> countByEmail = all.stream()
                .filter(ra -> ra.getEmail() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                    ra -> ra.getEmail().toLowerCase(),
                    java.util.stream.Collectors.counting()
                ));

            // Build a job-titles map: email -> list of other job titles
            java.util.Map<String, List<String>> jobsByEmail = all.stream()
                .filter(ra -> ra.getEmail() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                    ra -> ra.getEmail().toLowerCase(),
                    java.util.stream.Collectors.mapping(ResumeAnalysis::getJobTitle,
                        java.util.stream.Collectors.toList())
                ));

            List<java.util.Map<String, Object>> rows = all.stream().map(ra -> {
                ResumeAnalysisDTO dto = ResumeAnalysisDTO.fromEntity(ra, objectMapper);
                java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("id",                 dto.getId());
                row.put("candidateName",      dto.getCandidateName());
                row.put("currentRole",        dto.getCurrentRole());
                row.put("email",              dto.getEmail());
                row.put("phone",              dto.getPhone());
                row.put("atsScore",           dto.getAtsScore());
                row.put("matchedSkills",      dto.getMatchedSkills());
                row.put("missingSkills",      dto.getMissingSkills());
                row.put("yearsOfExperience",  dto.getYearsOfExperience());
                row.put("education",          dto.getEducation());
                row.put("professionalSummary",dto.getProfessionalSummary());
                row.put("resumeFileName",     dto.getResumeFileName());
                row.put("resumeS3Url",        dto.getResumeS3Url());
                row.put("rating",             dto.getRating());
                row.put("analyzedAt",         dto.getAnalyzedAt());
                row.put("jobId",              dto.getJobId());
                row.put("jobTitle",           dto.getJobTitle());
                row.put("isApplied",          dto.isApplied());
                row.put("source",             dto.getSource());
                // Enriched: how many jobs this candidate applied for + which ones
                String emailKey = ra.getEmail() != null ? ra.getEmail().toLowerCase() : "";
                long totalApps = countByEmail.getOrDefault(emailKey, 1L);
                row.put("totalApplications",  totalApps);
                row.put("otherApplications",  totalApps - 1);
                List<String> allJobs = jobsByEmail.getOrDefault(emailKey, List.of());
                row.put("appliedJobTitles",   allJobs);
                return row;
            }).toList();

            return ResponseEntity.ok(java.util.Map.of(
                "data",              rows,
                "total",             rows.size(),
                "uniqueCandidates",  countByEmail.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("error", e.getMessage() != null ? e.getMessage() : "Internal error"));
        }
    }

    /**
     * Download resume from S3
     * GET /api/v1/resume-analysis/{analysisId}/download
     */
    @GetMapping("/{analysisId}/download")
    public ResponseEntity<String> getResumeUrl(
        @RequestParam String organizationId,
        @PathVariable String analysisId
    ) {
        try {
            // In production, retrieve from database and generate signed URL
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body("Resume not found");
        }
    }
}
