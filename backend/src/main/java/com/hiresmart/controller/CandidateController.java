package com.hiresmart.controller;

import com.hiresmart.dto.ApiResponse;
import com.hiresmart.dto.CandidateDTO;
import com.hiresmart.dto.PageableResponseDTO;
import com.hiresmart.service.CandidateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/candidates")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Candidates", description = "Candidate Management API")
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping
    @Operation(summary = "Get all candidates", description = "Retrieve paginated list of candidates for an organization")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Candidates retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Organization not found")
    })
    public ResponseEntity<ApiResponse<PageableResponseDTO<CandidateDTO>>> getAllCandidates(
            @PathVariable UUID organizationId,
            @Parameter(description = "Page number (0-indexed)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction")
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        PageableResponseDTO<CandidateDTO> candidates = candidateService.getAllCandidates(organizationId, pageable);

        return ResponseEntity.ok(ApiResponse.success(candidates, "Candidates retrieved successfully"));
    }

    @GetMapping("/search")
    @Operation(summary = "Search candidates", description = "Search candidates by keyword")
    public ResponseEntity<ApiResponse<PageableResponseDTO<CandidateDTO>>> searchCandidates(
            @PathVariable UUID organizationId,
            @Parameter(description = "Search keyword")
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<CandidateDTO> candidates = candidateService.searchCandidates(organizationId, query, pageable);

        return ResponseEntity.ok(ApiResponse.success(candidates, "Search completed"));
    }

    @GetMapping("/by-skill")
    @Operation(summary = "Find candidates by skill", description = "Filter candidates by specific skill")
    public ResponseEntity<ApiResponse<PageableResponseDTO<CandidateDTO>>> findBySkill(
            @PathVariable UUID organizationId,
            @Parameter(description = "Skill name")
            @RequestParam String skill,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<CandidateDTO> candidates = candidateService.findBySkill(organizationId, skill, pageable);

        return ResponseEntity.ok(ApiResponse.success(candidates, "Candidates with skill retrieved"));
    }

    @GetMapping("/by-experience")
    @Operation(summary = "Find candidates by experience range", description = "Filter candidates by years of experience")
    public ResponseEntity<ApiResponse<PageableResponseDTO<CandidateDTO>>> findByExperienceRange(
            @PathVariable UUID organizationId,
            @Parameter(description = "Minimum years of experience")
            @RequestParam Double minYears,
            @Parameter(description = "Maximum years of experience")
            @RequestParam Double maxYears,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        PageableResponseDTO<CandidateDTO> candidates = candidateService.findByExperienceRange(organizationId, minYears, maxYears, pageable);

        return ResponseEntity.ok(ApiResponse.success(candidates, "Candidates in experience range retrieved"));
    }

    @GetMapping("/{candidateId}")
    @Operation(summary = "Get candidate by ID", description = "Retrieve detailed information for a specific candidate")
    public ResponseEntity<ApiResponse<CandidateDTO>> getCandidateById(
            @PathVariable UUID organizationId,
            @PathVariable UUID candidateId) {

        CandidateDTO candidate = candidateService.getCandidateById(organizationId, candidateId);

        return ResponseEntity.ok(ApiResponse.success(candidate, "Candidate retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create candidate", description = "Create a new candidate profile")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Candidate created successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid input"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Organization not found")
    })
    public ResponseEntity<ApiResponse<CandidateDTO>> createCandidate(
            @PathVariable UUID organizationId,
            @Valid @RequestBody CandidateDTO candidateDTO) {

        CandidateDTO created = candidateService.createCandidate(organizationId, candidateDTO);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Candidate created successfully"));
    }

    @PutMapping("/{candidateId}")
    @Operation(summary = "Update candidate", description = "Update candidate information")
    public ResponseEntity<ApiResponse<CandidateDTO>> updateCandidate(
            @PathVariable UUID organizationId,
            @PathVariable UUID candidateId,
            @Valid @RequestBody CandidateDTO candidateDTO) {

        CandidateDTO updated = candidateService.updateCandidate(organizationId, candidateId, candidateDTO);

        return ResponseEntity.ok(ApiResponse.success(updated, "Candidate updated successfully"));
    }

    @DeleteMapping("/{candidateId}")
    @Operation(summary = "Delete candidate", description = "Delete a candidate profile")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Candidate deleted successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Candidate not found")
    })
    public ResponseEntity<ApiResponse<Void>> deleteCandidate(
            @PathVariable UUID organizationId,
            @PathVariable UUID candidateId) {

        candidateService.deleteCandidate(organizationId, candidateId);

        return ResponseEntity.ok(ApiResponse.success(null, "Candidate deleted successfully"));
    }

    @GetMapping("/count")
    @Operation(summary = "Get candidate count", description = "Get total number of candidates in organization")
    public ResponseEntity<ApiResponse<Long>> getCandidateCount(
            @PathVariable UUID organizationId) {

        long count = candidateService.getCandidateCount(organizationId);

        return ResponseEntity.ok(ApiResponse.success(count, "Candidate count retrieved"));
    }
}
