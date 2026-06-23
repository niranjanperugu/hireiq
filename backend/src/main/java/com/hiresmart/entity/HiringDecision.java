package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hiring_decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HiringDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(nullable = false)
    private String decision; // 'HIRE', 'NO_HIRE', 'PENDING'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by_user_id", nullable = false)
    private User decidedByUser;

    @Column(name = "decision_notes", columnDefinition = "TEXT")
    private String decisionNotes;

    @Column(name = "final_feedback_summary", columnDefinition = "TEXT")
    private String finalFeedbackSummary;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private LocalDateTime decidedAt;

    @PrePersist
    protected void onCreate() {
        decidedAt = LocalDateTime.now();
    }
}
