package com.svems.service;

import com.svems.config.ApiException;
import com.svems.model.Vehicle;
import com.svems.repository.FirestoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private static final String COLLECTION = "vehicles";

    /** Indian plates: standard state series (MH12AB1234, DL3CAB1234) and Bharat series (22BH1234AB). */
    private static final Pattern REG_NO = Pattern.compile(
            "^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$");
    private static final Pattern CONTACT = Pattern.compile("^\\+?[0-9]{10,13}$");
    private static final Set<String> TYPES = Set.of("Car", "Bike", "Scooter", "SUV", "Van", "Truck", "Bus");
    private static final Set<String> REG_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final FirestoreRepository repo;

    /** Canonical form used for storage and lookups: upper case, no spaces or dashes. */
    public static String normalizeRegNo(String regNo) {
        return regNo == null ? "" : regNo.replaceAll("[\\s-]", "").toUpperCase();
    }

    public List<Vehicle> findAll() throws Exception {
        return repo.findAll(COLLECTION).stream()
                .map(this::toVehicle)
                .sorted(Comparator.comparing(Vehicle::getRegNo, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    public Optional<Vehicle> findById(String id) throws Exception {
        return repo.findById(COLLECTION, id).map(this::toVehicle);
    }

    public Optional<Vehicle> findByRegNo(String regNo) throws Exception {
        return repo.findWhere(COLLECTION, "regNo", normalizeRegNo(regNo))
                .stream().findFirst().map(this::toVehicle);
    }

    public long countInside() throws Exception {
        return repo.findWhere(COLLECTION, "currentStatus", "INSIDE").size();
    }

    public Vehicle create(Vehicle vehicle) throws Exception {
        validate(vehicle);
        if (findByRegNo(vehicle.getRegNo()).isPresent()) {
            throw ApiException.conflict("Vehicle " + vehicle.getRegNo() + " is already registered.");
        }
        if (vehicle.getRegistrationStatus() == null) vehicle.setRegistrationStatus("ACTIVE");
        vehicle.setCurrentStatus("OUTSIDE");
        String id = repo.save(COLLECTION, toMap(vehicle));
        vehicle.setId(id);
        return vehicle;
    }

    /** Edit a vehicle's details. Its inside/outside status is owned by the movement flow. */
    public Vehicle update(String id, Vehicle changes) throws Exception {
        Vehicle existing = findById(id).orElseThrow(() -> ApiException.notFound("Vehicle not found."));
        validate(changes);

        Optional<Vehicle> clash = findByRegNo(changes.getRegNo());
        if (clash.isPresent() && !clash.get().getId().equals(id)) {
            throw ApiException.conflict("Vehicle " + changes.getRegNo() + " is already registered.");
        }

        changes.setId(id);
        changes.setCurrentStatus(existing.getCurrentStatus());
        if (changes.getRegistrationStatus() == null) changes.setRegistrationStatus(existing.getRegistrationStatus());
        repo.update(COLLECTION, id, toMap(changes));
        return changes;
    }

    /** Flip ACTIVE/INACTIVE. An inactive vehicle is refused at the gate. */
    public Vehicle toggleRegistration(String id) throws Exception {
        Vehicle vehicle = findById(id).orElseThrow(() -> ApiException.notFound("Vehicle not found."));
        String next = "ACTIVE".equals(vehicle.getRegistrationStatus()) ? "INACTIVE" : "ACTIVE";
        repo.update(COLLECTION, id, Map.of("registrationStatus", next));
        vehicle.setRegistrationStatus(next);
        return vehicle;
    }

    public void updateStatus(String id, String currentStatus) throws Exception {
        repo.update(COLLECTION, id, Map.of("currentStatus", currentStatus));
    }

    public List<Vehicle> search(String regNo, String owner, String currentStatus, String registrationStatus) throws Exception {
        String reg = normalizeRegNo(regNo).toLowerCase();
        return findAll().stream().filter(v ->
            (reg.isBlank() || v.getRegNo().toLowerCase().contains(reg)) &&
            (owner == null || owner.isBlank() || v.getOwner().toLowerCase().contains(owner.toLowerCase())) &&
            (currentStatus == null || currentStatus.isBlank() || currentStatus.equals(v.getCurrentStatus())) &&
            (registrationStatus == null || registrationStatus.isBlank() || registrationStatus.equals(v.getRegistrationStatus()))
        ).collect(Collectors.toList());
    }

    /** Normalises the fields in place and rejects anything that should not be stored. */
    private void validate(Vehicle v) {
        v.setRegNo(normalizeRegNo(v.getRegNo()));
        v.setOwner(trim(v.getOwner()));
        v.setContact(trim(v.getContact()).replaceAll("[\\s-]", ""));
        v.setModel(trim(v.getModel()));
        v.setColor(trim(v.getColor()));

        if (!REG_NO.matcher(v.getRegNo()).matches()) {
            throw ApiException.badRequest("Enter a valid registration number, e.g. MH12AB1234.");
        }
        if (v.getOwner().length() < 2) {
            throw ApiException.badRequest("Owner name is required.");
        }
        if (!CONTACT.matcher(v.getContact()).matches()) {
            throw ApiException.badRequest("Contact must be a 10–13 digit phone number.");
        }
        if (v.getType() == null || !TYPES.contains(v.getType())) {
            throw ApiException.badRequest("Vehicle type must be one of " + String.join(", ", new TreeSet<>(TYPES)) + ".");
        }
        if (v.getRegistrationStatus() != null && !REG_STATUSES.contains(v.getRegistrationStatus())) {
            throw ApiException.badRequest("Registration status must be ACTIVE or INACTIVE.");
        }
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private Vehicle toVehicle(Map<String, Object> m) {
        return Vehicle.builder()
                .id((String) m.get("id"))
                .regNo((String) m.get("regNo"))
                .owner((String) m.get("owner"))
                .contact((String) m.get("contact"))
                .type((String) m.get("type"))
                .model((String) m.get("model"))
                .color((String) m.get("color"))
                .registrationStatus((String) m.get("registrationStatus"))
                .currentStatus((String) m.get("currentStatus"))
                .build();
    }

    private Map<String, Object> toMap(Vehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("regNo", v.getRegNo());
        m.put("owner", v.getOwner());
        m.put("contact", v.getContact());
        m.put("type", v.getType());
        m.put("model", v.getModel());
        m.put("color", v.getColor());
        m.put("registrationStatus", v.getRegistrationStatus());
        m.put("currentStatus", v.getCurrentStatus());
        return m;
    }
}
