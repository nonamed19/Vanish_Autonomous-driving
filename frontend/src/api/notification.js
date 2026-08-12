import axiosInstance from "./axiosInstance";

// FCM 토큰 발급
export const fcmToken = async (fcm_token) => {
  const response = await axiosInstance.post("api/v1/notifications/fcm-token", {
    fcm_token,
  });
  return response.data;
};

// 주차 완료 알림

// 결제 알림
