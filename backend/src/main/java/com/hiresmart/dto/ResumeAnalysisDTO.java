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
import java.util.Map;

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

    /** Extracted projects: [{name, description, responsibilities[], technologies[], duration}] */
    private List<Map<String, Object>> projects;

    /** Per-component score breakdown: {skillMatch, experienceFit, jdRelevance, education, resumeQuality, total} */
    private Map<String, Object> scoreBreakdown;

    /** Top strengths for this specific role */
    private List<String> keyStrengths;

    /** Gaps / areas for improvement */
    private List<String> areasForImprovement;

    /** STRONG_FIT | GOOD_FIT | POTENTIAL_FIT | NOT_FIT */
    private String hiringRecommendation;

    /** True when the same email+jobId already exists; analysis was skipped */
    @JsonProperty("isDuplicate")
    private boolean isDuplicate;

    /** Narrative explanation of JD alignment */
    private String jdAlignment;

    /** Complete structured ATS analysis from Claude (job_description_match, required_skills_match, etc.) */
    private Map<String, Object> fullAnalysis;

    public static ResumeAnalysisDTO fromEntity(ResumeAnalysis entity, ObjectMapper mapper) {
        return ResumeAnalysisDTO.builder()
            .id(entity.getId())
            .candidateName(entity.getCandidateName())
            .currentRole(entity.getCurrentRole())
            .email(entity.getEmail())
            .phone(entity.getPhone())
            .atsScore(entity.getAtsScore())
            .matchedSkills(parseStringList(entity.getMatchedSkillsJson(), mapper))
            .missingSkills(parseStringList(entity.getMissingSkillsJson(), mapper))
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
            .projects(parseProjectList(entity.getProjectsJson(), mapper))
            .scoreBreakdown(parseMap(entity.getScoreBreakdownJson(), mapper))
            .keyStrengths(parseStringList(entity.getKeyStrengthsJson(), mapper))
            .areasForImprovement(parseStringList(entity.getAreasForImprovementJson(), mapper))
            .hiringRecommendation(entity.getHiringRecommendation())
            .jdAlignment(entity.getJdAlignment())
            .fullAnalysis(parseMap(entity.getFullAnalysisJson(), mapper))
            .build();
    }

    private static List<String> parseStringList(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parseProjectList(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return mapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> parseMap(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
