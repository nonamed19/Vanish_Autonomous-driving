package com.moonshot.vehicle_service.service;

import com.moonshot.vehicle_service.dto.*;
import com.moonshot.vehicle_service.entity.Vehicle;
import com.moonshot.vehicle_service.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Autowired
    public VehicleService(VehicleRepository vehicleRepository, RedisTemplate<String, Object> redisTemplate) {
        this.vehicleRepository = vehicleRepository;
        this.redisTemplate = redisTemplate;
    }

    /**
     * 차량 등록 처리
     *
     * @param ownerId JWT에서 추출한 회원 ID
     * @param request 차량 등록 요청 DTO
     */
    public void registerVehicle(Long ownerId, VehicleRegisterRequest request) {
        // 중복 차량 등록 검사: 동일한 VIN이 이미 존재하는지 확인
        if (vehicleRepository.existsById(request.getVehicleVin())) {
            throw new IllegalArgumentException("이미 등록된 차량입니다.");
        }

        Vehicle vehicle = Vehicle.builder()
                .vehicleVin(request.getVehicleVin())
                .ownerId(ownerId)
                .model(request.getModel())
                .vehicleName(request.getVehicleName())
                .registrationNum(request.getRegistrationNum())
                .ownership(request.getOwnership())
                .planId(1L) //임시 값
                .build();
        vehicleRepository.save(vehicle);
    }

    /**
     * 회원 소유 차량 정보 조회
     * @param ownerId 회원 ID
     * @return 조회된 차량 정보가 있으면 VehicleResponse, 없으면 예외 발생
     */
    public VehicleResponse getMyVehicle(Long ownerId) {
        Vehicle vehicle = vehicleRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("차량 정보가 존재하지 않습니다."));
        return new VehicleResponse(
                vehicle.getVehicleVin(),
                vehicle.getOwnerId(),
                vehicle.getModel(),
                vehicle.getVehicleName(),
                vehicle.getRegistrationNum(),
                vehicle.getOwnership(),
                vehicle.getRegisteredAt(),
                vehicle.getUpdatedAt()
        );
    }

    /**
     * 차량 주차 상태 변경 처리
     * 차량 VIN을 기준으로 차량을 조회하여, isParked 값을 업데이트합니다.
     *
     * @param request ParkingStateRequest DTO (차량 VIN, isParking 포함)
     * @return ApiResponse (성공 또는 실패 메시지)
     */
    public ApiResponse updateParkingState(ParkingStateRequest request) {
        // 입력 데이터 검증은 @Valid에서 처리한다고 가정
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(request.getVehicleVin());
        if (vehicleOpt.isEmpty()) {
            return new ApiResponse(false, "차량 정보 혹은 연결 상태 확인 필요");
        }
        Vehicle vehicle = vehicleOpt.get();
        vehicle.setParked(request.getIsParking());
        vehicleRepository.save(vehicle);
        return new ApiResponse(true, "차량 주차 상태 변환");
    }

    /**
     * Redis에 저장된 차량 위치 정보를 조회합니다.
     *
     * Redis 키: "vehicle:{vehicleVin}:location"
     * 해시 필드:
     *  - latitude: String (예: "37.5665")
     *  - longitude: String (예: "126.9780")
     *  - timestamp: ISO-8601 형식의 문자열 (예: "2025-03-14T12:34:56")
     *
     * @param vehicleVin 차량 차대번호
     * @return GpsInfoResponse 객체
     */
    public GpsInfoResponse getVehicleLocation(String vehicleVin) {
        String key = "vehicle:" + vehicleVin + ":location";
        HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
        // 키가 존재하지 않으면 예외 발생 또는 기본값 반환 처리 가능
        Object latObj = hashOps.get(key, "latitude");
        Object lngObj = hashOps.get(key, "longitude");
        Object tsObj = hashOps.get(key, "timestamp");

        if (latObj == null || lngObj == null || tsObj == null) {
            throw new IllegalArgumentException("해당 차량의 위치 정보가 존재하지 않습니다.");
        }

        double latitude = Double.parseDouble(latObj.toString());
        double longitude = Double.parseDouble(lngObj.toString());
        // LocalDateTime 파싱 (예시에서는 기본 ISO 형식을 가정)
        LocalDateTime timestamp = LocalDateTime.parse(tsObj.toString());

        return new GpsInfoResponse(latitude, longitude, timestamp);
    }

    /**
     * Redis에 저장된 차량 상태 정보를 조회합니다.
     *
     * Redis 키 예시: "vehicle:{vehicleVin}:status"
     *
     * @param vehicleVin 차량 차대번호
     * @return VehicleStatusResponse 객체
     */
    public VehicleStatusResponse getVehicleStatus(String vehicleVin, VehicleStatusRequest request) {
        String key = "vehicle:" + vehicleVin + ":status";
        HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
        Object parkedObj = hashOps.get(key, "isParked");
        Object engineStatusObj = hashOps.get(key, "engineStatus");
        Object tsObj = hashOps.get(key, "timestamp");
        Object speedKmhObj = hashOps.get(key, "speedKmh");

        if (parkedObj == null || engineStatusObj == null || tsObj == null || speedKmhObj == null) {
            throw new IllegalArgumentException("해당 차량의 상태 정보가 존재하지 않습니다.");
        }

        boolean isParked = Boolean.parseBoolean(parkedObj.toString());
        String engineStatus = engineStatusObj.toString();
        String timestamp = tsObj.toString();
        double speedKmh = Double.parseDouble(speedKmhObj.toString());

        // 차량 GPS (실제 차량 위치, carGps)
        double vehicleLat = request.getCarGps().getLatitude();
        double vehicleLon = request.getCarGps().getLongitude();

        // 클라이언트 GPS (일반 gps, 사용자의 위치)
        double clientLat = request.getGps().getLatitude();
        double clientLon = request.getGps().getLongitude();

        // 주차장 위치 (고정 좌표)
        double lotLat = 37.5665;
        double lotLon = 126.9780;

        double kmDistanceToCar = calculateDistance(vehicleLat, vehicleLon, clientLat, clientLon);
        double kmDistanceToLot = calculateDistance(vehicleLat, vehicleLon, lotLat, lotLon);

        // km를 미터로 변환
        double distanceToCar = kmDistanceToCar * 1000;
        double distanceToLot = kmDistanceToLot * 1000;

        return new VehicleStatusResponse(vehicleVin, isParked, engineStatus, timestamp, distanceToLot, distanceToCar, speedKmh);
    }

    /**
     * 두 지점 간의 거리를 Haversine 공식을 이용해 계산.
     * 거리는 km 단위로 반환.
     *
     * @param lat1 첫 번째 지점의 위도
     * @param lon1 첫 번째 지점의 경도
     * @param lat2 두 번째 지점의 위도
     * @param lon2 두 번째 지점의 경도
     * @return 두 지점 간의 거리 (km)
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // 지구의 반지름 (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public VehicleDto getVehicleByVin(String vehicleVin) {
        Vehicle vehicle =  vehicleRepository.getVehicleByVehicleVin(vehicleVin);
        VehicleDto vehicleDto = new VehicleDto();
        vehicleDto.setVehicleVin(vehicle.getVehicleVin());
        vehicleDto.setOwnerId(vehicle.getOwnerId());
        return vehicleDto;
    }
}
