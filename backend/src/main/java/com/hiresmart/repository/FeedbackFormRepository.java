package com.hiresmart.repository;

import com.hiresmart.entity.FeedbackForm;
import com.hiresmart.entity.Enums.FeedbackRating;
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
public interface FeedbackFormRepository extends JpaRepository<FeedbackForm, UUID> {

    Optional<FeedbackForm> findByInterviewSessionId(UUID interviewSessionId);

    List<FeedbackForm> findByInterviewSession_Application_CandidateId(UUID candidateId);

    @Query("""
            SELECT f FROM FeedbackForm f
            WHERE f.interviewSession.application.id = :applicationId
            ORDER BY f.submittedAt DESC
            """)
    List<FeedbackForm> findByApplicationIdOrderBySubmittedDateDesc(@Param("applicationId") UUID applicationId);

    @Query("""
            SELECT COUNT(f) FROM FeedbackForm f
            WHERE f.interviewSession.application.id = :applicationId
            AND f.overallRating = :rating
            """)
    long countByApplicationAndRating(
            @Param("applicationId") UUID applicationId,
            @Param("rating") FeedbackRating rating
    );

    @Query("""
            SELECT AVG(f.technicalRating) FROM FeedbackForm f
            WHERE f.interviewSession.application.id = :applicationId
            """)
    Double getAverageTechnicalRating(@Param("applicationId") UUID applicationId);

    @Query("""
            SELECT AVG(f.communicationRating) FROM FeedbackForm f
            WHERE f.interviewSession.application.id = :applicationId
            """)
    Double getAverageCommunicationRating(@Param("applicationId") UUID applicationId);

    @Query("""
            SELECT AVG(f.culturalFitRating) FROM FeedbackForm f
            WHERE f.interviewSession.application.id = :applicationId
            """)
    Double getAverageCulturalFitRating(@Param("applicationId") UUID applicationId);

    @Query("""
            SELECT COUNT(f) FROM FeedbackForm f
            WHERE f.interviewSession.application.job.id = :jobId
            AND f.overallRating IN :positiveRatings
            """)
    long countPositiveFeedbackForJob(
            @Param("jobId") UUID jobId,
            @Param("positiveRatings") List<FeedbackRating> positiveRatings
    );
}
