package com.svems.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Configuration {
    private int maximumCapacity;
    private int alertThreshold;   // percentage, e.g. 80
    private List<Gate> gates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Gate {
        private String id;
        private String name;
        private String status;    // ACTIVE, MAINTENANCE, INACTIVE
    }
}
