package com.moonshot.remote_service.service;

import com.moonshot.remote_service.client.NotificationClient;
import com.moonshot.remote_service.client.PaymentClient;
import com.moonshot.remote_service.client.VehicleClient;
import com.moonshot.remote_service.dto.*;
import com.moonshot.remote_service.dto.RemoteVehicleGoalResponseDto.VehicleCurrentLocationDto;
import com.moonshot.remote_service.entity.ParkingLot;
import com.moonshot.remote_service.entity.RoamTask;
import com.moonshot.remote_service.repository.ParkingLotRepository;
import com.moonshot.remote_service.repository.RoamTaskRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Slf4j
@Service
public class RemoteVehicleService {

    private final RabbitTemplate rabbitTemplate;
    private final ParkingLotRepository parkingLotRepository;
    private final TaskScheduler taskScheduler;
    private final NotificationClient notificationServiceClient;
    private final VehicleClient vehicleClient;
    private final PaymentClient paymentClient;
    private final RoamTaskRepository roamTaskRepository;
    // 필드에 추가 (예: RemoteVehicleService)
    private final Map<String, List<ScheduledFuture<?>>> scheduledTasks = new ConcurrentHashMap<>();

    @Value("${spring.rabbitmq.destination.routingKey}")
    private String goalRoutingKey;

    @Value("${spring.rabbitmq.destination.exchange}")
    private String remoteExchange;

    @Value("${spring.rabbitmq.ros.routingKey}")
    private String rosRoutingKey;

    @Value("${spring.rabbitmq.roam.routingKey}")
    private String roamRoutingKey;

    public RemoteVehicleService(RabbitTemplate rabbitTemplate, ParkingLotRepository parkingLotRepository, TaskScheduler taskScheduler, NotificationClient notificationServiceClient, VehicleClient vehicleClient, PaymentClient paymentClient, RoamTaskRepository roamTaskRepository) {
        this.rabbitTemplate = rabbitTemplate;
        this.parkingLotRepository = parkingLotRepository;
        this.taskScheduler = taskScheduler;
        this.notificationServiceClient = notificationServiceClient;
        this.vehicleClient = vehicleClient;
        this.paymentClient = paymentClient;
        this.roamTaskRepository = roamTaskRepository;
    }

    public RemoteVehicleGoalResponseDto setRemoteVehicleGoal(RemoteVehicleGoalRequestDto requestDto) {
        // 메시지 구성 예시: "destination|latitude|longitude|requestTime"
        // requestTime이 없으면 빈 문자열("")로 전달
        String timeStr = (requestDto.getRequestTime() != null && !requestDto.getRequestTime().isEmpty())
                ? requestDto.getRequestTime() : "";
        String message;
        if(timeStr == null || timeStr.isEmpty()) {
            message = String.format("destination|%f|%f",
                    requestDto.getCurrentLocation().getLatitude(),
                    requestDto.getCurrentLocation().getLongitude());
        }
        else{
            message = String.format("destination|%f|%f|%s",
                    requestDto.getCurrentLocation().getLatitude(),
                    requestDto.getCurrentLocation().getLongitude(),
                    timeStr);
        }
        Object response = rabbitTemplate.convertSendAndReceive(remoteExchange, goalRoutingKey, message);

        if (response != null) {
            // 반환된 response가 byte[]인 경우 이를 문자열로 변환
            String responseStr;
            if (response instanceof byte[]) {
                responseStr = new String((byte[])response, StandardCharsets.UTF_8);
            } else {
                responseStr = response.toString();
            }
            log.info("Received response string: {}", responseStr);

            String[] parts = responseStr.split("\\|");
            log.info("Split response into {} parts: {}", parts.length, java.util.Arrays.toString(parts));

            if (parts.length == 3) {
                try {
                    Double currentLat = Double.parseDouble(parts[0]);
                    Double currentLon = Double.parseDouble(parts[1]);
                    String eta = parts[2];
                    VehicleCurrentLocationDto vehicleCurrentLocation =
                            new VehicleCurrentLocationDto(currentLat, currentLon, eta);
                    return new RemoteVehicleGoalResponseDto(true, "원격 호출 목적지 설정 성공", vehicleCurrentLocation);
                } catch (NumberFormatException e) {
                    log.error("응답 메시지 파싱 중 숫자 변환 오류: {}", e.getMessage());
                    return new RemoteVehicleGoalResponseDto(false, "응답 메시지 형식 오류", null);
                }
            } else {
                log.error("응답 메시지 토큰 수 오류. 기대값: 3, 실제값: {}", parts.length);
                return new RemoteVehicleGoalResponseDto(false, "응답 메시지 형식 오류", null);
            }
        } else {
            log.error("응답이 없습니다.");
            return new RemoteVehicleGoalResponseDto(false, "응답이 없습니다.", null);
        }
    }

    public ParkingDestinationResponseDto getRemoteParkingDestination(ParkingDestinationRequestDto requestDto) {
        double latitude = requestDto.getDestination().getLatitude();
        double longitude = requestDto.getDestination().getLongitude();
        double radius = 5000; // 5km 반경

        List<ParkingLot> nearestList = parkingLotRepository.findTop2NearestParkingLotsWithinRadius(longitude, latitude, radius);
        List<ParkingLotDto> nearestDtos = new ArrayList<>();
        nearestList.forEach(parkingLot -> nearestDtos.add(convertToDto(parkingLot, latitude, longitude)));

        List<ParkingLot> cheapestList = parkingLotRepository.findTop2CheapestParkingLotsWithinRadius(longitude, latitude, radius);
        List<ParkingLotDto> cheapestDtos = new ArrayList<>();
        cheapestList.forEach(parkingLot -> cheapestDtos.add(convertToDto(parkingLot, latitude, longitude)));

        if (nearestDtos.isEmpty() && cheapestDtos.isEmpty()) {
            return new ParkingDestinationResponseDto(false, "주차장 리스트 조회 실패. 입력 정보를 확인해 주세요.", null, null);
        }
        return new ParkingDestinationResponseDto(true, "근처 주차장 리스트 조회 성공", nearestDtos, cheapestDtos);
    }

    private ParkingLotDto convertToDto(ParkingLot parkingLot, double destLat, double destLng) {
        double lng = parkingLot.getLocation().getX();
        double lat = parkingLot.getLocation().getY();
        double distance = calculateDistance(destLat, destLng, lat, lng);
        String congestionText = getCongestionText(parkingLot.getCongestion());
        return new ParkingLotDto(
                parkingLot.getId().toString(),
                parkingLot.getName(),
                parkingLot.getAddress(),
                lat,
                lng,
                congestionText,
                parkingLot.getBaseFee().toString(),
                parkingLot.getRateFee().toString(),
                String.format("%.1fKM", distance)
        );
    }

    private String getCongestionText(Integer congestion) {
        if (congestion == null) return "정보없음";
        if (congestion >= 80) return "혼잡";
        else if (congestion >= 50) return "보통";
        else return "여유";
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * 주차 명령 메시지를 ROS로 전달하는 메서드 (위도, 경도를 기반)
     */
    public void sendParkingInstruction(String AuthToken, double latitude, double longitude) {
        // 메시지 구성 형식 예시: "PARKING|latitude|longitude"
        ParkingLot parkingLot = parkingLotRepository.findByLatitudeAndLongtitude(latitude,longitude);
        if (parkingLot == null) {
            throw new IllegalStateException("해당 위치에 주차장이 존재하지 않습니다.");
        }
        InitPaymentHistoryRequest request = new InitPaymentHistoryRequest();
        request.setParkingLotName(parkingLot.getName());
        request.setBaseFee(parkingLot.getBaseFee());
        request.setRateFee(parkingLot.getRateFee());

        String token = AuthToken;

        ResponseEntity<String> response = paymentClient.registerInitHistory(token, request);

        String message = String.format("PARKING|%f|%f", latitude, longitude);
        rabbitTemplate.convertAndSend(remoteExchange, rosRoutingKey, message);
    }

    // 배회 요청 처리 (토큰은 저장하지 않고, 매개변수로 전달)
    public RemoteVehicleRoamResponseDto processRoamRequest(RemoteVehicleRoamRequestDto requestDto, Long userNo, String token) {
        Instant startTime = Instant.now();
        Instant endTime = startTime.plusSeconds(requestDto.getRoamDuration() * 60);
        String message = "Roam";
        rabbitTemplate.convertAndSend(remoteExchange, roamRoutingKey, message);

        // RoamTask에는 토큰을 저장하지 않음
        Optional<RoamTask> existingTaskOpt = roamTaskRepository.findByVehicleVin(requestDto.getVehicleVin());

        RoamTask task = new RoamTask();
        task.setVehicleVin(requestDto.getVehicleVin());
        task.setUserNo(userNo);
        task.setRoamStartTime(startTime);
        task.setRoamEndTime(endTime);
        task.setBoarded(false);
        task.setUserResponded(false);

        if (existingTaskOpt.isPresent()) {
            // 기존 엔티티가 있다면 필요한 필드를 갱신
            RoamTask existingTask = existingTaskOpt.get();
            existingTask.setExtendedRoamEndTime(task.getExtendedRoamEndTime());
            existingTask.setRoamEndTime(task.getRoamEndTime());
            existingTask.setRoamStartTime(task.getRoamStartTime());
            existingTask.setUserNo(task.getUserNo());
            // 업데이트 처리
            roamTaskRepository.save(existingTask);
        }else {
            roamTaskRepository.save(task);
        }

        // 종료시각에 상태 체크 예약, token 전달하고 ScheduledFuture 저장
        ScheduledFuture<?> future = taskScheduler.schedule(() -> checkRoamStatusAndNotify(task.getId(), token, requestDto.getVehicleVin()), Date.from(endTime));
        scheduledTasks.computeIfAbsent(requestDto.getVehicleVin(), k -> new ArrayList<>())
                .add(future);

        return new RemoteVehicleRoamResponseDto(true, "배회 시작됨. 지정된 시간 동안 차량이 배회합니다.");
    }

    // 배회 종료 후 첫 번째 알림 처리 (토큰을 매개변수로 전달)
    private void checkRoamStatusAndNotify(Long taskId, String token, String vehicleVin) {
        Optional<RoamTask> opt = roamTaskRepository.findById(taskId);
        if (opt.isEmpty()) return;
        RoamTask task = opt.get();
        if (task.isBoarded()) return;

        // 버튼 액션 정보를 구성합니다.
        Map<String, String> actions = Map.of(
                "yes", "KEEP_ROAM",
                "no", "PARKING_API"
        );
        NotificationRequestDto notifDto = new NotificationRequestDto(
                "[배회 중 알림]",
                "배회 요청 시간이 지났습니다.",
                actions
        );
        notificationServiceClient.sendPushNotification(token, notifDto);

        long originalDuration = task.getRoamEndTime().getEpochSecond() - task.getRoamStartTime().getEpochSecond();
        Instant secondCheckTime = task.getRoamEndTime().plusSeconds(originalDuration);

        // 두 번째 알림 예약 및 ScheduledFuture 저장
        ScheduledFuture<?> secondFuture = taskScheduler.schedule(() -> checkUserResponseAndPark(task.getId(), token, vehicleVin), Date.from(secondCheckTime));
        scheduledTasks.computeIfAbsent(task.getVehicleVin(), k -> new ArrayList<>()).add(secondFuture);
    }

    // 두 번째 알림 처리 (토큰 전달)
    private void checkUserResponseAndPark(Long taskId, String token, String vehicleVin) {
        Optional<RoamTask> opt = roamTaskRepository.findById(taskId);
        if (opt.isEmpty()) return;
        RoamTask task = opt.get();
        if (task.isUserResponded()) return;

        NotificationRequestDto noti = new NotificationRequestDto(
                "[자동 주차 안내]",
                "지정 시간이 지나 자동으로 주차장으로 이동합니다.",
                null
        );
        stopRoamService(vehicleVin, token);
        notificationServiceClient.sendPushNotification(token, noti);

        List<ParkingLot> lots = parkingLotRepository.findTop2NearestParkingLotsWithinRadius(126.5628378, 37.5249278, 5000);
        if (!lots.isEmpty()) {
            ParkingLot parkingLot = lots.get(0);
            double latitude = parkingLot.getLocation().getY();
            double longitude = parkingLot.getLocation().getX();
            sendParkingInstruction(token, latitude, longitude);
        }

        // 두 번째 알림 후 RoamTask 삭제
        roamTaskRepository.delete(task);
    }


    // 배회 연장 요청 시, 토큰을 함께 전달받아 스케줄러 콜백에 사용
    public void handleUserResponse(String vehicleVin, long additionalTime, String token) {
        Optional<RoamTask> optionalTask = roamTaskRepository.findByVehicleVin(vehicleVin);
        if (optionalTask.isEmpty()) {
            return;
        }
        RoamTask task = optionalTask.get();
        task.setUserResponded(true);

        Instant newRoamEndTime = task.getRoamEndTime().plusSeconds(additionalTime * 60);
        task.setExtendedRoamEndTime(newRoamEndTime);

        // RoamTask에는 토큰을 저장하지 않음
        Optional<RoamTask> existingTaskOpt = roamTaskRepository.findByVehicleVin(task.getVehicleVin());

        if (existingTaskOpt.isPresent()) {
            // 기존 엔티티가 있다면 필요한 필드를 갱신
            RoamTask existingTask = existingTaskOpt.get();
            existingTask.setExtendedRoamEndTime(task.getExtendedRoamEndTime());
            existingTask.setRoamEndTime(task.getRoamEndTime());
            existingTask.setRoamStartTime(task.getRoamStartTime());
            existingTask.setUserNo(task.getUserNo());
            // 업데이트 처리
            roamTaskRepository.save(existingTask);
        }else {
            roamTaskRepository.save(task);
        }

        ScheduledFuture<?> additionalFuture = taskScheduler.schedule(() -> checkRoamStatusAndNotify(task.getId(), token, vehicleVin), Date.from(newRoamEndTime));
        scheduledTasks.computeIfAbsent(vehicleVin, k -> new ArrayList<>()).add(additionalFuture);
    }

    public void stopRoamService(@NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin, String authorization) {
        String message = "Stop";
        rabbitTemplate.convertAndSend(remoteExchange, roamRoutingKey, message);

        // 예약된 스케줄 작업 취소
        List<ScheduledFuture<?>> futures = scheduledTasks.get(vehicleVin);
        if (futures != null) {
            for (ScheduledFuture<?> future : futures) {
                future.cancel(true);
            }
            scheduledTasks.remove(vehicleVin);
        }

        // 해당 RoamTask 삭제
        Optional<RoamTask> optionalTask = roamTaskRepository.findByVehicleVin(vehicleVin);
        optionalTask.ifPresent(task -> roamTaskRepository.delete(task));
    }

    /**
     * 배회 중지 및 차량 위치와 사용자 위치를 기반으로 가장 가까운 주차장을 찾아
     * 주차 명령 메시지를 전송한 후, 해당 주차장의 정보를 리스폰스로 반환하는 메서드.
     *
     * @param vehicleVin 차량 VIN
     * @param authorization JWT 토큰 (또는 인증 문자열)
     * @param vehicleLat 차량의 현재 위도
     * @param vehicleLon 차량의 현재 경도
     * @param userLat 사용자의 현재 위도
     * @param userLon 사용자의 현재 경도
     * @return ParkingLotResponseDto - 주차장 이름, 주소, 위치, 혼잡도, 기본/추가 요금 및
     *         사용자의 위치와 주차장 사이의 거리 정보를 포함한 DTO.
     */
    public ParkingLotResponseDto stopRoamAndPark(@NotBlank(message = "차량 VIN은 필수 입력 값입니다.") String vehicleVin,
                                                 String authorization,
                                                 double vehicleLat,
                                                 double vehicleLon,
                                                 double userLat,
                                                 double userLon) {
        // 1. 배회 중지 처리
        stopRoamService(vehicleVin, authorization);

        // 2. 차량 위치를 기준으로 주차장 검색 (5km 반경)
        double radius = 5000;
        List<ParkingLot> parkingLots = parkingLotRepository.findTop2NearestParkingLotsWithinRadius(vehicleLon, vehicleLat, radius);
        if (parkingLots.isEmpty()) {
            log.warn("No parking lot found within radius {} for vehicle location (lat={}, lon={})", radius, vehicleLat, vehicleLon);
            return null;
        }
        ParkingLot nearest = parkingLots.get(0);
        // 주차장의 위치 정보 (ParkingLot 엔티티에서는 위도는 Y, 경도는 X)
        double parkingLat = nearest.getLocation().getY();
        double parkingLon = nearest.getLocation().getX();

        // 3. 주차 명령 메시지를 전송
        sendParkingInstruction(authorization, parkingLat, parkingLon);
        log.info("Nearest parking lot found. Sending parking instruction to lat={}, lon={}", parkingLat, parkingLon);

        // 4. 사용자 위치와 주차장 위치 사이의 거리를 계산 (calculateDistance 메서드 활용)
        double distanceValue = calculateDistance(userLat, userLon, parkingLat, parkingLon);
        String distanceStr = String.format("%.1fKM", distanceValue);

        // 5. 조회된 주차장의 정보와 계산된 거리를 포함하여 ParkingLotResponseDto 생성
        ParkingLotResponseDto responseDto = new ParkingLotResponseDto(
                nearest.getName(),                             // parkingLotName
                nearest.getAddress(),                          // address
                parkingLat,                                    // latitude
                parkingLon,                                    // longitude
                getCongestionText(nearest.getCongestion()),    // congestion
                nearest.getBaseFee().toString(),               // baseFee
                nearest.getRateFee().toString(),               // rateFee
                distanceStr                                    // distance (사용자 위치와 주차장 사이)
        );
        return responseDto;
    }

    public ParkingLotDto getParkingLotById(String id) {
        // DB에서 ParkingLot 엔티티 조회 (없으면 예외 발생)
        ParkingLot parkingLot = parkingLotRepository.findById(Long.valueOf(id))
                .orElseThrow(() -> new RuntimeException("Parking lot not found with id: " + id));

        // 엔티티에서 DTO로 매핑
        ParkingLotDto dto = new ParkingLotDto();
        dto.setId(String.valueOf(parkingLot.getId()));
        dto.setParkingLotName(parkingLot.getName());
        dto.setAddress(parkingLot.getAddress());
        dto.setBaseFee(String.valueOf(parkingLot.getBaseFee()));
        dto.setRateFee(String.valueOf(parkingLot.getRateFee()));
        dto.setCongestion(String.valueOf(parkingLot.getCongestion()));
        return dto;
    }
}
