import { NextResponse } from "next/server";
import { mhlwNotices } from "@/data/mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";

/**
 * Phase 4: 通達・リーフレット URL の月次健全性チェック (Vercel Cron 想定)
 *
 * 呼び出し例:
 *   GET /api/cron/notice-url-health (Vercel Cron は自動で Authorization: Bearer $CRON_SECRET を送る)
 *
 * - mhlw-notices.ts / mhlw-leaflets.ts の URL をサンプリングして HEAD リクエスト
 * - 失敗 URL の件数のみ JSON で返す (詳細レポートは記録しない、月次運用は GitHub Actions 等で別途)
 * - 失敗率 > 30% は 503 を返してアラート可能に
 */

const TIMEOUT_MS = 8000;
const SAMPLE_PER_SOURCE = 30;

async function checkUrl(url: string): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    return { ok: res.ok || (res.status >= 300 && res.status < 400), status: res.status };
  } catch {
    clearTimeout(t);
    return { ok: false, status: 0 };
  }
}

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = Math.floor(arr.length / n);
  const out: T[] = [];
  for (let i = 0; i < arr.length && out.length < n; i += step) out.push(arr[i]);
  return out;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel Cron 認証 (CRON_SECRET 環境変数)
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const noticeUrls = sample(
    mhlwNotices
      .map((n) => n.detailUrl || n.pdfUrl || n.sourceUrl)
      .filter((u): u is string => !!u),
    SAMPLE_PER_SOURCE,
  );
  const leafletUrls = sample(
    mhlwLeaflets
      .map((l) => l.detailUrl || l.pdfUrl || l.sourceUrl)
      .filter((u): u is string => !!u),
    SAMPLE_PER_SOURCE,
  );

  let checked = 0;
  let failures = 0;
  const failureUrls: string[] = [];

  for (const u of [...noticeUrls, ...leafletUrls]) {
    const r = await checkUrl(u);
    checked++;
    if (!r.ok) {
      failures++;
      if (failureUrls.length < 20) failureUrls.push(u);
    }
  }

  const failureRate = checked > 0 ? failures / checked : 0;
  const payload = {
    checked,
    failures,
    failureRate: Math.round(failureRate * 1000) / 1000,
    sampleFailures: failureUrls,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(payload, {
    status: failureRate > 0.3 ? 503 : 200,
  });
}
