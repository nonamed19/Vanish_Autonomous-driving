package com.moonshot.remote_service.config;

import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration public class RabbitTemplateConfig {
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        // direct reply-to 기능을 사용할 reply 주소 설정
        template.setReplyAddress("amq.rabbitmq.reply-to");
        // 필요한 경우 타임아웃도 설정합니다.
        template.setReplyTimeout(5000);
        return template;
    }
}