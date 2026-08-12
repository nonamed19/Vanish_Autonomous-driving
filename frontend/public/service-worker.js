self.addEventListener('install', (event) => {
    console.log('서비스 워커 설치됨');
    self.skipWaiting();
});
  
self.addEventListener('activate', (event) => {
    console.log('서비스 워커 활성화됨');
});
  
self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.notification && data.notification.title ? data.notification.title : '알림';
    const options = {
        body: data.notification && data.notification.body ? data.notification.body : '',
        icon: '/vanish_192.png'
    };

    // 푸쉬 수신시 시스템 알림도 표시 (백그라운드 시)
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
    
    // 모든 클라이언트로 데이터 전달 (전면 알림 처리를 위한 메시지)
    event.waitUntil(
        self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
            .then(clients => {
                clients.forEach(client => {
                    client.postMessage({ title, options });
                });
            })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'no_action') {
      // 주차 API 호출 페이지(메인 스레드에서 axios 호출)를 열도록 리다이렉트 합니다.
      event.waitUntil(clients.openWindow('https://j12a707.p.ssafy.io/parking-redirect'));
    } else {
      // '예' 버튼 또는 버튼 없이 알림 클릭 시 기본 페이지 이동
      event.waitUntil(clients.openWindow('https://j12a707.p.ssafy.io/'));
    }
  });
