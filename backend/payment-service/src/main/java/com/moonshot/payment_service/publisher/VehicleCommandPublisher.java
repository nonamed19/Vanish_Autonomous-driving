package com.moonshot.payment_service.publisher;

import com.moonshot.payment_service.dto.VehicleDepartureMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class VehicleCommandPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbit.vehicle.exchange}")
    private String exchange;

    @Value("${rabbit.vehicle.routing-key")
    private String routingKey;

    public void sendDepartureCommand(String vehicleVin){
        VehicleDepartureMessage message = new VehicleDepartureMessage(vehicleVin);
        log.info("차량 출발 메시지 전송: {}", message);
        rabbitTemplate.convertAndSend(exchange, routingKey, message);
    }
}
