import { NextResponse } from "next/server";
import { runAuditPipeline } from "@/lib/ugc-audit";
import {
  generateAuthorAlias,
  generateSubmissionId,
  serverAddSubmission,
} from "@/lib/ugc-store";
import {
  UGC_INDUSTRY_OPTIONS,
  type UgcCategory,
  type UgcIndustry,
  type UgcSubmission,
} from "@/lib/ugc-types";

const VALID_CATEGORIES: UgcCategory[] = ["hiyari", "question", "tips"];
const VALID_INDUSTRIES = UGC_INDUSTRY_OPTIONS.map((i) => i.value);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3;
const rateBuckets = new Map<string, number[]>();

function resolveClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function isRateLimited(ip: string, now: number): boolean {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateBuckets.get(ip) ?? [];
  const recent = bucket.filter((ts) => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

type SubmitPayload = {
  category: UgcCategory;
  industry: UgcIndustry;
  title: string;
  body: string;
};

function isValidPayload(b: unknown): b is SubmitPayload {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.category === "string" &&
    VALID_CATEGORIES.includes(o.category as UgcCategory) &&
    typeof o.industry === "string" &&
    VALID_INDUSTRIES.includes(o.industry as UgcIndustry) &&
    typeof o.title === "string" &&
    o.title.trim().length > 0 &&
    o.title.trim().length <= 80 &&
    typeof o.body === "string" &&
    o.body.trim().length >= 15 &&
    o.body.trim().length <= 2000
  );
}

export async function POST(request: Request) {
  const ip = resolveClientIp(request);
  const now = Date.now();
  if (isRateLimited(ip, now)) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "短時間に多数の投稿が行われました。1分ほどおいて再度お試しください。",
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPayload(raw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_payload",
        message:
          "必須項目が不足しているか、本文の長さが範囲外です（15〜2000文字、タイトルは1〜80文字）。",
      },
      { status: 400 }
    );
  }

  const payload = raw as SubmitPayload;

  // 4層監査パイプライン
  const audit = runAuditPipeline({ text: payload.body });

  const submission: UgcSubmission = {
    id: generateSubmissionId(),
    createdAt: new Date().toISOString(),
    category: payload.category,
    industry: payload.industry,
    title: payload.title.trim(),
    body: audit.maskedText,
    bodyOriginal: payload.body.trim(),
    authorAlias: generateAuthorAlias(),
    status:
      audit.audit.recommendation === "auto_approve"
        ? "approved"
        : audit.audit.recommendation === "auto_reject"
          ? "rejected"
          : "pending",
    audit: audit.audit,
  };

  serverAddSubmission(submission);

  return NextResponse.json(
    {
      ok: true,
      submission,
      message:
        submission.status === "approved"
          ? "投稿ありがとうございます！自動審査を通過し、公開されました。"
          : submission.status === "rejected"
            ? "投稿内容に不適切な表現が含まれているため、公開を見送らせていただきました。"
            : "投稿ありがとうございます！運営による確認後、公開されます。",
    },
    { status: 200 }
  );
}
