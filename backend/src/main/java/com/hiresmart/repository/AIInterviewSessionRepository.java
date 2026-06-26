package com.hiresmart.repository;

import com.hiresmart.entity.AIInterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AIInterviewSessionRepository extends JpaRepository<AIInterviewSession, String> {

    Optional<AIInterviewSession> findByToken(String token);

    List<AIInterviewSession> findByOrganizationIdAndJobIdOrderByCreatedAtDesc(
            String organizationId, String jobId);
}
