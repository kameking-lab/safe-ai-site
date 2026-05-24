/**
 * Phase 4: 月次通達・リーフレット URL ヘルスチェック（Vercel Cron 想定）
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §6
 *
 * 動作:
 * - CRON_SECRET ヘッダ認証で許可されたリクエストのみ受理
 * - 全 mhlw-notices + mhlw-leaflets の detailUrl/sourceUrl/pdfUrl を HEAD で検証
 * - 結果サマリを JSON で返す（失敗 URL リスト含む）
 *
 * 注意: 本ルートは Vercel Function 上で実行。
 * 大量 URL（1,500+）の HEAD は実行時間制限に注意し、batch サイズと並列度を保守的に。
 * 失敗詳細を永続化したい場合は、別途レポート保存ロジックを追加（本実装はレスポンスのみ）。
 */

import { NextResponse } from "next/server";
import { mhlwNotices } from "@/data/mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel max duration: 60s on hobby、300s on pro。 ヘルスチェックは sampleSize で制御
export const maxDuration = 60;

const USER_AGENT =
  "safe-ai-portal-url-health (+https://www.anzen-ai-portal.jp/about)";
const TIMEOUT_MS = 6000;
const BATCH_SIZE = 10;

type Target = {
  kind: "notice" | "leaflet";
  id: string;
  title: string;
  url: string;
  field: string;
};

type Failure = Target & { status: number; err?: string };

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; err?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    return { ok: res.ok || (res.status >= 200 && res.status < 400), status: res.status };
  } catch (err) {
    return { ok: false, status: -1, err: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function buildTargets(sampleSize: number | null): Target[] {
  const targets: Target[] = [];
  for (const n of mhlwNotices) {
    if (n.detailUrl) {
      targets.push({ kind: "notice", id: n.id, title: n.title, url: n.detailUrl, field: "detailUrl" });
    }
    if (n.pdfUrl) {
      targets.push({ kind: "notice", id: n.id, title: n.title, url: n.pdfUrl, field: "pdfUrl" });
    }
  }
  for (const l of mhlwLeaflets) {
    if (l.sourceUrl) {
      targets.push({ kind: "leaflet", id: l.id, title: l.title, url: l.sourceUrl, field: "sourceUrl" });
    }
    if (l.pdfUrl) {
      targets.push({ kind: "leaflet", id: l.id, title: l.title, url: l.pdfUrl, field: "pdfUrl" });
    }
  }
  if (sampleSize !== null && sampleSize > 0) return targets.slice(0, sampleSize);
  return targets;
}

export async function GET(request: Request) {
  // CRON_SECRET 認証（Vercel Cron は Authorization: Bearer <CRON_SECRET> を送る）
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sampleParam = url.searchParams.get("sample");
  const sampleSize = sampleParam ? Number.parseInt(sampleParam, 10) : 100; // デフォルト 100 件
  const safeSample = Number.isFinite(sampleSize) && sampleSize > 0 ? sampleSize : 100;

  const targets = buildTargets(safeSample);
  const failures: Failure[] = [];
  let okCount = 0;

  // 並列度を BATCH_SIZE に絞る（厚労省/JAISH へ負荷をかけない）
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((t) => checkUrl(t.url)));
    for (let j = 0; j < batch.length; j++) {
      const t = batch[j];
      const r = results[j];
      if (r.ok) okCount++;
      else failures.push({ ...t, status: r.status, err: r.err });
    }
  }

  return NextResponse.json(
    {
      checked: targets.length,
      ok: okCount,
      failed: failures.length,
      successRate: targets.length > 0 ? okCount / targets.length : 0,
      failures: failures.slice(0, 100), // レスポンスサイズ制御
      sampleSize: safeSample,
      checkedAt: new Date().toISOString(),
    },
    {
      status: failures.length > 0 ? 207 : 200, // 207 Multi-Status = 部分失敗
      headers: { "Cache-Control": "no-store" },
    }
  );
}
