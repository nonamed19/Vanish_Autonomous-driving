package com.moonshot.remote_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RemoteVehicleRoamRequestDto {
    @NotBlank(message = "차량 VIN은 필수 입력 값입니다.")
    private String vehicleVin;

    @NotNull(message = "배회 시간은 필수 입력 값입니다.")
    private Long roamDuration; // 배회 지속 시간 (분 단위)
    
}
