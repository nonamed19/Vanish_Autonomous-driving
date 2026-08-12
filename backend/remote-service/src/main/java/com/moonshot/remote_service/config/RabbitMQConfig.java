package com.moonshot.remote_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // DirectExchange는 모든 큐에 대해 공통으로 사용합니다.
    @Bean
    public DirectExchange remoteExchange(@Value("${spring.rabbitmq.destination.exchange}") String exchangeName) {
        return new DirectExchange(exchangeName);
    }

    // 목적지 설정 메시지 전용 큐
    @Bean
    public Queue destinationQueue() {
        return new Queue("remote.destination.queue", true);
    }

    // convertSendAndReceive 용 응답 전용 큐
    @Bean
    public Queue destinationReplyQueue() {
        return new Queue("remote.destination.reply.queue", true);
    }

    // 로밍 명령 메시지 전용 큐
    @Bean
    public Queue roamQueue() {
        return new Queue("remote.roam.queue", true);
    }

    // 주차 명령 메시지 전용 큐
    @Bean
    public Queue parkingQueue() {
        return new Queue("remote.parking.queue", true);
    }

    // 각 큐별 바인딩 설정

    // 목적지 설정 큐에 대한 바인딩 (라우팅 키: spring.rabbitmq.destination.routingKey)
    @Bean
    public Binding bindingDestinationQueue(Queue destinationQueue,
                                           DirectExchange remoteExchange,
                                           @Value("${spring.rabbitmq.destination.routingKey}") String routingKey) {
        return BindingBuilder.bind(destinationQueue).to(remoteExchange).with(routingKey);
    }

    // 응답 큐에 대한 바인딩 (라우팅 키: spring.rabbitmq.destination.reply.routingKey)
    @Bean
    public Binding bindingDestinationReplyQueue(Queue destinationReplyQueue,
                                                DirectExchange remoteExchange,
                                                @Value("${spring.rabbitmq.destination.reply.routingKey}") String replyRoutingKey) {
        return BindingBuilder.bind(destinationReplyQueue).to(remoteExchange).with(replyRoutingKey);
    }

    // 로밍 명령 큐에 대한 바인딩 (라우팅 키: spring.rabbitmq.roam.routingKey)
    @Bean
    public Binding bindingRoamQueue(Queue roamQueue,
                                    DirectExchange remoteExchange,
                                    @Value("${spring.rabbitmq.roam.routingKey}") String roamRoutingKey) {
        return BindingBuilder.bind(roamQueue).to(remoteExchange).with(roamRoutingKey);
    }

    // 주차 명령 큐에 대한 바인딩 (라우팅 키: spring.rabbitmq.ros.routingKey)
    @Bean
    public Binding bindingParkingQueue(Queue parkingQueue,
                                       DirectExchange remoteExchange,
                                       @Value("${spring.rabbitmq.ros.routingKey}") String parkingRoutingKey) {
        return BindingBuilder.bind(parkingQueue).to(remoteExchange).with(parkingRoutingKey);
    }
}
