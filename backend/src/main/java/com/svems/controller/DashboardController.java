package com.svems.controller;

import com.svems.model.ApiResponse;
import com.svems.model.Configuration;
import com.svems.model.Movement;
import com.svems.model.Vehicle;
import com.svems.service.AlertService;
import com.svems.service.ConfigurationService;
import com.svems.service.MovementService;
import com.svems.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final VehicleService vehicleService;
    private final MovementService movementService;
    private final AlertService alertService;
    private final ConfigurationService configurationService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stats() {
        try {
            List<Vehicle> vehicles   = vehicleService.findAll();
            List<Movement> movements = movementService.findAll();
            Configuration config     = configurationService.get();

            long inside   = vehicles.stream().filter(v -> "INSIDE".equals(v.getCurrentStatus())).count();
            long outside  = vehicles.stream().filter(v -> "OUTSIDE".equals(v.getCurrentStatus())).count();
            long openAlerts = alertService.findAll().stream().filter(a -> "OPEN".equals(a.getStatus())).count();

            String today = LocalDate.now().toString();
            long todayEntries = movements.stream()
                    .filter(m -> "ENTRY".equals(m.getType()) && m.getEntryTime() != null && m.getEntryTime().startsWith(today))
                    .count();
            long todayExits = movements.stream()
                    .filter(m -> "EXIT".equals(m.getType()) && m.getExitTime() != null && m.getExitTime().startsWith(today))
                    .count();

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("registeredVehicles", vehicles.size());
            stats.put("vehiclesInside",  inside);
            stats.put("vehiclesOutside", outside);
            stats.put("todayEntries",    todayEntries);
            stats.put("todayExits",      todayExits);
            stats.put("activeAlerts",    openAlerts);
            stats.put("currentOccupancy", inside);
            stats.put("maximumCapacity", config.getMaximumCapacity());
            stats.put("alertThreshold",  config.getAlertThreshold());

            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage()));
        }
    }
}
