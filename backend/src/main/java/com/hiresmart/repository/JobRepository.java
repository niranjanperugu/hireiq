package com.hiresmart.repository;

import com.hiresmart.entity.Job;
import com.hiresmart.entity.Enums.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {

    Optional<Job> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<Job> findByOrganizationIdAndStatus(UUID organizationId, JobStatus status, Pageable pageable);

    Page<Job> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<Job> findByOrganizationIdAndDepartmentId(UUID organizationId, UUID departmentId, Pageable pageable);

    Page<Job> findByOrganizationIdAndStatusIn(UUID organizationId, List<JobStatus> statuses, Pageable pageable);

    @Query("""
            SELECT j FROM Job j
            WHERE j.organization.id = :orgId
            AND (LOWER(j.title) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(j.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(j.location) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
            """)
    Page<Job> searchJobs(@Param("orgId") UUID organizationId, @Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("""
            SELECT j FROM Job j
            WHERE j.organization.id = :orgId
            AND j.status = :status
            """)
    List<Job> findOpenJobs(@Param("orgId") UUID organizationId, @Param("status") JobStatus status);

    @Query("""
            SELECT j FROM Job j
            WHERE j.organization.id = :orgId
            AND j.status = :status
            AND (:workMode IS NULL OR j.workMode = :workMode)
            """)
    Page<Job> findOpenJobsByWorkMode(
            @Param("orgId") UUID organizationId,
            @Param("status") JobStatus status,
            @Param("workMode") com.hiresmart.entity.Enums.WorkMode workMode,
            Pageable pageable
    );

    long countByOrganizationIdAndStatus(UUID organizationId, JobStatus status);

    long countByOrganizationId(UUID organizationId);
}
