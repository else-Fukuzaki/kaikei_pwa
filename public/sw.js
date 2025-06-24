const CACHE_NAME = 'kaikei-app-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  // アイコンファイルも必要に応じて追加
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Service Worker インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // 新しいService Workerを即座に有効化
        return self.skipWaiting();
      })
  );
});

// Service Worker 有効化時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 古いキャッシュを削除
            if (cacheName !== CACHE_NAME) {
              console.log('古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Service Workerがすべてのクライアントを制御
        return self.clients.claim();
      })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュにある場合はキャッシュから返す
      if (response) {
        return response;
      }

      // キャッシュにない場合はネットワークから取得
      return fetch(event.request)
        .then((response) => {
          // レスポンスが有効でない場合はそのまま返す
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response;
          }

          // レスポンスのクローンを作成してキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合
          if (event.request.destination === 'document') {
            // HTMLページの場合はオフライン用のページを返す
            return caches.match('/index.html');
          }

          // その他のリソースの場合
          return new Response('オフラインです', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// バックグラウンド同期の処理（将来の拡張用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// バックグラウンド同期の実装（データの同期など）
function doBackgroundSync() {
  // 将来的にサーバーとの同期機能を実装する場合はここに追加
  console.log('バックグラウンド同期を実行');
  return Promise.resolve();
}

// プッシュ通知の処理（将来の拡張用）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: '確認する',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/xmark.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('収支管理アプリ', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // アプリを開く
    event.waitUntil(clients.openWindow('/'));
  }
});

// アプリのアップデート通知
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
