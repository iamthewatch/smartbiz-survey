package com.smartbiz.survey.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank(message = "Введите логин") String username,
            @NotBlank(message = "Введите пароль") String password) {}

    public record LoginResponse(String token, Instant expiresAt, UserInfo user) {}

    public record UserInfo(Long id, String username, String fullName, String role) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Введите текущий пароль") String currentPassword,
            @NotBlank @Size(min = 6, max = 100, message = "Пароль должен быть от 6 до 100 символов") String newPassword) {}
}
