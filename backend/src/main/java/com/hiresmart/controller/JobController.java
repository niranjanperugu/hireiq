package com.hiresmart.controller;

import com.hiresmart.dto.ApiResponse;
import com.hiresmart.dto.JobDTO;
import com.hiresmart.dto.PageableResponseDTO;
import com.hiresmart.entity.Enums;
import com.hiresmart.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/jobs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Jobs", description = "Job Management API")
public class JobController {

    private final JobService jobService;

    @GetMapping
    @Operation(summary = "Get all jobs", description = "Retrieve paginated list of job postings")
    public ResponseEntity<ApiResponse<PageableResponseDTO<JobDTO>>> getAllJobs(
            @PathVariable UUID organizationId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        PageableResponseDTO<JobDTO> jobs = jobService.getAllJobs(organizationId, search, pageable);

        return ResponseEntity.ok(ApiResponse.success(jobs, "Jobs retrieved successfully"));
    }

    @GetMapping("/by-status")
    @Operation(summary = "Get jobs by status", description = "Filter jobs by status")
    public ResponseEntity<ApiResponse<PageableResponseDTO<JobDTO>>> getJobsByStatus(
            @PathVariable UUID organizationId,
            @Parameter(description = "Job status")
            @RequestParam Enums.JobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<JobDTO> jobs = jobService.getJobsByStatus(organizationId, status, pageable);

        return ResponseEntity.ok(ApiResponse.success(jobs, "Jobs retrieved successfully"));
    }

    @GetMapping("/open")
    @Operation(summary = "Get open jobs", description = "Retrieve all currently open job postings")
    public ResponseEntity<ApiResponse<List<JobDTO>>> getOpenJobs(
            @PathVariable UUID organizationId) {

        List<JobDTO> jobs = jobService.getOpenJobs(organizationId);

        return ResponseEntity.ok(ApiResponse.success(jobs, "Open jobs retrieved successfully"));
    }

    @GetMapping("/search")
    @Operation(summary = "Search jobs", description = "Search jobs by keyword")
    public ResponseEntity<ApiResponse<PageableResponseDTO<JobDTO>>> searchJobs(
            @PathVariable UUID organizationId,
            @Parameter(description = "Search keyword")
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<JobDTO> jobs = jobService.searchJobs(organizationId, query, pageable);

        return ResponseEntity.ok(ApiResponse.success(jobs, "Search completed"));
    }

    @GetMapping("/by-department/{departmentId}")
    @Operation(summary = "Get jobs by department", description = "Retrieve jobs in a specific department")
    public ResponseEntity<ApiResponse<PageableResponseDTO<JobDTO>>> getJobsByDepartment(
            @PathVariable UUID organizationId,
            @PathVariable UUID departmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<JobDTO> jobs = jobService.getJobsByDepartment(organizationId, departmentId, pageable);

        return ResponseEntity.ok(ApiResponse.success(jobs, "Department jobs retrieved successfully"));
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Get job by ID", description = "Retrieve detailed information for a specific job")
    public ResponseEntity<ApiResponse<JobDTO>> getJobById(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {

        JobDTO job = jobService.getJobById(organizationId, jobId);

        return ResponseEntity.ok(ApiResponse.success(job, "Job retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create job", description = "Create a new job posting")
    public ResponseEntity<ApiResponse<JobDTO>> createJob(
            @PathVariable UUID organizationId,
            @Valid @RequestBody JobDTO jobDTO) {

        JobDTO created = jobService.createJob(organizationId, jobDTO);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Job created successfully"));
    }

    @PutMapping("/{jobId}")
    @Operation(summary = "Update job", description = "Update job details")
    public ResponseEntity<ApiResponse<JobDTO>> updateJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId,
            @Valid @RequestBody JobDTO jobDTO) {

        JobDTO updated = jobService.updateJob(organizationId, jobId, jobDTO);

        return ResponseEntity.ok(ApiResponse.success(updated, "Job updated successfully"));
    }

    @PutMapping("/{jobId}/publish")
    @Operation(summary = "Publish job", description = "Publish job and change status to OPEN")
    public ResponseEntity<ApiResponse<JobDTO>> publishJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {

        JobDTO published = jobService.publishJob(organizationId, jobId);

        return ResponseEntity.ok(ApiResponse.success(published, "Job published successfully"));
    }

    @PutMapping("/{jobId}/close")
    @Operation(summary = "Close job", description = "Close job posting")
    public ResponseEntity<ApiResponse<JobDTO>> closeJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {

        JobDTO closed = jobService.closeJob(organizationId, jobId);

        return ResponseEntity.ok(ApiResponse.success(closed, "Job closed successfully"));
    }

    @DeleteMapping("/{jobId}")
    @Operation(summary = "Delete job", description = "Delete a job posting")
    public ResponseEntity<ApiResponse<Void>> deleteJob(
            @PathVariable UUID organizationId,
            @PathVariable UUID jobId) {

        jobService.deleteJob(organizationId, jobId);

        return ResponseEntity.ok(ApiResponse.success(null, "Job deleted successfully"));
    }

    @GetMapping("/count")
    @Operation(summary = "Get job count", description = "Get total number of jobs in organization")
    public ResponseEntity<ApiResponse<Long>> getJobCount(
            @PathVariable UUID organizationId) {

        long count = jobService.getJobCount(organizationId);

        return ResponseEntity.ok(ApiResponse.success(count, "Job count retrieved"));
    }
}
