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
public class FeedbackFormDTO {

    private UUID id;

    @NotNull(message = "Interview session ID is required")
    private UUID interviewSessionId;

    @NotNull(message = "Overall rating is required")
    private Enums.FeedbackRating overallRating;

    @DecimalMin(value = "1.0", message = "Technical rating must be between 1.0 and 5.0")
    @DecimalMax(value = "5.0", message = "Technical rating must be between 1.0 and 5.0")
    private BigDecimal technicalRating;

    @DecimalMin(value = "1.0", message = "Communication rating must be between 1.0 and 5.0")
    @DecimalMax(value = "5.0", message = "Communication rating must be between 1.0 and 5.0")
    private BigDecimal communicationRating;

    @DecimalMin(value = "1.0", message = "Cultural fit rating must be between 1.0 and 5.0")
    @DecimalMax(value = "5.0", message = "Cultural fit rating must be between 1.0 and 5.0")
    private BigDecimal culturalFitRating;

    @DecimalMin(value = "1.0", message = "Problem solving rating must be between 1.0 and 5.0")
    @DecimalMax(value = "5.0", message = "Problem solving rating must be between 1.0 and 5.0")
    private BigDecimal problemSolvingRating;

    @NotBlank(message = "Feedback notes are required")
    @Size(min = 10, max = 2000, message = "Feedback notes must be between 10 and 2000 characters")
    private String feedbackNotes;

    @Pattern(regexp = "^(STRONG_HIRE|HIRE|NEUTRAL|NO_HIRE|STRONG_NO_HIRE)$", message = "Recommendation must be a valid rating")
    private String recommendation;

    private LocalDateTime submittedAt;

    private LocalDateTime updatedAt;

    // Read-only fields
    private String evaluatorName;

    private String candidateName;

    private String jobTitle;
}
