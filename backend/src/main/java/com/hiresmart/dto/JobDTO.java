package com.hiresmart.dto;

import com.hiresmart.entity.Enums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobDTO {

    private UUID id;

    private String jobCode;

    private UUID departmentId;

    private String departmentName;

    @NotBlank(message = "Job title is required")
    @Size(min = 3, max = 255, message = "Job title must be between 3 and 255 characters")
    private String title;

    @NotBlank(message = "Job description is required")
    @Size(min = 20, max = 5000, message = "Job description must be between 20 and 5000 characters")
    private String description;

    @Min(value = 0, message = "Minimum experience years cannot be negative")
    @Max(value = 70, message = "Minimum experience years cannot exceed 70")
    private Integer minExperienceYears;

    @Min(value = 0, message = "Maximum experience years cannot be negative")
    @Max(value = 70, message = "Maximum experience years cannot exceed 70")
    private Integer maxExperienceYears;

    @NotNull(message = "Employment type is required")
    private Enums.EmploymentType employmentType;

    @NotNull(message = "Work mode is required")
    private Enums.WorkMode workMode;

    @DecimalMin(value = "0.0", message = "Salary minimum must be non-negative")
    private BigDecimal salaryMin;

    @DecimalMin(value = "0.0", message = "Salary maximum must be non-negative")
    private BigDecimal salaryMax;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Salary currency must be a valid ISO 4217 code (3 uppercase letters)")
    private String salaryCurrency = "USD";

    @NotBlank(message = "Location is required")
    @Size(min = 2, max = 255, message = "Location must be between 2 and 255 characters")
    private String location;

    private Enums.JobStatus status = Enums.JobStatus.DRAFT;

    private boolean featured;

    private boolean published;

    private LocalDateTime deadline;

    private LocalDateTime postedDate;

    private LocalDateTime closedDate;

    private int applicationCount;

    // Job requirements
    private List<JobRequirementDTO> requirements;

    @AssertTrue(message = "Maximum experience years must be greater than or equal to minimum")
    private boolean isValidExperienceRange() {
        if (minExperienceYears != null && maxExperienceYears != null) {
            return maxExperienceYears >= minExperienceYears;
        }
        return true;
    }

    @AssertTrue(message = "Salary maximum must be greater than or equal to minimum")
    private boolean isValidSalaryRange() {
        if (salaryMin != null && salaryMax != null) {
            return salaryMax.compareTo(salaryMin) >= 0;
        }
        return true;
    }
}
