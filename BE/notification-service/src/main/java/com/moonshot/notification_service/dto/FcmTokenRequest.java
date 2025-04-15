package com.moonshot.notification_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FcmTokenRequest {
    @NotBlank(message = "FCM 토큰은 필수 입력 값입니다.")
    private String fcmToken;
}
