/**
 * P0-001 (usability-audit-day2-2026-05-24):
 * 安衛法AIチャットの SSE ストリーミング応答エンドポイント。
 *
 * 既存の /api/chatbot/route.ts (full JSON 応答) はそのまま残し、
 * stream モードのみここで提供する。フロントの ChatbotPanel は
 * 「ストリーミング優先 + 失敗時に従来 JSON 応答に fallback」する
 * 形にして互換性を保つ。
 *
 * SSE イベント:
 *   - event: progress  → { step, message }     (RAG検索/AI生成中の進捗)
 *   - event: text      → { chunk: "..." }      (Gemini チャンク)
 *   - event: meta      → ChatbotResponse 形    (完了時の sources/notices/...)
 *   - event: error     → { message, retryable }
 *
 * Phase 2 ハルシネーション3層との整合:
 * - Layer 1 (ホワイトリスト同梱プロンプト): buildPromptWithWhitelist を使用
 * - Layer 2 (条文番号検証): full answer 確定後に validateCitations を実施。
 *   ストリーミング中の retry は UX を悪化させるため警告追記のみ (社長指示通り)。
 * - Layer 3 (fallback decision): 既存 buildFallbackDecision を使用
 * Phase 4 (通達・リーフレット添付): attachNoticesAndLeaflets を完成後に呼ぶ。
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  searchRelevantArticlesWithScore,
  buildContextFromArticles,
  formatSourceCitations,
  type LawCategoryFilter,
} from "@/lib/rag-search";
import { searchRelevantNotices, NOTICE_BINDING_LABELS } from "@/lib/notice-search";
import { searchMlitResources } from "@/data/mlit-resources";
import { AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import {
  buildStructuredCitations,
  formatCitationTriples,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
} from "@/lib/chatbot-enrichment";
import {
  buildAllowedCitations,
  buildPromptWithWhitelist,
} from "@/lib/chatbot-prompt-builder";
import { validateCitations } from "@/lib/chatbot-citation-validator";
import { buildFallbackDecision } from "@/lib/chatbot-fallback-logic";
import { attachNoticesAndLeaflets } from "@/lib/chatbot-notice-attachment";
import { cacheKey, getCachedResponse, setCachedResponse } from "@/lib/chatbot-cache";
import type { LawArticle } from "@/data/laws";
import {
  SYSTEM_PROMPT,
  buildMlitContext,
  buildHistoryContents,
  buildFollowups,
  buildSnippet,
  mlitToSource,
  type ChatbotRequest,
  type ChatbotResponse,
  type ChatbotSource,
} from "../route";

const encoder = new TextEncoder();

function sseFrame(event: string, data: unknown): Uint8Array {
  // SSE は data 行を JSON 1 行で送る。改行を含む payload は data: で複数行
  // 書く必要があるが、JSON.stringify した結果に改行は含まれないので 1 行で OK。
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return encoder.encode(payload);
}

export async function POST(request: Request) {
  let body: ChatbotRequest | null = null;
  try {
    body = (await request.json()) as ChatbotRequest;
  } catch {
    // SSE エンドポイントだが、入力エラーは即時 JSON で返す (フロントは res.ok を見て fallback)
    return new Response(
      JSON.stringify({ error: "リクエストボディのJSON形式が不正です。", retryable: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const message = body?.message?.trim();
  if (!message) {
    return new Response(
      JSON.stringify({ error: "質問文を入力してください。", retryable: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const lawCategory: LawCategoryFilter = body?.lawCategory ?? "all";
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // P1-1 (chatbot-deep-audit 2026-05-26): stream 経路でもレスポンスキャッシュを使う。
  // 履歴付きリクエストは直前ターンの文脈が回答に影響するため bypass（非stream route と同条件）。
  const cacheableRequest = !body?.history || body.history.length === 0;
  const cKey = cacheableRequest ? cacheKey(message, lawCategory) : null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(sseFrame(event, data));
      };

      try {
        // キャッシュヒット時は Gemini を呼ばず、確定済み応答を擬似ストリームで再生する
        if (cKey) {
          const cached = getCachedResponse<ChatbotResponse>(cKey);
          if (cached) {
            send("text", { chunk: cached.answer });
            send("meta", cached);
            controller.close();
            return;
          }
        }

        send("progress", { step: "rag", message: "関連条文を検索しています…" });

        // RAG 検索 (関数引数の型ガード上 message は trim 済の string)
        const { articles: allRelevant, normalizedScore } =
          searchRelevantArticlesWithScore(message, 10, lawCategory);
        const mlitMatches = searchMlitResources(message, 3);
        const relatedNotices = searchRelevantNotices(message, 3);
        const CONFIDENCE_THRESHOLD = 0.5;
        const relevantArticles =
          normalizedScore >= CONFIDENCE_THRESHOLD ? allRelevant : [];
        const context = buildContextFromArticles(relevantArticles);
        const hasRagHits = relevantArticles.length > 0;
        const confidenceScore = Math.round(normalizedScore * 100) / 100;

        // APIキーなし or 低信頼なら最小限の degraded response を1発で送る
        if (!apiKey || apiKey === "dummy" || !hasRagHits) {
          const fallbackText = !apiKey || apiKey === "dummy"
            ? `AIによる回答生成は現在ご利用いただけません（APIキー未設定）。関連条文のみご案内します。\n\n${AI_LEGAL_DISCLAIMER}`
            : `ご質問に合致する法令条文を十分な確信度で特定できませんでした。\n\n最新・正確な条文は e-Gov 法令検索（https://laws.e-gov.go.jp/）でご確認ください。\n${AI_LEGAL_DISCLAIMER}`;
          send("text", { chunk: fallbackText });
          const fallbackPayload: ChatbotResponse = {
            answer: fallbackText,
            sources: [
              ...relevantArticles.map((a: LawArticle) => ({
                law: `${a.law}（${a.lawShort}）`,
                article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
                articleTitle: a.articleTitle,
                text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
                fullText: a.text,
                snippet: buildSnippet(a.text, message),
              })),
              ...mlitMatches.map(mlitToSource),
            ] satisfies ChatbotSource[],
            source_type: hasRagHits ? "rag" : "ai_inference",
            confidence: "low",
            confidenceScore,
            followups: buildFollowups(message, relevantArticles),
            notices: relatedNotices,
            citations: hasRagHits ? buildStructuredCitations(relevantArticles) : [],
            relatedLaws: hasRagHits ? suggestRelatedLaws(message, relevantArticles) : [],
            digDeeperLinks: suggestDigDeeperLinks(message, relevantArticles),
          };
          send("meta", fallbackPayload);
          controller.close();
          return;
        }

        // Phase 2 Layer 1: ホワイトリスト同梱プロンプト
        const allowedCitations = buildAllowedCitations(relevantArticles);
        const fallbackDecision = buildFallbackDecision({
          query: message,
          normalizedScore,
          articles: relevantArticles,
        });

        send("progress", { step: "ai", message: "AIが回答を生成しています…" });

        // Gemini streaming
        let answer = "";
        let citationLayer2Status: "skipped" | "passed" | "warned" = "skipped";
        try {
          await withCircuitBreaker(
            "gemini",
            async () => {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: SYSTEM_PROMPT,
              });
              const userPrompt = buildPromptWithWhitelist({
                question: message,
                context,
                mlitContext: buildMlitContext(mlitMatches),
                allowed: allowedCitations,
              });
              const historyContents = buildHistoryContents(body?.history);
              const streamResult = historyContents.length > 0
                ? await model.startChat({ history: historyContents }).sendMessageStream(userPrompt)
                : await model.generateContentStream(userPrompt);
              for await (const chunkResponse of streamResult.stream) {
                const chunkText = chunkResponse.text();
                if (chunkText) {
                  answer += chunkText;
                  send("text", { chunk: chunkText });
                }
              }
              return answer;
            },
            { failureThreshold: 4, cooldownMs: 60_000 },
          );

          // Phase 2 Layer 2: 応答完了後の条文番号検証 (retry は SSE では行わず警告のみ)
          const validation = validateCitations(answer, allowedCitations);
          if (validation.findings.length === 0) {
            citationLayer2Status = "passed";
          } else {
            answer += validation.warningNote;
            send("text", { chunk: validation.warningNote });
            citationLayer2Status = "warned";
          }
        } catch (err) {
          const lower = err instanceof Error ? err.message.toLowerCase() : "";
          let reasonLabel = "AIサービスへの接続に失敗しました";
          if (err instanceof CircuitOpenError) reasonLabel = "AIサービスが連続失敗中（自動復旧待ち）";
          else if (lower.includes("quota") || lower.includes("429")) reasonLabel = "AIサービスの利用制限に達しました";
          else if (lower.includes("timeout")) reasonLabel = "AIサービスの応答がタイムアウトしました";

          const degradedAnswer =
            `【AI生成は現在ご利用いただけません（${reasonLabel}）。関連条文のみご案内します。】\n\n` +
            `信頼度の高い関連条文：\n` +
            relevantArticles
              .slice(0, 5)
              .map((a) => `・${a.law}（${a.lawShort}） ${a.articleNum}${a.articleTitle ? `「${a.articleTitle}」` : ""}`)
              .join("\n") +
            `\n\n条文本文は下記の【参照】セクションまたは e-Gov 法令検索 (https://laws.e-gov.go.jp/) でご確認ください。` +
            `\n${AI_LEGAL_DISCLAIMER}`;
          send("text", { chunk: degradedAnswer });
          const degradedPayload: ChatbotResponse = {
            answer: degradedAnswer,
            sources: relevantArticles.map((a: LawArticle) => ({
              law: `${a.law}（${a.lawShort}）`,
              article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
              articleTitle: a.articleTitle,
              text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
              fullText: a.text,
              snippet: buildSnippet(a.text, message),
            })),
            source_type: "rag",
            confidence: "low",
            confidenceScore,
            notices: relatedNotices,
            citations: buildStructuredCitations(relevantArticles),
            relatedLaws: suggestRelatedLaws(message, relevantArticles),
            digDeeperLinks: suggestDigDeeperLinks(message, relevantArticles),
            scopeWarnings: [reasonLabel],
          };
          send("meta", degradedPayload);
          controller.close();
          return;
        }

        // Phase 2 Layer 3 (adjacent)
        if (fallbackDecision.tier === "adjacent" && fallbackDecision.headline) {
          const headlineChunk = `\n\n[補足] ${fallbackDecision.headline}`;
          answer += headlineChunk;
          send("text", { chunk: headlineChunk });
        }

        // 出典・通達・リーフレット
        const structuredCitations = buildStructuredCitations(relevantArticles);
        const relatedLaws = suggestRelatedLaws(message, relevantArticles);
        const digDeeperLinks = suggestDigDeeperLinks(message, relevantArticles);
        const attached = attachNoticesAndLeaflets({
          articles: relevantArticles,
          answer,
          query: message,
        });

        // 末尾の整形テキストをチャンクで追記 (UI のスクロール体験のため text event で逐次送信)
        let trailing = "";
        if (structuredCitations.length > 0) {
          trailing += formatCitationTriples(structuredCitations);
        } else if (relevantArticles.length > 0) {
          trailing += formatSourceCitations(relevantArticles);
        }
        if (mlitMatches.length > 0) {
          const ministryRefs = [
            ...new Set(mlitMatches.map((r) => `${r.publisher}（${r.bureau}）`)),
          ].slice(0, 3);
          trailing += `\n\n🏛 所管省庁資料: ${ministryRefs.join("、")}`;
        }
        if (attached.notices.length > 0) {
          trailing += "\n\n【関連通達・告示】\n";
          for (const n of attached.notices) {
            const num = n.noticeNumber ? `${n.noticeNumber}・` : "";
            const date = n.issuedDateRaw ? `${n.issuedDateRaw}・` : "";
            trailing += `- ${num}${date}${n.title}（${NOTICE_BINDING_LABELS[n.bindingLevel]}）\n`;
            trailing += `  原文: ${n.detailUrl}\n`;
          }
        }
        if (attached.leaflets.length > 0) {
          trailing += "\n\n【関連リーフレット・教材】\n";
          for (const l of attached.leaflets) {
            const date = l.publishedDateRaw ? `（${l.publishedDateRaw}）` : "";
            trailing += `- ${l.title}${date}・${l.publisher}\n`;
            const url = l.pdfUrl ?? l.sourceUrl;
            trailing += `  原文: ${url}\n`;
          }
        }
        if (relatedLaws.length > 0) {
          trailing += "\n\n【合わせて確認すべき法令】\n";
          for (const r of relatedLaws) {
            trailing += `- ${r.lawShort}（${r.fullName}）: ${r.reason}\n`;
          }
        }
        if (trailing) {
          answer += trailing;
          send("text", { chunk: trailing });
        }

        // ハルシネーション抑制系の警告
        const scopeWarnings: string[] = [];
        const hitLawShorts = relevantArticles.map((a: LawArticle) => a.lawShort);
        const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawShorts);
        if (outOfScopeRefs.length > 0) {
          const sample = outOfScopeRefs.slice(0, 3).join("、");
          const note = `\n\n⚠️ 注記：回答中の「${sample}」は本ツールの提供データ（33法令＋通達DB）の範囲外の参照のため、e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`;
          answer += note;
          send("text", { chunk: note });
          scopeWarnings.push(
            `回答中の参照「${sample}」は提供データ範囲外のため、内容の確からしさは保証できません。`,
          );
        }
        if (detectUngroundedAssertions(answer)) {
          scopeWarnings.push(
            "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。",
          );
        }

        // 信頼度判定
        let finalConfidence: "high" | "medium" | "low" =
          normalizedScore >= 0.75 && relevantArticles.length >= 2 ? "high" : "medium";
        if (citationLayer2Status === "warned") {
          if (finalConfidence === "high") finalConfidence = "medium";
          else if (finalConfidence === "medium") finalConfidence = "low";
          scopeWarnings.push(
            "応答中の条文引用に整合しない参照を検出したため、信頼度を一段階降格しました。",
          );
        }
        if (fallbackDecision.tier === "adjacent" && finalConfidence === "high") {
          finalConfidence = "medium";
        }

        const sources: ChatbotSource[] = [
          ...relevantArticles.map((a: LawArticle) => ({
            law: `${a.law}（${a.lawShort}）`,
            article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
            articleTitle: a.articleTitle,
            text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
            fullText: a.text,
            snippet: buildSnippet(a.text, message),
          })),
          ...mlitMatches.map(mlitToSource),
        ];

        const payload: ChatbotResponse = {
          answer,
          sources,
          source_type: "rag",
          confidence: finalConfidence,
          confidenceScore,
          followups: buildFollowups(message, relevantArticles),
          notices: relatedNotices,
          citations: structuredCitations,
          relatedLaws,
          digDeeperLinks,
          scopeWarnings: scopeWarnings.length > 0 ? scopeWarnings : undefined,
          attachedNotices: attached.notices.length > 0 ? attached.notices : undefined,
          attachedLeaflets: attached.leaflets.length > 0 ? attached.leaflets : undefined,
        };
        // P1-1: 正常完了した応答のみキャッシュ（degraded/error path はキャッシュしない）。
        // citationLayer2 で警告降格された応答も、確定した本文＋出典なので再利用して問題ない。
        if (cKey) {
          setCachedResponse(cKey, payload);
        }
        send("meta", payload);
        controller.close();
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        });
        controller.close();
      }
    },
    cancel() {
      // クライアントが abort した場合は何もしない (Gemini stream は yield で抜ける)
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
