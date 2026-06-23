package com.hiresmart.controller;

import com.hiresmart.entity.Job;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.entity.Enums.JobStatus;
import com.hiresmart.repository.JobRepository;
import com.hiresmart.repository.ResumeAnalysisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AnalyticsController {

    private final ResumeAnalysisRepository analysisRepo;
    private final JobRepository jobRepo;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam String organizationId) {
        try {
            UUID orgUuid = UUID.fromString(organizationId);

            // ── Fetch raw data ─────────────────────────────────────────────────
            List<ResumeAnalysis> allAnalyses = analysisRepo
                    .findByOrganizationId(organizationId, PageRequest.of(0, 1000)).getContent();
            List<ResumeAnalysis> applied = allAnalyses.stream()
                    .filter(ResumeAnalysis::isApplied).collect(Collectors.toList());
            List<Job> allJobs = jobRepo.findByOrganizationId(orgUuid, PageRequest.of(0, 200)).getContent();

            Map<String, Object> result = new LinkedHashMap<>();

            // ── KPIs ──────────────────────────────────────────────────────────
            double avgScore = applied.stream()
                    .mapToDouble(a -> a.getAtsScore() != null ? a.getAtsScore() : 0)
                    .average().orElse(0.0);
            result.put("totalProfiles",  allAnalyses.size());
            result.put("totalApplied",   applied.size());
            result.put("openJobs",       allJobs.stream().filter(j -> j.getStatus() == JobStatus.OPEN).count());
            result.put("avgAtsScore",    Math.round(avgScore * 10.0) / 10.0);

            // ── ATS distribution ──────────────────────────────────────────────
            result.put("atsDistribution", List.of(
                kv("label", "Excellent (80+)",  "count", applied.stream().filter(a -> score(a) >= 80).count()),
                kv("label", "Good (60–79)",     "count", applied.stream().filter(a -> score(a) >= 60 && score(a) < 80).count()),
                kv("label", "Fair (40–59)",     "count", applied.stream().filter(a -> score(a) >= 40 && score(a) < 60).count()),
                kv("label", "Poor (<40)",       "count", applied.stream().filter(a -> score(a)  < 40).count())
            ));

            // ── Applications by job ───────────────────────────────────────────
            Map<String, Long> byJob = applied.stream()
                    .collect(Collectors.groupingBy(
                        a -> a.getJobTitle() != null ? a.getJobTitle() : "Unknown",
                        Collectors.counting()));
            Map<String, Double> avgByJob = applied.stream()
                    .filter(a -> a.getJobTitle() != null)
                    .collect(Collectors.groupingBy(
                        ResumeAnalysis::getJobTitle,
                        Collectors.averagingDouble(a -> a.getAtsScore() != null ? a.getAtsScore() : 0)));
            List<Map<String, Object>> appsByJob = byJob.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .map(e -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("jobTitle", e.getKey());
                        m.put("count", e.getValue());
                        m.put("avgScore", Math.round((avgByJob.getOrDefault(e.getKey(), 0.0)) * 10.0) / 10.0);
                        return m;
                    }).collect(Collectors.toList());
            result.put("applicationsByJob", appsByJob);

            // ── Job status distribution ───────────────────────────────────────
            Map<JobStatus, Long> statusCount = allJobs.stream()
                    .collect(Collectors.groupingBy(j -> j.getStatus() != null ? j.getStatus() : JobStatus.OPEN, Collectors.counting()));
            result.put("jobStatusDistribution", List.of(
                kv("status", "Open",    "count", statusCount.getOrDefault(JobStatus.OPEN,   0L)),
                kv("status", "Closed",  "count", statusCount.getOrDefault(JobStatus.CLOSED, 0L)),
                kv("status", "Filled",  "count", statusCount.getOrDefault(JobStatus.FILLED, 0L)),
                kv("status", "On Hold", "count", statusCount.getOrDefault(JobStatus.ON_HOLD,0L))
            ));

            // ── Source breakdown ──────────────────────────────────────────────
            long hrCount     = applied.stream().filter(a -> "HR_ANALYZED".equals(a.getSource())).count();
            long publicCount = applied.stream().filter(a -> !"HR_ANALYZED".equals(a.getSource())).count();
            result.put("sourceBreakdown", List.of(
                kv("label", "Applied Externally", "count", publicCount),
                kv("label", "Imported by HR",     "count", hrCount)
            ));

            // ── Experience distribution ───────────────────────────────────────
            result.put("experienceDistribution", List.of(
                kv("label", "Entry (0–2 yrs)",   "count", applied.stream().filter(a -> exp(a) >= 0  && exp(a) <= 2).count()),
                kv("label", "Mid (3–5 yrs)",     "count", applied.stream().filter(a -> exp(a) >= 3  && exp(a) <= 5).count()),
                kv("label", "Senior (6–10 yrs)", "count", applied.stream().filter(a -> exp(a) >= 6  && exp(a) <= 10).count()),
                kv("label", "Expert (10+ yrs)",  "count", applied.stream().filter(a -> exp(a) > 10).count())
            ));

            // ── ATS rating breakdown ──────────────────────────────────────────
            result.put("ratingBreakdown", List.of(
                kv("rating", "Excellent", "count", applied.stream().filter(a -> a.getRating() == ResumeAnalysis.ATSRating.EXCELLENT).count()),
                kv("rating", "Good",      "count", applied.stream().filter(a -> a.getRating() == ResumeAnalysis.ATSRating.GOOD).count()),
                kv("rating", "Fair",      "count", applied.stream().filter(a -> a.getRating() == ResumeAnalysis.ATSRating.FAIR).count()),
                kv("rating", "Poor",      "count", applied.stream().filter(a -> a.getRating() == ResumeAnalysis.ATSRating.POOR).count())
            ));

            // ── Top skills (parse JSON array strings) ─────────────────────────
            Map<String, Long> skillFreq = new TreeMap<>();
            for (ResumeAnalysis a : applied) {
                if (a.getMatchedSkillsJson() == null || a.getMatchedSkillsJson().isBlank()) continue;
                String raw = a.getMatchedSkillsJson().replaceAll("[\\[\\]\"]", "");
                for (String skill : raw.split(",")) {
                    String s = skill.trim();
                    if (!s.isEmpty()) skillFreq.merge(s, 1L, Long::sum);
                }
            }
            List<Map<String, Object>> topSkills = skillFreq.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .limit(10)
                    .map(e -> kv("skill", e.getKey(), "count", e.getValue()))
                    .collect(Collectors.toList());
            result.put("topSkills", topSkills);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private double score(ResumeAnalysis a) { return a.getAtsScore() != null ? a.getAtsScore() : 0; }
    private int    exp(ResumeAnalysis a)   { return a.getYearsOfExperience() != null ? a.getYearsOfExperience() : 0; }

    private Map<String, Object> kv(String k1, Object v1, String k2, Object v2) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(k1, v1); m.put(k2, v2);
        return m;
    }
}
