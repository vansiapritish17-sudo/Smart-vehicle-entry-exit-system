package com.svems.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {
    private String id;
    private String regNo;
    private String owner;
    private String contact;
    private String type;        // Car, Bike, SUV, Van, Scooter
    private String model;
    private String color;
    private String registrationStatus; // ACTIVE, INACTIVE
    private String currentStatus;      // INSIDE, OUTSIDE
}
