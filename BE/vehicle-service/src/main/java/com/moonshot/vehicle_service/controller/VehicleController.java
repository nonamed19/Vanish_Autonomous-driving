package com.moonshot.vehicle_service.controller;

import com.moonshot.vehicle_service.dto.*;
import com.moonshot.vehicle_service.service.VehicleService;
import com.moonshot.vehicle_service.util.JWTUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;
    private final JWTUtil jwtUtil;

    /**
     * 차량 등록 API
     *
     * 클라이언트는 Authorization 헤더에 담긴 JWT에서 회원 ID를 추출하고,
     * 차량 등록 정보를 전송한다.
     * 검증 및 등록에 성공하면 "등록 성공!" 메시지를, 오류 발생 시 "등록 실패!" 메시지를 반환한다.
     *
     * @param authorization "Bearer {accessToken}" 형식의 헤더
     * @param request       차량 등록 요청 DTO
     * @return 성공 시 "등록 성공!", 실패 시 "등록 실패!" 메시지
     */
    @PostMapping("/register")
    public ResponseEntity<String> registerVehicle(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody VehicleRegisterRequest request) {
        try {
            String token = jwtUtil.resolveToken(authorization);
            if (token == null || token.isEmpty()) {
                return ResponseEntity.badRequest().body("등록 실패! (유효한 토큰이 없습니다.)");
            }
            // JWT에서 회원 ID 추출 (Access Token 처리, isRefreshToken=false)
            Long ownerId = jwtUtil.extractUserNo(token, false);
            log.info("ownerId: {}", ownerId);
            vehicleService.registerVehicle(ownerId, request);
            return ResponseEntity.ok("등록 성공!");
        } catch (IllegalArgumentException e) {
            log.error("차량 등록 오류: {}", e.getMessage());
            return ResponseEntity.badRequest().body("등록 실패! " + e.getMessage());
        } catch (Exception e) {
            log.error("차량 등록 중 예외 발생", e);
            return ResponseEntity.internalServerError().body("등록 실패! 예외 발생");
        }
    }

    /**
     * 본인 소유 차량 정보 조회 API
     * 쿼리 파라미터(model, vin)를 이용해 사용자의 차량 정보를 조회합니다.
     * JWT 토큰에서 회원 ID를 추출하여, 해당 회원의 소유 차량만 조회합니다.
     *
     * @param authorization "Bearer {accessToken}" 헤더
     * @return 성공 시 차량 정보 DTO, 실패 시 오류 메시지
     */
    @GetMapping("/my")
    public ResponseEntity<VehicleResultResponse> getMyVehicle(@RequestHeader("Authorization") String authorization) {
        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Long ownerId = jwtUtil.extractUserNo(token, false);
        VehicleResponse vehicle = vehicleService.getMyVehicle(ownerId);
        VehicleResultResponse response = new VehicleResultResponse(
                true,
                "본인 소유 차량 정보 조회 성공",
                vehicle
        );
        return ResponseEntity.ok(response);
    }

    /**
     * 차량 주차 상태 변경 API
     *
     * 요청 본문에 포함된 차량 VIN과 주차 상태(isParking)를 기반으로,
     * 해당 차량의 주차 상태를 변경합니다.
     *
     * @param request ParkingStateRequest DTO
     * @return ApiResponse (성공 시 "차량 주차 상태 변환", 실패 시 오류 메시지)
     */
    @PostMapping("/parking-state")
    public ResponseEntity<ApiResponse> updateParkingState(
            @Valid @RequestBody ParkingStateRequest request) {
        ApiResponse response = vehicleService.updateParkingState(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 차량 현재 위치 조회 API (JWT 적용)
     *
     * 쿼리 파라미터로 전달된 차량 VIN을 기반으로,
     * Redis에 저장된 최신 GPS 정보를 조회하여 반환합니다.
     *
     * @param authorization "Bearer {accessToken}" 헤더
     * @param vehicleVin 차량 차대번호 (필수)
     * @return VehicleLocationResponse (성공 시 위치 정보 포함)
     */
    @GetMapping("/location")
    public ResponseEntity<VehicleLocationResponse> getVehicleLocation(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin) {
        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Long ownerId = jwtUtil.extractUserNo(token, false);

        //소유자 확인 로직을 추가 (VehicleService에서 본인 소유 차량 여부 확인)
        VehicleResponse vehicleResponse = vehicleService.getMyVehicle(ownerId);
        if (!vehicleResponse.getVehicleVin().equals(vehicleVin)) {
            return ResponseEntity.badRequest().body(
                    new VehicleLocationResponse(false, "해당 차량은 본인 소유의 차량이 아닙니다.", null));
        }

        try {
            GpsInfoResponse gps = vehicleService.getVehicleLocation(vehicleVin);
            VehicleLocationResponse response = new VehicleLocationResponse(true, "현재 차량 위치 조회 성공", gps);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            VehicleLocationResponse response = new VehicleLocationResponse(false, e.getMessage(), null);
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 차량 상태 조회 API (JWT 적용)
     *
     * @param authorization "Bearer {accessToken}" 헤더
     * @param vehicleVin 차량 차대번호
     * @return VehicleStatusResponse (성공 시 상태 정보 포함)
     */
    @PostMapping("/status")
    public ResponseEntity<VehicleStatusResponse> getVehicleStatus(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @RequestBody @Valid VehicleStatusRequest statusRequest) {

        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Long ownerId = jwtUtil.extractUserNo(token, false);

        // 소유자 확인 (해당 차량이 사용자의 차량인지)
        VehicleResponse vehicleResponse = vehicleService.getMyVehicle(ownerId);
        if (!vehicleResponse.getVehicleVin().equals(vehicleVin)) {
            return ResponseEntity.badRequest().build();
        }

        try {
            VehicleStatusResponse response = vehicleService.getVehicleStatus(vehicleVin, statusRequest);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/by-vin")
    VehicleDto getVehicleByVin(@RequestParam("vehicleVin") String vehicleVin){
        return vehicleService.getVehicleByVin(vehicleVin);
    }
}