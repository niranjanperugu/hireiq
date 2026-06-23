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
@Table(name = "evaluation_criteria")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_type", nullable = false)
    private Enums.InterviewType interviewType;

    @Column(name = "criteria_name", nullable = false)
    private String criteriaName;

    private String description;

    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore = new BigDecimal("100");

    @Column(name = "weight_percentage", precision = 5, scale = 2)
    private BigDecimal weightPercentage = new BigDecimal("1");

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
