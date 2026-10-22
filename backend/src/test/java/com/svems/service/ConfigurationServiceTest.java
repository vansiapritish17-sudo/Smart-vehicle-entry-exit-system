package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Configuration;
import com.svems.support.InMemoryDocumentStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConfigurationServiceTest {

    private ConfigurationService configuration;

    @BeforeEach
    void setUp() {
        configuration = new ConfigurationService(new InMemoryDocumentStore());
    }

    private static Configuration.Gate gate(String name, String status) {
        return Configuration.Gate.builder().name(name).status(status).build();
    }

    private static Configuration config(int capacity, int threshold, Configuration.Gate... gates) {
        return Configuration.builder()
                .maximumCapacity(capacity).alertThreshold(threshold)
                .gates(new ArrayList<>(List.of(gates)))
                .build();
    }

    @Test
    void seedsAUsableDefaultOnFirstRun() throws Exception {
        Configuration seeded = configuration.get();

        assertThat(seeded.getMaximumCapacity()).isEqualTo(100);
        assertThat(seeded.getAlertThreshold()).isEqualTo(80);
        assertThat(configuration.activeGate("Main Gate")).isPresent();
    }

    @Test
    void savesAndReadsBackSettingsAndGivesNewGatesAnId() throws Exception {
        configuration.save(config(250, 90, gate("  East Gate ", "ACTIVE"), gate("West Gate", "INACTIVE")));

        Configuration saved = configuration.get();
        assertThat(saved.getMaximumCapacity()).isEqualTo(250);
        assertThat(saved.getGates()).extracting(Configuration.Gate::getName).containsExactly("East Gate", "West Gate");
        assertThat(saved.getGates()).allSatisfy(g -> assertThat(g.getId()).isNotBlank());
    }

    @Test
    void findsOnlyActiveGatesIgnoringCase() throws Exception {
        configuration.save(config(100, 80, gate("Main Gate", "ACTIVE"), gate("North Gate", "MAINTENANCE")));

        assertThat(configuration.activeGate("main gate")).isPresent();
        assertThat(configuration.activeGate("North Gate")).isEmpty();
        assertThat(configuration.activeGate("Nowhere")).isEmpty();
        assertThat(configuration.activeGate(null)).isEmpty();
    }

    @Test
    void requiresAtLeastOneActiveGate() {
        assertThatThrownBy(() -> configuration.save(config(100, 80, gate("Main Gate", "MAINTENANCE"))))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("At least one gate must be ACTIVE");
    }

    @Test
    void rejectsDuplicateGateNamesIgnoringCase() {
        assertThatThrownBy(() -> configuration.save(config(100, 80, gate("Main Gate", "ACTIVE"), gate("main gate", "ACTIVE"))))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("unique");
    }

    @Test
    void rejectsCapacityAndThresholdOutOfRange() {
        assertThatThrownBy(() -> configuration.save(config(0, 80, gate("Main Gate", "ACTIVE"))))
                .isInstanceOf(ApiException.class).hasMessageContaining("capacity");
        assertThatThrownBy(() -> configuration.save(config(100, 101, gate("Main Gate", "ACTIVE"))))
                .isInstanceOf(ApiException.class).hasMessageContaining("threshold");
    }
}
