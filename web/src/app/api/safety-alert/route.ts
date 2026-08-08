import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlertKind = "fatal-accident" | "weather" | "law-revision";

type RequestBody = {
  kind: AlertKind;
  title: string;
  context?: string;
  aiProviderConsent?: boolean;
};

export const SAFETY_ALERT_GENERATION_ENABLED = false;

const VALID_KINDS = new Set<AlertKind>([
  "fatal-accident",
  "weather",
  "law-revision",
]);

function responseHeaders(): Record<string, string> {
  return {
    ...noStoreHeaders(),
    "X-AI-Used": "false",
    "X-Generation-Status": "withheld",
  };
}

/**
 * ニュース見出しや短い気象文だけでは、個々の現場に適合する朝礼指示を支持できない。
 * 引用単位の支持検証と承認ワークフローが整うまでは fail-closed とする。
 */
export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です。" },
      { status: 400, headers: responseHeaders() },
    );
  }

  if (
    !VALID_KINDS.has(body?.kind) ||
    typeof body?.title !== "string" ||
    !body.title.trim()
  ) {
    return NextResponse.json(
      { error: "kind と title は必須です。" },
      { status: 400, headers: responseHeaders() },
    );
  }

  return NextResponse.json(
    {
      error:
        "根拠資料と現場条件の対応を検証できないため、朝礼文の自動生成を停止しています。元の出典、対象日時、適用範囲を確認し、人が朝礼内容を承認してください。",
      code: "CLAIM_SUPPORT_UNVERIFIED",
      alert: null,
      generationStatus: "withheld",
      requiresHumanReview: true,
      aiUsed: false,
    },
    { status: 422, headers: responseHeaders() },
  );
}
