// 서비스 워커: 앱 파일을 폰에 저장해 두고 인터넷 없이도 실행되게 한다.
// 앱 내용을 고치면 VERSION 숫자를 올려야 폰에서 새 버전을 받는다.
const VERSION = 'daily-hanja-v5';
const FILES = ['./', 'index.html', 'manifest.json', 'fonts/NotoSerifKR-subset.woff2', 'icons/icon-192.png', 'icons/icon-512.png'];

// 설치할 때 파일을 모두 캐시에 담는다.
// cache:'reload'로 브라우저 임시 저장본을 건너뛰고 서버에서 새로 받는다 (새 글꼴이 바로 들어오게).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

// 옛 버전 캐시는 지운다
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 화면(HTML)은 인터넷을 먼저 시도해 최신으로, 나머지는 캐시를 먼저 쓴다
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return res; })
      .catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
