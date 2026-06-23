package com.hiresmart.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.entity.ResumeAnalysis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeAnalysisDTO {
    private String id;
    private String candidateName;
    private String currentRole;
    private String email;
    private String phone;
    private Double atsScore;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private Integer yearsOfExperience;
    private String education;
    private String professionalSummary;
    private String resumeFileName;
    private String resumeS3Url;
    private String rating;
    private LocalDateTime analyzedAt;
    private String jobId;
    private String jobTitle;
    @JsonProperty("isApplied")
    private boolean isApplied;
    private String source;

    public static ResumeAnalysisDTO fromEntity(ResumeAnalysis entity, ObjectMapper mapper) {
        return ResumeAnalysisDTO.builder()
            .id(entity.getId())
            .candidateName(entity.getCandidateName())
            .currentRole(entity.getCurrentRole())
            .email(entity.getEmail())
            .phone(entity.getPhone())
            .atsScore(entity.getAtsScore())
            .matchedSkills(parseJson(entity.getMatchedSkillsJson(), mapper))
            .missingSkills(parseJson(entity.getMissingSkillsJson(), mapper))
            .yearsOfExperience(entity.getYearsOfExperience())
            .education(entity.getEducation())
            .professionalSummary(entity.getProfessionalSummary())
            .resumeFileName(entity.getResumeFileName())
            .resumeS3Url(entity.getResumeS3Url())
            .rating(entity.getRating() != null ? entity.getRating().toString() : null)
            .analyzedAt(entity.getAnalyzedAt())
            .jobId(entity.getJobId())
            .jobTitle(entity.getJobTitle())
            .isApplied(entity.isApplied())
            .source(entity.getSource())
            .build();
    }

    private static List<String> parseJson(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
