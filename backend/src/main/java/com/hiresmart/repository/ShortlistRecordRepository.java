package com.hiresmart.repository;

import com.hiresmart.entity.ShortlistRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShortlistRecordRepository extends JpaRepository<ShortlistRecord, String> {
    Optional<ShortlistRecord> findByResumeAnalysisIdAndJobId(String resumeAnalysisId, String jobId);
    List<ShortlistRecord> findByJobIdOrderByShortlistedAtDesc(String jobId);
    List<ShortlistRecord> findByOrganizationIdOrderByShortlistedAtDesc(String organizationId);
}
