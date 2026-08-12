// RemoteVehicleGoalResponseDto.java
package com.moonshot.remote_service.dto;

public class RemoteVehicleGoalResponseDto {

    private boolean success;
    private String message;
    private VehicleCurrentLocationDto vehicleCurrentLocation;

    // getters, setters, constructors

    public RemoteVehicleGoalResponseDto() {
    }

    public RemoteVehicleGoalResponseDto(boolean success, String message, VehicleCurrentLocationDto vehicleCurrentLocation) {
        this.success = success;
        this.message = message;
        this.vehicleCurrentLocation = vehicleCurrentLocation;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public VehicleCurrentLocationDto getVehicleCurrentLocation() {
        return vehicleCurrentLocation;
    }

    public void setVehicleCurrentLocation(VehicleCurrentLocationDto vehicleCurrentLocation) {
        this.vehicleCurrentLocation = vehicleCurrentLocation;
    }

    // 내부 DTO: 차량 현재 위치 정보
    public static class VehicleCurrentLocationDto {
        private Double latitude;
        private Double longitude;
        private String timestamp; // 도착 예정 시각

        public VehicleCurrentLocationDto() {
        }

        public VehicleCurrentLocationDto(Double latitude, Double longitude, String timestamp) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.timestamp = timestamp;
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

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }
    }
}
