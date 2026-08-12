package com.moonshot.notification_service.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.moonshot.notification_service.client.RemoteParkingLotClient;
import com.moonshot.notification_service.client.RemoteVehicleClient;
import com.moonshot.notification_service.dto.FcmTokenRequest;
import com.moonshot.notification_service.dto.NotificationRequestDto;
import com.moonshot.notification_service.dto.ParkingLotDto;
import com.moonshot.notification_service.dto.VehicleDto;
import com.moonshot.notification_service.entity.FcmToken;
import com.moonshot.notification_service.repository.FcmTokenRepository;
import com.moonshot.notification_service.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class NotificationService {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private FcmTokenRepository fcmTokenRepository;

    private final RemoteParkingLotClient remoteParkingLotClient;

    private final RemoteVehicleClient remoteVehicleClient;

    public NotificationService(RemoteParkingLotClient remoteParkingLotClient, RemoteVehicleClient remoteVehicleClient) {
        this.remoteParkingLotClient = remoteParkingLotClient;
        this.remoteVehicleClient = remoteVehicleClient;
    }

    // JWT 토큰과 FCM Token Request를 받아서 처리하는 메서드
    public void processFcmToken(String bearerToken, FcmTokenRequest request) {
        String token = extractToken(bearerToken);
        if (token != null && tokenProvider.validateToken(token)) {
            Long userId = tokenProvider.extractUserNo(token, false);
            saveNotification(userId, request);
        } else {
            // 토큰이 유효하지 않을 경우 예외 처리
            throw new RuntimeException("Invalid or missing JWT token");
        }
    }

    // Bearer 접두사 제거
    private String extractToken(String bearerToken) {
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7).trim();
        }
        return bearerToken;
    }

    // 추출한 사용자 ID와 FCM Token을 DB에 저장
    private void saveNotification(Long userId, FcmTokenRequest request) {
        // 해당 사용자에 대해 이미 등록된 토큰 목록 조회
        List<FcmToken> tokens = fcmTokenRepository.findByUserId(userId);

        // 동일한 토큰이 존재하는지 확인
        for (FcmToken token : tokens) {
            if (token.getToken().equals(request.getFcmToken())) {
                // 이미 존재하면 저장하지 않고 메서드를 종료합니다.
                return;
            }
        }

        // 동일한 토큰이 없으면 새로 저장
        FcmToken notification = new FcmToken();
        notification.setUserId(userId);
        notification.setToken(request.getFcmToken());
        fcmTokenRepository.save(notification);
    }

    /**
     * 헤더에 포함된 JWT를 사용해 사용자 ID를 추출하고, 해당 사용자의 FCM 토큰으로 푸쉬 알림을 전송합니다.
     */
    public String sendPushNotification(String bearerToken, NotificationRequestDto requestDto) {
        String token = extractToken(bearerToken);
        if (token == null || !tokenProvider.validateToken(token)) {
            throw new RuntimeException("Invalid or missing JWT token");
        }
        Long userId = tokenProvider.extractUserNo(token, false);

        // DB에서 해당 사용자의 FCM 토큰 조회
        List<FcmToken> tokens = fcmTokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            throw new RuntimeException("User id " + userId + "에 대한 FCM 토큰을 찾을 수 없습니다.");
        }

        // 각 토큰에 대해 개별 메시지 전송
        for (FcmToken fcmToken : tokens) {
            Message message = Message.builder()
                    .setToken(fcmToken.getToken())
                    .setNotification(Notification.builder()
                            .setTitle(requestDto.getTitle())
                            .setBody(requestDto.getBody())
                            .build())
                    .build();
            try {
                String response = FirebaseMessaging.getInstance().send(message);
                System.out.println("FCM 메시지 전송 성공 - Token: " + fcmToken.getToken() + ", Response: " + response);
            } catch (Exception e) {
                System.err.println("토큰 " + fcmToken.getToken() + "에 알림 전송 실패: " + e.getMessage());
            }
        }
        return "모든 토큰으로 알림 전송 완료";
    }


    public void sendParkingCompleteNotification(String vehicleVin, String parkingLotId) {
        // 1. remote-service에서 주차장 정보 조회 (DTO 사용)
        ParkingLotDto parkingLot = remoteParkingLotClient.getParkingLotById(parkingLotId);
        if (parkingLot == null) {
            throw new RuntimeException("Parking lot not found with id: " + parkingLotId);
        }

        // 2. vehicle-service에 Feign Client를 사용해서 차량 정보 조회
        VehicleDto vehicle = remoteVehicleClient.getVehicleByVin(vehicleVin);
        if (vehicle == null) {
            throw new RuntimeException("Vehicle not found: " + vehicleVin);
        }
        Long ownerId = vehicle.getOwnerId();

        // 3. FcmTokenRepository를 통해 해당 사용자의 FCM 토큰 조회
        List<FcmToken> tokens = fcmTokenRepository.findByUserId(ownerId);

        // 4. 주차장 정보를 포함한 푸쉬 알림 메시지 생성
        String message = createNotificationMessage(parkingLot);

        // 5. 모든 FCM 토큰으로 푸쉬 알림 전송 (실제 FCM 전송 로직은 구현 필요)
        tokens.forEach(token -> pushNotification(token.getToken(), message));
    }

    private String createNotificationMessage(ParkingLotDto parkingLot) {
        // 주차장 이름, 주소, 초기 금액, 시간당 금액, 혼잡도 포함 메시지 생성
        int baseFeeInt = (int) Double.parseDouble(parkingLot.getBaseFee());
        int rateFeeInt = (int) Double.parseDouble(parkingLot.getRateFee());

        return String.format("주차 완료: %s (%s). 요금: 초기 %s, 시간당 %s, 혼잡도 %s",
                parkingLot.getParkingLotName(),
                parkingLot.getAddress(),
                String.format("%d원", baseFeeInt),
                String.format("%d원", rateFeeInt),
                parkingLot.getCongestion());
    }

    private void pushNotification(String fcmToken, String message) {
        Message msg = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder()
                        .setTitle("주차 완료 알림")
                        .setBody(message)
                        .build())
                .build();
        try {
            String response = FirebaseMessaging.getInstance().send(msg);
            log.info("FCM 메시지 전송 성공 - Token: " + fcmToken + ", Response: " + response);
        } catch (Exception e) {
            log.info("토큰 " + fcmToken + "에 알림 전송 실패: " + e.getMessage());
        }
    }

}
