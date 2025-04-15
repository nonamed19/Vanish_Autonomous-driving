package com.moonshot.vehicle_service.service;

import com.moonshot.vehicle_service.dto.GpsInfoResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * 웹소켓을 통해 차량 위치 데이터를 전송합니다.
     *
     * @param vehicleVin 차량 VIN
     * @param gpsInfo 최신 GPS 정보
     */
    public void sendVehicleLocationUpdate(String vehicleVin, GpsInfoResponse gpsInfo) {
        // 클라이언트가 /topic/vehicle-location/{vehicleVin}으로 구독한다고 가정
        String destination = "/topic/vehicle-location/" + vehicleVin;
        messagingTemplate.convertAndSend(destination, gpsInfo);
    }
}
