package com.moonshot.payment_service.service;

import com.moonshot.payment_service.dto.InitPaymentHistoryRequest;
import com.moonshot.payment_service.dto.ParkingStartRequest;
import com.moonshot.payment_service.dto.PaymentSummaryResponse;
import com.moonshot.payment_service.entity.PaymentHistory;
import com.moonshot.payment_service.feign.VehicleClient;
import com.moonshot.payment_service.publisher.VehicleCommandPublisher;
import com.moonshot.payment_service.repository.PaymentHistoryRepository;
import com.siot.IamportRestClient.IamportClient;
import com.siot.IamportRestClient.exception.IamportResponseException;
import com.siot.IamportRestClient.request.CancelData;
import com.siot.IamportRestClient.response.IamportResponse;
import com.siot.IamportRestClient.response.Payment;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentHistoryRepository paymentHistoryRepository;
    private final VehicleCommandPublisher vehicleCommandPublisher;
    private final VehicleClient vehicleClient;
    private IamportClient iamportClient;

    @Value("${imp.api}")
    private String apiKey;

    @Value("${imp.secretkey}")
    private String secretKey;

    @PostConstruct
    public void init() {
        // 환경 변수로부터 주입받은 키를 이용하여 IamportClient 초기화
        this.iamportClient = new IamportClient(apiKey, secretKey);
        log.info("IamportClient 초기화 완료: API Key = {}, Secret Key = {}", apiKey, secretKey);
    }

    /**
     * 초기 결제 내역 등록 처리
     * @param userId JWT에서 추출한 회원 ID
     * @param request 초기 결제 등록 요청 DTO
     */
    public void registerInitHistory(Long userId, InitPaymentHistoryRequest request){
        // 기존 status=I 결제 내역이 있다면 모두 취소 처리
        List<PaymentHistory> InitList = paymentHistoryRepository
                .findAllByUserIdAndStatus(userId, PaymentHistory.PaymentStatus.I);

        for (PaymentHistory old : InitList) {
            old.setStatus(PaymentHistory.PaymentStatus.C);
            paymentHistoryRepository.save(old);
        }

        log.info("userId={}의 초기 결제 내역 {}건을 취소했습니다.", userId, InitList.size());
    
        // 새로운 초기 결제 내역 등록
        PaymentHistory paymentHistory = PaymentHistory.builder()
                .userId(userId)
                .orderName(request.getParkingLotName())
                .baseFee(request.getBaseFee())
                .rateFee(request.getRateFee())
                .build();
        paymentHistoryRepository.save(paymentHistory);
    }

    /**
     * 입차 시각 등록 처리
     * @param userId JWT에서 추출한 회원 ID
     * @param request 입차 시각 DTO
     */
    public void registerParkingStart(Long userId, ParkingStartRequest request) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findByUserIdAndStatus(userId, PaymentHistory.PaymentStatus.valueOf("I"))
                .orElseThrow(() -> new IllegalArgumentException("결제 내역이 존재하지 않습니다."));
        paymentHistory.setParkingStart(request.getParkingStart());
        paymentHistory.setStatus(PaymentHistory.PaymentStatus.P);
        paymentHistoryRepository.save(paymentHistory);
    }

    /**
     * 예상 결제 내역 등록 처리
     * @param userId JWT에서 추출한 회원 ID
     */
    public PaymentSummaryResponse completePayment(Long userId) {
        PaymentHistory paymentHistory = paymentHistoryRepository.findByUserIdAndStatus(userId, PaymentHistory.PaymentStatus.valueOf("P"))
                .orElseThrow(() -> new IllegalArgumentException("결제 내역이 존재하지 않습니다."));
        LocalDateTime parkingEnd = LocalDateTime.now();
        log.info("[parkingEnd]: {}", parkingEnd);
        paymentHistory.setParkingEnd(parkingEnd);

        LocalDateTime parkingStartUTC = paymentHistory.getParkingStart();
        LocalDateTime parkingEndUTC = paymentHistory.getParkingEnd();
        log.info("[결제 로직] DB에서 조회한 parkingStart(UTC 가정): {}", parkingStartUTC);
        log.info("[결제 로직] DB에서 조회한 parkingEnd(UTC 가정): {}", parkingEndUTC);

        if(parkingStartUTC == null){
            throw new IllegalStateException("입차 시각이 등록되지 않아 결제를 완료할 수 없습니다.");
        }

        ZonedDateTime zoneStart = parkingStartUTC.atZone(ZoneId.of("UTC"));
        ZonedDateTime zoneEnd = parkingEndUTC.atZone(ZoneId.of("UTC"));
        log.info("[결제 로직] ZonedS UTC 시간: {}", zoneStart);
        log.info("[결제 로직] ZonedE UTC 시간: {}", zoneEnd);
        LocalDateTime parkingStartKst = zoneStart.withZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime();
        LocalDateTime parkingEndKst = zoneEnd.withZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime();
        log.info("[결제 로직] 변환된 KST 기준 parkingStart: {}", parkingStartKst);
        log.info("[결제 로직] 변환된 KST 기준 parkingEnd: {}", parkingEndKst);

        // 총 주차 시간 계산
        long durationMinutes = Duration.between(parkingStartKst, parkingEndKst).toMinutes();
        paymentHistory.setParkingDuration((int)durationMinutes);

        // 결제 요금 계산
        BigDecimal totalFee = paymentHistory.getBaseFee();
        if(durationMinutes > 30) {
            long extraMinutes = durationMinutes - 30;
            long extraUnits = (extraMinutes + 9) / 10;// 올림 처리
            BigDecimal additionalFee = paymentHistory.getRateFee().multiply(BigDecimal.valueOf(extraUnits));
            totalFee = totalFee.add(additionalFee);
        }
        paymentHistory.setPrice(totalFee);

        paymentHistoryRepository.save(paymentHistory);

        // 클라이언트에 반환할 결제 요약 정보
        PaymentSummaryResponse summary = PaymentSummaryResponse.builder()
                .parkingLotName(paymentHistory.getOrderName())
                .parkingStart(parkingStartKst)
                .parkingEnd(parkingEndKst)
                .parkingDuration(paymentHistory.getParkingDuration())
                .totalFee(totalFee)
                .baseFee(paymentHistory.getBaseFee())
                .rateFee(paymentHistory.getRateFee())
                .build();
        return summary;
    }

    /**
     * 아임포트 서버로부터 결제 정보를 검증하고, 결제 완료 처리를 진행
     * @param imp_uid 아임포트 결제 고유 식별자
     * @param userId 사용자 식별자
     * @return 검증된 결제 정보
     * @throws IamportResponseException
     * @throws IOException
     */
    public IamportResponse<Payment> validateIamport(String imp_uid, Long userId)
            throws IamportResponseException, IOException {
        PaymentHistory paymentHistory = paymentHistoryRepository.findByUserIdAndStatus(userId, PaymentHistory.PaymentStatus.P)
                .orElseThrow(() -> new IllegalArgumentException("결제 내역이 존재하지 않습니다."));

        IamportResponse<Payment> paymentResponse = iamportClient.paymentByImpUid(imp_uid);
        Payment iamportPayment = paymentResponse.getResponse();

        if (iamportPayment == null){
            log.error("아임포트로부터 결제 정보를 가져오지 못했습니다. imp_uid: {}", imp_uid);
            throw new IllegalStateException("결제 정보를 가져올 수 없습니다.");
        }

        paymentHistory.setOrderNo(iamportPayment.getMerchantUid());
        paymentHistory.setStatus(PaymentHistory.PaymentStatus.S);
        paymentHistory.setCompletedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")));
        paymentHistory.setTransactionId(imp_uid);
        paymentHistoryRepository.save(paymentHistory);

        log.info("DB 결제 내역 업데이트 완료. orderNo: {}, status: S, completedAt: {}",
                paymentHistory.getOrderNo(), paymentHistory.getCompletedAt());

        try {
            String vehicleVin = vehicleClient.getVehicleVinByOwnerId(userId);
            vehicleCommandPublisher.sendDepartureCommand(vehicleVin);
        } catch (Exception e) {
            log.warn("차량 출발 명령 전송 실패 - 결제는 성공했으나 ROS 통신에 문제가 발생: {}", e.getMessage());
        }

        return paymentResponse;
    }

    /**
     * 아임포트 서버로 결제 취소 요청을 보내고 취소 처리 진행
     * @param imp_uid 아임포트 결제 고유 식별자
     * @param userId 사용자 식별자
     * @return 취소된 결제 정보
     * @throws IamportResponseException
     * @throws IOException
     */
    public IamportResponse<Payment> cancelPayment(String imp_uid, Long userId)
            throws IamportResponseException, IOException {
        PaymentHistory paymentHistory = paymentHistoryRepository.findByUserIdAndStatus(userId, PaymentHistory.PaymentStatus.valueOf("S"))
                .orElseThrow(() -> new IllegalArgumentException("결제 내역이 존재하지 않습니다."));

        // 취소 요청 전 DB의 주문번호와 결제 정보의 주문번호가 일치하는지 확인
        String currentOrderNo = paymentHistory.getOrderNo();

        CancelData cancelData = new CancelData(imp_uid, true);
        IamportResponse<Payment> cancellationResponse = iamportClient.cancelPaymentByImpUid(cancelData);
        Payment canceledPayment = cancellationResponse.getResponse();

        if(canceledPayment == null){
            log.error("아임포트로부터 취소 정보를 가져오지 못했습니다. imp_uid: {}", imp_uid);
            throw new IllegalStateException("취소 정보를 가져올 수 없습니다.");
        }

        log.info("결제 취소 요청 응답. 취소 주문 번호: {}", canceledPayment.getMerchantUid());

        if(currentOrderNo.equals(canceledPayment.getMerchantUid())){
            paymentHistory.setStatus(PaymentHistory.PaymentStatus.C);
            paymentHistory.setCompletedAt(LocalDateTime.now());
            paymentHistoryRepository.save(paymentHistory);
            log.info("DB 결제 취소 업데이트 완료. orderNo: {}, status: C, completedAt: {}",
                    paymentHistory.getOrderNo(), paymentHistory.getCompletedAt());
        } else {
            log.warn("DB의 주문번호와 취소된 merchant_uid가 일치하지 않습니다. DB orderNo: {}, 취소 merchant_uid: {}",
                    currentOrderNo, canceledPayment.getMerchantUid());
        }

        return cancellationResponse;
    }

}
