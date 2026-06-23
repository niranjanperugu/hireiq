package com.hiresmart.controller;

import com.hiresmart.dto.ApiResponse;
import com.hiresmart.dto.AuthDTO;
import com.hiresmart.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "Auth API")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate with email and password")
    public ResponseEntity<ApiResponse<AuthDTO.AuthResponse>> login(
            @RequestBody AuthDTO.LoginRequest request) {
        try {
            AuthDTO.AuthResponse response = authService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.unauthorized(e.getMessage()));
        }
    }

    @PostMapping("/register")
    @Operation(summary = "Register", description = "Create a new account")
    public ResponseEntity<ApiResponse<Void>> register(
            @RequestBody AuthDTO.RegisterRequest request) {
        try {
            authService.register(
                    request.getFirstName(),
                    request.getLastName(),
                    request.getEmail(),
                    request.getPassword()
            );
            return ResponseEntity.ok(ApiResponse.success(null, "Registration successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.badRequest(e.getMessage()));
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }
}
