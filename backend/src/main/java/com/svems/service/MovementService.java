package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Alert;
import com.svems.model.Configuration;
import com.svems.model.Movement;
import com.svems.model.Vehicle;
import com.svems.repository.FirestoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Gate entry/exit workflow. Every attempt is validated here, and every refusal raises
 * an alert so security staff see it on the Alerts page in real time.
 *
 * Entry and exit are serialised on one lock: the read-check-write sequence (is the
 * vehicle outside? is there room?) must not interleave with another gate's request,
 * or a double submit could record the same vehicle entering twice.
 */
@Service
@RequiredArgsConstructor
public class MovementService {

    private static final String COLLECTION = "movements";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FirestoreRepository repo;
    private final VehicleService vehicleService;
    private final AlertService alertService;
    private final ConfigurationService configurationService;

    private final Object gateLock = new Object();

    public List<Movement> findAll() throws Exception {
        return repo.findAll(COLLECTION).stream()
                .map(this::toMovement)
                .sorted(Comparator.comparing(MovementService::eventTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /** When the movement happened: the exit time for an EXIT, the entry time otherwise. */
    private static String eventTime(Movement m) {
        return "EXIT".equals(m.getType()) ? m.getExitTime() : m.getEntryTime();
    }

    public Map<String, Object> recordEntry(String regNo, String gate, String operator) throws Exception {
        String normalized = requireRegNo(regNo);
        synchronized (gateLock) {
            Configuration config = configurationService.get();
            String gateName = requireActiveGate(gate);
            Optional<Vehicle> vehicleOpt = vehicleService.findByRegNo(normalized);

            if (vehicleOpt.isEmpty()) {
                return refuse(normalized, gateName, "UNAUTHORIZED_VEHICLE", "HIGH",
                        "Unregistered vehicle attempted entry at " + gateName + ".",
                        "Unauthorized vehicle. Entry rejected.");
            }
            Vehicle vehicle = vehicleOpt.get();

            if ("INACTIVE".equals(vehicle.getRegistrationStatus())) {
                return refuse(normalized, gateName, "INACTIVE_VEHICLE", "HIGH",
                        "Vehicle with an inactive registration attempted entry at " + gateName + ".",
                        "Inactive registration. Entry rejected.");
            }
            if ("INSIDE".equals(vehicle.getCurrentStatus())) {
                return refuse(normalized, gateName, "DUPLICATE_ENTRY", "MEDIUM",
                        "Entry attempted at " + gateName + " for a vehicle already inside.",
                        "Duplicate entry. Vehicle is already inside.");
            }

            long inside = vehicleService.countInside();
            int capacity = config.getMaximumCapacity();
            if (inside >= capacity) {
                return refuse(normalized, gateName, "CAPACITY_FULL", "HIGH",
                        "Entry refused at " + gateName + ": facility is full (" + inside + "/" + capacity + ").",
                        "Facility is at full capacity. Entry rejected.");
            }

            String now = LocalDateTime.now().format(FMT);
            Movement movement = Movement.builder()
                    .vehicleId(vehicle.getId()).regNo(vehicle.getRegNo()).owner(vehicle.getOwner())
                    .type("ENTRY").gate(gateName).entryTime(now).exitTime("").stayDuration("")
                    .operator(operator).status("VALID")
                    .build();
            movement.setId(repo.save(COLLECTION, toMap(movement)));
            vehicleService.updateStatus(vehicle.getId(), "INSIDE");

            warnIfThresholdCrossed(inside, inside + 1, config);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ok", true);
            result.put("message", "Entry recorded successfully.");
            result.put("movement", movement);
            return result;
        }
    }

    public Map<String, Object> recordExit(String regNo, String gate, String operator) throws Exception {
        String normalized = requireRegNo(regNo);
        synchronized (gateLock) {
            String gateName = requireActiveGate(gate);
            Optional<Vehicle> vehicleOpt = vehicleService.findByRegNo(normalized);

            if (vehicleOpt.isEmpty() || !"INSIDE".equals(vehicleOpt.get().getCurrentStatus())) {
                return refuse(normalized, gateName, "INVALID_EXIT", "MEDIUM",
                        "Exit attempted at " + gateName + " for a vehicle not recorded inside.",
                        "Invalid exit. Occupancy unchanged.");
            }

            Vehicle vehicle = vehicleOpt.get();
            String now = LocalDateTime.now().format(FMT);

            // The open ENTRY this exit closes: same vehicle, no exit time yet, most recent first.
            // Matched on the vehicle's id, not its plate — the plate can be corrected while
            // the vehicle is inside, and the entry keeps the plate it was recorded under.
            // Records written before vehicleId existed are still found by plate.
            Stream<Map<String, Object>> candidates = Stream.concat(
                    repo.findWhere(COLLECTION, "vehicleId", vehicle.getId()).stream(),
                    repo.findWhere(COLLECTION, "regNo", normalized).stream()
                            .filter(m -> m.get("vehicleId") == null));
            Optional<Movement> lastEntry = candidates
                    .map(this::toMovement)
                    .filter(m -> "ENTRY".equals(m.getType()) && (m.getExitTime() == null || m.getExitTime().isBlank()))
                    .max(Comparator.comparing(Movement::getEntryTime, Comparator.nullsFirst(Comparator.naturalOrder())));

            String stayDuration = lastEntry.map(e -> durationFrom(e.getEntryTime())).orElse("Unknown");
            String entryTime = lastEntry.map(Movement::getEntryTime).orElse("");

            Movement movement = Movement.builder()
                    .vehicleId(vehicle.getId()).regNo(vehicle.getRegNo()).owner(vehicle.getOwner())
                    .type("EXIT").gate(gateName).entryTime(entryTime).exitTime(now).stayDuration(stayDuration)
                    .operator(operator).status("VALID")
                    .build();
            movement.setId(repo.save(COLLECTION, toMap(movement)));

            if (lastEntry.isPresent()) {
                repo.update(COLLECTION, lastEntry.get().getId(), Map.of("exitTime", now, "stayDuration", stayDuration));
            }
            vehicleService.updateStatus(vehicle.getId(), "OUTSIDE");

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ok", true);
            result.put("message", "Exit recorded successfully.");
            result.put("movement", movement);
            return result;
        }
    }

    private static String requireRegNo(String regNo) {
        String normalized = VehicleService.normalizeRegNo(regNo);
        if (normalized.isEmpty()) throw ApiException.badRequest("Enter a vehicle registration number.");
        return normalized;
    }

    private String requireActiveGate(String gate) throws Exception {
        return configurationService.activeGate(gate)
                .map(Configuration.Gate::getName)
                .orElseThrow(() -> ApiException.badRequest(
                        "Gate '" + (gate == null ? "" : gate) + "' is not an active gate. Choose an active gate."));
    }

    /** Raise the alert for a refused movement and build the response the client shows. */
    private Map<String, Object> refuse(String regNo, String gate, String type, String severity,
                                       String description, String message) throws Exception {
        Alert alert = alertService.create(Alert.builder()
                .vehicle(regNo).gate(gate).type(type).severity(severity).description(description).build());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", false);
        result.put("message", message);
        result.put("alert", alert);
        return result;
    }

    /** One alert when occupancy rises across the threshold, not one per entry above it. */
    private void warnIfThresholdCrossed(long before, long after, Configuration config) throws Exception {
        int capacity = config.getMaximumCapacity();
        long thresholdCount = (long) Math.ceil(capacity * config.getAlertThreshold() / 100.0);
        if (before < thresholdCount && after >= thresholdCount) {
            long percent = Math.round(after * 100.0 / capacity);
            alertService.create(Alert.builder()
                    .vehicle("SYSTEM").type("CAPACITY_WARNING").severity("HIGH")
                    .description("Occupancy reached " + after + " of " + capacity + " (" + percent +
                            "%), at or above the " + config.getAlertThreshold() + "% alert threshold.")
                    .build());
        }
    }

    private String durationFrom(String entryTime) {
        try {
            LocalDateTime entry = LocalDateTime.parse(entryTime, FMT);
            long minutes = Math.max(1, ChronoUnit.MINUTES.between(entry, LocalDateTime.now()));
            long hours = minutes / 60;
            long mins = minutes % 60;
            return hours > 0 ? hours + "h " + mins + "m" : mins + "m";
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private Movement toMovement(Map<String, Object> m) {
        return Movement.builder()
                .id((String) m.get("id"))
                .vehicleId((String) m.get("vehicleId"))
                .regNo((String) m.get("regNo"))
                .owner((String) m.get("owner"))
                .type((String) m.get("type"))
                .gate((String) m.get("gate"))
                .entryTime((String) m.get("entryTime"))
                .exitTime((String) m.getOrDefault("exitTime", ""))
                .stayDuration((String) m.getOrDefault("stayDuration", ""))
                .operator((String) m.get("operator"))
                .status((String) m.get("status"))
                .build();
    }

    private Map<String, Object> toMap(Movement mv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("vehicleId", mv.getVehicleId());
        m.put("regNo", mv.getRegNo());
        m.put("owner", mv.getOwner());
        m.put("type", mv.getType());
        m.put("gate", mv.getGate());
        m.put("entryTime", mv.getEntryTime());
        m.put("exitTime", mv.getExitTime());
        m.put("stayDuration", mv.getStayDuration());
        m.put("operator", mv.getOperator());
        m.put("status", mv.getStatus());
        return m;
    }
}
