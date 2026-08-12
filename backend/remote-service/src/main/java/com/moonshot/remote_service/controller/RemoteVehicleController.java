package com.moonshot.remote_service.controller;

import com.moonshot.remote_service.client.VehicleClient;
import com.moonshot.remote_service.dto.*;
import com.moonshot.remote_service.service.RemoteVehicleService;
import com.moonshot.remote_service.util.JWTUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/remote")
public class RemoteVehicleController {

    private final RemoteVehicleService remoteVehicleService;
    private final JWTUtil jwtUtil;
    private final VehicleClient vehicleClient;

    public RemoteVehicleController(RemoteVehicleService remoteVehicleService, JWTUtil jwtUtil, VehicleClient vehicleClient) {
        this.remoteVehicleService = remoteVehicleService;
        this.jwtUtil = jwtUtil;
        this.vehicleClient = vehicleClient;
    }

    /**
     * 원격 호출 목적지 설정 API (JWT 적용)
     *
     * @param authorization "Bearer {accessToken}" 헤더
     * @param vehicleVin 차량 VIN (쿼리 파라미터)
     * @param requestDto 원격 호출 요청 DTO
     * @return RemoteVehicleGoalResponseDto (성공 시 차량 상태 정보 포함)
     */
    @PostMapping("/destination")
    public ResponseEntity<RemoteVehicleGoalResponseDto> setRemoteVehicleGoal(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @jakarta.validation.constraints.NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @Validated @RequestBody RemoteVehicleGoalRequestDto requestDto) {

        // JWT 토큰 추출 및 검증
        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // vehicle service 호출하여 소유 차량 정보 조회
        VehicleResultResponse vehicleResult = vehicleClient.getMyVehicle(authorization);
        if (vehicleResult == null || vehicleResult.getVehicle() == null ||
                !Objects.equals(vehicleResult.getVehicle().getVehicleVin(), vehicleVin)) {
            // 차량 소유자가 아니라면 인가 실패 처리
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // 원격 호출 처리
        RemoteVehicleGoalResponseDto responseDto = remoteVehicleService.setRemoteVehicleGoal(requestDto);
        if (responseDto.isSuccess()) {
            return ResponseEntity.ok(responseDto);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseDto);
        }
    }

    /**
     * 근처 주차장 조회 API
     *
     * 요청 예시:
     * POST /api/v1/remote/parking/destination?vehicleVin=1HGCM82633A123123
     * Body:
     * {
     *   "destination": {
     *     "latitude": 37.5665,
     *     "longitude": 126.9780
     *   }
     * }
     *
     * @param vehicleVin 차량 VIN (쿼리 파라미터)
     * @param requestDto 목적지 좌표를 포함한 요청 본문
     * @return 주차장 리스트 조회 결과
     */
    @PostMapping("/parking/destination")
    public ResponseEntity<ParkingDestinationResponseDto> getRemoteParkingDestination(
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @Valid @RequestBody ParkingDestinationRequestDto requestDto) {

        ParkingDestinationResponseDto responseDto = remoteVehicleService.getRemoteParkingDestination(requestDto);
        if (responseDto.isSuccess()) {
            return ResponseEntity.ok(responseDto);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(responseDto);
        }
    }

    /**
     * 선택한 주차장(위도, 경도)을 ROS로 전달하는 API
     *
     * 요청 예시:
     * POST /api/v1/remote/parking/choose?vehicleVin=1HGCM82633A123456
     * Header: Authorization: Bearer jwtTokenHere
     * Body:
     * {
     *   "destination": {
     *     "latitude": 37.5665,
     *     "longitude": 126.9780
     *   }
     * }
     */
    @PostMapping("/parking/choose")
    public ResponseEntity<String> chooseParkingLot(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @Valid @RequestBody ParkingDestinationRequestDto requestDto) {

        // JWT 토큰 추출 및 검증
        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("유효한 JWT 토큰이 없습니다.");
        }

        // 차량 소유 정보 조회 및 검증
        VehicleResultResponse vehicleResult = vehicleClient.getMyVehicle(authorization);
        if (vehicleResult == null || vehicleResult.getVehicle() == null ||
                !Objects.equals(vehicleResult.getVehicle().getVehicleVin(), vehicleVin)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("차량 소유 인증에 실패하였습니다.");
        }

        double latitude = requestDto.getDestination().getLatitude();
        double longitude = requestDto.getDestination().getLongitude();

        // 좌표 정보를 이용해 ROS에 주차 명령 메시지를 전송합니다.
        remoteVehicleService.sendParkingInstruction(authorization, latitude, longitude);
        return ResponseEntity.ok("요청 성공");
    }


    /**
     * 차량 배회 요청 API (JWT 적용)
     * 요청 예시:
     * POST /api/v1/remote/roam?vehicleVin=1HGCM82633A123456
     * Header: Authorization: Bearer jwtTokenHere
     * Body:
     * {
     *   "vehicleVin": "1HGCM82633A123456",
     *   "roamDuration": 5    // 배회 지속 시간 (분 단위)
     * }
     */
    @PostMapping("/roam")
    public ResponseEntity<RemoteVehicleRoamResponseDto> roamVehicle(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @Valid @RequestBody RemoteVehicleRoamRequestDto requestDto) {

        // JWT 토큰 추출 및 검증
        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body(new RemoteVehicleRoamResponseDto(false, "유효한 JWT 토큰이 없습니다."));
        }
        // VehicleClient 등을 통해 차량 소유 여부를 추가 검증할 수 있음
        // 차량 VIN 일관성 체크
        if (!requestDto.getVehicleVin().equals(vehicleVin)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new RemoteVehicleRoamResponseDto(false, "요청 본문과 쿼리 파라미터의 차량 VIN이 일치하지 않습니다."));
        }
        // JWT 토큰에서 사용자 번호 추출
        Long userNo = jwtUtil.extractUserNo(token, false);

        // 배회 요청 처리 (배회 시간은 분 단위로 입력되며, 내부에서는 초 단위로 변환 처리)
        RemoteVehicleRoamResponseDto responseDto = remoteVehicleService.processRoamRequest(requestDto, userNo, authorization);
        return ResponseEntity.ok(responseDto);
    }

    /**
     * 사용자 배회 연장 요청 API (JWT 적용)
     * 요청 예시:
     * POST /api/v1/remote/roam/extend?vehicleVin=1HGCM82633A123456
     * Header: Authorization: Bearer jwtTokenHere
     * Body:
     * {
     *   "additionalTime": 3   // 추가 배회 시간 (분 단위)
     * }
     */
    @PostMapping("/roam/extend")
    public ResponseEntity<String> extendRoam(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @RequestBody Map<String, Long> requestBody) {

        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("유효한 JWT 토큰이 없습니다.");
        }
        Long additionalTime = requestBody.get("additionalTime");
        if (additionalTime == null || additionalTime <= 0) {
            return ResponseEntity.badRequest().body("추가 배회 시간은 양수여야 합니다.");
        }
        remoteVehicleService.handleUserResponse(vehicleVin, additionalTime, authorization);
        return ResponseEntity.ok("배회가 " + additionalTime + "분 연장되었습니다.");
    }

    /**
     * 배회 중지 API (JWT 적용)
     * 요청 예시:
     * POST /api/v1/remote/roam/stop?vehicleVin=1HGCM82633A123456
     * Header: Authorization: Bearer jwtTokenHere
     */
    @PostMapping("/roam/stop")
    public ResponseEntity<String> stopRoam(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin) {

        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("유효한 JWT 토큰이 없습니다.");
        }

        remoteVehicleService.stopRoamService(vehicleVin, authorization);
        return ResponseEntity.ok("배회가 종료되었습니다.");
    }

    /**
     * 배회 중지 및 차량, 사용자 위치를 기반으로 가장 가까운 주차장을 찾아 주차 명령 메시지를 전송하고,
     * 선택된 주차장의 정보를 리스폰스로 반환하는 API (JWT 적용)
     *
     * 요청 예시:
     * POST /api/v1/remote/roam/stop-parking?vehicleVin=1HGCM82633A123456
     * Header: Authorization: Bearer jwtTokenHere
     * Body:
     * {
     *    "vehicleLocation": {
     *         "latitude": 37.5665,
     *         "longitude": 126.9780
     *    },
     *    "userLocation": {
     *         "latitude": 37.5651,
     *         "longitude": 126.9895
     *    }
     * }
     *
     * 리스폰스 예시:
     * {
     *    "parkingLotName": "인천 시티 주차장",
     *    "address": "인천광역시 서구 시티동 50",
     *    "latitude": 37.5238596,
     *    "longitude": 126.56211564,
     *    "congestion": "여유",
     *    "baseFee": "4600.00",
     *    "rateFee": "420.00",
     *    "distance": "0.1KM"
     * }
     */
    @PostMapping("/roam/stop-parking")
    public ResponseEntity<ParkingLotResponseDto> stopRoamAndPark(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("vehicleVin") @NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
            @Valid @RequestBody StopRoamAndParkRequestDto request) {

        String token = jwtUtil.resolveToken(authorization);
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        ParkingLotResponseDto responseDto = remoteVehicleService.stopRoamAndPark(
                vehicleVin,
                authorization,
                request.getVehicleLocation().getLatitude(),
                request.getVehicleLocation().getLongitude(),
                request.getUserLocation().getLatitude(),
                request.getUserLocation().getLongitude()
        );

        return ResponseEntity.ok(responseDto);
    }

    @GetMapping("/parking-lots/{id}")
    ParkingLotDto getParkingLotById(@PathVariable("id") String id){
        ParkingLotDto responseDto = remoteVehicleService.getParkingLotById(id);
        return responseDto;
    }
}
