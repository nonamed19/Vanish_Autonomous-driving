package com.moonshot.remote_service.dto;

public class ParkingLotResponseDto {

    private String parkingLotName;
    private String address;
    private double latitude;
    private double longitude;
    private String congestion;
    private String baseFee;
    private String rateFee;
    private String distance; // 사용자의 위치와 주차장 사이의 거리 (예: "0.1KM")

    public ParkingLotResponseDto() {
    }

    public ParkingLotResponseDto(String parkingLotName, String address, double latitude, double longitude,
                                 String congestion, String baseFee, String rateFee, String distance) {
        this.parkingLotName = parkingLotName;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.congestion = congestion;
        this.baseFee = baseFee;
        this.rateFee = rateFee;
        this.distance = distance;
    }

    public String getParkingLotName() {
        return parkingLotName;
    }

    public void setParkingLotName(String parkingLotName) {
        this.parkingLotName = parkingLotName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public String getCongestion() {
        return congestion;
    }

    public void setCongestion(String congestion) {
        this.congestion = congestion;
    }

    public String getBaseFee() {
        return baseFee;
    }

    public void setBaseFee(String baseFee) {
        this.baseFee = baseFee;
    }

    public String getRateFee() {
        return rateFee;
    }

    public void setRateFee(String rateFee) {
        this.rateFee = rateFee;
    }

    public String getDistance() {
        return distance;
    }

    public void setDistance(String distance) {
        this.distance = distance;
    }
}
