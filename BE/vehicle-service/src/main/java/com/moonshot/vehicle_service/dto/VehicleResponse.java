package com.moonshot.vehicle_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class VehicleResponse {
    private String vehicleVin;      // 차량 차대번호
    private Long ownerId;           // 소유주 (회원) ID
    private String model;           // 차종
    private String vehicleName;     // 차량 이름
    private String registrationNum;
    private String ownership;
    private LocalDateTime registeredAt; // 차량 등록 일시
    private LocalDateTime updatedAt;    // 차량 수정 일시
}
