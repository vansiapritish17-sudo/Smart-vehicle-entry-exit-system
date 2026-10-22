package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Alert;
import com.svems.model.Configuration;
import com.svems.model.Movement;
import com.svems.model.Vehicle;
import com.svems.repository.DocumentStore;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Gate entry/exit workflow. Every attempt is validated here, and every refusal raises
 * an alert so security staff see it on the Alerts page in real time.
 *
 * Each movement is one transaction: the checks (is the vehicle registered and outside?
 * is there room?) and the writes (the movement record, the vehicle's status, the entry
 * an exit closes) commit together or not at all, so a failure part-way can never leave
 * a movement without the matching status change. The transaction also re-validates its
 * reads at commit, which keeps the checks sound across several server instances; the
 * local lock just spares one instance from contending with itself.
 *
 * A transaction may be retried, so it only decides and writes. Alerts are raised after
 * it commits, so a retry never raises the same alert twice.
 */
@Service
@RequiredArgsConstructor
public class MovementService {

    private static final Logger log = LoggerFactory.getLogger(MovementService.class);
    private static final String COLLECTION = "movements";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final DocumentStore repo;
    private final VehicleService vehicleService;
    private final AlertService alertService;
    private final ConfigurationService configurationService;
    private final Clock clock;

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

    /** Why a movement was turned away; becomes the alert and the message the gate sees. */
    private record Refusal(String type, String severity, String description, String message) {}

    /** What a movement transaction decided: the recorded movement, or the refusal. */
    private record Outcome(Movement movement, Refusal refusal, long insideBefore) {
        static Outcome recorded(Movement movement, long insideBefore) { return new Outcome(movement, null, insideBefore); }
        static Outcome refused(Refusal refusal) { return new Outcome(null, refusal, 0); }
    }

    public Map<String, Object> recordEntry(String regNo, String gate, String operator) throws Exception {
        String normalized = requireRegNo(regNo);
        synchronized (gateLock) {
            Configuration config = configurationService.get();
            String gateName = requireActiveGate(gate);
            int capacity = config.getMaximumCapacity();
            String now = now();

            Outcome outcome = repo.runTransaction(tx -> {
                Optional<Vehicle> found = tx.findWhere(VehicleService.COLLECTION, "regNo", normalized)
                        .stream().findFirst().map(VehicleService::toVehicle);

                if (found.isEmpty()) {
                    return Outcome.refused(new Refusal("UNAUTHORIZED_VEHICLE", "HIGH",
                            "Unregistered vehicle attempted entry at " + gateName + ".",
                            "Unauthorized vehicle. Entry rejected."));
                }
                Vehicle vehicle = found.get();
                if ("INACTIVE".equals(vehicle.getRegistrationStatus())) {
                    return Outcome.refused(new Refusal("INACTIVE_VEHICLE", "HIGH",
                            "Vehicle with an inactive registration attempted entry at " + gateName + ".",
                            "Inactive registration. Entry rejected."));
                }
                if ("INSIDE".equals(vehicle.getCurrentStatus())) {
                    return Outcome.refused(new Refusal("DUPLICATE_ENTRY", "MEDIUM",
                            "Entry attempted at " + gateName + " for a vehicle already inside.",
                            "Duplicate entry. Vehicle is already inside."));
                }
                long inside = tx.findWhere(VehicleService.COLLECTION, "currentStatus", "INSIDE").size();
                if (inside >= capacity) {
                    return Outcome.refused(new Refusal("CAPACITY_FULL", "HIGH",
                            "Entry refused at " + gateName + ": facility is full (" + inside + "/" + capacity + ").",
                            "Facility is at full capacity. Entry rejected."));
                }

                // All reads are done; from here on, only writes.
                Movement movement = Movement.builder()
                        .id(tx.newId(COLLECTION))
                        .vehicleId(vehicle.getId()).regNo(vehicle.getRegNo()).owner(vehicle.getOwner())
                        .type("ENTRY").gate(gateName).entryTime(now).exitTime("").stayDuration("")
                        .operator(operator).status("VALID")
                        .build();
                tx.set(COLLECTION, movement.getId(), toMap(movement));
                tx.update(VehicleService.COLLECTION, vehicle.getId(), Map.of("currentStatus", "INSIDE"));
                return Outcome.recorded(movement, inside);
            });

            if (outcome.refusal() != null) return refuse(normalized, gateName, outcome.refusal());

            warnIfThresholdCrossed(outcome.insideBefore(), outcome.insideBefore() + 1, config);
            return recorded("Entry recorded successfully.", outcome.movement());
        }
    }

    public Map<String, Object> recordExit(String regNo, String gate, String operator) throws Exception {
        String normalized = requireRegNo(regNo);
        synchronized (gateLock) {
            String gateName = requireActiveGate(gate);
            LocalDateTime exitAt = LocalDateTime.now(clock);
            String now = exitAt.format(FMT);

            Outcome outcome = repo.runTransaction(tx -> {
                Optional<Vehicle> found = tx.findWhere(VehicleService.COLLECTION, "regNo", normalized)
                        .stream().findFirst().map(VehicleService::toVehicle);

                if (found.isEmpty() || !"INSIDE".equals(found.get().getCurrentStatus())) {
                    return Outcome.refused(new Refusal("INVALID_EXIT", "MEDIUM",
                            "Exit attempted at " + gateName + " for a vehicle not recorded inside.",
                            "Invalid exit. Occupancy unchanged."));
                }
                Vehicle vehicle = found.get();

                // The open ENTRY this exit closes: same vehicle, no exit time yet, most recent first.
                // Matched on the vehicle's id, not its plate — the plate can be corrected while
                // the vehicle is inside, and the entry keeps the plate it was recorded under.
                // Records written before vehicleId existed are still found by plate.
                List<Map<String, Object>> candidates = new ArrayList<>(
                        tx.findWhere(COLLECTION, "vehicleId", vehicle.getId()));
                tx.findWhere(COLLECTION, "regNo", normalized).stream()
                        .filter(m -> m.get("vehicleId") == null)
                        .forEach(candidates::add);
                Optional<Movement> lastEntry = candidates.stream()
                        .map(this::toMovement)
                        .filter(m -> "ENTRY".equals(m.getType()) && (m.getExitTime() == null || m.getExitTime().isBlank()))
                        .max(Comparator.comparing(Movement::getEntryTime, Comparator.nullsFirst(Comparator.naturalOrder())));

                String stayDuration = lastEntry.map(e -> durationBetween(e.getEntryTime(), exitAt)).orElse("Unknown");
                String entryTime = lastEntry.map(Movement::getEntryTime).orElse("");

                // All reads are done; from here on, only writes.
                Movement movement = Movement.builder()
                        .id(tx.newId(COLLECTION))
                        .vehicleId(vehicle.getId()).regNo(vehicle.getRegNo()).owner(vehicle.getOwner())
                        .type("EXIT").gate(gateName).entryTime(entryTime).exitTime(now).stayDuration(stayDuration)
                        .operator(operator).status("VALID")
                        .build();
                tx.set(COLLECTION, movement.getId(), toMap(movement));
                lastEntry.ifPresent(entry ->
                        tx.update(COLLECTION, entry.getId(), Map.of("exitTime", now, "stayDuration", stayDuration)));
                tx.update(VehicleService.COLLECTION, vehicle.getId(), Map.of("currentStatus", "OUTSIDE"));
                return Outcome.recorded(movement, 0);
            });

            if (outcome.refusal() != null) return refuse(normalized, gateName, outcome.refusal());
            return recorded("Exit recorded successfully.", outcome.movement());
        }
    }

    private String now() {
        return LocalDateTime.now(clock).format(FMT);
    }

    private static Map<String, Object> recorded(String message, Movement movement) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", true);
        result.put("message", message);
        result.put("movement", movement);
        return result;
    }

    /**
     * Delete movement records older than {@code olderThanDays} days (every completed
     * record when 0). The open entry of a vehicle still inside is always kept: its exit
     * needs it to record the entry time and the stay. Returns how many were removed.
     */
    public int clearHistory(int olderThanDays, String clearedBy) throws Exception {
        if (olderThanDays < 0) throw ApiException.badRequest("The age to clear must be zero or more days.");
        String cutoff = olderThanDays == 0
                ? null
                : LocalDateTime.now(clock).toLocalDate().minusDays(olderThanDays).atStartOfDay().format(FMT);

        synchronized (gateLock) {
            List<String> ids = repo.findAll(COLLECTION).stream()
                    .map(this::toMovement)
                    .filter(m -> !isOpenEntry(m))
                    .filter(m -> cutoff == null || (eventTime(m) != null && eventTime(m).compareTo(cutoff) < 0))
                    .map(Movement::getId)
                    .toList();
            repo.deleteAll(COLLECTION, ids);
            log.info("{} cleared {} movement record(s){}", clearedBy, ids.size(),
                    cutoff == null ? "" : " from before " + cutoff);
            return ids.size();
        }
    }

    private static boolean isOpenEntry(Movement m) {
        return "ENTRY".equals(m.getType()) && (m.getExitTime() == null || m.getExitTime().isBlank());
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
    private Map<String, Object> refuse(String regNo, String gate, Refusal refusal) throws Exception {
        Alert alert = alertService.create(Alert.builder()
                .vehicle(regNo).gate(gate).type(refusal.type()).severity(refusal.severity())
                .description(refusal.description()).build());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ok", false);
        result.put("message", refusal.message());
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

    private static String durationBetween(String entryTime, LocalDateTime exit) {
        try {
            LocalDateTime entry = LocalDateTime.parse(entryTime, FMT);
            long minutes = Math.max(1, ChronoUnit.MINUTES.between(entry, exit));
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
        m.put("id", mv.getId());
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
