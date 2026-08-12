package com.moonshot.remote_service.dto;

import jakarta.validation.constraints.NotNull;

public class ParkingDestinationRequestDto {

    @NotNull(message = "목적지 좌표 정보는 필수입니다.")
    private DestinationDto destination;

    // 기본 생성자, getter, setter

    public ParkingDestinationRequestDto() {}

    public ParkingDestinationRequestDto(DestinationDto destination) {
        this.destination = destination;
    }

    public DestinationDto getDestination() {
        return destination;
    }

    public void setDestination(DestinationDto destination) {
        this.destination = destination;
    }

    public static class DestinationDto {
        @NotNull(message = "위도는 필수입니다.")
        private Double latitude;
        @NotNull(message = "경도는 필수입니다.")
        private Double longitude;

        public DestinationDto() {}

        public DestinationDto(Double latitude, Double longitude) {
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
