package com.hiresmart.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_rounds")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewRound {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @Column(nullable = false)
    private String name;

    @Column(name = "sequence_number", nullable = false)
    private Integer sequenceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false)
    private Enums.InterviewType interviewType;

    private String description;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InterviewSession> interviewSessions;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
