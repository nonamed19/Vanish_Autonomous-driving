package com.moonshot.vehicle_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class VehicleLocationResponse {
    private boolean success;
    private String message;
    private GpsInfoResponse gps;
}
