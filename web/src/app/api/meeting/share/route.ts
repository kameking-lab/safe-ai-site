/**
 * 打合せ書 分散入力: 元請側の共有作成 & 投稿取り込み API（service_role・サーバー専用）。
 *  - POST: 元請が打合せ書ごとに共有トークンを発行（meeting_shares に1件）。
 *  - GET ?deviceId=&meetingId=: 元請が自分の打合せ書に集まった協力会社の投稿一覧を取得（取り込み用）。
 * env 未設定なら 503 → ブラウザは「クラウド未設定」表示（既存機能は localStorage で継続）。
 *
 * セキュリティ: 匿名キーはDBに触れない（RLS遮断）。token は capability。元請の取り込みは
 * device_id 照合で「自分が発行した共有の投稿」だけを返す（他端末の打合せ書は読めない）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { generateShareToken, type MeetingContribution } from "@/lib/meeting/distributed";

export const dynamic = "force-dynamic";

const SHARE_TTL_DAYS = 14;

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

/** 元請: 共有トークンを発行（自分の打合せ書 meeting_id にスコープ）。 */
export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { deviceId?: unknown; meetingId?: unknown; siteName?: unknown; workDate?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const meetingId = typeof body.meetingId === "string" ? body.meetingId.trim() : "";
  if (!deviceId || !meetingId) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const token = generateShareToken();
  const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("meeting_shares").insert({
    token,
    device_id: deviceId,
    meeting_id: meetingId,
    site_name: typeof body.siteName === "string" ? body.siteName.slice(0, 200) : null,
    work_date: typeof body.workDate === "string" ? body.workDate.slice(0, 20) : null,
    expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, token, expiresAt });
}

/** 元請: 自分の打合せ書(meeting_id)に集まった投稿一覧を取得（device_id 照合）。 */
export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const deviceId = params.get("deviceId")?.trim() ?? "";
  const meetingId = params.get("meetingId")?.trim() ?? "";
  if (!deviceId || !meetingId) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  // 自分(device_id)が発行した、この打合せ書のトークンだけを対象にする（他端末の共有は対象外）。
  const { data: shares, error: shareErr } = await supabase
    .from("meeting_shares")
    .select("token")
    .eq("device_id", deviceId)
    .eq("meeting_id", meetingId);
  if (shareErr) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: shareErr.message }, { status: 502 });
  }
  const tokens = (shares ?? []).map((s) => (s as { token: string }).token);
  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, contributions: [], shareToken: null });
  }

  const { data: inputs, error: inputErr } = await supabase
    .from("meeting_share_inputs")
    .select("contribution_id, token, payload, submitted_at")
    .in("token", tokens)
    .order("submitted_at", { ascending: true });
  if (inputErr) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: inputErr.message }, { status: 502 });
  }
  const contributions: MeetingContribution[] = (inputs ?? []).map((row) => {
    const r = row as { contribution_id: string; token: string; payload: unknown; submitted_at: string };
    return {
      contributionId: r.contribution_id,
      token: r.token,
      payload: r.payload as MeetingContribution["payload"],
      submittedAt: r.submitted_at,
    };
  });
  // 最新の共有トークンも返す（元請UIが共有リンクを再表示できるよう）
  return NextResponse.json({ ok: true, contributions, shareToken: tokens[tokens.length - 1] });
}
