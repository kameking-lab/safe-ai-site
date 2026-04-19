import { NextRequest, NextResponse } from "next/server";
import { summaryMockByRevisionId } from "@/data/mock/summaries";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import type { SummaryApiRouteResponse } from "@/lib/types/api";
import type { LawRevisionSummary } from "@/lib/types/domain";

function parseDelay(value: string | null, fallbackMs: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallbackMs;
  }
  return parsed;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveForceError(request: NextRequest) {
  return request.nextUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");
}

function errorResponse(
  status: number,
  message: string,
  code: "UNAVAILABLE" | "VALIDATION" | "NETWORK" | "NOT_FOUND",
  retryable = status >= 500
) {
  return NextResponse.json<SummaryApiRouteResponse>(
    {
      ok: false,
      error: {
        code,
        message,
        retryable,
      },
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const revisionId = request.nextUrl.searchParams.get("revisionId");
  const delayMs = parseDelay(request.nextUrl.searchParams.get("delayMs"), 650);
  const forceError = resolveForceError(request);

  if (forceError === "timeout") {
    await wait(6000);
    return errorResponse(504, "要約API応答がタイムアウトしました。", "NETWORK");
  }

  await wait(delayMs);

  if (forceError === "5xx") {
    return errorResponse(503, "要約APIが一時的に利用できません。", "UNAVAILABLE");
  }

  if (forceError === "validation") {
    return errorResponse(400, "要約APIの入力検証エラーです。", "VALIDATION", false);
  }

  if (!revisionId) {
    return errorResponse(400, "revisionId は必須です。", "VALIDATION", false);
  }

  const mockSummary = summaryMockByRevisionId[revisionId];
  if (mockSummary) {
    return NextResponse.json<SummaryApiRouteResponse>({
      ok: true,
      data: { revisionId, summary: mockSummary },
    });
  }

  // Fallback: 事前要約が未作成の場合は、AI or ヒューリスティックで生成
  const revision = realLawRevisions.find((r) => r.id === revisionId);
  if (!revision) {
    return errorResponse(404, "要約データが見つかりませんでした。", "NOT_FOUND", false);
  }
  const generated = await generateSummaryForRevision(revision);
  return NextResponse.json<SummaryApiRouteResponse>({
    ok: true,
    data: { revisionId, summary: generated },
  });
}

async function generateSummaryForRevision(
  revision: (typeof realLawRevisions)[number]
): Promise<LawRevisionSummary> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  // AI生成を試みる
  if (apiKey && apiKey !== "dummy") {
    try {
      const prompt = `以下の労働安全衛生に関する法改正を、現場担当者向けに分析し、JSONで回答してください。
回答は必ず \`\`\`json ... \`\`\` ブロックで、以下の形式で出力してください。

\`\`\`json
{
  "threeLineSummary": ["1行目（改正の核心）", "2行目（実務への影響）", "3行目（期限や罰則があれば）"],
  "workplaceActions": ["現場で取るべき具体的アクション1", "アクション2", "アクション3"],
  "targetIndustries": ["対象業種1", "対象業種2"]
}
\`\`\`

法改正情報:
- タイトル: ${revision.title}
- 区分: ${revision.category}
- インパクト: ${revision.impact}
- 概要: ${revision.summary}
- 施行日: ${revision.enforcement_date ?? "不明"}
- 発出元: ${revision.issuer}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = raw.match(/```json\s*([\s\S]*?)```/);
        if (match?.[1]) {
          try {
            const parsed = JSON.parse(match[1]) as Partial<LawRevisionSummary>;
            const three = Array.isArray(parsed.threeLineSummary) ? parsed.threeLineSummary.slice(0, 3) : [];
            while (three.length < 3) three.push(revision.summary ?? "情報なし");
            return {
              threeLineSummary: [three[0], three[1], three[2]] as [string, string, string],
              workplaceActions: Array.isArray(parsed.workplaceActions) ? parsed.workplaceActions : [],
              targetIndustries: Array.isArray(parsed.targetIndustries) ? parsed.targetIndustries : [],
            };
          } catch {
            // fall through to heuristic
          }
        }
      }
    } catch {
      // fall through to heuristic
    }
  }
  // Heuristic fallback — revision.summary を 3 行に分割
  const sentences = (revision.summary ?? "")
    .split(/[。\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);
  while (sentences.length < 3) sentences.push(revision.title);
  return {
    threeLineSummary: [sentences[0], sentences[1], sentences[2]] as [string, string, string],
    workplaceActions: [
      `${revision.category}の該当条文を確認し、現場手順を見直す`,
      "対象労働者へ教育・周知を実施する",
      "記録保存・点検体制を整備する",
    ],
    targetIndustries: revision.impact === "高" ? ["建設業", "製造業", "化学工業"] : ["製造業"],
  };
}
