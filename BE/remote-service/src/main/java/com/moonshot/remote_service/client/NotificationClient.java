package com.moonshot.remote_service.client;

import com.moonshot.remote_service.dto.NotificationRequestDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "notification-service", path = "/api/v1/notifications")
public interface NotificationClient {

    @PostMapping("/push")
    void sendPushNotification(@RequestHeader("Authorization") String authorization,
                              @RequestBody NotificationRequestDto requestDto);
}