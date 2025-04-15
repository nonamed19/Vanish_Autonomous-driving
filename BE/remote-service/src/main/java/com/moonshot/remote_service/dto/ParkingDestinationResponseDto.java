package com.moonshot.remote_service.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ParkingDestinationResponseDto {
    private boolean success;
    private String message;
    private List<ParkingLotDto> nearestParkingLots;
    private List<ParkingLotDto> cheapestParkingLots;

    public ParkingDestinationResponseDto() {}

    public ParkingDestinationResponseDto(boolean success, String message, List<ParkingLotDto> nearestParkingLots, List<ParkingLotDto> cheapestParkingLots) {
        this.success = success;
        this.message = message;
        this.nearestParkingLots = nearestParkingLots;
        this.cheapestParkingLots = cheapestParkingLots;
    }
}
