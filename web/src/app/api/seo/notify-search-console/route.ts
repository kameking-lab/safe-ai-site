import { NextResponse, type NextRequest } from "next/server";

const SITE_BASE = "https://safe-ai-site.vercel.app";
const SITEMAP_URL = `${SITE_BASE}/sitemap-index.xml`;

// Vercel Cron は Authorization: Bearer ${CRON_SECRET} を付与する。
// CRON_SECRET 未設定時は誰でも叩けるため、本番では必ず設定する。
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type PingResult = {
  target: string;
  ok: boolean;
  httpStatus: number | null;
  note?: string;
  error?: string | null;
};

async function checkSitemap(): Promise<PingResult> {
  try {
    const r = await fetch(SITEMAP_URL, { method: "HEAD", cache: "no-store" });
    return {
      target: SITEMAP_URL,
      ok: r.ok,
      httpStatus: r.status,
      note: "sitemap reachability check (HEAD)",
    };
  } catch (e) {
    return {
      target: SITEMAP_URL,
      ok: false,
      httpStatus: null,
      error: String(e),
    };
  }
}

// IndexNow（Bing / Yandex / Naver / Seznam が対応）。
// INDEXNOW_KEY を設定すると使える。Google は IndexNow 非対応のため、
// robots.txt の sitemap ディレクティブによる自動発見に任せる。
async function submitIndexNow(): Promise<PingResult | null> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return null;
  const endpoint = "https://api.indexnow.org/IndexNow";
  const body = {
    host: new URL(SITE_BASE).host,
    key,
    keyLocation: `${SITE_BASE}/${key}.txt`,
    urlList: [SITE_BASE, SITEMAP_URL],
  };
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    return {
      target: endpoint,
      ok: r.ok,
      httpStatus: r.status,
      note: "IndexNow notification (Bing/Yandex/Naver/Seznam)",
    };
  } catch (e) {
    return {
      target: endpoint,
      ok: false,
      httpStatus: null,
      error: String(e),
    };
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tasks: Array<Promise<PingResult | null>> = [checkSitemap(), submitIndexNow()];
  const results = (await Promise.all(tasks)).filter((r): r is PingResult => r !== null);

  return NextResponse.json({
    success: results.every((r) => r.ok),
    sitemap: SITEMAP_URL,
    results,
    note: "Google/Bing の /ping?sitemap= は廃止済み。Google は robots.txt の sitemap ディレクティブで自動発見、Bing/Yandex 等は IndexNow（INDEXNOW_KEY 設定時）で通知。",
    timestamp: new Date().toISOString(),
  });
}
