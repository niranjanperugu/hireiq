package com.hiresmart.dto;

import com.hiresmart.entity.Enums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationDTO {

    private UUID id;

    @NotNull(message = "Candidate ID is required")
    private UUID candidateId;

    @NotNull(message = "Job ID is required")
    private UUID jobId;

    private Enums.CandidateStatus status;

    @DecimalMin(value = "0.0", message = "Similarity score must be between 0 and 100")
    @DecimalMax(value = "100.0", message = "Similarity score must be between 0 and 100")
    private BigDecimal similarityScore;

    private String aiRecommendation;

    @Size(max = 2000, message = "Recruiter notes must not exceed 2000 characters")
    private String recruiterNotes;

    private Boolean isShortlisted = false;

    private LocalDateTime shortlistedDate;

    @Size(max = 1000, message = "Rejection reason must not exceed 1000 characters")
    private String rejectionReason;

    private LocalDateTime rejectionDate;

    private LocalDateTime appliedDate;

    private LocalDateTime updatedAt;

    // Nested DTOs
    private SimilarityScoreDTO similarityScoreDetails;

    // Read-only fields
    private String candidateName;

    private String candidateEmail;

    private String jobTitle;
}
