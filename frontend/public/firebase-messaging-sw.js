
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAIq434wwLjxSDzJVWKqMsodmeYa6k8oX4",
  authDomain: "vanish-80d6a.firebaseapp.com",
  projectId: "vanish-80d6a",
  storageBucket: "vanish-80d6a.firebasestorage.app",
  messagingSenderId: "13349961711",
  appId: "1:13349961711:web:bbc721aa37f356ec2b001a",
  measurementId: "G-MKLDR0R86P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 이벤트 핸들러: 알림 클릭 시 버튼 action에 따라 분기 처리
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  
  if (event.action === "no") {
    event.waitUntil(clients.openWindow("https://j12a707.p.ssafy.io/api/v1/remote/parking/destination"));
  } else {
    event.waitUntil(clients.openWindow("https://j12a707.p.ssafy.io/"));
  }
});
