package com.moonshot.notification_service.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ParkingLotDto {
    private String id;
    private String parkingLotName;
    private String address;
    private Double latitude;
    private Double longitude;
    private String congestion;
    private String baseFee;
    private String rateFee;
    private String distance;
}
