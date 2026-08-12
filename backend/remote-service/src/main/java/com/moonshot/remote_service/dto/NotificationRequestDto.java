package com.moonshot.remote_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationRequestDto {
    private String title; // 알림 제목
    private String body;  // 알림 내용
    private Map<String, String> actions;
}
