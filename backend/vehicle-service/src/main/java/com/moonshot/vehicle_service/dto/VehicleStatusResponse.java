package com.moonshot.vehicle_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class VehicleStatusResponse {
    private String vehicleVin;
    private boolean isParked;
    private String engineStatus;
    private String timestamp;
    private double distanceToLot; // 차량과 주차장 사이의 거리 (m 단위)
    private double distanceToCar; // 차량과 클라이언트(사람) 사이의 거리 (m 단위)
    private double speedKmh; // 차량의 속도 (km/h)
}
