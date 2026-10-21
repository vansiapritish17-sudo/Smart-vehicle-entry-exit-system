package com.svems.controller;

import com.svems.model.ApiResponse;
import com.svems.model.Configuration;
import com.svems.service.ConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuration")
@RequiredArgsConstructor
public class ConfigurationController {

    private final ConfigurationService configurationService;

    @GetMapping
    public ApiResponse<Configuration> get() throws Exception {
        return ApiResponse.success(configurationService.get());
    }

    @PutMapping
    public ApiResponse<Configuration> save(@RequestBody Configuration config) throws Exception {
        return ApiResponse.success("Configuration saved.", configurationService.save(config));
    }
}
