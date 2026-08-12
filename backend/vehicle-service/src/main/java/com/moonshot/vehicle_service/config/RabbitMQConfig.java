package com.moonshot.vehicle_service.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    // Direct Exchange 정의
    @Bean
    public DirectExchange rosExchange() {
        return new DirectExchange("ros_exchange", true, false);
    }

    //차량 위치 정보를 위한 큐 설정
    @Bean
    public Queue vehicleLocationQueue() {
        return new Queue("vehicle.location.queue", true);
    }

    // 차량 상태 정보를 위한 큐 설정
    @Bean
    public Queue vehicleStatusQueue() {
        return new Queue("vehicle.status.queue", true);
    }

    // vehicle.location.queue를 위한 바인딩 (routing key: "vehicle.location")
    @Bean
    public Binding bindingVehicleLocationQueue(DirectExchange rosExchange, Queue vehicleLocationQueue) {
        return BindingBuilder.bind(vehicleLocationQueue).to(rosExchange).with("vehicle.location");
    }

    // vehicle.status.queue를 위한 바인딩 (routing key: "vehicle.status")
    @Bean
    public Binding bindingVehicleStatusQueue(DirectExchange rosExchange, Queue vehicleStatusQueue) {
        return BindingBuilder.bind(vehicleStatusQueue).to(rosExchange).with("vehicle.status");
    }

}
