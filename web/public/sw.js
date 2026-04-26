// ANZEN AI Service Worker
// Cache-first: static assets / Network-first: API calls
// v2: モバイル LCP 改善のため主要ページをプリキャッシュ

const CACHE_NAME = "anzen-ai-v2";
const OFFLINE_URL = "/offline.html";

// 山田職長レベルのモバイルでも初回以降サクサク動くよう、
// ボトムナビからの 5 ページ + ホーム関連を先読みキャッシュ。
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/",
  "/ky",
  "/law-search",
  "/chatbot",
  "/account",
  "/manifest.json",
];

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 個別に addAll せず Promise.allSettled で 1 件失敗しても継続
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { credentials: "same-origin" })
            .then((res) => (res.ok ? cache.put(url, res.clone()) : undefined))
            .catch(() => undefined)
        )
      );
    })
  );
  // 新しいSWを即座にアクティブにする
  self.skipWaiting();
});

// ----- Activate -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // 全クライアントをすぐに制御下に置く
  self.clients.claim();
});

// ----- Fetch -----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // chrome-extension や非http(s)スキームは無視
  if (!url.protocol.startsWith("http")) return;

  // /api/ への呼び出し → Network-first（失敗時はエラーをそのまま返す）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, false));
    return;
  }

  // _next/static, fonts, images → Cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image/") ||
    /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ナビゲーションリクエスト（HTMLページ） → Network-first、オフライン時は /offline.html
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // その他 → Network-first
  event.respondWith(networkFirst(request, false));
});

/**
 * Cache-first: キャッシュにあればそれを返す。なければネットワーク取得してキャッシュに保存。
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 408 });
  }
}

/**
 * Network-first: ネットワーク優先。失敗した場合はキャッシュ、
 * キャッシュもなければ offline.html（navigateのみ）を返す。
 */
async function networkFirst(request, fallbackToOffline) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToOffline) {
      return caches.match(OFFLINE_URL);
    }
    return new Response(
      JSON.stringify({ error: "オフライン中です。インターネット接続を確認してください。" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ----- Push Notification (将来用のプレースホルダー) -----
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title ?? "ANZEN AI";
  const options = {
    body: data.body ?? "新しい通知があります",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
