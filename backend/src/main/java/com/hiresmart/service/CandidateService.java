package com.hiresmart.service;

import com.hiresmart.dto.CandidateDTO;
import com.hiresmart.dto.PageableResponseDTO;
import com.hiresmart.entity.Candidate;
import com.hiresmart.entity.Organization;
import com.hiresmart.exception.ResourceNotFoundException;
import com.hiresmart.repository.CandidateRepository;
import com.hiresmart.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final OrganizationRepository organizationRepository;

    /**
     * Get paginated list of all candidates for an organization
     */
    public PageableResponseDTO<CandidateDTO> getAllCandidates(UUID organizationId, Pageable pageable) {
        log.info("Fetching all candidates for organization: {}", organizationId);

        verifyOrganizationExists(organizationId);
        Page<Candidate> candidates = candidateRepository.findByOrganizationId(organizationId, pageable);

        return PageableResponseDTO.from(candidates.map(this::convertToDTO));
    }

    /**
     * Search candidates by keyword
     */
    public PageableResponseDTO<CandidateDTO> searchCandidates(UUID organizationId, String searchTerm, Pageable pageable) {
        log.info("Searching candidates in organization {} with term: {}", organizationId, searchTerm);

        verifyOrganizationExists(organizationId);
        Page<Candidate> candidates = candidateRepository.searchCandidates(organizationId, searchTerm, pageable);

        return PageableResponseDTO.from(candidates.map(this::convertToDTO));
    }

    /**
     * Get candidate by ID
     */
    @Transactional(readOnly = true)
    public CandidateDTO getCandidateById(UUID organizationId, UUID candidateId) {
        log.info("Fetching candidate {} from organization {}", candidateId, organizationId);

        Candidate candidate = candidateRepository.findByIdAndOrganizationId(candidateId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + candidateId));

        return convertToDTO(candidate);
    }

    /**
     * Create new candidate
     */
    public CandidateDTO createCandidate(UUID organizationId, CandidateDTO candidateDTO) {
        log.info("Creating new candidate in organization: {}", organizationId);

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with ID: " + organizationId));

        // Check if candidate already exists
        if (candidateRepository.findByEmailAndOrganizationId(candidateDTO.getEmail(), organizationId).isPresent()) {
            throw new IllegalArgumentException("Candidate with email already exists: " + candidateDTO.getEmail());
        }

        Candidate candidate = Candidate.builder()
                .organization(organization)
                .firstName(candidateDTO.getFirstName())
                .lastName(candidateDTO.getLastName())
                .email(candidateDTO.getEmail())
                .phone(candidateDTO.getPhone())
                .location(candidateDTO.getLocation())
                .currentCompany(candidateDTO.getCurrentCompany())
                .currentDesignation(candidateDTO.getCurrentDesignation())
                .totalExperienceYears(candidateDTO.getTotalExperienceYears())
                .summary(candidateDTO.getSummary())
                .build();

        Candidate savedCandidate = candidateRepository.save(candidate);
        log.info("Candidate created successfully with ID: {}", savedCandidate.getId());

        return convertToDTO(savedCandidate);
    }

    /**
     * Update candidate information
     */
    public CandidateDTO updateCandidate(UUID organizationId, UUID candidateId, CandidateDTO candidateDTO) {
        log.info("Updating candidate {} in organization {}", candidateId, organizationId);

        Candidate candidate = candidateRepository.findByIdAndOrganizationId(candidateId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + candidateId));

        // Update fields
        candidate.setFirstName(candidateDTO.getFirstName());
        candidate.setLastName(candidateDTO.getLastName());
        candidate.setPhone(candidateDTO.getPhone());
        candidate.setLocation(candidateDTO.getLocation());
        candidate.setCurrentCompany(candidateDTO.getCurrentCompany());
        candidate.setCurrentDesignation(candidateDTO.getCurrentDesignation());
        candidate.setTotalExperienceYears(candidateDTO.getTotalExperienceYears());
        candidate.setSummary(candidateDTO.getSummary());

        Candidate updatedCandidate = candidateRepository.save(candidate);
        log.info("Candidate updated successfully: {}", candidateId);

        return convertToDTO(updatedCandidate);
    }

    /**
     * Delete candidate
     */
    public void deleteCandidate(UUID organizationId, UUID candidateId) {
        log.info("Deleting candidate {} from organization {}", candidateId, organizationId);

        Candidate candidate = candidateRepository.findByIdAndOrganizationId(candidateId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with ID: " + candidateId));

        candidateRepository.delete(candidate);
        log.info("Candidate deleted successfully: {}", candidateId);
    }

    /**
     * Find candidates by skill
     */
    @Transactional(readOnly = true)
    public PageableResponseDTO<CandidateDTO> findBySkill(UUID organizationId, String skillName, Pageable pageable) {
        log.info("Finding candidates with skill: {} in organization: {}", skillName, organizationId);

        verifyOrganizationExists(organizationId);
        Page<Candidate> candidates = candidateRepository.findByOrganizationAndSkill(organizationId, skillName, pageable);

        return PageableResponseDTO.from(candidates.map(this::convertToDTO));
    }

    /**
     * Find candidates by experience range
     */
    @Transactional(readOnly = true)
    public PageableResponseDTO<CandidateDTO> findByExperienceRange(UUID organizationId, Double minYears, Double maxYears, Pageable pageable) {
        log.info("Finding candidates with experience {} - {} years in organization: {}", minYears, maxYears, organizationId);

        verifyOrganizationExists(organizationId);
        Page<Candidate> candidates = candidateRepository.findByOrganizationAndExperienceRange(organizationId, minYears, maxYears, pageable);

        return PageableResponseDTO.from(candidates.map(this::convertToDTO));
    }

    /**
     * Get candidate count for organization
     */
    @Transactional(readOnly = true)
    public long getCandidateCount(UUID organizationId) {
        verifyOrganizationExists(organizationId);
        return candidateRepository.countByOrganizationId(organizationId);
    }

    /**
     * Helper method to verify organization exists
     */
    private void verifyOrganizationExists(UUID organizationId) {
        if (!organizationRepository.existsById(organizationId)) {
            throw new ResourceNotFoundException("Organization not found with ID: " + organizationId);
        }
    }

    /**
     * Convert Candidate entity to DTO
     */
    private CandidateDTO convertToDTO(Candidate candidate) {
        return CandidateDTO.builder()
                .id(candidate.getId())
                .firstName(candidate.getFirstName())
                .lastName(candidate.getLastName())
                .email(candidate.getEmail())
                .phone(candidate.getPhone())
                .location(candidate.getLocation())
                .currentCompany(candidate.getCurrentCompany())
                .currentDesignation(candidate.getCurrentDesignation())
                .totalExperienceYears(candidate.getTotalExperienceYears())
                .summary(candidate.getSummary())
                .profilePictureUrl(candidate.getProfilePictureUrl())
                .createdAt(candidate.getCreatedAt())
                .updatedAt(candidate.getUpdatedAt())
                .build();
    }
}
