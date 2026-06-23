package com.hiresmart.service;

import com.hiresmart.dto.AuthDTO;
import com.hiresmart.entity.Organization;
import com.hiresmart.entity.User;
import com.hiresmart.entity.UserRole;
import com.hiresmart.repository.OrganizationRepository;
import com.hiresmart.repository.UserRepository;
import com.hiresmart.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public AuthDTO.AuthResponse login(String email, String password) {
        User user = userRepository.findTopByEmailOrderByCreatedAtAsc(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is deactivated");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        log.info("User logged in: {}", email);

        return AuthDTO.AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .organizationId(user.getOrganization().getId().toString())
                .user(AuthDTO.UserInfo.builder()
                        .id(user.getId().toString())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    @Transactional
    public void register(String firstName, String lastName, String email, String password) {
        if (userRepository.findTopByEmailOrderByCreatedAtAsc(email).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        Organization org = Organization.builder()
                .name(firstName + " " + lastName + "'s Organization")
                .email(email)
                .build();
        org = organizationRepository.save(org);

        User user = User.builder()
                .organization(org)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .role(UserRole.HR_ADMINISTRATOR)
                .isActive(true)
                .build();
        userRepository.save(user);

        log.info("New user registered: {} with org: {}", email, org.getId());
    }
}
