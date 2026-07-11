import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import { cdnCacheHeaders } from "@/lib/api-cache";

const LAW_SUMMARY_TIMEOUT_MS = 12_000;
// F-005: 同一条文(law+articleNum+text)は同一要約に収束するため4hキャッシュ。
const SUCCESS_CACHE = cdnCacheHeaders("INDUSTRY");

function excerpt(text: string, maxChars = 200): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function buildFallback(
  law: string,
  articleNum: string,
  text: string,
  reason: string,
  kind: "要約" | "解説" = "要約"
): { summary: string; source: "fallback" } {
  return {
    summary:
      `【${kind}フォールバック】\n${law} ${articleNum}\n\n${excerpt(text)}\n\n` +
      `(${reason}のためAI${kind}は利用できません。条文冒頭をそのまま表示しています。)`,
    source: "fallback",
  };
}

export async function POST(req: Request) {
  const { law, articleNum, text, mode } = (await req.json()) as {
    law: string;
    articleNum: string;
    text: string;
    /**
     * 省略時は従来どおり要約（後方互換）。"explain" は法令ナビ条文ページの
     * 「AI解説」＝原文を読み解くための平易な解説（原文が正・解説は補助の建て付け。
     * docs/horei-navi-foundation-2026-07-11 §2-6）。
     */
    mode?: "summary" | "explain";
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "dummy") {
    const kind = mode === "explain" ? "解説" as const : "要約" as const;
    return NextResponse.json(buildFallback(law, articleNum, text, "GEMINI_API_KEY未設定", kind), {
      headers: SUCCESS_CACHE,
    });
  }

  // 同一条文＋同一モードで決定的な出力に収束させ、CDNキャッシュ（INDUSTRY 4h）を効かせる。
  const prompt =
    mode === "explain"
      ? `以下の労働安全衛生法令の条文を、法律に不慣れな現場の作業者向けに平易な日本語で解説してください。` +
        `「誰が」「何を」「いつ・どんなときに」しなければならない（してはならない）のかを最初に短く言い切り、` +
        `条文中の専門用語はかみ砕いて説明してください。根拠のない義務・数値を付け足さないでください。` +
        `回答の末尾には必ず根拠として「【根拠条文】${law} ${articleNum}」と「【原文】e-GovのURL（例: https://laws.e-gov.go.jp/law/347AC0000000057）」を記載してください。\n\n` +
        `法令: ${law} ${articleNum}\n\n条文（原文）:\n${text}`
      : `以下の労働安全衛生法令の条文を、現場担当者向けに3〜5行で分かりやすく要約してください。法令名・条番号を冒頭に示し、重要なポイントを箇条書きで補足してください。回答の末尾には必ず「【出典】告示番号（わかる場合）とe-GovのURL（例: https://laws.e-gov.go.jp/law/347AC0000000057）」を記載してください。\n\n法令: ${law} ${articleNum}\n\n条文:\n${text}`;

  try {
    const data = await withCircuitBreaker(
      "gemini",
      async () => {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            timeoutMs: LAW_SUMMARY_TIMEOUT_MS,
          }
        );
        if (!res.ok) {
          throw new Error(`gemini HTTP ${res.status}`);
        }
        return (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
      },
      { failureThreshold: 4, cooldownMs: 60_000 }
    );

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!summary) {
      return NextResponse.json(buildFallback(law, articleNum, text, "AI応答が空", mode === "explain" ? "解説" : "要約"), {
        headers: SUCCESS_CACHE,
      });
    }
    return NextResponse.json({ summary, source: "ai" }, { headers: SUCCESS_CACHE });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    let reason = "AI応答エラー";
    if (err instanceof CircuitOpenError) reason = "AIサービスが連続失敗中（サーキット解放待ち）";
    else if (message.includes("quota") || message.includes("429")) reason = "APIクォータ超過";
    else if (message.includes("timeout") || message.includes("timed out")) reason = "AIサービス応答タイムアウト";
    else if (message.includes("network") || message.includes("fetch")) reason = "ネットワークエラー";
    console.error("[law-summary] Gemini call failed:", err instanceof Error ? err.message : err);
    // フォールバック文も同一条文なら同一出力なのでキャッシュ可
    return NextResponse.json(buildFallback(law, articleNum, text, reason, mode === "explain" ? "解説" : "要約"), {
      headers: SUCCESS_CACHE,
    });
  }
}
