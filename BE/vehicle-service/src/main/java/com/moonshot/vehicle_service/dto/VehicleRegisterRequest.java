package com.moonshot.vehicle_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class VehicleRegisterRequest {
    @NotBlank(message = "차량 VIN은 필수 입력 값입니다.")
    private String vehicleVin;

    @NotBlank(message = "차종은 필수 입력 값입니다.")
    private String model;

    @NotBlank(message = "차량 이름은 필수 입력 값입니다.")
    private String vehicleName;

    @NotBlank(message = "차량 등록번호는 필수 입력 값입니다.")
    private String registrationNum;

    @NotBlank(message = "차량 소유 형태는 필수 입력 값입니다.")
    private String ownership;

}
