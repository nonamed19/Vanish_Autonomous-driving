package com.moonshot.vehicle_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class GpsInfoResponse {
    private double latitude;
    private double longitude;
    private LocalDateTime timestamp;
}
