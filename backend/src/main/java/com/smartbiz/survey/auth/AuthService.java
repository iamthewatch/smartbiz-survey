package com.smartbiz.survey.auth;

import com.smartbiz.survey.auth.AuthDtos.*;
import com.smartbiz.survey.common.ApiException;
import com.smartbiz.survey.security.JwtService;
import com.smartbiz.survey.user.AppUser;
import com.smartbiz.survey.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService attempts;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        long wait = attempts.secondsUntilUnlock(req.username());
        if (wait > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Слишком много попыток входа. Повторите через " + wait + " сек.");
        }
        AppUser user = users.findByUsernameIgnoreCase(req.username().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            attempts.onFailure(req.username());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Неверный логин или пароль");
        }
        attempts.onSuccess(req.username());
        var issued = jwtService.issue(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(issued.token(), issued.expiresAt(), toInfo(user));
    }

    @Transactional(readOnly = true)
    public UserInfo me(Long userId) {
        return toInfo(users.findById(userId).orElseThrow(() -> ApiException.notFound("Пользователь")));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        AppUser user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Пользователь"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_PASSWORD", "Текущий пароль указан неверно");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    }

    private UserInfo toInfo(AppUser u) {
        return new UserInfo(u.getId(), u.getUsername(), u.getFullName(), u.getRole());
    }
}
