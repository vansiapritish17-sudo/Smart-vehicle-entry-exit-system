package com.svems.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * The time source for recorded movements. A bean rather than LocalDateTime.now()
 * so tests can fix the time and check stay durations exactly.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        // The default zone is set from SVEMS_TIMEZONE at startup (see SvemsApplication).
        return Clock.systemDefaultZone();
    }
}
