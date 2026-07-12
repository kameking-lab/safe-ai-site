// 安全AIポータル Service Worker
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

// ----- Push Notification (閉端末Web Push・NIQ-HUB1) -----
// サーバー（/api/notify/push-weather-alert）が SiteNotification を
// { title, body, tag, data:{ url } } の payload で送ってくる。
// tag は SiteNotification.id（例 jma-JP-13-...）＝同一警報の重複表示をOS側で抑止し、
// ベル/OS通知（同じidで既読管理）との二重表示も避ける。
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // 非JSON（プレーンテキスト）payload の保険
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title ?? "安全AIポータル";
  const options = {
    body: data.body ?? "新しい通知があります",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    // notificationclick が data.url を読む。未指定なら通知センターへ。
    data: { url: data.data?.url ?? data.url ?? "/notifications" },
  };
  if (data.tag) {
    options.tag = data.tag;
    // 同一tagの再送は既存通知を静かに差し替える（警報継続中の再通知スパムを抑止）
    options.renotify = false;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップで該当ページへ（鍵なし通知ライト③）。ページ生成の通知は各ページの
// onclick で処理されるが、SW経由（将来のpush・一部ブラウザのtag再利用）でも
// タップが無反応にならないようにする。data.url が無ければトップへ。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
