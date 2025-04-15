package com.moonshot.remote_service.dto;

import jakarta.validation.constraints.NotNull;

public class CurrentLocationDto {

    @NotNull(message = "위도는 필수 입력 값입니다.")
    private Double latitude;

    @NotNull(message = "경도는 필수 입력 값입니다.")
    private Double longitude;

    public CurrentLocationDto() {}

    public CurrentLocationDto(Double latitude, Double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
}
