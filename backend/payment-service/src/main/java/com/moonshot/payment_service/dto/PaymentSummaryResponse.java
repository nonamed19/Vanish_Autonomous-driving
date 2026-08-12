package com.moonshot.payment_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@Builder
public class PaymentSummaryResponse {

    @NotBlank(message = "주차장 이름은 필수 입력 값입니다.")
    private String parkingLotName;

    @NotNull(message = "입차 시각은 필수 입력 값입니다.")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "Asia/Seoul")
    private LocalDateTime parkingStart;

    @NotNull(message = "출차 시각은 필수 입력 값입니다.")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss", timezone = "Asia/Seoul")
    private LocalDateTime parkingEnd;

    @Min(value = 0, message = "총 주차 시간은 0 이상이어야 합니다.")
    private int parkingDuration;

    @NotNull(message = "총 결제 금액은 필수 입력 값입니다.")
    private BigDecimal totalFee;

    @NotNull(message = "기본요금은 필수 입력 값입니다.")
    private BigDecimal baseFee;

    @NotNull(message = "단위요금은 필수 입력 값입니다.")
    private BigDecimal rateFee;
}
