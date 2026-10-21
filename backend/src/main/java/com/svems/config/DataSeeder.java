package com.svems.config;

import com.svems.service.ConfigurationService;
import com.svems.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once on startup. On an empty database it creates the bootstrap accounts and
 * the default configuration — nothing else. Vehicles, movements and alerts only
 * ever come from real use of the system.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserService userService;
    private final ConfigurationService configurationService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // Seeds the admin + operator accounts if no users exist
        userService.seedDefaultUsers();
        // Seeds capacity, threshold and one gate if the config doc is missing
        configurationService.get();
    }
}
