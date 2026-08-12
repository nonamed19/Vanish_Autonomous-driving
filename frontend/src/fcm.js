import axiosInstance from "./api/axiosInstance";

export const registerFcmToken = async (fcmToken) => {
  if (!fcmToken) return;

  try {
    const response = await axiosInstance.post(
      "/api/v1/notifications/fcm-token",
      { fcmToken }
    );
    console.log("FCM 토큰 등록 성공:", response.data);
  } catch (error) {
    console.error("FCM 토큰 등록 실패:", error);
  }
};
