package com.hiresmart.repository;

import com.hiresmart.entity.ResumeAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, String> {

    /**
     * Find all analyses for a specific job
     */
    Page<ResumeAnalysis> findByOrganizationIdAndJobId(
        String organizationId,
        String jobId,
        Pageable pageable
    );

    /**
     * Find analyses by rating
     */
    Page<ResumeAnalysis> findByOrganizationIdAndRating(
        String organizationId,
        ResumeAnalysis.ATSRating rating,
        Pageable pageable
    );

    /**
     * Find all analyses for an organization
     */
    Page<ResumeAnalysis> findByOrganizationId(
        String organizationId,
        Pageable pageable
    );

    /**
     * Find analysis by candidate email
     */
    Optional<ResumeAnalysis> findByOrganizationIdAndEmailAndJobId(
        String organizationId,
        String email,
        String jobId
    );

    /**
     * Get top candidates by ATS score for a job
     */
    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.organizationId = :organizationId AND ra.jobId = :jobId ORDER BY ra.atsScore DESC")
    List<ResumeAnalysis> findTopCandidatesForJob(
        @Param("organizationId") String organizationId,
        @Param("jobId") String jobId,
        Pageable pageable
    );

    /**
     * Search analyses by name, email, or current role across the org
     */
    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.organizationId = :orgId " +
           "AND ra.source = 'HR_ANALYZED' " +
           "AND (:q = '' OR LOWER(ra.candidateName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(ra.email,'')) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(ra.currentRole,'')) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "ORDER BY ra.analyzedAt DESC")
    Page<ResumeAnalysis> searchByOrganization(@Param("orgId") String organizationId,
                                              @Param("q") String query,
                                              Pageable pageable);

    /**
     * Count analyses by rating for a job
     */
    long countByOrganizationIdAndJobIdAndRating(
        String organizationId,
        String jobId,
        ResumeAnalysis.ATSRating rating
    );

    /**
     * Get average ATS score for a job
     */
    @Query("SELECT AVG(ra.atsScore) FROM ResumeAnalysis ra WHERE ra.organizationId = :organizationId AND ra.jobId = :jobId")
    Double getAverageATSScoreForJob(
        @Param("organizationId") String organizationId,
        @Param("jobId") String jobId
    );

    long countByJobId(String jobId);

    /**
     * Find applied candidates for a specific job (no org check — job is already trusted)
     */
    List<ResumeAnalysis> findByJobIdAndIsApplied(String jobId, boolean isApplied);

    /**
     * Find all applied candidates across an org
     */
    @Query("SELECT ra FROM ResumeAnalysis ra WHERE ra.organizationId = :orgId AND ra.isApplied = true ORDER BY ra.analyzedAt DESC")
    List<ResumeAnalysis> findAppliedByOrganization(@Param("orgId") String organizationId);
}
