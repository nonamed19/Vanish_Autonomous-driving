package com.moonshot.vehicle_service.listener;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleStatusListener {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * RabbitMQ의 "vehicle.status.queue" 큐를 구독하여 차량 상태 데이터를 처리합니다.
     *
     * @param message 수신된 메시지 (JSON 형식)
     */
    @RabbitListener(queues = "vehicle.status.queue")
    public void handleStatusMessage(String message) {
        try {
            log.info("Received status message: {}", message);
            // JSON 파싱
            JsonNode node = objectMapper.readTree(message);
            String vehicleVin = node.get("vehicleVin").asText();
            boolean isParked = node.get("isParked").asBoolean();
            String engineStatus = node.get("engineStatus").asText();
            double speedKmh = node.get("speedKmh").asDouble();
            String timestamp = node.get("timestamp").asText();

            // Redis에 저장할 키 구성: "vehicle:{vehicleVin}:status"
            String key = "vehicle:" + vehicleVin + ":status";
            HashOperations<String, String, Object> hashOps = redisTemplate.opsForHash();
            hashOps.put(key, "isParked", isParked);
            hashOps.put(key, "engineStatus", engineStatus);
            hashOps.put(key, "speedKmh", speedKmh);
            hashOps.put(key, "timestamp", timestamp);

            log.info("Updated Redis key {} with isParked={}, engineStatus={}, speedKmh={}, timestamp={}",
                    key, isParked, engineStatus, speedKmh, timestamp);
        } catch (Exception e) {
            log.error("Error processing status message", e);
        }
    }
}
