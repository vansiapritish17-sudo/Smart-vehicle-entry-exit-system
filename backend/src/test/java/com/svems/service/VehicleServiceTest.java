package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Vehicle;
import com.svems.support.InMemoryDocumentStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VehicleServiceTest {

    private InMemoryDocumentStore store;
    private VehicleService vehicles;

    @BeforeEach
    void setUp() {
        store = new InMemoryDocumentStore();
        vehicles = new VehicleService(store);
    }

    private Vehicle.VehicleBuilder valid(String regNo) {
        return Vehicle.builder().regNo(regNo).owner("Asha Rao").contact("98765 43210").type("Car");
    }

    @Test
    void registersANewVehicleActiveAndOutsideWithANormalisedPlate() throws Exception {
        Vehicle vehicle = vehicles.create(valid("mh 12-ab 1234").build());

        assertThat(vehicle.getRegNo()).isEqualTo("MH12AB1234");
        assertThat(vehicle.getContact()).isEqualTo("9876543210");
        assertThat(vehicle.getRegistrationStatus()).isEqualTo("ACTIVE");
        assertThat(vehicle.getCurrentStatus()).isEqualTo("OUTSIDE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"MH12AB1234", "DL3CAB1234", "KA01A1234", "22BH1234AB"})
    void acceptsIndianPlateFormats(String regNo) throws Exception {
        assertThat(vehicles.create(valid(regNo).build()).getId()).isNotBlank();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "ABC", "MH12AB12", "12345678", "MH12ABCD12345"})
    void rejectsMalformedPlates(String regNo) {
        assertThatThrownBy(() -> vehicles.create(valid(regNo).build()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("registration number");
    }

    @Test
    void rejectsAPlateThatIsAlreadyRegisteredHoweverItIsTyped() throws Exception {
        vehicles.create(valid("MH12AB1234").build());

        assertThatThrownBy(() -> vehicles.create(valid("mh12 ab-1234").build()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    void rejectsAnInvalidContactNumber() {
        assertThatThrownBy(() -> vehicles.create(valid("MH12AB1234").contact("12345").build()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Contact");
    }

    @Test
    void editingDetailsNeverChangesWhetherTheVehicleIsInside() throws Exception {
        Vehicle vehicle = vehicles.create(valid("MH12AB1234").build());
        vehicles.updateStatus(vehicle.getId(), "INSIDE");

        Vehicle changes = valid("MH12AB1234").owner("New Owner").build();
        changes.setCurrentStatus("OUTSIDE");
        vehicles.update(vehicle.getId(), changes);

        assertThat(vehicles.findById(vehicle.getId()).orElseThrow())
                .satisfies(v -> {
                    assertThat(v.getOwner()).isEqualTo("New Owner");
                    assertThat(v.getCurrentStatus()).isEqualTo("INSIDE");
                });
    }

    @Test
    void refusesToDeleteAVehicleThatIsInside() throws Exception {
        Vehicle vehicle = vehicles.create(valid("MH12AB1234").build());
        vehicles.updateStatus(vehicle.getId(), "INSIDE");

        assertThatThrownBy(() -> vehicles.delete(vehicle.getId()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Record its exit");
        assertThat(vehicles.findById(vehicle.getId())).isPresent();
    }

    @Test
    void deletesAVehicleThatIsOutsideButKeepsItsHistory() throws Exception {
        Vehicle vehicle = vehicles.create(valid("MH12AB1234").build());
        store.save("movements", new java.util.HashMap<>(Map.of("vehicleId", vehicle.getId(), "type", "ENTRY")));

        vehicles.delete(vehicle.getId());

        assertThat(vehicles.findById(vehicle.getId())).isEmpty();
        assertThat(store.all("movements")).hasSize(1);
    }

    @Test
    void togglingRegistrationFlipsBetweenActiveAndInactive() throws Exception {
        Vehicle vehicle = vehicles.create(valid("MH12AB1234").build());

        assertThat(vehicles.toggleRegistration(vehicle.getId()).getRegistrationStatus()).isEqualTo("INACTIVE");
        assertThat(vehicles.toggleRegistration(vehicle.getId()).getRegistrationStatus()).isEqualTo("ACTIVE");
    }
}
