package com.moonshot.notification_service.dto;

public class ParkingCompleteRequest {
    private String parkingLotId;

    public String getParkingLotId() {
        return parkingLotId;
    }

    public void setParkingLotId(String parkingLotId) {
        this.parkingLotId = parkingLotId;
    }
}
