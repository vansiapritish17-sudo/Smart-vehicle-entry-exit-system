package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Configuration;
import com.svems.model.Movement;
import com.svems.model.Vehicle;
import com.svems.support.InMemoryDocumentStore;
import com.svems.support.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The gate rules, run through the real services against an in-memory store with
 * Firestore's transaction semantics.
 */
class MovementServiceTest {

    private static final String GATE = "Main Gate";
    private static final String OPERATOR = "Test Operator";

    private InMemoryDocumentStore store;
    private MutableClock clock;
    private VehicleService vehicles;
    private ConfigurationService configuration;
    private MovementService movements;

    @BeforeEach
    void setUp() throws Exception {
        store = new InMemoryDocumentStore();
        clock = new MutableClock(LocalDateTime.of(2026, 10, 22, 9, 0), ZoneId.of("Asia/Kolkata"));
        vehicles = new VehicleService(store);
        configuration = new ConfigurationService(store);
        movements = new MovementService(store, vehicles, new AlertService(store), configuration, clock);
        configure(100, 80);
    }

    /* ── Helpers ── */

    private void configure(int capacity, int thresholdPercent) throws Exception {
        configuration.save(Configuration.builder()
                .maximumCapacity(capacity)
                .alertThreshold(thresholdPercent)
                .gates(new java.util.ArrayList<>(List.of(
                        Configuration.Gate.builder().id("G1").name(GATE).status("ACTIVE").build(),
                        Configuration.Gate.builder().id("G2").name("North Gate").status("MAINTENANCE").build())))
                .build());
    }

    private Vehicle register(String regNo) throws Exception {
        return vehicles.create(Vehicle.builder()
                .regNo(regNo).owner("Asha Rao").contact("9876543210").type("Car").build());
    }

    private Map<String, Object> enter(String regNo) throws Exception {
        return movements.recordEntry(regNo, GATE, OPERATOR);
    }

    private Map<String, Object> exit(String regNo) throws Exception {
        return movements.recordExit(regNo, GATE, OPERATOR);
    }

    private String statusOf(String regNo) throws Exception {
        return vehicles.findByRegNo(regNo).orElseThrow().getCurrentStatus();
    }

    private List<Map<String, Object>> alertsOfType(String type) {
        return store.all("alerts").stream().filter(a -> type.equals(a.get("type"))).toList();
    }

    /* ── Entry ── */

    @Nested
    @DisplayName("Entry")
    class Entry {

        @Test
        void recordsTheMovementAndMarksTheVehicleInside() throws Exception {
            register("MH12AB1234");

            Map<String, Object> result = enter("MH12AB1234");

            assertThat(result.get("ok")).isEqualTo(true);
            Movement movement = (Movement) result.get("movement");
            assertThat(movement.getType()).isEqualTo("ENTRY");
            assertThat(movement.getGate()).isEqualTo(GATE);
            assertThat(movement.getEntryTime()).isEqualTo("2026-10-22 09:00");
            assertThat(movement.getOperator()).isEqualTo(OPERATOR);
            assertThat(statusOf("MH12AB1234")).isEqualTo("INSIDE");
            assertThat(store.all("movements")).hasSize(1);
        }

        @Test
        void acceptsThePlateWithSpacesDashesAndLowerCase() throws Exception {
            register("MH12AB1234");

            assertThat(enter("mh 12-ab 1234").get("ok")).isEqualTo(true);
            assertThat(statusOf("MH12AB1234")).isEqualTo("INSIDE");
        }

        @Test
        void refusesAnUnregisteredVehicleAndRaisesAHighAlert() throws Exception {
            Map<String, Object> result = enter("KA01XY9999");

            assertThat(result.get("ok")).isEqualTo(false);
            assertThat(store.all("movements")).isEmpty();
            assertThat(alertsOfType("UNAUTHORIZED_VEHICLE"))
                    .singleElement()
                    .satisfies(alert -> {
                        assertThat(alert.get("severity")).isEqualTo("HIGH");
                        assertThat(alert.get("vehicle")).isEqualTo("KA01XY9999");
                        assertThat(alert.get("gate")).isEqualTo(GATE);
                    });
        }

        @Test
        void refusesAVehicleWithAnInactiveRegistration() throws Exception {
            Vehicle vehicle = register("MH12AB1234");
            vehicles.toggleRegistration(vehicle.getId());

            assertThat(enter("MH12AB1234").get("ok")).isEqualTo(false);
            assertThat(statusOf("MH12AB1234")).isEqualTo("OUTSIDE");
            assertThat(alertsOfType("INACTIVE_VEHICLE")).hasSize(1);
        }

        @Test
        void refusesADuplicateEntryForAVehicleAlreadyInside() throws Exception {
            register("MH12AB1234");
            enter("MH12AB1234");

            assertThat(enter("MH12AB1234").get("ok")).isEqualTo(false);
            assertThat(store.all("movements")).hasSize(1);
            assertThat(alertsOfType("DUPLICATE_ENTRY")).singleElement()
                    .satisfies(alert -> assertThat(alert.get("severity")).isEqualTo("MEDIUM"));
        }

        @Test
        void refusesEntryWhenTheFacilityIsFull() throws Exception {
            configure(2, 80);
            register("MH12AB1001");
            register("MH12AB1002");
            register("MH12AB1003");
            enter("MH12AB1001");
            enter("MH12AB1002");

            assertThat(enter("MH12AB1003").get("ok")).isEqualTo(false);
            assertThat(statusOf("MH12AB1003")).isEqualTo("OUTSIDE");
            assertThat(alertsOfType("CAPACITY_FULL")).hasSize(1);
        }

        @Test
        void raisesOneCapacityWarningWhenOccupancyCrossesTheThreshold() throws Exception {
            configure(5, 60); // warn at 3 of 5
            for (int i = 1; i <= 5; i++) register("MH12AB100" + i);

            enter("MH12AB1001");
            enter("MH12AB1002");
            assertThat(alertsOfType("CAPACITY_WARNING")).isEmpty();

            enter("MH12AB1003");
            assertThat(alertsOfType("CAPACITY_WARNING")).hasSize(1);

            enter("MH12AB1004"); // already above it: no second warning
            assertThat(alertsOfType("CAPACITY_WARNING")).hasSize(1);
        }

        @Test
        void rejectsAGateThatIsNotActive() throws Exception {
            register("MH12AB1234");

            assertThatThrownBy(() -> movements.recordEntry("MH12AB1234", "North Gate", OPERATOR))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("not an active gate");
            assertThat(store.all("movements")).isEmpty();
        }

        @Test
        void rejectsAnEmptyPlate() {
            assertThatThrownBy(() -> enter("  "))
                    .isInstanceOf(ApiException.class)
                    .hasMessageContaining("registration number");
        }
    }

    /* ── Exit ── */

    @Nested
    @DisplayName("Exit")
    class Exit {

        @Test
        void closesTheEntryAndRecordsTheStay() throws Exception {
            register("MH12AB1234");
            enter("MH12AB1234");
            clock.advance(Duration.ofMinutes(95));

            Map<String, Object> result = exit("MH12AB1234");

            assertThat(result.get("ok")).isEqualTo(true);
            Movement movement = (Movement) result.get("movement");
            assertThat(movement.getEntryTime()).isEqualTo("2026-10-22 09:00");
            assertThat(movement.getExitTime()).isEqualTo("2026-10-22 10:35");
            assertThat(movement.getStayDuration()).isEqualTo("1h 35m");
            assertThat(statusOf("MH12AB1234")).isEqualTo("OUTSIDE");

            Map<String, Object> entry = store.all("movements").stream()
                    .filter(m -> "ENTRY".equals(m.get("type"))).findFirst().orElseThrow();
            assertThat(entry.get("exitTime")).isEqualTo("2026-10-22 10:35");
            assertThat(entry.get("stayDuration")).isEqualTo("1h 35m");
        }

        @Test
        void refusesAVehicleThatIsNotInside() throws Exception {
            register("MH12AB1234");

            assertThat(exit("MH12AB1234").get("ok")).isEqualTo(false);
            assertThat(store.all("movements")).isEmpty();
            assertThat(alertsOfType("INVALID_EXIT")).hasSize(1);
        }

        @Test
        void refusesAnUnregisteredVehicle() throws Exception {
            assertThat(exit("KA01XY9999").get("ok")).isEqualTo(false);
            assertThat(alertsOfType("INVALID_EXIT")).hasSize(1);
        }

        @Test
        @DisplayName("still closes the right entry after the plate was corrected while inside")
        void closesTheEntryAfterThePlateWasCorrected() throws Exception {
            Vehicle vehicle = register("GJ01FB4556");
            enter("GJ01FB4556");
            vehicles.update(vehicle.getId(), Vehicle.builder()
                    .regNo("GJ01PB4556").owner("Asha Rao").contact("9876543210").type("Car").build());
            clock.advance(Duration.ofMinutes(32));

            Movement movement = (Movement) exit("GJ01PB4556").get("movement");

            assertThat(movement.getEntryTime()).isEqualTo("2026-10-22 09:00");
            assertThat(movement.getStayDuration()).isEqualTo("32m");
            assertThat(store.all("movements").stream()
                    .filter(m -> "ENTRY".equals(m.get("type")))
                    .allMatch(m -> !((String) m.get("exitTime")).isBlank()))
                    .as("no entry is left open")
                    .isTrue();
        }

        @Test
        void aShortVisitCountsAsAtLeastOneMinute() throws Exception {
            register("MH12AB1234");
            enter("MH12AB1234");

            assertThat(((Movement) exit("MH12AB1234").get("movement")).getStayDuration()).isEqualTo("1m");
        }
    }

    /* ── Clearing history ── */

    @Nested
    @DisplayName("Clearing history")
    class ClearHistory {

        @Test
        @DisplayName("clears completed records but keeps the open entry of a vehicle inside")
        void keepsOpenVisits() throws Exception {
            register("MH12AB1001");
            register("MH12AB1002");
            enter("MH12AB1001");
            exit("MH12AB1001");
            enter("MH12AB1002"); // still inside
            clock.advance(Duration.ofMinutes(20));

            assertThat(movements.clearHistory(0, "Admin")).isEqualTo(2);
            assertThat(store.all("movements")).singleElement()
                    .satisfies(m -> assertThat(m.get("regNo")).isEqualTo("MH12AB1002"));

            // Its exit still finds the entry it closes.
            Movement out = (Movement) exit("MH12AB1002").get("movement");
            assertThat(out.getEntryTime()).isEqualTo("2026-10-22 09:00");
            assertThat(out.getStayDuration()).isEqualTo("20m");
        }

        @Test
        void clearsOnlyRecordsOlderThanTheCutoff() throws Exception {
            register("MH12AB1001");
            register("MH12AB1002");
            enter("MH12AB1001");
            exit("MH12AB1001");
            clock.advance(Duration.ofDays(40));
            enter("MH12AB1002");
            exit("MH12AB1002");

            assertThat(movements.clearHistory(30, "Admin")).isEqualTo(2);
            assertThat(store.all("movements"))
                    .hasSize(2)
                    .allSatisfy(m -> assertThat(m.get("regNo")).isEqualTo("MH12AB1002"));
        }

        @Test
        void rejectsANegativeAge() {
            assertThatThrownBy(() -> movements.clearHistory(-1, "Admin")).isInstanceOf(ApiException.class);
        }
    }

    /* ── Atomicity ── */

    @Nested
    @DisplayName("Atomicity")
    class Atomicity {

        @Test
        @DisplayName("an entry that fails to commit writes nothing at all")
        void failedEntryLeavesNoTrace() throws Exception {
            register("MH12AB1234");
            store.failNextCommit();

            assertThatThrownBy(() -> enter("MH12AB1234")).hasMessageContaining("Simulated commit failure");

            assertThat(store.all("movements")).isEmpty();
            assertThat(statusOf("MH12AB1234")).isEqualTo("OUTSIDE");
            assertThat(store.all("alerts")).isEmpty();
        }

        @Test
        @DisplayName("an exit that fails to commit leaves the vehicle inside with its entry open")
        void failedExitLeavesTheVisitOpen() throws Exception {
            register("MH12AB1234");
            enter("MH12AB1234");
            store.failNextCommit();

            assertThatThrownBy(() -> exit("MH12AB1234")).hasMessageContaining("Simulated commit failure");

            assertThat(statusOf("MH12AB1234")).isEqualTo("INSIDE");
            assertThat(store.all("movements")).singleElement()
                    .satisfies(entry -> assertThat(entry.get("exitTime")).isEqualTo(""));
        }

        @Test
        void theVehicleCanEnterNormallyAfterAFailedAttempt() throws Exception {
            register("MH12AB1234");
            store.failNextCommit();
            assertThatThrownBy(() -> enter("MH12AB1234"));

            assertThat(enter("MH12AB1234").get("ok")).isEqualTo(true);
            assertThat(store.all("movements")).hasSize(1);
        }
    }
}
