package com.hiresmart.repository;

import com.hiresmart.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    Optional<Department> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Optional<Department> findByNameAndOrganizationId(String name, UUID organizationId);

    List<Department> findByOrganizationId(UUID organizationId);

    Page<Department> findByOrganizationId(UUID organizationId, Pageable pageable);

    long countByOrganizationId(UUID organizationId);
}
