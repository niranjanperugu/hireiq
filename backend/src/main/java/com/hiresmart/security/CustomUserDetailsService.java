package com.hiresmart.security;

import com.hiresmart.entity.User;
import com.hiresmart.exception.ResourceNotFoundException;
import com.hiresmart.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.debug("Loading user by email: {}", email);

        // Note: In a multi-tenant system, we'd need organization context
        // For now, this is a placeholder that needs organization context

        throw new UsernameNotFoundException("User not found with email: " + email);
    }

    /**
     * Load user by ID (used by JWT filter)
     */
    @Transactional(readOnly = true)
    public User loadUserById(UUID userId) {
        log.debug("Loading user by ID: {}", userId);

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    /**
     * Load user by email and organization ID
     */
    @Transactional(readOnly = true)
    public User loadUserByEmailAndOrganization(String email, UUID organizationId) {
        log.debug("Loading user by email: {} in organization: {}", email, organizationId);

        return userRepository.findByEmailAndOrganizationId(email, organizationId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }
}
