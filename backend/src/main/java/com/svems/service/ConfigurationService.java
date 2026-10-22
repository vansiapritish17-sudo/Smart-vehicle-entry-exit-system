package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Configuration;
import com.svems.repository.DocumentStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConfigurationService {

    private static final String COLLECTION = "configuration";
    private static final String DOC_ID = "default";
    private static final Set<String> GATE_STATUSES = Set.of("ACTIVE", "MAINTENANCE", "INACTIVE");

    private final DocumentStore repo;

    public Configuration get() throws Exception {
        Optional<Map<String, Object>> doc = repo.findById(COLLECTION, DOC_ID);
        if (doc.isEmpty()) return seedDefault();
        return toConfig(doc.get());
    }

    public Configuration save(Configuration config) throws Exception {
        validate(config);
        repo.saveWithId(COLLECTION, DOC_ID, toMap(config));
        return config;
    }

    /** The named gate, if it exists and is open for traffic. */
    public Optional<Configuration.Gate> activeGate(String name) throws Exception {
        return get().getGates().stream()
                .filter(g -> g.getName().equalsIgnoreCase(name == null ? "" : name.trim()))
                .filter(g -> "ACTIVE".equals(g.getStatus()))
                .findFirst();
    }

    /**
     * First-run defaults so the system is usable immediately: a capacity, a threshold
     * and a single gate. Everything else (vehicles, more gates) is entered by an admin.
     */
    public Configuration seedDefault() throws Exception {
        Configuration config = Configuration.builder()
                .maximumCapacity(100)
                .alertThreshold(80)
                .gates(new ArrayList<>(List.of(
                        Configuration.Gate.builder().id("G1").name("Main Gate").status("ACTIVE").build()
                )))
                .build();
        repo.saveWithId(COLLECTION, DOC_ID, toMap(config));
        System.out.println("✅ Default configuration seeded into Firestore.");
        return config;
    }

    private void validate(Configuration c) {
        if (c.getMaximumCapacity() < 1 || c.getMaximumCapacity() > 100_000) {
            throw ApiException.badRequest("Maximum capacity must be between 1 and 100000.");
        }
        if (c.getAlertThreshold() < 1 || c.getAlertThreshold() > 100) {
            throw ApiException.badRequest("Alert threshold must be between 1 and 100 percent.");
        }
        if (c.getGates() == null || c.getGates().isEmpty()) {
            throw ApiException.badRequest("Configure at least one gate.");
        }

        Set<String> names = new HashSet<>();
        int index = 1;
        for (Configuration.Gate gate : c.getGates()) {
            String name = gate.getName() == null ? "" : gate.getName().trim();
            if (name.isEmpty()) throw ApiException.badRequest("Every gate needs a name.");
            if (!names.add(name.toLowerCase())) throw ApiException.badRequest("Gate names must be unique: " + name);
            if (gate.getStatus() == null || !GATE_STATUSES.contains(gate.getStatus())) {
                throw ApiException.badRequest("Gate status must be ACTIVE, MAINTENANCE or INACTIVE.");
            }
            gate.setName(name);
            if (gate.getId() == null || gate.getId().isBlank()) gate.setId("G" + System.currentTimeMillis() + index);
            index++;
        }
        if (c.getGates().stream().noneMatch(g -> "ACTIVE".equals(g.getStatus()))) {
            throw ApiException.badRequest("At least one gate must be ACTIVE.");
        }
    }

    @SuppressWarnings("unchecked")
    private Configuration toConfig(Map<String, Object> m) {
        List<Map<String, Object>> rawGates = (List<Map<String, Object>>) m.getOrDefault("gates", List.of());
        List<Configuration.Gate> gates = rawGates.stream().map(g -> Configuration.Gate.builder()
                .id((String) g.get("id"))
                .name((String) g.get("name"))
                .status((String) g.get("status"))
                .build()).collect(Collectors.toList());

        return Configuration.builder()
                .maximumCapacity(((Number) m.getOrDefault("maximumCapacity", 100)).intValue())
                .alertThreshold(((Number) m.getOrDefault("alertThreshold", 80)).intValue())
                .gates(gates)
                .build();
    }

    private Map<String, Object> toMap(Configuration c) {
        List<Map<String, Object>> gates = c.getGates().stream().map(g -> {
            Map<String, Object> gm = new LinkedHashMap<>();
            gm.put("id", g.getId()); gm.put("name", g.getName()); gm.put("status", g.getStatus());
            return gm;
        }).collect(Collectors.toList());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("maximumCapacity", c.getMaximumCapacity());
        m.put("alertThreshold", c.getAlertThreshold());
        m.put("gates", gates);
        return m;
    }
}
