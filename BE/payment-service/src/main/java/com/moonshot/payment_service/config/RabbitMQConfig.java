package com.moonshot.payment_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // 출발 메시지를 보낼 Exchange (Direct)
    @Bean
    public DirectExchange rosExchange() {
        return new DirectExchange("ros_exchange", true, false);
    }

    // 차량 출발 명령을 받을 큐
    @Bean
    public Queue vehicleDepartureQueue() {
        return new Queue("vehicle.departure.queue", true);
    }

    // 큐 바인딩 - routing key: "vehicle.departure"
    @Bean
    public Binding bindingVehicleDepartureQueue(DirectExchange rosExchange, Queue vehicleDepartureQueue) {
        return BindingBuilder.bind(vehicleDepartureQueue)
                .to(rosExchange)
                .with("vehicle.departure");
    }
}
