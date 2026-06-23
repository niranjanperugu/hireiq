package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateExperienceDTO {

    private UUID id;

    @NotBlank(message = "Company name is required")
    @Size(min = 2, max = 255, message = "Company name must be between 2 and 255 characters")
    private String companyName;

    @NotBlank(message = "Job title is required")
    @Size(min = 2, max = 255, message = "Job title must be between 2 and 255 characters")
    private String jobTitle;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotNull(message = "Start date is required")
    @PastOrPresent(message = "Start date must be in the past or present")
    private LocalDate startDate;

    @PastOrPresent(message = "End date must be in the past or present")
    private LocalDate endDate;

    private Boolean isCurrent = false;

    @AssertTrue(message = "If current, end date must be null")
    private boolean isValidCurrent() {
        if (isCurrent) {
            return endDate == null;
        }
        return endDate == null || endDate.isAfter(startDate);
    }
}
