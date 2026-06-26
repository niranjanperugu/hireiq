package com.hiresmart.repository;

import com.hiresmart.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, String> {

    Optional<Assessment> findByToken(String token);

    List<Assessment> findByOrganizationIdAndJobIdAndCandidateIdOrderByCreatedAtDesc(
            String organizationId, String jobId, String candidateId);

    List<Assessment> findByOrganizationIdAndJobIdOrderByCreatedAtDesc(
            String organizationId, String jobId);
}
