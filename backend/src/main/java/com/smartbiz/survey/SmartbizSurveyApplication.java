package com.smartbiz.survey;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SmartbizSurveyApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartbizSurveyApplication.class, args);
    }
}
