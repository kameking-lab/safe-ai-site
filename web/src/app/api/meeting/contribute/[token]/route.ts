/**
 * 打合せ書 分散入力: 協力会社側の API（service_role・サーバー専用）。token がアクセス鍵。
 *  - GET  /api/meeting/contribute/[token]?cid=:  共有コンテキスト＋（cid指定時）自社の現在値・送信時刻・履歴。
 *  - POST /api/meeting/contribute/[token]:        自社分を投稿/更新（楽観ロック）／mode:"revert" で一つ前に戻す。
 *
 * セキュリティ:
 *  - token 無効/期限切れは 404。他社の投稿は返さない（自社cidのみ）。
 *  - 更新は (token + cid) 一致時のみ。cid は推測不能なサーバー生成ID＝他社行を書き換え不可。
 *  - sanitize 許可フィールドのみ（元請確定欄/当日欄/階層の混入防止）。
 * 競合(要件1): 各社は別 contribution_id ＝別行なので競合しない。同一行(同一cid)の並行更新だけは
 *   楽観ロック（baseSubmittedAt 照合）で検知し 409 を返す（黙ってデータを消さない）。
 * 履歴(要件2): 送信のたびにスナップショットを追記。30日超過は読み取り除外＋書き込み時に自動削除（ゼロ運用）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import {
  isValidToken,
  sanitizeContribution,
  generateShareToken,
  pickPreviousPayload,
  activeHistory,
  HISTORY_RETENTION_DAYS,
  type MeetingContributionHistory,
  type ContributionPayload,
} from "@/lib/meeting/distributed";

export const dynamic = "force-dynamic";

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}
function notFound() {
  return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
}

type Supa = NonNullable<ReturnType<typeof getServiceSupabase>>;
type ShareRow = { token: string; site_name: string | null; work_date: string | null; expires_at: string | null };

async function loadValidShare(supabase: Supa, token: string): Promise<ShareRow | null> {
  const { data, error } = await supabase
    .from("meeting_shares")
    .select("token, site_name, work_date, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ShareRow;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

async function loadHistory(supabase: Supa, token: string, cid: string): Promise<MeetingContributionHistory[]> {
  const { data } = await supabase
    .from("meeting_share_input_history")
    .select("history_id, contribution_id, token, payload, recorded_at")
    .eq("token", token)
    .eq("contribution_id", cid)
    .order("recorded_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => {
    const x = r as { history_id: string; contribution_id: string; token: string; payload: unknown; recorded_at: string };
    return { historyId: x.history_id, contributionId: x.contribution_id, token: x.token, payload: x.payload as ContributionPayload, recordedAt: x.recorded_at };
  });
}

/** 履歴を1件追記し、30日超過の履歴を自動削除（ゼロ運用GC）。 */
async function appendHistoryAndGc(supabase: Supa, token: string, cid: string, payload: ContributionPayload): Promise<void> {
  await supabase.from("meeting_share_input_history").insert({
    history_id: generateShareToken(),
    contribution_id: cid,
    token,
    payload,
    recorded_at: new Date().toISOString(),
  });
  const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("meeting_share_input_history").delete().lt("recorded_at", cutoff);
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
  let history: { recordedAt: string }[] = [];
  if (cid) {
    const { data } = await supabase
      .from("meeting_share_inputs")
      .select("contribution_id, payload, submitted_at")
      .eq("token", token)
      .eq("contribution_id", cid)
      .maybeSingle();
    if (data) {
      const r = data as { contribution_id: string; payload: unknown; submitted_at: string };
      mine = { contributionId: r.contribution_id, payload: r.payload, submittedAt: r.submitted_at };
      // 履歴件数（期限切れ除外・監査表示用。中身は自社のみ）
      history = activeHistory(await loadHistory(supabase, token, cid)).map((h) => ({ recordedAt: h.recordedAt }));
    }
  }
  return NextResponse.json({
    ok: true,
    context: { siteName: share.site_name ?? "", workDate: share.work_date ?? "" },
    mine,
    historyCount: history.length,
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();
  const { token } = await ctx.params;
  if (!isValidToken(token)) return notFound();
  const share = await loadValidShare(supabase, token);
  if (!share) return notFound();

  let body: { contributionId?: unknown; payload?: unknown; baseSubmittedAt?: unknown; mode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const givenCid = typeof body.contributionId === "string" ? body.contributionId.trim() : "";
  const baseSubmittedAt = typeof body.baseSubmittedAt === "string" ? body.baseSubmittedAt : "";
  const mode = body.mode === "revert" ? "revert" : "submit";

  // 既存行（このtokenスコープ）を確認＝楽観ロック／revert の基準
  let current: { submitted_at: string } | null = null;
  if (givenCid) {
    const { data } = await supabase
      .from("meeting_share_inputs")
      .select("submitted_at")
      .eq("token", token)
      .eq("contribution_id", givenCid)
      .maybeSingle();
    if (data) current = data as { submitted_at: string };
  }

  let payload: ContributionPayload;
  let contributionId = current ? givenCid : "";

  if (mode === "revert") {
    if (!current) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    const prev = pickPreviousPayload(await loadHistory(supabase, token, givenCid), current.submitted_at);
    if (!prev) return NextResponse.json({ ok: false, reason: "no_previous" }, { status: 409 });
    payload = prev;
    contributionId = givenCid;
  } else {
    // 楽観ロック: 既存行があり、baseSubmittedAt が現在値と食い違えば競合（黙って消さない）
    if (current && baseSubmittedAt && current.submitted_at !== baseSubmittedAt) {
      return NextResponse.json({ ok: false, reason: "conflict", currentSubmittedAt: current.submitted_at }, { status: 409 });
    }
    payload = sanitizeContribution(body.payload);
    if (!payload.companyName) {
      return NextResponse.json({ ok: false, reason: "company_required" }, { status: 400 });
    }
    if (!contributionId) contributionId = generateShareToken();
  }

  const submittedAt = new Date().toISOString();
  const { error } = await supabase
    .from("meeting_share_inputs")
    .upsert({ contribution_id: contributionId, token, payload, submitted_at: submittedAt }, { onConflict: "contribution_id" });
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  await appendHistoryAndGc(supabase, token, contributionId, payload);
  return NextResponse.json({ ok: true, contributionId, submittedAt });
}
