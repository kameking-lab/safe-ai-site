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
  type LawCategoryFilter,
} from "@/lib/rag-search";
import { searchRelevantNotices } from "@/lib/notice-search";
import { searchMlitResources } from "@/data/mlit-resources";
import { AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import {
  buildStructuredCitations,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  sanitizePlaceholderCitations,
} from "@/lib/chatbot-enrichment";
import { stripAnswerTailBlocks } from "@/lib/chatbot-answer-format";
import {
  buildAllowedCitations,
  buildPromptWithWhitelist,
} from "@/lib/chatbot-prompt-builder";
import { validateCitations } from "@/lib/chatbot-citation-validator";
import { buildFallbackDecision, searchPartialMatches } from "@/lib/chatbot-fallback-logic";
import { attachNoticesAndLeaflets } from "@/lib/chatbot-notice-attachment";
import { cacheKey, getCachedResponse, setCachedResponse } from "@/lib/chatbot-cache";
import {
  buildNoHitTemplate,
  buildNoHitGeminiPrompt,
  formatOfficialLinks,
  NO_HIT_NOISE_FLOOR,
} from "@/lib/chatbot-no-hit-response";
import { getClientIp, checkRateLimit, rateLimitMessage } from "@/lib/chatbot-rate-limit";
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

  // P2-5: 簡易IPレート制限（濫用防止）。到達時は公式DB誘導を返す。
  const rate = checkRateLimit(getClientIp(request));
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: rateLimitMessage(rate.retryAfterSec), retryable: false }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfterSec) },
      },
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
        const { articles: allRelevant, normalizedScore, hadPins } =
          searchRelevantArticlesWithScore(message, 10, lawCategory);
        const mlitMatches = searchMlitResources(message, 3);
        const relatedNotices = searchRelevantNotices(message, 3);
        const CONFIDENCE_THRESHOLD = 0.5;
        const hasDirectHit =
          normalizedScore >= CONFIDENCE_THRESHOLD && allRelevant.length > 0;
        // P1-5: 直接ヒットが無くても低スコアの関連条文を「参考」として根拠提示に使う。
        // 「該当条文無し」で突き放さず、関連条文＋一般原則＋公式誘導を返す。
        const noHitMode = !hasDirectHit;
        // T9: no-hit時は normalizedScore が下限未満ならslice内の全件がノイズ
        // （診断04 Q21「明日の東京の天気」→港湾労働法第2条 の誤提示事例）。
        const relevantArticles = hasDirectHit
          ? allRelevant
          : normalizedScore >= NO_HIT_NOISE_FLOOR
            ? allRelevant.slice(0, 8)
            : [];
        const partialMatches = searchPartialMatches(message);
        const context = buildContextFromArticles(relevantArticles);
        const confidenceScore = Math.round(normalizedScore * 100) / 100;
        const noApi = !apiKey || apiKey === "dummy";

        const buildSourceList = (): ChatbotSource[] => [
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

        // P1-5: API無し、または根拠となる関連条文が皆無 → 決定的テンプレ
        // （関連条文＋関連分野＋一般原則＋公式誘導。推測の断定は一切含めない）
        if (noApi || relevantArticles.length === 0) {
          const template = buildNoHitTemplate({
            query: message,
            relatedArticles: relevantArticles,
            partialMatches,
            disclaimer: AI_LEGAL_DISCLAIMER,
          });
          const answer = noApi
            ? `AIによる回答生成は現在ご利用いただけません（APIキー未設定）。関連条文と一般原則をご案内します。\n\n${template}`
            : template;
          send("text", { chunk: answer });
          const fallbackPayload: ChatbotResponse = {
            answer,
            sources: buildSourceList(),
            source_type: relevantArticles.length > 0 ? "rag" : "ai_inference",
            confidence: "low",
            confidenceScore,
            followups: buildFollowups(message, relevantArticles),
            notices: relatedNotices,
            citations:
              relevantArticles.length > 0 ? buildStructuredCitations(relevantArticles) : [],
            relatedLaws: suggestRelatedLaws(message, relevantArticles),
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
          hadPins,
        });

        send("progress", { step: "ai", message: "AIが回答を生成しています…" });

        // Gemini streaming
        let answer = "";
        let citationLayer2Status: "skipped" | "passed" | "warned" = "skipped";
        let citationWarningNote = "";
        try {
          await withCircuitBreaker(
            "gemini",
            async () => {
              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: SYSTEM_PROMPT,
              });
              // P1-5: 直接ヒット無しモードでは「関連＋最低限措置＋公式誘導」を根拠付きで生成
              const userPrompt = noHitMode
                ? buildNoHitGeminiPrompt({
                    question: message,
                    context,
                    allowed: allowedCitations,
                  })
                : buildPromptWithWhitelist({
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
          // 警告は answer 本文へ追記せず scopeWarnings（UIの警告枠）で返す（2026-07-11）
          const validation = validateCitations(answer, allowedCitations);
          if (validation.findings.length === 0) {
            citationLayer2Status = "passed";
          } else {
            citationWarningNote = validation.warningNote;
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

        // ごちゃごちゃブロック根絶（2026-07-11）: 出典・通達・リーフレット・関連法令は
        // answer 本文へテキスト追記せず、構造化フィールドのみで返す（UIが折りたたみ
        // カードで表示するため本文追記は二重表示だった）。モデルが自前で書いた
        // 免責・出典風テール、プレースホルダ（YYYY年MM月等）もここで除去する。
        answer = stripAnswerTailBlocks(sanitizePlaceholderCitations(answer));

        // Phase 2 Layer 3 (adjacent)
        if (fallbackDecision.tier === "adjacent" && fallbackDecision.headline) {
          const headlineChunk = `\n\n[補足] ${fallbackDecision.headline}`;
          answer += headlineChunk;
          send("text", { chunk: headlineChunk });
        }

        // 出典・通達・リーフレット（構造化フィールド）
        const structuredCitations = buildStructuredCitations(relevantArticles);
        const relatedLaws = suggestRelatedLaws(message, relevantArticles);
        const digDeeperLinks = suggestDigDeeperLinks(message, relevantArticles);
        const attached = attachNoticesAndLeaflets({
          articles: relevantArticles,
          answer,
          query: message,
        });

        // P1-5: 直接ヒット無しモードでは公式情報への誘導を必ず末尾に付与
        if (noHitMode) {
          const officialChunk = `\n${formatOfficialLinks()}`;
          answer += officialChunk;
          send("text", { chunk: officialChunk });
        }

        // ハルシネーション抑制系の警告（本文へは追記せず scopeWarnings で返す）
        const scopeWarnings: string[] = [];
        if (citationWarningNote) {
          scopeWarnings.push(citationWarningNote.trim());
        }
        const hitLawShorts = relevantArticles.map((a: LawArticle) => a.lawShort);
        const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawShorts);
        if (outOfScopeRefs.length > 0) {
          const sample = outOfScopeRefs.slice(0, 3).join("、");
          scopeWarnings.push(
            `回答中の参照「${sample}」は本ツールの収録データ（条文・通達DB）の範囲外のため、内容の確からしさは保証できません。e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`,
          );
        }
        if (detectUngroundedAssertions(answer)) {
          scopeWarnings.push(
            "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。",
          );
        }

        // 信頼度判定（no-hitモードは「参考」提示のため常に low）
        let finalConfidence: "high" | "medium" | "low" = noHitMode
          ? "low"
          : normalizedScore >= 0.75 && relevantArticles.length >= 2
            ? "high"
            : "medium";
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
