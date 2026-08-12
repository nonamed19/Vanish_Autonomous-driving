package com.moonshot.vehicle_service.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
@Slf4j
public class TestLocationPublisherController {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 테스트용 위치 메시지 발행 API
     * 클라이언트는 Postman에서 이 엔드포인트에 JSON 메시지를 전송하면,
     * RabbitMQ의 "vehicle.location.queue" 큐로 메시지가 발행됩니다.
     *
     * @param message 테스트용 메시지 (JSON 문자열)
     * @return 성공 여부 메시지
     */
    @PostMapping("/location")
    public ResponseEntity<String> sendTestLocationMessage(@RequestBody String message) {
        try {
            // 메시지를 "vehicle.location.queue"로 전송
            rabbitTemplate.convertAndSend("vehicle.location.queue", message);
            log.info("Test message sent to queue: {}", message);
            return ResponseEntity.ok("Test message sent successfully");
        } catch (Exception e) {
            log.error("Failed to send test message", e);
            return ResponseEntity.internalServerError().body("Failed to send test message");
        }
    }
}
