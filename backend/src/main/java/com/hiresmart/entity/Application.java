package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Enums.CandidateStatus status = Enums.CandidateStatus.APPLIED;

    @Column(name = "similarity_score", precision = 5, scale = 2)
    private BigDecimal similarityScore;

    @Column(name = "ai_recommendation")
    private String aiRecommendation;

    @Column(name = "recruiter_notes", columnDefinition = "TEXT")
    private String recruiterNotes;

    @Column(name = "is_shortlisted")
    private Boolean isShortlisted = false;

    @Column(name = "shortlisted_date")
    private LocalDateTime shortlistedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shortlisted_by_user_id")
    private User shortlistedByUser;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "rejection_date")
    private LocalDateTime rejectionDate;

    @Column(name = "applied_date", nullable = false, updatable = false)
    private LocalDateTime appliedDate;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private SimilarityScore similarityScoreDetails;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InterviewSession> interviewSessions;

    @OneToMany(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<WorkflowState> workflowStates;

    @OneToOne(mappedBy = "application", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private HiringDecision hiringDecision;

    @PrePersist
    protected void onCreate() {
        appliedDate = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
