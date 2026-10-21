package com.svems.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Movement {
    private String id;
    private String vehicleId;
    private String regNo;
    private String owner;
    private String type;         // ENTRY, EXIT
    private String gate;
    private String entryTime;
    private String exitTime;
    private String stayDuration;
    private String operator;
    private String status;       // VALID
}
