package com.hiresmart.controller;

import com.hiresmart.dto.AiChatRequest;
import com.hiresmart.dto.ApiResponse;
import com.hiresmart.service.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Chat", description = "AI-powered recruitment assistant")
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    @Operation(summary = "Ask the AI assistant", description = "Ask questions about candidates, jobs, and pipeline")
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(@RequestBody AiChatRequest request) {
        String answer = aiChatService.ask(request);
        Map<String, Object> data = Map.of(
            "answer",  answer,
            "enabled", aiChatService.isEnabled()
        );
        return ResponseEntity.ok(ApiResponse.success(data, "OK"));
    }

    @GetMapping("/status")
    @Operation(summary = "Check AI status", description = "Returns whether the AI assistant is configured")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> status() {
        return ResponseEntity.ok(ApiResponse.success(
            Map.of("enabled", aiChatService.isEnabled()), "OK"
        ));
    }
}
