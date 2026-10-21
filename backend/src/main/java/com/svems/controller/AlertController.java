package com.svems.controller;

import com.svems.model.Alert;
import com.svems.model.ApiResponse;
import com.svems.security.CurrentUser;
import com.svems.service.AlertService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public ApiResponse<List<Alert>> getAll() throws Exception {
        return ApiResponse.success(alertService.findAll());
    }

    @PutMapping("/{id}/resolve")
    public ApiResponse<Void> resolve(@PathVariable String id, HttpServletRequest request) throws Exception {
        alertService.resolve(id, CurrentUser.require(request).displayName());
        return ApiResponse.success("Alert resolved.", null);
    }
}
