package com.smartbiz.survey.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Cors cors, Security security) {

    public record Jwt(String secret, int ttlHours) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Security(int maxLoginAttempts, int lockMinutes) {}
}
