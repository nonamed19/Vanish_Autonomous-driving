package com.moonshot.remote_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
public class InitPaymentHistoryRequest {

    @NotBlank(message = "주차장 이름은 필수 입력 값입니다.")
    private String parkingLotName;

    @NotNull(message = "기본요금은 필수 입력 값입니다.")
    private BigDecimal baseFee;

    @NotNull(message = "단위요금은 필수 입력 값입니다.")
    private BigDecimal rateFee;
}
