package com.hiresmart.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresmart.dto.ResumeAnalysisDTO;
import com.hiresmart.entity.ResumeAnalysis;
import com.hiresmart.repository.ResumeAnalysisRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Processes a single resume file in its own database transaction.
 * Runs inside a virtual thread spawned by ResumeAnalysisService.
 * REQUIRES_NEW ensures each file commits independently — one failure
 * does not roll back the rest of the batch.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeFileProcessor {

    private final ResumeAnalysisRepository repository;
    private final S3Service s3Service;
    private final ObjectMapper objectMapper;
    private final DocumentTextExtractorService documentExtractor;
    private final ClaudeResumeAnalysisService claudeService;
    private final NLPResumePreprocessorService nlpPreprocessor;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<ResumeAnalysisDTO> process(
            MultipartFile file,
            String organizationId,
            String jobId,
            String jobTitle,
            String jobDescription,
            List<String> requiredSkills,
            Integer minExperience,
            Integer maxExperience,
            boolean isApplied,
            Set<String> batchEmails) {

        String filename = file.getOriginalFilename();
        try {
            // ── Step 1: Extract plain text ─────────────────────────────────────
            String resumeText = documentExtractor.extractText(file);
            if (resumeText == null || resumeText.isBlank()) {
                log.warn("[{}] Could not extract text, skipping", filename);
                return Optional.empty();
            }

            // ── Step 2: NLP pre-processing ─────────────────────────────────────
            NLPExtractedData nlpData = null;
            try {
                nlpData = nlpPreprocessor.extract(resumeText);
                if (nlpData.getCandidateName() == null) {
                    String filenameName = nlpPreprocessor.nameFromFilename(filename);
                    if (filenameName != null) {
                        nlpData = NLPExtractedData.builder()
                                .candidateName(filenameName)
                                .email(nlpData.getEmail())
                                .phone(nlpData.getPhone())
                                .currentRole(nlpData.getCurrentRole())
                                .yearsOfExperience(nlpData.getYearsOfExperience())
                                .education(nlpData.getEducation())
                                .extractedSkills(nlpData.getExtractedSkills())
                                .workHistory(nlpData.getWorkHistory())
                                .structuredContext(nlpData.getStructuredContext())
                                .build();
                    }
                }
                log.info("[{}] NLP: name={}, exp={}yr, skills={}",
                        filename, nlpData.getCandidateName(),
                        nlpData.getYearsOfExperience(), nlpData.getExtractedSkills().size());
            } catch (Exception e) {
                log.warn("[{}] NLP failed: {}", filename, e.getMessage());
            }

            // ── Step 3: Duplicate detection (DB + same-batch set) ─────────────
            if (nlpData != null && nlpData.getEmail() != null && !nlpData.getEmail().isBlank()) {
                String email = nlpData.getEmail().toLowerCase();
                // batchEmails.add() returns false if already present → duplicate in this batch
                if (!batchEmails.add(email)) {
                    log.info("[{}] Duplicate in batch: email={}", filename, email);
                    return Optional.of(duplicateDTO(nlpData, jobId, jobTitle, file));
                }
                if (repository.existsByOrganizationIdAndEmailIgnoreCaseAndJobId(
                        organizationId, email, jobId)) {
                    log.info("[{}] Duplicate in DB: email={}", filename, email);
                    return Optional.of(duplicateDTO(nlpData, jobId, jobTitle, file));
                }
            }

            // ── Step 4: AI analysis (Claude) or NLP rule-based fallback ────────
            String filenameFallback = nlpPreprocessor.nameFromFilename(filename);
            ResumeAnalysisService.ResumeData resumeData;
            try {
                if (claudeService.isEnabled()) {
                    Map<String, Object> aiResult = claudeService.analyzeResume(
                            resumeText, jobTitle, requiredSkills,
                            minExperience, maxExperience, jobDescription, nlpData);
                    resumeData = ResumeAnalysisService.mapAiResult(aiResult, requiredSkills, nlpData, filenameFallback, resumeText);
                    log.info("[{}] AI+NLP analysis complete", filename);
                } else {
                    log.info("[{}] Claude disabled, using NLP fallback", filename);
                    resumeData = ResumeAnalysisService.parseFallback(resumeText, requiredSkills, nlpData, filenameFallback);
                    resumeData.setAtsScore(ResumeAnalysisService.calcATSScore(resumeData, requiredSkills, minExperience, maxExperience));
                }
            } catch (Exception e) {
                log.warn("[{}] Claude failed, using NLP fallback: {}", filename, e.getMessage());
                resumeData = ResumeAnalysisService.parseFallback(resumeText, requiredSkills, nlpData, filenameFallback);
                resumeData.setAtsScore(ResumeAnalysisService.calcATSScore(resumeData, requiredSkills, minExperience, maxExperience));
            }

            // ── Step 5: Upload to S3 ───────────────────────────────────────────
            String s3Url = null;
            try {
                String s3Key = String.format("resumes/%s/%s/%d-%s",
                        organizationId, jobId, System.currentTimeMillis(), filename);
                s3Url = s3Service.uploadFile(file, s3Key);
            } catch (Exception e) {
                log.warn("[{}] S3 upload failed: {}", filename, e.getMessage());
            }

            // ── Step 6: Persist ────────────────────────────────────────────────
            ResumeAnalysis entity = ResumeAnalysis.builder()
                    .organizationId(organizationId)
                    .jobId(jobId)
                    .jobTitle(jobTitle)
                    .candidateName(resumeData.getCandidateName())
                    .currentRole(resumeData.getCurrentRole())
                    .email(resumeData.getEmail())
                    .phone(resumeData.getPhone())
                    .atsScore(resumeData.getAtsScore())
                    .matchedSkillsJson(toJson(resumeData.getMatchedSkills()))
                    .missingSkillsJson(toJson(resumeData.getMissingSkills()))
                    .yearsOfExperience(resumeData.getYearsOfExperience())
                    .education(resumeData.getEducation())
                    .professionalSummary(resumeData.getProfessionalSummary())
                    .resumeFileName(filename)
                    .resumeS3Url(s3Url)
                    .rating(getRating(resumeData.getAtsScore()))
                    .analyzedAt(LocalDateTime.now())
                    .isApplied(isApplied)
                    .source(isApplied ? "PUBLIC_APPLY" : "HR_ANALYZED")
                    .projectsJson(toJsonObject(resumeData.getProjects()))
                    .scoreBreakdownJson(toJsonObject(resumeData.getScoreBreakdown()))
                    .keyStrengthsJson(toJson(resumeData.getKeyStrengths()))
                    .areasForImprovementJson(toJson(resumeData.getAreasForImprovement()))
                    .hiringRecommendation(resumeData.getHiringRecommendation())
                    .jdAlignment(resumeData.getJdAlignment())
                    .fullAnalysisJson(toJsonObject(resumeData.getFullAnalysis()))
                    .build();

            return Optional.of(ResumeAnalysisDTO.fromEntity(repository.save(entity), objectMapper));

        } catch (Exception e) {
            log.error("[{}] Unexpected error during processing", filename, e);
            return Optional.empty();
        }
    }

    private ResumeAnalysisDTO duplicateDTO(NLPExtractedData nlp, String jobId,
                                            String jobTitle, MultipartFile file) {
        return ResumeAnalysisDTO.builder()
                .candidateName(nlp.getCandidateName() != null
                        ? nlp.getCandidateName() : file.getOriginalFilename())
                .email(nlp.getEmail())
                .jobId(jobId)
                .jobTitle(jobTitle)
                .isDuplicate(true)
                .rating("DUPLICATE")
                .atsScore(0.0)
                .matchedSkills(List.of())
                .missingSkills(List.of())
                .build();
    }

    private ResumeAnalysis.ATSRating getRating(double score) {
        if (score >= 80) return ResumeAnalysis.ATSRating.EXCELLENT;
        if (score >= 60) return ResumeAnalysis.ATSRating.GOOD;
        if (score >= 40) return ResumeAnalysis.ATSRating.FAIR;
        return ResumeAnalysis.ATSRating.POOR;
    }

    private String toJson(List<String> list) {
        try {
            return objectMapper.writeValueAsString(list != null ? list : List.of());
        } catch (Exception e) {
            return "[]";
        }
    }

    private String toJsonObject(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }
}
