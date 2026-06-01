/**
 * 打合せ書 分散入力: 協力会社側の API（service_role・サーバー専用）。token がアクセス鍵。
 *  - GET  /api/meeting/contribute/[token]?cid=:  共有の最小コンテキスト（現場名・作業日）＋（cid指定時）自社の投稿。
 *  - POST /api/meeting/contribute/[token]:        自社分を投稿/更新（cid を持てば自社行のみ更新）。
 *
 * セキュリティ:
 *  - token が無効/期限切れなら 404（他人の打合せ書は token を知らない限り触れない）。
 *  - GET は他社の投稿を返さない（自社cid分のみ＋現場コンテキスト）＝他社機密の漏洩防止。
 *  - 更新は (token + cid) 一致時のみ。cid は推測不能なサーバー生成IDで、他社は知り得ない＝他社行を書き換えられない。
 *  - 受理するのは sanitizeContribution が許可するフィールドのみ＝元請確定欄・当日欄の混入を防ぐ。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { isValidToken, sanitizeContribution, generateShareToken } from "@/lib/meeting/distributed";

export const dynamic = "force-dynamic";

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}
function notFound() {
  return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
}

type ShareRow = { token: string; site_name: string | null; work_date: string | null; expires_at: string | null };

async function loadValidShare(
  supabase: ReturnType<typeof getServiceSupabase>,
  token: string
): Promise<ShareRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("meeting_shares")
    .select("token, site_name, work_date, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ShareRow;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null; // 期限切れ
  return row;
}

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();
  const { token } = await ctx.params;
  if (!isValidToken(token)) return notFound();

  const share = await loadValidShare(supabase, token);
  if (!share) return notFound();

  const cid = new URL(request.url).searchParams.get("cid")?.trim() ?? "";
  let mine = null;
  if (cid) {
    // 自社の投稿のみ（token + cid 一致）。他社分は返さない。
    const { data } = await supabase
      .from("meeting_share_inputs")
      .select("contribution_id, payload")
      .eq("token", token)
      .eq("contribution_id", cid)
      .maybeSingle();
    if (data) {
      const r = data as { contribution_id: string; payload: unknown };
      mine = { contributionId: r.contribution_id, payload: r.payload };
    }
  }
  return NextResponse.json({
    ok: true,
    context: { siteName: share.site_name ?? "", workDate: share.work_date ?? "" },
    mine,
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();
  const { token } = await ctx.params;
  if (!isValidToken(token)) return notFound();

  const share = await loadValidShare(supabase, token);
  if (!share) return notFound();

  let body: { contributionId?: unknown; payload?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const payload = sanitizeContribution(body.payload);
  if (!payload.companyName) {
    return NextResponse.json({ ok: false, reason: "company_required" }, { status: 400 });
  }

  // 既存cidがこのtokenの行なら更新、なければ新規。cid は推測不能なので他社行は触れない。
  const givenCid = typeof body.contributionId === "string" ? body.contributionId.trim() : "";
  let contributionId = "";
  if (givenCid) {
    const { data } = await supabase
      .from("meeting_share_inputs")
      .select("contribution_id")
      .eq("token", token)
      .eq("contribution_id", givenCid)
      .maybeSingle();
    if (data) contributionId = givenCid;
  }
  if (!contributionId) contributionId = generateShareToken(); // 推測不能な新規ID

  const { error } = await supabase
    .from("meeting_share_inputs")
    .upsert(
      { contribution_id: contributionId, token, payload, submitted_at: new Date().toISOString() },
      { onConflict: "contribution_id" }
    );
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, contributionId });
}
