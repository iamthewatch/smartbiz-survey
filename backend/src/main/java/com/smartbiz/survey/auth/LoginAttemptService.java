package com.smartbiz.survey.auth;

import com.smartbiz.survey.config.AppProperties;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Простая защита от перебора пароля: после N неудачных попыток логин блокируется на несколько минут.
 */
@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final Duration lockDuration;
    private final ConcurrentHashMap<String, Attempts> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(AppProperties props) {
        this.maxAttempts = props.security().maxLoginAttempts();
        this.lockDuration = Duration.ofMinutes(props.security().lockMinutes());
    }

    public long secondsUntilUnlock(String key) {
        Attempts a = attempts.get(normalize(key));
        if (a == null || a.lockedUntil == null) return 0;
        long left = Duration.between(Instant.now(), a.lockedUntil).toSeconds();
        if (left <= 0) {
            attempts.remove(normalize(key));
            return 0;
        }
        return left;
    }

    public void onFailure(String key) {
        attempts.compute(normalize(key), (k, a) -> {
            Attempts next = a == null ? new Attempts(0, null) : a;
            int count = next.count + 1;
            Instant lock = count >= maxAttempts ? Instant.now().plus(lockDuration) : null;
            return new Attempts(lock != null ? 0 : count, lock);
        });
    }

    public void onSuccess(String key) {
        attempts.remove(normalize(key));
    }

    private String normalize(String key) {
        return key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
    }

    private record Attempts(int count, Instant lockedUntil) {}
}
