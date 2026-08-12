package com.moonshot.payment_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ParkingStartRequest {

    @NotNull(message = "입차 시각은 필수 입력 값입니다.")
    private LocalDateTime parkingStart;

    @NotBlank(message = "차대번호는 필수 입력 값입니다.")
    private String vehicleVin;
}
