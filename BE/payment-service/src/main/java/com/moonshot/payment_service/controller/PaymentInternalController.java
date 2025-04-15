package com.moonshot.payment_service.controller;

import com.moonshot.payment_service.dto.ParkingStartRequest;
import com.moonshot.payment_service.feign.VehicleClient;
import com.moonshot.payment_service.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
@Slf4j
public class PaymentInternalController {

    private final VehicleClient vehicleClient;
    private final PaymentService paymentService;

    /**
     * 차량의 입차 정보를 ROS로부터 전달받아 등록 API
     * @param request
     * @return 입차 등록 성공 시 200 OK, 실패 시 400 또는 500 상태 코드 반환
     */
    @PostMapping("/parking-start")
    public ResponseEntity<String> registerParkingStartFromRos(@RequestBody ParkingStartRequest request) {
        try {
            // 1. 차대번호로 사용자 ID 조회
            Long ownerId = vehicleClient.getOwnerIdByVin(request.getVehicleVin());
            log.info("ROS 요청 - VIN: {}, 추출된 사용자 ID: {}", request.getVehicleVin(), ownerId);

            // 2. 입차 시각 등록 처리
            paymentService.registerParkingStart(ownerId, request);

            return ResponseEntity.ok("입차 등록 성공!");
        } catch (IllegalArgumentException e) {
            log.error("입차 등록 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body("입차 등록 실패: " + e.getMessage());
        } catch (Exception e) {
            log.error("입차 등록 중 예외 발생", e);
            return ResponseEntity.internalServerError().body("입차 등록 중 서버 오류");
        }
    }
}
