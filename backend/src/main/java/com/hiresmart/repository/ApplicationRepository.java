package com.hiresmart.repository;

import com.hiresmart.entity.Application;
import com.hiresmart.entity.Enums.CandidateStatus;
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
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    Optional<Application> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<Application> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<Application> findByOrganizationIdAndStatus(UUID organizationId, CandidateStatus status, Pageable pageable);

    Page<Application> findByJobId(UUID jobId, Pageable pageable);

    Page<Application> findByJobIdAndStatus(UUID jobId, CandidateStatus status, Pageable pageable);

    Page<Application> findByCandidateId(UUID candidateId, Pageable pageable);

    Page<Application> findByOrganizationIdAndIsShortlistedTrue(UUID organizationId, Pageable pageable);

    @Query("""
            SELECT a FROM Application a
            WHERE a.organization.id = :orgId
            AND a.status = :status
            ORDER BY a.similarityScore DESC
            """)
    Page<Application> findByOrganizationAndStatusOrderBySimilarityScore(
            @Param("orgId") UUID organizationId,
            @Param("status") CandidateStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT a FROM Application a
            WHERE a.organization.id = :orgId
            AND a.job.id = :jobId
            AND a.similarityScore >= :minScore
            ORDER BY a.similarityScore DESC
            """)
    Page<Application> findHighScoringApplications(
            @Param("orgId") UUID organizationId,
            @Param("jobId") UUID jobId,
            @Param("minScore") Double minScore,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(a) FROM Application a
            WHERE a.organization.id = :orgId
            AND a.status = :status
            """)
    long countByOrganizationAndStatus(@Param("orgId") UUID organizationId, @Param("status") CandidateStatus status);

    @Query("""
            SELECT COUNT(a) FROM Application a
            WHERE a.job.id = :jobId
            AND a.status IN :statuses
            """)
    long countByJobAndStatuses(@Param("jobId") UUID jobId, @Param("statuses") List<CandidateStatus> statuses);

    List<Application> findByJobIdOrderByAppliedDateDesc(UUID jobId);
}
