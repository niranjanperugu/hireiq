package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysisRequest {
    @NotBlank(message = "Job ID is required")
    private String jobId;

    @NotBlank(message = "Job title is required")
    private String jobTitle;

    private String jobDescription;

    @NotBlank(message = "Employment type is required")
    private String employmentType;

    @NotBlank(message = "Work mode is required")
    private String workMode;

    private Integer minExperience;
    private Integer maxExperience;

    private Double minSalary;
    private Double maxSalary;

    @NotNull(message = "Required skills list cannot be null")
    private List<String> requiredSkills;

    // Files are handled separately via multipart upload
}
