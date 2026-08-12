package com.moonshot.notification_service.controller;

import com.moonshot.notification_service.dto.FcmTokenRequest;
import com.moonshot.notification_service.dto.NotificationRequestDto;
import com.moonshot.notification_service.dto.ParkingCompleteRequest;
import com.moonshot.notification_service.service.NotificationService;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * FCM 토큰 등록 API
     *
     * 클라이언트는 로그인 후, API Gateway에서 추출한 사용자 ID를 "X-User-Id" 헤더로 전달할 수 있습니다.
     *
     * @param userId  사용자 ID (API Gateway 또는 클라이언트에서 전달)
     * @param request FcmTokenRequest DTO (FCM 토큰 포함)
     * @return FCM 토큰 등록 성공 메시지
     */
    @PostMapping("/fcm-token")
    public ResponseEntity<String> registerFcmToken(@RequestBody FcmTokenRequest request,
                                                   @RequestHeader("Authorization") String bearerToken) {
        notificationService.processFcmToken(bearerToken, request);
        return ResponseEntity.ok("FCM token registered successfully");
    }

    /**
     * JWT를 헤더에 포함하여 푸쉬 알림 전송 요청
     * 예시:
     *   Header: Authorization: Bearer <JWT 토큰>
     *   Body (JSON):
     *   {
     *     "title": "테스트 알림",
     *     "body": "이것은 테스트 푸쉬 알림입니다."
     *   }
     */
    @PostMapping("/push")
    public ResponseEntity<String> sendPushNotification(
            @RequestHeader("Authorization") String authorization,
            @RequestBody NotificationRequestDto requestDto) {
        String result = notificationService.sendPushNotification(authorization, requestDto);
        return ResponseEntity.ok(result);
    }


    /**
     * 주차 완료 푸쉬 알림 전송 API
     * <p>
     * 클라이언트가 차량 식별번호(vehicleVin)와 주차장 고유 아이디를 포함한 요청을 전송하면,
     * 아래와 같은 처리를 수행합니다:
     * <ol>
     *   <li>notificationService를 호출하여, Feign Client를 통해 remote-service에서 주차장 정보를 조회합니다.</li>
     *   <li>Feing Client를 통해 vehicle-service에서 차량 정보를 조회하여 소유자(ownerId)를 확인합니다.</li>
     *   <li>FcmTokenRepository를 사용해 해당 소유자의 모든 FCM 토큰을 조회합니다.</li>
     *   <li>주차장 정보 (이름, 주소, 요금 등)를 포함한 푸쉬 알림 메시지를 생성한 뒤,
     *       조회된 모든 FCM 토큰으로 푸쉬 알림을 전송합니다.</li>
     * </ol>
     * <p>
     * 쿼리 파라미터:
     *   vehicleVin - 차량 식별번호 (예: 1HGCM82633A123456)
     * <p>
     * 요청 본문 (JSON):
     * {
     *   "parkingLotId": 주차장 고유 아이디
     * }
     *
     * @param vehicleVin 차량 식별번호 (Query Parameter)
     * @param request  주차장 고유 아이디를 포함한 요청 본문 (JSON)
     * @return "푸쉬 알림 전송 완료" 메시지를 포함한 ResponseEntity
     */
    @PostMapping("/parking-complete")
    public ResponseEntity<String> sendParkingCompleteNotification(
            @RequestParam("vehicleVin") String vehicleVin,
            @RequestBody ParkingCompleteRequest request) {

        notificationService.sendParkingCompleteNotification(vehicleVin, request.getParkingLotId());
        return ResponseEntity.ok("푸쉬 알림 전송 완료");
    }
}
