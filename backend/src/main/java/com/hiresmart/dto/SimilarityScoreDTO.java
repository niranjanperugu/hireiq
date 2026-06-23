package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarityScoreDTO {

    private UUID id;

    private UUID applicationId;

    private BigDecimal skillMatchPercentage;

    private BigDecimal experienceMatchPercentage;

    private BigDecimal educationMatchPercentage;

    private BigDecimal industryRelevancePercentage;

    private BigDecimal certificationMatchPercentage;

    private BigDecimal overallScore;

    private LocalDateTime calculatedAt;

    private String algorithmVersion;
}
