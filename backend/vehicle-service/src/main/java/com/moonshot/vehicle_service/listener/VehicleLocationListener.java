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

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleLocationListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;

    /**
     * RabbitMQ의 "vehicle.location.queue" 큐를 구독하여 위치 데이터를 처리합니다.
     *
     * @param message 수신된 메시지 (JSON 형식)
     */
    @RabbitListener(queues = "vehicle.location.queue")
    public void handleLocationMessage(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String vehicleVin = requiredText(node, "vehicleVin");
            double latitude = requiredFiniteNumber(node, "latitude");
            double longitude = requiredFiniteNumber(node, "longitude");
            String timestamp = requiredText(node, "timestamp");
            LocalDateTime receivedAt = parseTimestamp(timestamp);

            // Redis에 저장할 키 구성: "vehicle:{vehicleVin}:location"
            String key = "vehicle:" + vehicleVin + ":location";
            HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
            hashOps.putAll(key, Map.of(
                    "latitude", latitude,
                    "longitude", longitude,
                    "timestamp", receivedAt.toString()
            ));
            // 오래된 텔레메트리가 현재 위치처럼 표시되는 것을 막습니다.
            redisTemplate.expire(key, 5, TimeUnit.MINUTES);
            log.debug("Updated vehicle location for vin={}", vehicleVin);

            // GpsInfoResponse DTO 생성
            GpsInfoResponse gpsInfo = new GpsInfoResponse(latitude, longitude, receivedAt);
            // 웹소켓 클라이언트에 실시간 위치 업데이트 전송
            webSocketService.sendVehicleLocationUpdate(vehicleVin, gpsInfo);
        } catch (Exception e) {
            log.error("Error processing location message", e);
        }
    }

    private String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing " + field);
        }
        return value.asText();
    }

    private double requiredFiniteNumber(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isNumber() || !Double.isFinite(value.asDouble())) {
            throw new IllegalArgumentException("Invalid " + field);
        }
        return value.asDouble();
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            return OffsetDateTime.parse(timestamp).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.parse(timestamp);
        }
    }
}
