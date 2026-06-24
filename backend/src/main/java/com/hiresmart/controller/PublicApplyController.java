package com.hiresmart.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.dto.ResumeAnalysisDTO;
import com.hiresmart.entity.Job;
import com.hiresmart.entity.JobRequirement;
import com.hiresmart.repository.JobRepository;
import com.hiresmart.repository.ResumeAnalysisRepository;
import com.hiresmart.service.EmailService;
import com.hiresmart.service.ResumeAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Public (unauthenticated) endpoints for candidate job applications.
 * All paths under /api/v1/public/** are permitted in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Slf4j
public class PublicApplyController {

    private final JobRepository jobRepository;
    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    /**
     * Fetch basic job info for the public apply page.
     * GET /api/v1/public/jobs/{jobId}
     */
    @GetMapping("/jobs/{jobId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getJobPublicInfo(@PathVariable String jobId) {
        try {
            Job job = jobRepository.findById(UUID.fromString(jobId))
                .orElse(null);
            if (job == null) {
                return ResponseEntity.notFound().build();
            }

            List<String> skills = job.getRequirements() == null ? List.of()
                : job.getRequirements().stream()
                    .filter(r -> "SKILL".equals(r.getRequirementType()))
                    .map(JobRequirement::getRequirementValue)
                    .collect(Collectors.toList());

            Map<String, Object> info = new LinkedHashMap<>();
            info.put("id",          job.getId().toString());
            info.put("title",       job.getTitle());
            info.put("description", job.getDescription());
            info.put("location",    job.getLocation());
            info.put("workMode",    job.getWorkMode() != null ? job.getWorkMode().toString() : null);
            info.put("employmentType", job.getEmploymentType() != null ? job.getEmploymentType().toString() : null);
            info.put("minExperience", job.getMinExperienceYears());
            info.put("maxExperience", job.getMaxExperienceYears());
            info.put("requiredSkills", skills);
            info.put("status",      job.getStatus() != null ? job.getStatus().toString() : null);
            return ResponseEntity.ok(info);

        } catch (Exception e) {
            log.error("Error fetching public job info for {}: {}", jobId, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Submit a job application with resume.
     * POST /api/v1/public/jobs/{jobId}/apply
     */
    @PostMapping(value = "/jobs/{jobId}/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<Map<String, Object>> applyForJob(
            @PathVariable String jobId,
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam(required = false) String phone,
            @RequestPart("resume") MultipartFile resume) {

        Map<String, Object> response = new LinkedHashMap<>();
        try {
            Job job = jobRepository.findById(UUID.fromString(jobId)).orElse(null);
            if (job == null) {
                response.put("success", false);
                response.put("message", "Job not found");
                return ResponseEntity.badRequest().body(response);
            }

            if (job.getStatus() != null && job.getStatus().toString().equals("CLOSED")) {
                response.put("success", false);
                response.put("message", "This position is no longer accepting applications");
                return ResponseEntity.badRequest().body(response);
            }

            String orgId    = job.getOrganization().getId().toString();
            String title    = job.getTitle();
            String desc     = job.getDescription() != null ? job.getDescription() : "";
            int    minExp   = job.getMinExperienceYears() != null ? job.getMinExperienceYears() : 0;
            int    maxExp   = job.getMaxExperienceYears() != null ? job.getMaxExperienceYears() : 10;

            List<String> skills = job.getRequirements() == null ? List.of()
                : job.getRequirements().stream()
                    .filter(r -> "SKILL".equals(r.getRequirementType()))
                    .map(JobRequirement::getRequirementValue)
                    .collect(Collectors.toList());

            // Duplicate check: same email already applied to this job
            if (resumeAnalysisRepository.existsByOrganizationIdAndEmailIgnoreCaseAndJobId(orgId, email, jobId)) {
                response.put("success",     false);
                response.put("isDuplicate", true);
                response.put("message",     "You have already applied for this position. Duplicate applications are not accepted.");
                return ResponseEntity.badRequest().body(response);
            }

            // Rename file to include candidate name so NLP picks it up
            MultipartFile namedFile = rename(resume, name);

            List<ResumeAnalysisDTO> results = resumeAnalysisService.analyzeResumes(
                orgId, jobId, title, desc, skills,
                List.of(namedFile), minExp, maxExp, true
            );

            if (results.isEmpty()) {
                response.put("success", false);
                response.put("message", "Could not process your resume. Please try a PDF or DOCX file.");
                return ResponseEntity.badRequest().body(response);
            }

            ResumeAnalysisDTO dto = results.get(0);

            // Fire confirmation email — non-blocking, never fails the apply flow
            try {
                emailService.sendApplicationConfirmation(email, name, title);
            } catch (Exception ex) {
                log.warn("Confirmation email failed for {}: {}", email, ex.getMessage());
            }

            response.put("success",  true);
            response.put("message",  "Your application has been submitted successfully!");
            response.put("atsScore", (int) Math.round(dto.getAtsScore()));
            response.put("rating",   dto.getRating());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing application for job {}: {}", jobId, e.getMessage(), e);
            response.put("success", false);
            response.put("message", "An error occurred. Please try again later.");
            return ResponseEntity.status(500).body(response);
        }
    }

    /** Wrap the MultipartFile so its original filename contains the candidate's name. */
    private MultipartFile rename(MultipartFile original, String candidateName) {
        String orig = original.getOriginalFilename();
        String ext  = (orig != null && orig.contains(".")) ? orig.substring(orig.lastIndexOf('.')) : "";
        String safe = candidateName.trim().replaceAll("[^A-Za-z ]", "").trim().replace(' ', '_');
        final String newName = safe.isEmpty() ? orig : (safe + ext);

        return new MultipartFile() {
            @Override public String getName()             { return original.getName(); }
            @Override public String getOriginalFilename() { return newName; }
            @Override public String getContentType()      { return original.getContentType(); }
            @Override public boolean isEmpty()            { return original.isEmpty(); }
            @Override public long getSize()               { return original.getSize(); }
            @Override public byte[] getBytes()    throws java.io.IOException { return original.getBytes(); }
            @Override public java.io.InputStream getInputStream() throws java.io.IOException { return original.getInputStream(); }
            @Override public void transferTo(java.io.File dest) throws java.io.IOException { original.transferTo(dest); }
        };
    }
}
