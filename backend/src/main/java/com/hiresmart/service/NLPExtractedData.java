package com.hiresmart.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NLPExtractedData {
    private String candidateName;
    private String email;
    private String phone;
    private String currentRole;
    private Integer yearsOfExperience;
    private String education;
    private List<String> extractedSkills;
    private List<WorkEntry> workHistory;
    private String structuredContext;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WorkEntry {
        private String title;
        private String company;
        private String dateRange;
        private int durationYears;
    }
}
