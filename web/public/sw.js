// 安全AIポータル Service Worker
// Cache-first: static assets / Network-first: API calls
// 安全・法令ページはオフライン時に最新表示と誤認させないためHTMLを保存しない。

const CACHE_NAME = "anzen-ai-v8";
const OFFLINE_URL = "/offline.html";
const PUBLIC_SAFETY_LEARNING_PATH = /^\/e-learning\/safety(?:\/(?:first-class-health-officer|second-class-health-officer|occupational-safety-consultant|occupational-health-consultant))?\/?$/;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/mascot/mascot-sleeping.webp",
  "/manifest.json",
];

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 個別に addAll せず Promise.allSettled で 1 件失敗しても継続
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { credentials: "omit", cache: "no-cache" })
            .then((res) => {
              const cacheControl = res.headers.get("cache-control") ?? "";
              return res.ok &&
                !/\b(?:no-store|private)\b/i.test(cacheControl) &&
                !res.headers.has("set-cookie")
                ? cache.put(url, res.clone())
                : undefined;
            })
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
          .filter((key) => key.startsWith("anzen-ai-") && key !== CACHE_NAME)
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
  const sameOrigin = url.origin === self.location.origin;

  // chrome-extension や非http(s)スキームは無視
  if (!url.protocol.startsWith("http")) return;

  // API・認証/管理画面は個人情報を含み得るため、Service Workerへ保存しない。
  if (
    !sameOrigin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/account") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/auth")
  ) {
    event.respondWith(networkOnly(request));
    return;
  }

  // _next/static, fonts, images → Cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 公開安全資格教材だけは、訪問成功後の同一routeをオフライン再読込できる。
  // query付きURL、非公開route、法令・API・account等は対象外。
  if (request.mode === "navigate") {
    if (PUBLIC_SAFETY_LEARNING_PATH.test(url.pathname) && url.search === "") {
      event.respondWith(publicLearningNavigationNetworkFirst(request, url));
    } else {
      event.respondWith(navigationNetworkFirst(request));
    }
    return;
  }

  // その他の動的レスポンスも永続化しない。
  event.respondWith(networkOnly(request));
});

/**
 * Cache-first: キャッシュにあればそれを返す。なければネットワーク取得してキャッシュに保存。
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cacheControl = response.headers.get("cache-control") ?? "";
    if (
      response.ok &&
      request.method === "GET" &&
      !/\b(?:no-store|private)\b/i.test(cacheControl) &&
      !response.headers.has("set-cookie")
    ) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 408 });
  }
}

function canCachePublicLearningHtml(response) {
  const contentType = response.headers.get("content-type") ?? "";
  return (
    response.ok &&
    response.type !== "opaque" &&
    /text\/html/i.test(contentType) &&
    response.headers.get("x-safe-ai-public-offline") ===
      "safety-learning-v1" &&
    !response.headers.has("set-cookie")
  );
}

/**
 * 公開資格教材専用: 成功した公開HTMLだけをroute完全一致で保存する。
 * 個人状態をqueryやcache keyへ含めず、失敗時も別courseへfallbackしない。
 */
async function publicLearningNavigationNetworkFirst(request, url) {
  const cacheKey = new Request(`${url.origin}${url.pathname}`, {
    method: "GET",
    headers: { Accept: "text/html" },
    credentials: "omit",
  });
  try {
    const response = await fetch(request);
    if (canCachePublicLearningHtml(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(cacheKey)) ??
      (await caches.match(OFFLINE_URL)) ??
      new Response("オフライン中です。", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      })
    );
  }
}

/**
 * Navigation: network only. On failure, always show an explicit offline shell.
 * Cached safety/legal HTML must never look like a current response.
 */
async function navigationNetworkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    return (
      (await caches.match(OFFLINE_URL)) ??
      new Response("オフライン中です。", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      })
    );
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response("オフライン中です。インターネット接続を確認してください。", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
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
  const url = safeNotificationPath(event.notification.data?.url);
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

function safeNotificationPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/notifications";
  }
  try {
    const parsed = new URL(value, self.location.origin);
    if (parsed.origin !== self.location.origin) return "/notifications";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/notifications";
  }
}
