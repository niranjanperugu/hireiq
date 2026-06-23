package com.hiresmart.repository;

import com.hiresmart.entity.InterviewSession;
import com.hiresmart.entity.Enums.InterviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {

    Optional<InterviewSession> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<InterviewSession> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<InterviewSession> findByOrganizationIdAndStatus(UUID organizationId, InterviewStatus status, Pageable pageable);

    Page<InterviewSession> findByApplicationId(UUID applicationId, Pageable pageable);

    Page<InterviewSession> findByPanelId(UUID panelId, Pageable pageable);

    @Query("""
            SELECT i FROM InterviewSession i
            WHERE i.organization.id = :orgId
            AND i.scheduledAt BETWEEN :startDate AND :endDate
            ORDER BY i.scheduledAt ASC
            """)
    List<InterviewSession> findInterviewsBetweenDates(
            @Param("orgId") UUID organizationId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("""
            SELECT i FROM InterviewSession i
            WHERE i.panel.id IN (
                SELECT ip.panel.id FROM InterviewPanelMember ip
                WHERE ip.user.id = :userId
            )
            AND i.status = :status
            AND i.scheduledAt >= CURRENT_TIMESTAMP
            ORDER BY i.scheduledAt ASC
            """)
    List<InterviewSession> findUpcomingInterviewsForUser(
            @Param("userId") UUID userId,
            @Param("status") InterviewStatus status
    );

    @Query("""
            SELECT i FROM InterviewSession i
            WHERE i.organization.id = :orgId
            AND i.status = :status
            AND i.scheduledAt >= CURRENT_TIMESTAMP
            ORDER BY i.scheduledAt ASC
            """)
    Page<InterviewSession> findUpcomingInterviews(
            @Param("orgId") UUID organizationId,
            @Param("status") InterviewStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(i) FROM InterviewSession i
            WHERE i.organization.id = :orgId
            AND i.status = :status
            AND i.scheduledAt >= CURRENT_TIMESTAMP
            """)
    long countUpcomingInterviews(@Param("orgId") UUID organizationId, @Param("status") InterviewStatus status);

    @Query("""
            SELECT COUNT(i) FROM InterviewSession i
            WHERE i.organization.id = :orgId
            AND i.scheduledAt >= :startOfDay
            AND i.scheduledAt < :endOfDay
            """)
    long countTodayInterviews(@Param("orgId") UUID organizationId,
                               @Param("startOfDay") LocalDateTime startOfDay,
                               @Param("endOfDay") LocalDateTime endOfDay);

    List<InterviewSession> findByApplicationIdOrderByScheduledAtDesc(UUID applicationId);
}
