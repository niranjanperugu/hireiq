package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "feedback_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackForm {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_session_id", nullable = false)
    private InterviewSession interviewSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_user_id")
    private User evaluatorUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_rating", nullable = false)
    private Enums.FeedbackRating overallRating;

    @Column(name = "technical_rating", precision = 3, scale = 1)
    private BigDecimal technicalRating;

    @Column(name = "communication_rating", precision = 3, scale = 1)
    private BigDecimal communicationRating;

    @Column(name = "cultural_fit_rating", precision = 3, scale = 1)
    private BigDecimal culturalFitRating;

    @Column(name = "problem_solving_rating", precision = 3, scale = 1)
    private BigDecimal problemSolvingRating;

    @Column(name = "feedback_notes", columnDefinition = "TEXT")
    private String feedbackNotes;

    private String recommendation;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
