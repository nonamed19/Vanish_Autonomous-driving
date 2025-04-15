// RemoteVehicleGoalRequestDto.java
package com.moonshot.remote_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

public class RemoteVehicleGoalRequestDto {

    @Setter
    @Getter
    @NotNull(message = "현재 위치 정보는 필수입니다.")
    private LocationDto currentLocation;

    // 선택: 없으면 즉시 출발
    @Getter
    private String requestTime; // ISO8601 형식

    public RemoteVehicleGoalRequestDto() {
    }

    public RemoteVehicleGoalRequestDto(LocationDto currentLocation, String requestTime) {
        this.currentLocation = currentLocation;
        this.requestTime = requestTime;
    }

    public void setRequestTime(String requestTime) {
        this.requestTime = requestTime;
    }

    // 중첩 DTO: 위치 정보
    public static class LocationDto {
        @NotNull(message = "위도는 필수입니다.")
        private Double latitude;

        @NotNull(message = "경도는 필수입니다.")
        private Double longitude;

        public LocationDto() {
        }

        public LocationDto(Double latitude, Double longitude) {
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
}
