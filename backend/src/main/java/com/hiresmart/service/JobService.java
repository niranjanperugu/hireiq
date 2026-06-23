package com.hiresmart.service;

import com.hiresmart.dto.JobDTO;
import com.hiresmart.dto.PageableResponseDTO;
import com.hiresmart.entity.Job;
import com.hiresmart.entity.Department;
import com.hiresmart.entity.Enums;
import com.hiresmart.entity.Organization;
import com.hiresmart.exception.ResourceNotFoundException;
import com.hiresmart.repository.JobRepository;
import com.hiresmart.repository.DepartmentRepository;
import com.hiresmart.repository.OrganizationRepository;
import com.hiresmart.repository.ResumeAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final JobRepository jobRepository;
    private final DepartmentRepository departmentRepository;
    private final OrganizationRepository organizationRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;

    /**
     * Get paginated list of all jobs for an organization, with optional search
     */
    public PageableResponseDTO<JobDTO> getAllJobs(UUID organizationId, String search, Pageable pageable) {
        log.info("Fetching all jobs for organization: {}", organizationId);
        verifyOrganizationExists(organizationId);
        Page<Job> jobs = (search != null && !search.isBlank())
            ? jobRepository.searchJobs(organizationId, search, pageable)
            : jobRepository.findByOrganizationId(organizationId, pageable);
        return PageableResponseDTO.from(jobs.map(this::convertToDTO));
    }

    /** Keep old signature for internal callers */
    public PageableResponseDTO<JobDTO> getAllJobs(UUID organizationId, Pageable pageable) {
        return getAllJobs(organizationId, null, pageable);
    }

    /**
     * Get jobs filtered by status
     */
    public PageableResponseDTO<JobDTO> getJobsByStatus(UUID organizationId, Enums.JobStatus status, Pageable pageable) {
        log.info("Fetching jobs with status {} for organization: {}", status, organizationId);

        verifyOrganizationExists(organizationId);
        Page<Job> jobs = jobRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);

        return PageableResponseDTO.from(jobs.map(this::convertToDTO));
    }

    /**
     * Search jobs by keyword
     */
    public PageableResponseDTO<JobDTO> searchJobs(UUID organizationId, String searchTerm, Pageable pageable) {
        log.info("Searching jobs in organization {} with term: {}", organizationId, searchTerm);

        verifyOrganizationExists(organizationId);
        Page<Job> jobs = jobRepository.searchJobs(organizationId, searchTerm, pageable);

        return PageableResponseDTO.from(jobs.map(this::convertToDTO));
    }

    /**
     * Get job by ID
     */
    @Transactional(readOnly = true)
    public JobDTO getJobById(UUID organizationId, UUID jobId) {
        log.info("Fetching job {} from organization {}", jobId, organizationId);

        Job job = jobRepository.findByIdAndOrganizationId(jobId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        return convertToDTO(job);
    }

    /**
     * Create new job posting
     */
    public JobDTO createJob(UUID organizationId, JobDTO jobDTO) {
        log.info("Creating new job in organization: {}", organizationId);

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", organizationId));

        Department department;
        if (jobDTO.getDepartmentId() != null) {
            department = departmentRepository.findByIdAndOrganizationId(jobDTO.getDepartmentId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", jobDTO.getDepartmentId()));
        } else {
            department = departmentRepository.findByOrganizationId(organizationId)
                    .stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "organization", organizationId));
        }

        long seq = jobRepository.countByOrganizationId(organizationId) + 1;
        String code = "JOB-1-" + String.format("%05d", seq);

        Job job = Job.builder()
                .organization(organization)
                .department(department)
                .jobCode(code)
                .title(jobDTO.getTitle())
                .description(jobDTO.getDescription())
                .featured(jobDTO.isFeatured())
                .deadline(jobDTO.getDeadline())
                .minExperienceYears(jobDTO.getMinExperienceYears())
                .maxExperienceYears(jobDTO.getMaxExperienceYears())
                .employmentType(jobDTO.getEmploymentType())
                .workMode(jobDTO.getWorkMode())
                .salaryMin(jobDTO.getSalaryMin())
                .salaryMax(jobDTO.getSalaryMax())
                .salaryCurrency(jobDTO.getSalaryCurrency() != null ? jobDTO.getSalaryCurrency() : "USD")
                .location(jobDTO.getLocation())
                .status(Enums.JobStatus.DRAFT)
                .build();

        Job savedJob = jobRepository.save(job);
        log.info("Job created successfully with ID: {}", savedJob.getId());

        return convertToDTO(savedJob);
    }

    /**
     * Update job
     */
    public JobDTO updateJob(UUID organizationId, UUID jobId, JobDTO jobDTO) {
        log.info("Updating job {} in organization {}", jobId, organizationId);

        Job job = jobRepository.findByIdAndOrganizationId(jobId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        job.setTitle(jobDTO.getTitle());
        job.setDescription(jobDTO.getDescription());
        job.setFeatured(jobDTO.isFeatured());
        job.setDeadline(jobDTO.getDeadline());
        job.setMinExperienceYears(jobDTO.getMinExperienceYears());
        job.setMaxExperienceYears(jobDTO.getMaxExperienceYears());
        job.setEmploymentType(jobDTO.getEmploymentType());
        job.setWorkMode(jobDTO.getWorkMode());
        job.setSalaryMin(jobDTO.getSalaryMin());
        job.setSalaryMax(jobDTO.getSalaryMax());
        job.setLocation(jobDTO.getLocation());

        Job updatedJob = jobRepository.save(job);
        log.info("Job updated successfully: {}", jobId);

        return convertToDTO(updatedJob);
    }

    /**
     * Publish job (change status to OPEN)
     */
    public JobDTO publishJob(UUID organizationId, UUID jobId) {
        log.info("Publishing job {} in organization {}", jobId, organizationId);

        Job job = jobRepository.findByIdAndOrganizationId(jobId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        if (job.getStatus() != Enums.JobStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft jobs can be published");
        }

        job.setStatus(Enums.JobStatus.OPEN);
        job.setPostedDate(LocalDateTime.now());

        Job publishedJob = jobRepository.save(job);
        log.info("Job published successfully: {}", jobId);

        return convertToDTO(publishedJob);
    }

    /**
     * Close job (change status to CLOSED)
     */
    public JobDTO closeJob(UUID organizationId, UUID jobId) {
        log.info("Closing job {} in organization {}", jobId, organizationId);

        Job job = jobRepository.findByIdAndOrganizationId(jobId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        job.setStatus(Enums.JobStatus.CLOSED);
        job.setClosedDate(LocalDateTime.now());

        Job closedJob = jobRepository.save(job);
        log.info("Job closed successfully: {}", jobId);

        return convertToDTO(closedJob);
    }

    /**
     * Delete job
     */
    public void deleteJob(UUID organizationId, UUID jobId) {
        log.info("Deleting job {} from organization {}", jobId, organizationId);

        Job job = jobRepository.findByIdAndOrganizationId(jobId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        jobRepository.delete(job);
        log.info("Job deleted successfully: {}", jobId);
    }

    /**
     * Get open jobs for organization
     */
    @Transactional(readOnly = true)
    public List<JobDTO> getOpenJobs(UUID organizationId) {
        verifyOrganizationExists(organizationId);
        return jobRepository.findOpenJobs(organizationId, com.hiresmart.entity.Enums.JobStatus.OPEN).stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Get jobs by department
     */
    @Transactional(readOnly = true)
    public PageableResponseDTO<JobDTO> getJobsByDepartment(UUID organizationId, UUID departmentId, Pageable pageable) {
        log.info("Fetching jobs for department {} in organization {}", departmentId, organizationId);

        verifyOrganizationExists(organizationId);
        Page<Job> jobs = jobRepository.findByOrganizationIdAndDepartmentId(organizationId, departmentId, pageable);

        return PageableResponseDTO.from(jobs.map(this::convertToDTO));
    }

    /**
     * Get job count for organization
     */
    @Transactional(readOnly = true)
    public long getJobCount(UUID organizationId) {
        verifyOrganizationExists(organizationId);
        return jobRepository.countByOrganizationId(organizationId);
    }

    /**
     * Helper method to verify organization exists
     */
    private void verifyOrganizationExists(UUID organizationId) {
        if (!organizationRepository.existsById(organizationId)) {
            throw new ResourceNotFoundException("Organization", "id", organizationId);
        }
    }

    /**
     * Convert Job entity to DTO
     */
    private JobDTO convertToDTO(Job job) {
        int appCount = (int) resumeAnalysisRepository.countByJobId(job.getId().toString());
        return JobDTO.builder()
                .id(job.getId())
                .jobCode(job.getJobCode())
                .departmentId(job.getDepartment().getId())
                .departmentName(job.getDepartment().getName())
                .title(job.getTitle())
                .description(job.getDescription())
                .featured(job.isFeatured())
                .published(job.getStatus() == Enums.JobStatus.OPEN)
                .deadline(job.getDeadline())
                .minExperienceYears(job.getMinExperienceYears())
                .maxExperienceYears(job.getMaxExperienceYears())
                .employmentType(job.getEmploymentType())
                .workMode(job.getWorkMode())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .salaryCurrency(job.getSalaryCurrency())
                .location(job.getLocation())
                .status(job.getStatus())
                .applicationCount(appCount)
                .postedDate(job.getPostedDate())
                .closedDate(job.getClosedDate())
                .build();
    }
}
