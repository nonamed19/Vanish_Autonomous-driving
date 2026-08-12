package com.moonshot.payment_service.controller;

import com.moonshot.payment_service.dto.InitPaymentHistoryRequest;
import com.moonshot.payment_service.dto.ParkingStartRequest;
import com.moonshot.payment_service.dto.PaymentSummaryResponse;
import com.moonshot.payment_service.entity.PaymentHistory;
import com.moonshot.payment_service.feign.VehicleClient;
import com.moonshot.payment_service.service.PaymentService;
import com.moonshot.payment_service.util.JWTUtil;
import com.siot.IamportRestClient.IamportClient;
import com.siot.IamportRestClient.exception.IamportResponseException;
import com.siot.IamportRestClient.request.CancelData;
import com.siot.IamportRestClient.response.IamportResponse;
import com.siot.IamportRestClient.response.Payment;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@Slf4j
@Controller
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    private final JWTUtil jwtUtil;
    private final VehicleClient vehicleClient;

    /**
     * 초기 결제 정보 등록 API
     *
     * 클라이언트는 로그인 후, API Gateway에서 추출한 사용자 ID를 "X-user-Id" 헤더로 전달할 수 있습니다.
     *
     * @Param userId 사용자 ID (API Gateway 또는 클라이언트에서 전달)
     * @param request InitPaymentHistoryRequest DTO
     * @return 초기 결제 등록 성공 메시지
     */
    @PostMapping("/register/init-history")
    public ResponseEntity<String> registerInitHistory(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody InitPaymentHistoryRequest request){
        try {
            String token = jwtUtil.resolveToken(authorization);
            if (token == null || token.isEmpty()){
                return ResponseEntity.badRequest().body("등록 실패! (유효한 토큰이 없습니다.)");
            }
            // JWT에서 회원 ID 추출 (Access Token 처리, isRefreshToken=false)
            Long userId = jwtUtil.extractUserNo(token, false);
            log.info("userId: {}", userId);
            paymentService.registerInitHistory(userId, request);
            return ResponseEntity.ok("등록 성공!");

        } catch (IllegalArgumentException e) {
            log.error("초기 결제 내역 등록 오류: {}", e.getMessage());
            return ResponseEntity.badRequest().body("등록 실패! "+ e.getMessage());
        } catch (Exception e) {
            log.error("초기 결제 내역 등록 중 예외 발생", e);
            return ResponseEntity.internalServerError().body("등록 실패! 예외 발생");
        }
    }

    /**
     * 예상 결제 내역 등록 처리
     * @param authorization
     * @return
     */
    @PostMapping("/complete")
    public ResponseEntity<PaymentSummaryResponse> completePayment(@RequestHeader("Authorization") String authorization){
        try {
            String token = jwtUtil.resolveToken(authorization);
            if (token == null || token.isEmpty()){
                return ResponseEntity.badRequest().build();
            }
            Long userId = jwtUtil.extractUserNo(token, false);
            PaymentSummaryResponse summary = paymentService.completePayment(userId);
            return ResponseEntity.ok(summary);
        } catch (IllegalArgumentException e) {
            log.error("예상 결제 내역 등록 오류: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("예상 결제 내역 등록 중 예외 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 결제 검증 API
     * @param imp_uid 아임포트 결제 고유 식별자
     * @param authorization 요청 헤더의 JWT 토큰
     * @return 검증된 결제 정보 (JSON)
     */
    @PostMapping("/{imp_uid}")
    public ResponseEntity<?> validateIamport(
            @PathVariable String imp_uid,
            @RequestHeader("Authorization") String authorization) {
        try {
            String token = jwtUtil.resolveToken(authorization);
            if (token == null || token.isEmpty()) {
                return ResponseEntity.badRequest().body("유효한 토큰이 없습니다.");
            }
            Long userId = jwtUtil.extractUserNo(token, false);
            IamportResponse<Payment> payment = paymentService.validateIamport(imp_uid, userId);
            return ResponseEntity.ok(payment);
        } catch (IamportResponseException | IOException e) {
            log.error("결제 검증 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("결제 검증 중 오류가 발생했습니다.");
        }
    }

    /**
     * 결제 취소 API
     * @param imp_uid 아임포트 결제 고유 식별자
     * @param authorization 요청 헤더의 JWT 토큰
     * @return 취소된 결제 정보 (JSON)
     */
    @PostMapping("/cancel/{imp_uid}")
    public ResponseEntity<?> cancelPayment(
            @PathVariable String imp_uid,
            @RequestHeader("Authorization") String authorization) {
        try {
            String token = jwtUtil.resolveToken(authorization);
            if (token == null || token.isEmpty()) {
                return ResponseEntity.badRequest().body("유효한 토큰이 없습니다.");
            }
            Long userId = jwtUtil.extractUserNo(token, false);
            IamportResponse<Payment> cancellationResponse = paymentService.cancelPayment(imp_uid, userId);
            return ResponseEntity.ok(cancellationResponse);
        } catch (IamportResponseException | IOException e) {
            log.error("결제 취소 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("결제 취소 중 오류가 발생했습니다.");
        } catch (Exception e) {
            log.error("알 수 없는 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("알 수 없는 오류가 발생했습니다.");
        }
    }
}
