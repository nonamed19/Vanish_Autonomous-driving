package com.moonshot.vehicle_service.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleStatusListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * RabbitMQ의 "vehicle.status.queue" 큐를 구독하여 차량 상태 데이터를 처리합니다.
     *
     * @param message 수신된 메시지 (JSON 형식)
     */
    @RabbitListener(queues = "vehicle.status.queue")
    public void handleStatusMessage(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            String vehicleVin = requiredText(node, "vehicleVin");
            boolean isParked = requiredBoolean(node, "isParked");
            String engineStatus = requiredText(node, "engineStatus");
            double speedKmh = requiredFiniteNumber(node, "speedKmh");
            String timestamp = requiredText(node, "timestamp");

            // Redis에 저장할 키 구성: "vehicle:{vehicleVin}:status"
            String key = "vehicle:" + vehicleVin + ":status";
            HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
            hashOps.putAll(key, Map.of(
                    "isParked", isParked,
                    "engineStatus", engineStatus,
                    "speedKmh", speedKmh,
                    "timestamp", timestamp
            ));
            redisTemplate.expire(key, 5, TimeUnit.MINUTES);
            log.debug("Updated vehicle status for vin={}", vehicleVin);
        } catch (Exception e) {
            log.error("Error processing status message", e);
        }
    }

    private String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.asText().isBlank()) {
            throw new IllegalArgumentException("Missing " + field);
        }
        return value.asText();
    }

    private boolean requiredBoolean(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isBoolean()) {
            throw new IllegalArgumentException("Invalid " + field);
        }
        return value.asBoolean();
    }

    private double requiredFiniteNumber(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isNumber() || !Double.isFinite(value.asDouble())) {
            throw new IllegalArgumentException("Invalid " + field);
        }
        return value.asDouble();
    }
}
