package com.moonshot.vehicle_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ParkingStateRequest {
    @NotBlank(message = "차량 VIN은 필수 입력 값입니다.")
    private String vehicleVin;

    // JSON으로 "true"나 "false"가 전달되면 Boolean 타입으로 매핑
    private Boolean isParking;
}
