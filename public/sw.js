// Service Worker（public/sw.js，收尾任务 1：PWA 支持）
// 策略：页面 Network First（失败回离线页）；图片 Cache First；预缓存关键入口
const CACHE_VERSION = 'yqt-cache-v1';
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/icons/icon-192.png'];

// 安装：预缓存关键静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // 跳过 API 与后台、非 http(s)
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // 页面导航：Network First，失败回离线页
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // 图片：Cache First
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
              }
              return response;
            })
            .catch(() => new Response('', { status: 404 }))
      )
    );
    return;
  }

  // CSS/JS/字体：Stale While Revalidate（预缓存之外的运行时补充）
  if (['style', 'script', 'font'].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
