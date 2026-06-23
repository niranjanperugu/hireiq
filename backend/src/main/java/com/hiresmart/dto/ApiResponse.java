package com.hiresmart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private int code;

    private String message;

    private T data;

    private LocalDateTime timestamp;

    @Builder.Default
    private boolean success = true;

    private String errorCode;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .code(200)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .success(true)
                .build();
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Success");
    }

    public static <T> ApiResponse<T> error(int code, String message, String errorCode) {
        return ApiResponse.<T>builder()
                .code(code)
                .message(message)
                .timestamp(LocalDateTime.now())
                .success(false)
                .errorCode(errorCode)
                .build();
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return error(code, message, null);
    }

    public static <T> ApiResponse<T> badRequest(String message) {
        return error(400, message, "BAD_REQUEST");
    }

    public static <T> ApiResponse<T> unauthorized(String message) {
        return error(401, message, "UNAUTHORIZED");
    }

    public static <T> ApiResponse<T> forbidden(String message) {
        return error(403, message, "FORBIDDEN");
    }

    public static <T> ApiResponse<T> notFound(String message) {
        return error(404, message, "NOT_FOUND");
    }

    public static <T> ApiResponse<T> internalError(String message) {
        return error(500, message, "INTERNAL_ERROR");
    }
}
