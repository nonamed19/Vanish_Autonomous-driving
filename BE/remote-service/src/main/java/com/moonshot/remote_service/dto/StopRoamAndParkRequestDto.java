package com.moonshot.remote_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public class StopRoamAndParkRequestDto {

    @Valid
    @NotNull(message = "차량 위치는 필수 입력 값입니다.")
    private LocationDto vehicleLocation;

    @Valid
    @NotNull(message = "사용자 위치는 필수 입력 값입니다.")
    private LocationDto userLocation;

    public StopRoamAndParkRequestDto() {
    }

    public StopRoamAndParkRequestDto(LocationDto vehicleLocation, LocationDto userLocation) {
        this.vehicleLocation = vehicleLocation;
        this.userLocation = userLocation;
    }

    public LocationDto getVehicleLocation() {
        return vehicleLocation;
    }

    public void setVehicleLocation(LocationDto vehicleLocation) {
        this.vehicleLocation = vehicleLocation;
    }

    public LocationDto getUserLocation() {
        return userLocation;
    }

    public void setUserLocation(LocationDto userLocation) {
        this.userLocation = userLocation;
    }
}
