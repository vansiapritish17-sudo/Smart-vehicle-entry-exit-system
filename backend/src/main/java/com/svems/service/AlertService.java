package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Alert;
import com.svems.repository.FirestoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {

    private static final String COLLECTION = "alerts";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FirestoreRepository repo;

    public List<Alert> findAll() throws Exception {
        return repo.findAll(COLLECTION).stream()
                .map(this::toAlert)
                .sorted(Comparator.comparing(Alert::getTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    public Alert create(Alert alert) throws Exception {
        alert.setTime(LocalDateTime.now().format(FMT));
        alert.setStatus("OPEN");
        Map<String, Object> data = toMap(alert);
        String id = repo.save(COLLECTION, data);
        alert.setId(id);
        return alert;
    }

    public void resolve(String id, String resolvedBy) throws Exception {
        Map<String, Object> doc = repo.findById(COLLECTION, id)
                .orElseThrow(() -> ApiException.notFound("Alert not found."));
        if ("RESOLVED".equals(doc.get("status"))) {
            throw ApiException.conflict("This alert is already resolved.");
        }
        repo.update(COLLECTION, id, Map.of(
                "status", "RESOLVED",
                "resolvedBy", resolvedBy,
                "resolvedAt", LocalDateTime.now().format(FMT)));
    }

    private Alert toAlert(Map<String, Object> m) {
        return Alert.builder()
                .id((String) m.get("id"))
                .vehicle((String) m.get("vehicle"))
                .type((String) m.get("type"))
                .severity((String) m.get("severity"))
                .description((String) m.get("description"))
                .time((String) m.get("time"))
                .status((String) m.get("status"))
                .gate((String) m.get("gate"))
                .resolvedBy((String) m.get("resolvedBy"))
                .resolvedAt((String) m.get("resolvedAt"))
                .build();
    }

    private Map<String, Object> toMap(Alert a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("vehicle", a.getVehicle());
        m.put("type", a.getType());
        m.put("severity", a.getSeverity());
        m.put("description", a.getDescription());
        m.put("time", a.getTime());
        m.put("status", a.getStatus());
        if (a.getGate() != null) m.put("gate", a.getGate());
        return m;
    }
}
