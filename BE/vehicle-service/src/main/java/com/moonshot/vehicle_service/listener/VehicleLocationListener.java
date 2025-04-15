package com.moonshot.vehicle_service.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moonshot.vehicle_service.dto.GpsInfoResponse;
import com.moonshot.vehicle_service.service.WebSocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleLocationListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * RabbitMQ의 "vehicle.location.queue" 큐를 구독하여 위치 데이터를 처리합니다.
     *
     * @param message 수신된 메시지 (JSON 형식)
     */
    @RabbitListener(queues = "vehicle.location.queue")
    public void handleLocationMessage(String message) {
        try {
            log.info("Received message: {}", message);
            // 메시지를 JSON 객체로 파싱
            JsonNode node = objectMapper.readTree(message);
            String vehicleVin = node.get("vehicleVin").asText();
            double latitude = node.get("latitude").asDouble();
            double longitude = node.get("longitude").asDouble();
            String timestamp = node.get("timestamp").asText();

            // Redis에 저장할 키 구성: "vehicle:{vehicleVin}:location"
            String key = "vehicle:" + vehicleVin + ":location";
            HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
            hashOps.put(key, "latitude", latitude);
            hashOps.put(key, "longitude", longitude);
            hashOps.put(key, "timestamp", timestamp);

            log.info("Updated Redis key {} with latitude={}, longitude={}, timestamp={}",
                    key, latitude, longitude, timestamp);

            // GpsInfoResponse DTO 생성
            GpsInfoResponse gpsInfo = new GpsInfoResponse(latitude, longitude, java.time.OffsetDateTime.parse(timestamp).toLocalDateTime());
            // 웹소켓 클라이언트에 실시간 위치 업데이트 전송
            webSocketService.sendVehicleLocationUpdate(vehicleVin, gpsInfo);
        } catch (Exception e) {
            log.error("Error processing location message", e);
        }
    }
}
