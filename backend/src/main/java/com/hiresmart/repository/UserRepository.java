package com.hiresmart.repository;

import com.hiresmart.entity.User;
import com.hiresmart.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndOrganizationId(String email, UUID organizationId);

    Optional<User> findTopByEmailOrderByCreatedAtAsc(String email);

    Optional<User> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<User> findByOrganizationIdAndIsActiveTrue(UUID organizationId, Pageable pageable);

    Page<User> findByOrganizationIdAndRoleAndIsActiveTrue(UUID organizationId, UserRole role, Pageable pageable);

    Page<User> findByOrganizationIdAndDepartmentIdAndIsActiveTrue(UUID organizationId, UUID departmentId, Pageable pageable);

    List<User> findByOrganizationIdAndRole(UUID organizationId, UserRole role);

    @Query("SELECT u FROM User u WHERE u.organization.id = :orgId AND u.role IN :roles AND u.isActive = true")
    List<User> findByOrganizationAndRoles(@Param("orgId") UUID organizationId, @Param("roles") List<UserRole> roles);

    @Query(value = """
            SELECT u.* FROM users u
            WHERE u.org_id = :orgId
            AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(u.first_name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                 OR LOWER(u.last_name) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
            """, nativeQuery = true)
    Page<User> searchUsers(@Param("orgId") UUID organizationId, @Param("searchTerm") String searchTerm, Pageable pageable);

    long countByOrganizationIdAndRole(UUID organizationId, UserRole role);
}
