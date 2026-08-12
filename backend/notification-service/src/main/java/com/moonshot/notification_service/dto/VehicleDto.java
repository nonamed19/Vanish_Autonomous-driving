package com.moonshot.notification_service.dto;

public class VehicleDto {
    private String vehicleVin;
    private Long ownerId;

    // Getter, Setter
    public String getVehicleVin() {
        return vehicleVin;
    }
    public void setVehicleVin(String vehicleVin) {
        this.vehicleVin = vehicleVin;
    }
    public Long getOwnerId() {
        return ownerId;
    }
    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }
}
