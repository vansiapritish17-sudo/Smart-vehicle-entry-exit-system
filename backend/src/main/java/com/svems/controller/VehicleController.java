package com.svems.controller;

import com.svems.config.ApiException;
import com.svems.model.ApiResponse;
import com.svems.model.Vehicle;
import com.svems.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Vehicle register. Reads are open to any signed-in user; writes (POST, PUT) are
 * Administrator-only via `svems.security.admin-paths`. Errors are mapped to
 * responses by GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public ApiResponse<List<Vehicle>> getAll() throws Exception {
        return ApiResponse.success(vehicleService.findAll());
    }

    @GetMapping("/search")
    public ApiResponse<List<Vehicle>> search(
            @RequestParam(required = false) String regNo,
            @RequestParam(required = false) String owner,
            @RequestParam(required = false) String currentStatus,
            @RequestParam(required = false) String registrationStatus) throws Exception {
        return ApiResponse.success(vehicleService.search(regNo, owner, currentStatus, registrationStatus));
    }

    @GetMapping("/{id}")
    public ApiResponse<Vehicle> getById(@PathVariable String id) throws Exception {
        return ApiResponse.success(vehicleService.findById(id)
                .orElseThrow(() -> ApiException.notFound("Vehicle not found.")));
    }

    @PostMapping
    public ApiResponse<Vehicle> create(@RequestBody Vehicle vehicle) throws Exception {
        return ApiResponse.success("Vehicle registered.", vehicleService.create(vehicle));
    }

    @PutMapping("/{id}")
    public ApiResponse<Vehicle> update(@PathVariable String id, @RequestBody Vehicle vehicle) throws Exception {
        return ApiResponse.success("Vehicle updated.", vehicleService.update(id, vehicle));
    }

    @PutMapping("/{id}/toggle")
    public ApiResponse<Vehicle> toggle(@PathVariable String id) throws Exception {
        Vehicle vehicle = vehicleService.toggleRegistration(id);
        return ApiResponse.success("Vehicle " + vehicle.getRegNo() + " is now " + vehicle.getRegistrationStatus() + ".", vehicle);
    }
}
