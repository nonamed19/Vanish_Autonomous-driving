package com.moonshot.vehicle_service.dto;

import jakarta.validation.*;
import jakarta.validation.constraints.NotNull;

public class VehicleStatusRequest {

    @NotNull(message = "gps 정보는 필수입니다.")
    @Valid
    private Location gps;

    @NotNull(message = "carGps 정보는 필수입니다.")
    @Valid
    private Location carGps;

    // inner class로 좌표 정보를 정의
    public static class Location {
        @NotNull(message = "위도는 필수 입력 값입니다.")
        private Double latitude;

        @NotNull(message = "경도는 필수 입력 값입니다.")
        private Double longitude;

        // 기본 생성자, getter, setter
        public Location() {
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

    // 기본 생성자, getter, setter
    public VehicleStatusRequest() {
    }

    public Location getGps() {
        return gps;
    }

    public void setGps(Location gps) {
        this.gps = gps;
    }

    public Location getCarGps() {
        return carGps;
    }

    public void setCarGps(Location carGps) {
        this.carGps = carGps;
    }
}
