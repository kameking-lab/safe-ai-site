/**
 * P3-1 e-Stat 公式統計表カタログ取得。
 * GET ?q=労働災害 : e-Stat getStatsList を叩き、労働災害関連の公式統計表（実データ）の
 * メタ情報＋e-Statリンクを返す。E_STAT_API_KEY 未設定なら503（UIは非表示）。
 * 数値の軸別解釈は表構造差で誤読リスクがあるため本Phaseでは行わない（公式表へ誘導）。
 * 出典: 政府統計の総合窓口(e-Stat)。政府標準利用規約2.0・出典明示。
 */
import { NextResponse } from "next/server";
import { parseEstatStatsList } from "@/lib/accidents/estat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 公式統計表カタログは頻繁に変わらないため1日キャッシュ（ビルド/呼出コスト抑制）。
export const revalidate = 86400;

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return (xff?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown");
}
function isRateLimited(ip: string, now: number): boolean {
  const ws = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateBuckets.get(ip) ?? []).filter((ts) => ts > ws);
  if (recent.length >= RATE_LIMIT_MAX) { rateBuckets.set(ip, recent); return true; }
  recent.push(now); rateBuckets.set(ip, recent);
  return false;
}

export async function GET(request: Request) {
  const appId = process.env.E_STAT_API_KEY;
  if (!appId) {
    return NextResponse.json({ ok: false, reason: "estat_not_configured" }, { status: 503 });
  }
  if (isRateLimited(clientIp(request), Date.now())) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }
  const q = new URL(request.url).searchParams.get("q")?.trim() || "労働災害";
  const api = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsList?appId=${encodeURIComponent(appId)}&searchWord=${encodeURIComponent(q)}&limit=12`;

  try {
    const res = await fetch(api, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: "estat_http_error", status: res.status }, { status: 502 });
    }
    const json: unknown = await res.json();
    const parsed = parseEstatStatsList(json);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, reason: "estat_status_error", status: parsed.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true, source: "e-stat", query: q, tables: parsed.tables });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, reason: "fetch_error", detail: msg }, { status: 502 });
  }
}
