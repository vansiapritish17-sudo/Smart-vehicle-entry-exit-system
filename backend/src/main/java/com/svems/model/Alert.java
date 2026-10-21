package com.svems.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {
    private String id;
    private String vehicle;     // reg number
    private String type;        // UNAUTHORIZED_VEHICLE, INACTIVE_VEHICLE, DUPLICATE_ENTRY, INVALID_EXIT, CAPACITY_WARNING, CAPACITY_FULL
    private String severity;    // HIGH, MEDIUM, LOW
    private String description;
    private String time;
    private String status;      // OPEN, RESOLVED
    private String gate;
    private String resolvedBy;
    private String resolvedAt;
}
