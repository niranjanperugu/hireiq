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
@Table(name = "similarity_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarityScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "skill_match_percentage", precision = 5, scale = 2)
    private BigDecimal skillMatchPercentage;

    @Column(name = "experience_match_percentage", precision = 5, scale = 2)
    private BigDecimal experienceMatchPercentage;

    @Column(name = "education_match_percentage", precision = 5, scale = 2)
    private BigDecimal educationMatchPercentage;

    @Column(name = "industry_relevance_percentage", precision = 5, scale = 2)
    private BigDecimal industryRelevancePercentage;

    @Column(name = "certification_match_percentage", precision = 5, scale = 2)
    private BigDecimal certificationMatchPercentage;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "calculated_at", nullable = false, updatable = false)
    private LocalDateTime calculatedAt;

    @Column(name = "algorithm_version")
    private String algorithmVersion;

    @PrePersist
    protected void onCreate() {
        calculatedAt = LocalDateTime.now();
    }
}
