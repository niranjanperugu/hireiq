package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflow_states")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowState {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false)
    private Enums.CandidateStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private Enums.CandidateStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transitioned_by_user_id")
    private User transitionedByUser;

    private String reason;

    @Column(name = "transitioned_at", nullable = false, updatable = false)
    private LocalDateTime transitionedAt;

    @PrePersist
    protected void onCreate() {
        transitionedAt = LocalDateTime.now();
    }
}
