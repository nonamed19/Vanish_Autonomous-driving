package com.moonshot.remote_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
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

    public ParkingLotDto() {}

}
