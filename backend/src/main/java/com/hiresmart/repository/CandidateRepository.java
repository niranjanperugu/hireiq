package com.hiresmart.repository;

import com.hiresmart.entity.Candidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, UUID> {

    Optional<Candidate> findByEmailAndOrganizationId(String email, UUID organizationId);

    Optional<Candidate> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<Candidate> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<Candidate> findByOrganizationIdAndLocationContainingIgnoreCase(UUID organizationId, String location, Pageable pageable);

    @Query("""
            SELECT DISTINCT c FROM Candidate c
            WHERE c.organization.id = :orgId
            AND (LOWER(c.email) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(c.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(c.currentCompany) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
            """)
    Page<Candidate> searchCandidates(@Param("orgId") UUID organizationId, @Param("searchTerm") String searchTerm, Pageable pageable);

    @Query("""
            SELECT DISTINCT c FROM Candidate c
            JOIN c.skills cs
            WHERE c.organization.id = :orgId
            AND LOWER(cs.skillName) = LOWER(:skillName)
            """)
    Page<Candidate> findByOrganizationAndSkill(@Param("orgId") UUID organizationId, @Param("skillName") String skillName, Pageable pageable);

    @Query("""
            SELECT DISTINCT c FROM Candidate c
            WHERE c.organization.id = :orgId
            AND c.totalExperienceYears >= :minYears
            AND c.totalExperienceYears <= :maxYears
            """)
    Page<Candidate> findByOrganizationAndExperienceRange(
            @Param("orgId") UUID organizationId,
            @Param("minYears") Double minYears,
            @Param("maxYears") Double maxYears,
            Pageable pageable
    );

    long countByOrganizationId(UUID organizationId);

    @Query("SELECT COUNT(c) FROM Candidate c WHERE c.organization.id = :orgId AND c.totalExperienceYears >= :years")
    long countByOrganizationAndExperienceGreaterThan(@Param("orgId") UUID organizationId, @Param("years") Double years);
}
