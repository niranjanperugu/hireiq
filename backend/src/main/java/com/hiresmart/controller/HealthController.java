package com.hiresmart.controller;

import com.hiresmart.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Slf4j
@Tag(name = "Health", description = "Application Health Check API")
public class HealthController {

    @GetMapping
    @Operation(summary = "Health check", description = "Check if application is running")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        log.info("Health check requested");

        Map<String, Object> healthData = new HashMap<>();
        healthData.put("status", "UP");
        healthData.put("service", "HireSmart");
        healthData.put("version", "1.0.0");
        healthData.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(ApiResponse.success(healthData, "Service is healthy"));
    }

    @GetMapping("/status")
    @Operation(summary = "Status check")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        Map<String, Object> statusData = new HashMap<>();
        statusData.put("status", "UP");
        statusData.put("service", "HireSmart");
        statusData.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(ApiResponse.success(statusData, "Service is up"));
    }

    @GetMapping("/ready")
    @Operation(summary = "Readiness check", description = "Check if application is ready to serve requests")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ready() {
        log.info("Readiness check requested");

        Map<String, Object> readinessData = new HashMap<>();
        readinessData.put("ready", true);
        readinessData.put("service", "HireSmart");
        readinessData.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(ApiResponse.success(readinessData, "Service is ready"));
    }
}
