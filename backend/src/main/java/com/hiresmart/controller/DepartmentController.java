package com.hiresmart.controller;

import com.hiresmart.dto.ApiResponse;
import com.hiresmart.entity.Department;
import com.hiresmart.repository.DepartmentRepository;
import com.hiresmart.repository.OrganizationRepository;
import com.hiresmart.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final OrganizationRepository organizationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDepartments(
            @PathVariable UUID organizationId) {

        if (!organizationRepository.existsById(organizationId)) {
            throw new ResourceNotFoundException("Organization", "id", organizationId);
        }

        List<Map<String, Object>> depts = departmentRepository.findByOrganizationId(organizationId)
                .stream()
                .map(d -> Map.<String, Object>of(
                        "id",   d.getId(),
                        "name", d.getName()
                ))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(depts, "Departments retrieved"));
    }
}
