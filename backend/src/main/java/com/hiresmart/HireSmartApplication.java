package com.hiresmart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * HireSmart Application Entry Point
 *
 * Enterprise AI-Powered Recruitment and Interview Management Platform
 *
 * Features:
 * - AI Resume Parsing and Candidate Screening
 * - Interview Orchestration and Scheduling
 * - Real-time Interview Management
 * - Analytics and Reporting
 * - Multi-tenant Architecture
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class HireSmartApplication {

    public static void main(String[] args) {
        SpringApplication.run(HireSmartApplication.class, args);
    }
}
