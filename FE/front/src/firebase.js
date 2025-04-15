// firebase.js

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAIq434wwLjxSDzJVWKqMsodmeYa6k8oX4",
  authDomain: "vanish-80d6a.firebaseapp.com",
  projectId: "vanish-80d6a",
  storageBucket: "vanish-80d6a.firebasestorage.app",
  messagingSenderId: "13349961711",
  appId: "1:13349961711:web:bbc721aa37f356ec2b001a",
  measurementId: "G-MKLDR0R86P"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// FCM 토큰 요청
export const requestForToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BK0a0drik6_RDwwDZD2hy18iKN-o5IMIQUAdliwLq-WW_xvh5PTqpQmhec7QEF0kfaz8VO1odvtUV7c0a8Cl6u4"
    });
    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("FCM 토큰 받기 실패:", err);
    return null;
  }
};

// 포그라운드 메시지 수신 핸들러
onMessage(messaging, (payload) => {
  console.log("메시지 수신(포그라운드):", payload);
  const { title, body } = payload.notification || {};
  // 서버에서 actions 정보가 전달될 경우 아래처럼 처리할 수 있습니다.
  let actions = [];
  if (payload.data && payload.data.actions) {
    try {
      const parsed = typeof payload.data.actions === "string" ? JSON.parse(payload.data.actions) : payload.data.actions;
      if (parsed.yes && parsed.no) {
        actions = [
          { action: "yes", title: "예" },
          { action: "no", title: "아니오" }
        ];
      }
    } catch (err) {
      console.error("actions 파싱 실패:", err);
    }
  }
  const notificationOptions = {
    body,
    ...(actions.length > 0 && { actions }),
    icon: '../public/vanish_192.png'
  };

  if (Notification.permission === "granted") {
    new Notification(title, notificationOptions);
  }
});

export default app;
