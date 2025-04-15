import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { register } from './serviceWorkerRegistration';

// 서비스 워커 메시지 수신 처리
navigator.serviceWorker.addEventListener('message', event => {
  const data = event.data;
  if (data && data.title) {
    // 현재 페이지가 포그라운드에 있고 알림 권한이 허용된 경우 알림 표시
    if (document.visibilityState === 'visible' && Notification.permission === 'granted') {
      new Notification(data.title, data.options);
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

register();
