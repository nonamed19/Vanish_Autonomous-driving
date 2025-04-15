package com.moonshot.remote_service.listener;

import org.springframework.amqp.rabbit.annotation.RabbitListener; import org.springframework.stereotype.Component;

@Component public class RemoteDestinationListener {
    // remote.destination.queue로 들어오는 메시지를 처리하는 리스너
// @RabbitListener로 처리한 결과 값은 자동으로 요청쪽 convertSendAndReceive의 응답으로 전달됩니다.
    @RabbitListener(queues = "remote.destination.reply.queue")
    public String handleRemoteDestination(String message) {
        try {
            String[] parts = message.split("\\|");
            if (parts.length != 4) {
                return "error|잘못된 요청 형식입니다.";
            }
            if (!"destination".equals(parts[0])) {
                return "error|올바르지 않은 명령입니다.";
            }
            // parts[1]: 위도, parts[2]: 경도, parts[3]: 예상 도착 시간(또는 예상 소요 시간)
            return String.format("%s|%s|%s", parts[1], parts[2], parts[3]);
        } catch (Exception e) {
            return "error|" + e.getMessage();
        }
    }

}
