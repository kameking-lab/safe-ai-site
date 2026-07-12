import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchRelevantArticlesWithScore, buildContextFromArticles, type LawCategoryFilter } from "@/lib/rag-search";
import { resolveFulltextRagArticles } from "@/lib/laws-fulltext/rag-fallback";
import { stripAnswerTailBlocks } from "@/lib/chatbot-answer-format";
import { searchRelevantNotices, type NoticeHit } from "@/lib/notice-search";
import type { LawArticle } from "@/data/laws";
import { LAW_SOURCE_COUNT } from "@/data/laws";
import { searchMlitResources, type MlitResource } from "@/data/mlit-resources";
import { AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import { withCircuitBreaker, CircuitOpenError } from "@/lib/external/circuit-breaker";
import {
  buildStructuredCitations,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  sanitizePlaceholderCitations,
  type StructuredCitation,
  type RelatedLawLink,
  type DigDeeperLink,
} from "@/lib/chatbot-enrichment";
import { cacheKey, getCachedResponse, setCachedResponse } from "@/lib/chatbot-cache";
// Phase 2 ハルシネーション絶滅3層
import {
  buildAllowedCitations,
  buildPromptWithWhitelist,
} from "@/lib/chatbot-prompt-builder";
import { validateCitations } from "@/lib/chatbot-citation-validator";
import {
  buildFallbackDecision,
  searchPartialMatches,
} from "@/lib/chatbot-fallback-logic";
import { buildNoHitTemplate, NO_HIT_NOISE_FLOOR } from "@/lib/chatbot-no-hit-response";
import { hasOutOfDomainSignal } from "@/lib/rag/out-of-domain";
import { getClientIp, checkRateLimit, rateLimitMessage } from "@/lib/chatbot-rate-limit";
// Phase 4 通達・リーフレット添付
import {
  attachNoticesAndLeaflets,
  type AttachedLeaflet,
  type AttachedNotice,
} from "@/lib/chatbot-notice-attachment";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatbotRequest = {
  message: string;
  history?: ChatTurn[];
  /** 法令カテゴリで RAG 検索の対象を絞る（"all" または lawShort 指定） */
  lawCategory?: LawCategoryFilter;
};

export type ChatbotSource = {
  law: string;
  article: string;
  text: string;
  /** 条文中、質問に該当する箇所の前後を抜粋したスニペット */
  snippet?: string;
  /** 条文全文（UI で「全文表示」ボタン用。法令条文の場合のみ） */
  fullText?: string;
  /** 条文タイトル（「総則」「定義」等） */
  articleTitle?: string;
  /** 出典の所管省庁（国交省資料の場合のみ） */
  ministry?: string;
  /** 公式ページURL（外部出典の場合） */
  url?: string;
};

export type FollowupSuggestion = {
  /** ボタンのラベル（「もっと詳しく」等） */
  label: string;
  /** クリックされた際に送信される質問文 */
  prompt: string;
};

export type ChatbotResponse = {
  answer: string;
  sources: ChatbotSource[];
  source_type: "rag" | "ai_inference";
  confidence: "high" | "medium" | "low";
  /** 信頼度スコア（0〜1） */
  confidenceScore?: number;
  /** フォローアップ質問サジェスト（最大3件） */
  followups?: FollowupSuggestion[];
  /** 関連する厚労省通達・告示・指針（一次資料DB由来）— Phase 4 で attachedNotices に統合 */
  notices?: NoticeHit[];
  /** 構造化された出典（条文番号＋施行日＋発出機関） */
  citations?: StructuredCitation[];
  /** 合わせて確認すべき法令の自動サジェスト */
  relatedLaws?: RelatedLawLink[];
  /** 「もっと深く知る」動線（事故事例・通達・業種別レポート） */
  digDeeperLinks?: DigDeeperLink[];
  /** RAG コーパス範囲外の参照を検出した場合の警告（先頭に表示） */
  scopeWarnings?: string[];
  /** Phase 4: 条文紐付け/応答引用/クエリ で取得した通達・告示（最大5件、source 付き） */
  attachedNotices?: AttachedNotice[];
  /** Phase 4: 条文紐付けで取得した厚労省リーフレット（最大5件） */
  attachedLeaflets?: AttachedLeaflet[];
};

type ApiErrorBody = {
  error: string;
  retryable: boolean;
};

function jsonError(status: number, message: string, retryable = false) {
  return NextResponse.json<ApiErrorBody>({ error: message, retryable }, { status });
}

// P0-001 (usability-audit-day2): /api/chatbot/stream で再利用するため export 化。
export const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家AIアシスタントです。
以下のルールを厳守してください。

1. 必ず提供された法令条文のみに基づいて回答すること
2. 回答に引用する法令名・条文番号は、必ず【参照法令条文】に記載された法令名・条番号のみを使用すること。その他の架空・不確かな法令名（例：「化学物質管理関連通達第60条」のような存在しない法令）は絶対に作らないこと
3. 条文中の号番号（第○号、一・二・三・…・十一 等）は、参照条文に記載されている表記をそのまま用いること。号番号を独自に変換・推測・並べ替えしてはならない（例：条文に「六」とあるものを「第6号」「第11号」等に書き換えない）。条文に号番号の記載がない場合は号番号を付与しないこと
4. ハルシネーション（根拠のない情報の創作）は絶対に行わないこと。提供された法令条文・所管省庁資料に記載のない事実は推測で書かず、「提供データには明記なし」と明示すること
5. 日本語で丁寧に回答すること
6. 専門用語には補足説明を加えること
7. これまでの会話履歴がある場合は、文脈を踏まえて回答すること（「先ほどの〜について」等の指示語を解釈する）
8. 法的義務として明文化されている事項（資格・免許・特別教育・技能講習・作業主任者の選任など）は、参照条文に明示があれば「〜が必要です」「〜しなければなりません」と断定形で書くこと。「〜とされています」「〜と考えられます」等のぼかし表現は、解釈の余地が残る論点に限定する
9. 「法令上の明確な規定は見つかりませんでした」「明確な規定がありません」のようなぼかし表現は、参照条文に該当論点の規定が本当に存在しない場合に限り使用すること。参照条文に該当条文がある場合に逃げ口上として使うことを禁ずる
10. 法令条文を引用する際は、条番号だけでなく可能な限り「条文番号＋施行日＋発出機関」の3点セットで明示すること（例：「安衛則第518条（施行：2020年12月、所管：厚生労働省）」）。施行日が提供条文の文中に明記されていない場合は施行日を省略し「（所管：厚生労働省）」のみ書くこと。「YYYY年MM月」「第XX条」のようなプレースホルダ・記号のまま出力することは絶対に禁止（施行日不明時は省略、条番号不明時はその条文自体を引用しない）
11. 参照法令条文に含まれない法令（例：架空の通達番号、根拠不明のガイドライン名）を断定的に引用してはならない。範囲外の場合は必ず「本ツールの提供データ範囲外のため、e-Gov・MHLW公式情報でご確認ください」と明示的に断ること

資格系質問（フォークリフト・クレーン・玉掛け・酸欠・有機溶剤などの「運転に必要な資格は？」「教育は何が必要？」型の質問）への回答ルール：
- 結論を本文の先頭に1〜2文で必ず明記する。例：「最大荷重1t以上のフォークリフトの運転には『フォークリフト運転技能講習』の修了が必要です（労働安全衛生法第61条第1項、労働安全衛生法施行令第20条第11号）。1t未満は特別教育（安衛則第36条第5号）で足ります。」
- 結論の直後に、法令名・条番号を括弧付きで併記する
- 参照条文に安衛法第61条（就業制限）または安衛法施行令第20条が含まれている場合は、必ずその条番号を回答中に直接引用する
- 施行令第20条を引用する際は必ず「第○号」（例：第11号、第6号）の号番号を明示すること。号番号なしに「施行令第20条」とだけ書くことは禁止
- 「明確な規定が見つかりません」型の回答は、参照条文に第61条・施行令第20条のいずれも含まれない場合に限る

回答の形式（スマホで3秒で結論が読める形にすること）：
- まず質問への直接的な回答（結論）を1〜2文で述べる
- 次に根拠となる条文を引用する（「根拠：安衛法第○条」等）。各条文の説明は要点1〜2文に要約し、条文全文の逐語引用はしないこと（条文全文は画面の「参照条文」欄に自動表示される）
- 必要に応じて補足説明を加える。回答全体は結論→根拠→補足の順で簡潔に（目安600字以内）
- 表示形式: 箇条書きは行頭を「・」で書くこと。markdown記法（「* 」「- 」「+ 」の箇条書き、「#」見出し、表、コードブロック、水平線「---」）は使用禁止。強調は**太字**のみ使用可
- 出典一覧・関連通達・関連リーフレットの一覧を回答本文に書かないこと（画面が構造化して自動表示する）

【重要：免責・表現ルール】
- 回答は「～と考えられます」「～とされています」等の表現を使い、断定を避けること（ただし法的義務の明文はルール8のとおり断定形で書く）
- 法令解釈が行政・判例によって異なる可能性がある場合は必ずその旨を明記すること
- 免責文は画面側で常時表示されるため、回答本文に免責文を書かないこと`;

// Phase 2 Layer 1 で buildPromptWithWhitelist に置換済み（旧 buildUserPrompt を削除）。
// 設計参照: docs/chatbot-quality-research-2026-05-23/04-hallucination-prevention-design.md §2

/** MLIT資料をプロンプト用テキストに整形 (P0-001: stream route で再利用) */
export function buildMlitContext(resources: MlitResource[]): string {
  if (resources.length === 0) return "";
  return resources
    .map(
      (r) =>
        `- ${r.publisher}（${r.bureau}）「${r.title}」 ${r.publishedDate ? `(${r.publishedDate})` : ""} カテゴリ:${r.category}/${r.subcategory}`
    )
    .join("\n");
}

/** MLIT資料をChatbotSource形式に変換 (P0-001: stream route で再利用) */
export function mlitToSource(r: MlitResource): ChatbotSource {
  const desc = `${r.subcategory}・対象:${r.targetAudience.join("・")}${r.relatedLaws.length > 0 ? `・関連:${r.relatedLaws.join("、")}` : ""}`;
  return {
    law: `${r.publisher}（${r.bureau}）`,
    article: r.title,
    text: desc,
    snippet: r.keywords.length > 0 ? `キーワード: ${r.keywords.slice(0, 5).join("・")}` : undefined,
    ministry: r.publisher,
    url: r.pdfUrl ?? r.sourceUrl,
  };
}

/** 条文テキストから質問キーワード周辺を抜粋したスニペットを生成 (P0-001: stream route で再利用) */
export function buildSnippet(text: string, query: string, maxLen = 140): string {
  if (!text) return "";
  const tokens = query
    .replace(/[？?！!。、.,（）()「」『』【】\s　]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  let bestIdx = -1;
  for (const t of tokens) {
    const idx = text.indexOf(t);
    if (idx >= 0) {
      bestIdx = idx;
      break;
    }
  }
  if (bestIdx < 0) {
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
  }
  const start = Math.max(0, bestIdx - 30);
  const end = Math.min(text.length, bestIdx + maxLen - 30);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

/** 直近の会話履歴を最大10ターンに制限してGeminiの contents 形式に変換 (P0-001: stream route で再利用) */
export function buildHistoryContents(history: ChatTurn[] | undefined) {
  if (!history || history.length === 0) return [];
  const recent = history.slice(-10);
  return recent.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));
}

/** 質問と関連条文から、フォローアップ候補を生成 (P0-001: stream route で再利用) */
export function buildFollowups(question: string, articles: LawArticle[]): FollowupSuggestion[] {
  const out: FollowupSuggestion[] = [];
  out.push({
    label: "💡 もっと詳しく",
    prompt: `先ほどの回答についてもう少し詳しく説明してください。特に実務での運用方法や注意点を教えてください。`,
  });
  out.push({
    label: "📚 事例を教えて",
    prompt: `この内容に関連する具体的な現場事例や実施例を教えてください。`,
  });
  if (articles.length > 0) {
    const top = articles[0];
    out.push({
      label: `📖 ${top.lawShort}${top.articleNum} の条文を見せて`,
      prompt: `${top.law}${top.articleNum}の条文の全文と要点を教えてください。`,
    });
  } else {
    out.push({
      label: "📖 関連条文を見せて",
      prompt: `${question} に関連する具体的な法令条文を教えてください。`,
    });
  }
  return out;
}

export async function POST(request: Request) {
  let body: ChatbotRequest | null = null;
  try {
    body = (await request.json()) as ChatbotRequest;
  } catch {
    return jsonError(400, "リクエストボディのJSON形式が不正です。");
  }

  const message = body?.message?.trim();
  if (!message) {
    return jsonError(400, "質問文を入力してください。");
  }

  // P2-5: 簡易IPレート制限（stream route と同条件・同 in-memory バケットを共有）
  const rate = checkRateLimit(getClientIp(request));
  if (!rate.allowed) {
    return NextResponse.json<ApiErrorBody>(
      { error: rateLimitMessage(rate.retryAfterSec), retryable: false },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const lawCategory: LawCategoryFilter = body?.lawCategory ?? "all";
  const relatedNotices = searchRelevantNotices(message, 3);

  // Cache lookup. Only safe for stateless (no-history) requests: with a
  // history array, the prior turn context affects the answer.
  const cacheableRequest = !body?.history || body.history.length === 0;
  const key = cacheableRequest ? cacheKey(message, lawCategory) : null;
  if (key) {
    const cached = getCachedResponse<ChatbotResponse>(key);
    if (cached) {
      return NextResponse.json<ChatbotResponse>(cached, {
        status: 200,
        headers: { "X-Cache-Hit": "true" },
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時もRAG検索による条文引用は提供する。
    // T9: normalizedScore が下限未満なら無関係条文（ノイズ）とみなし除外する
    // （このdegradedパスは通常フローのno-hit noise floorを経由しないため個別適用）。
    const { articles: degradedArticles, normalizedScore: degradedScore } =
      searchRelevantArticlesWithScore(message, 5, lawCategory);
    const articles = degradedScore >= NO_HIT_NOISE_FLOOR ? degradedArticles : [];
    const mlitMatches = searchMlitResources(message, 3);
    const sources: ChatbotSource[] = [
      ...articles.map((a) => ({
        law: `${a.law}（${a.lawShort}）`,
        article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
        articleTitle: a.articleTitle,
        text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
        fullText: a.text,
        snippet: buildSnippet(a.text, message),
      })),
      ...mlitMatches.map(mlitToSource),
    ];
    const fallbackAnswer = articles.length > 0 || mlitMatches.length > 0
      ? `AIによる回答生成は現在利用できませんが、関連する法令条文・所管省庁資料が見つかりました。下記の参照をご確認ください。\n\nGEMINI_API_KEYを環境変数に設定すると、AIによる詳細な回答が利用できます。\n\n⚠️ ${AI_LEGAL_DISCLAIMER}`
      : `現在、AIチャットボット機能はAPIキーが設定されていないため利用できません。\n\nGEMINI_API_KEYを環境変数に設定することで、労働安全衛生法に関するご質問にお答えできます。\n\n⚠️ ${AI_LEGAL_DISCLAIMER}`;
    // Phase 4: API キー無しの degraded path でも条文ベースで通達・リーフレットを添付
    const attachedDegraded = attachNoticesAndLeaflets({
      articles,
      query: message,
    });
    const fallbackPayload: ChatbotResponse = {
      answer: fallbackAnswer,
      sources,
      source_type: articles.length > 0 || mlitMatches.length > 0 ? "rag" : "ai_inference",
      confidence: articles.length > 0 || mlitMatches.length > 0 ? "medium" : "low",
      followups: buildFollowups(message, articles),
      notices: relatedNotices,
      citations: buildStructuredCitations(articles),
      relatedLaws: suggestRelatedLaws(message, articles),
      digDeeperLinks: suggestDigDeeperLinks(message, articles),
      attachedNotices: attachedDegraded.notices.length > 0 ? attachedDegraded.notices : undefined,
      attachedLeaflets: attachedDegraded.leaflets.length > 0 ? attachedDegraded.leaflets : undefined,
    };
    if (key) {
      setCachedResponse(key, fallbackPayload);
    }
    return NextResponse.json<ChatbotResponse>(fallbackPayload, {
      status: 200,
      headers: { "X-Cache-Hit": "false" },
    });
  }

  // RAG: 関連条文の検索（スコア付き）
  const { articles: allRelevant, normalizedScore, hadPins } = searchRelevantArticlesWithScore(message, 10, lawCategory);
  // FT-D4 全文フォールバック: 条番号を直指定していて curated に無い条は、全文層から
  // サーバー側で1条だけ読んで文脈注入する（RAG の検索母集団＝curated は不変・全文の
  // BM25 投入はしない）。条番号を直指定しない通常質問では 1 件も発火しない。
  const fulltextArticles = await resolveFulltextRagArticles(message, lawCategory, allRelevant);
  // MLIT資料の関連検索（所管省庁資料の追加コンテキスト）
  const mlitMatches = searchMlitResources(message, 3);

  // 信頼度が 0.5 未満の条文は無関係とみなして除外。
  // 閾値を 0.7 → 0.5 に引き下げた背景: RAG コーパスを安衛法・安衛則・特化則・
  // 有機則の主要条文まで拡充したことで、部分マッチでも十分に正答に寄与する条文が
  // 当たるようになったため（「6問テストで正解率を上げる」導線）。
  const CONFIDENCE_THRESHOLD = 0.5;
  const curatedRelevant = normalizedScore >= CONFIDENCE_THRESHOLD ? allRelevant : [];
  // 全文フォールバック条（明示条番号の確定ソース）は PIN と同型で先頭へ差し込む
  // ＝curated の順位・母集団は変えず、直指定条だけを追加する。
  const relevantArticles =
    fulltextArticles.length > 0
      ? [
          ...fulltextArticles,
          ...curatedRelevant.filter(
            (a) => !fulltextArticles.some((f) => f.law === a.law && f.articleNum === a.articleNum),
          ),
        ].slice(0, 12)
      : curatedRelevant;
  const context = buildContextFromArticles(relevantArticles);

  const hasRagHits = relevantArticles.length > 0;
  const source_type: "rag" | "ai_inference" = hasRagHits ? "rag" : "ai_inference";
  // 全文フォールバックが刺さった場合は明示条番号の確定ソースのため、PIN と同様に信頼度を
  // 最低 0.7 まで底上げする（curated スコアが低くても「関連条文なし」扱いにしない）。
  const scoreForConfidence =
    fulltextArticles.length > 0 ? Math.max(normalizedScore, 0.7) : normalizedScore;
  // 信頼度判定の精度を向上：
  // - high  : スコア>=0.75 かつ 上位2件以上ヒット（複数条文が裏付け）
  // - medium: それ以外でRAGヒットあり
  // - low   : RAGヒットなし
  const confidence: "high" | "medium" | "low" = hasRagHits
    ? (scoreForConfidence >= 0.75 && relevantArticles.length >= 2) ? "high" : "medium"
    : "low";
  const confidenceScore = Math.round(scoreForConfidence * 100) / 100;

  // P1-5: 直接ヒット無しでも「該当無し」で突き放さず、低スコアの関連条文＋一般原則＋
  // 公式誘導を返す。stream route と同じ buildNoHitTemplate を使い挙動を揃える。
  if (!hasRagHits) {
    // T9: normalizedScore は先頭ヒットのスコアなので、これが下限未満ならslice内の
    // 全件がノイズ（診断04 Q21「明日の東京の天気」→港湾労働法第2条 の誤提示事例）。
    // 2026-07-11 E3/GQ51: ドメイン外シグナルつきクエリ（車検等）では、低スコアの
    // 「関連する可能性のある条文」自体が偶発ヒットのノイズ（騒音規制法16条等）なので
    // 一切提示しない（クリーンなno-hit＝確定申告と同じ誠実な範囲外対応にする）。
    const relatedForNoHit =
      normalizedScore >= NO_HIT_NOISE_FLOOR && !hasOutOfDomainSignal(message)
        ? allRelevant.slice(0, 8)
        : [];
    const partialMatches = searchPartialMatches(message);
    const noHitAnswer = buildNoHitTemplate({
      query: message,
      relatedArticles: relatedForNoHit,
      partialMatches,
      disclaimer: AI_LEGAL_DISCLAIMER,
    });
    const noHitSources: ChatbotSource[] = [
      ...relatedForNoHit.map((a) => ({
        law: `${a.law}（${a.lawShort}）`,
        article: a.articleNum + (a.articleTitle ? `「${a.articleTitle}」` : ""),
        articleTitle: a.articleTitle,
        text: a.text.length > 200 ? a.text.slice(0, 200) + "…" : a.text,
        fullText: a.text,
        snippet: buildSnippet(a.text, message),
      })),
      ...mlitMatches.map(mlitToSource),
    ];
    const scopeWarningMsg =
      partialMatches.length > 0
        ? `直接規定する条文は特定できませんでしたが、関連条文・関連分野（${partialMatches.length}件）と一般原則をご案内しました。確定情報は公式でご確認ください。`
        : "直接規定する条文は特定できませんでした。関連条文と一般原則をご案内しています。確定情報は e-Gov・厚生労働省・所轄労働基準監督署でご確認ください。";

    return NextResponse.json<ChatbotResponse>(
      {
        answer: noHitAnswer,
        sources: noHitSources,
        source_type: relatedForNoHit.length > 0 ? "rag" : "ai_inference",
        confidence: "low",
        confidenceScore,
        followups: [
          { label: "🔁 別の言い方で質問", prompt: `${message}（別の言い方で再度質問させてください。法令名や条文番号を含めた言い方で教えてください）` },
          { label: "📚 関連する法令を調べる", prompt: `${message} に関連する労働安全衛生法令にはどのようなものがありますか？` },
        ],
        notices: relatedNotices,
        citations: relatedForNoHit.length > 0 ? buildStructuredCitations(relatedForNoHit) : [],
        relatedLaws: suggestRelatedLaws(message, relatedForNoHit),
        digDeeperLinks: suggestDigDeeperLinks(message, relatedForNoHit),
        scopeWarnings: [scopeWarningMsg],
      },
      { status: 200 }
    );
  }

  // Phase 2 Layer 1: RAG ヒット articles からホワイトリストを構築
  const allowedCitations = buildAllowedCitations(relevantArticles);
  // Phase 2 Layer 3: fallback tier 判定
  const fallbackDecision = buildFallbackDecision({
    query: message,
    normalizedScore,
    articles: relevantArticles,
    hadPins,
  });

  // Gemini Flash API呼び出し（多ターン会話対応） — 失敗時は RAG ヒットを degraded 回答として返す
  // Phase 2 D6 段階的対応: Pattern A 検出時は最大1回まで retry
  let answer: string = "";
  let citationLayer2Status: "skipped" | "passed" | "warned" | "retried" = "skipped";
  // Layer 2 の警告は answer 本文へ追記せず scopeWarnings（UIの警告枠）で返す
  // （ごちゃごちゃブロック根絶 2026-07-11: 本文=回答、警告・出典=構造化フィールドに分離）
  let citationWarningNote = "";
  try {
    const callGemini = async () => {
      return await withCircuitBreaker(
        "gemini",
        async () => {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
          });
          // Phase 2 Layer 1: ホワイトリスト同梱プロンプト
          const userPrompt = buildPromptWithWhitelist({
            question: message,
            context,
            mlitContext: buildMlitContext(mlitMatches),
            allowed: allowedCitations,
          });
          const historyContents = buildHistoryContents(body?.history);
          const result = historyContents.length > 0
            ? await model.startChat({ history: historyContents }).sendMessage(userPrompt)
            : await model.generateContent(userPrompt);
          // SYSTEM_PROMPTのフォーマット例「YYYY年MM月」等をGeminiがテンプレートのまま
          // 出力してしまう事故を防ぐ（本番実測で1問中3箇所の漏出を確認）
          return sanitizePlaceholderCitations(result.response.text());
        },
        { failureThreshold: 4, cooldownMs: 60_000 }
      );
    };

    answer = await callGemini();
    // Phase 2 Layer 2: 応答中の条文番号を構造化条文DBと照合
    const validation = validateCitations(answer, allowedCitations);
    if (validation.findings.length === 0) {
      citationLayer2Status = "passed";
    } else if (validation.retryRecommended) {
      // 高リスク（Pattern A 検出）: もう一度だけ Gemini を呼んで再生成
      try {
        const retried = await callGemini();
        const reValidation = validateCitations(retried, allowedCitations);
        if (reValidation.findings.length === 0) {
          answer = retried;
          citationLayer2Status = "retried";
        } else if (!reValidation.retryRecommended) {
          // retry 後 Pattern A 消失 → 採用し警告のみ付与
          answer = retried;
          citationWarningNote = reValidation.warningNote;
          citationLayer2Status = "warned";
        } else {
          // retry 後も Pattern A 残存 → 元の応答に警告付与
          citationWarningNote = validation.warningNote;
          citationLayer2Status = "warned";
        }
      } catch {
        // retry 失敗時は元応答 + 警告で続行
        citationWarningNote = validation.warningNote;
        citationLayer2Status = "warned";
      }
    } else {
      // Pattern B/C のみ: 警告付与、信頼度降格は呼出元で処理
      citationWarningNote = validation.warningNote;
      citationLayer2Status = "warned";
    }
  } catch (err) {
    console.error("[chatbot] Gemini API error:", err instanceof Error ? err.message : String(err));
    const lower = err instanceof Error ? err.message.toLowerCase() : "";
    let reasonLabel = "AIサービスへの接続に失敗しました";
    if (err instanceof CircuitOpenError) reasonLabel = "AIサービスが連続失敗中（自動復旧待ち）";
    else if (lower.includes("quota") || lower.includes("429")) reasonLabel = "AIサービスの利用制限に達しました";
    else if (lower.includes("timeout")) reasonLabel = "AIサービスの応答がタイムアウトしました";

    const degradedAnswer =
      `【AI生成は現在ご利用いただけません（${reasonLabel}）。関連条文のみご案内します。】\n\n` +
      `ご質問：${message}\n\n` +
      `信頼度の高い関連条文：\n` +
      relevantArticles
        .slice(0, 5)
        .map((a) => `・${a.law}（${a.lawShort}） ${a.articleNum}${a.articleTitle ? `「${a.articleTitle}」` : ""}`)
        .join("\n") +
      `\n\n条文本文は下記の【参照】セクションまたは e-Gov 法令検索 (https://laws.e-gov.go.jp/) でご確認ください。` +
      `\n${AI_LEGAL_DISCLAIMER}`;

    const degradedSources: ChatbotSource[] = [
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

    return NextResponse.json<ChatbotResponse>(
      {
        answer: degradedAnswer,
        sources: degradedSources,
        source_type: "rag",
        confidence: "medium",
        confidenceScore,
        followups: buildFollowups(message, relevantArticles),
        notices: relatedNotices,
      },
      { status: 200 }
    );
  }

  // ごちゃごちゃブロック根絶（2026-07-11）: 出典・通達・リーフレット・関連法令は
  // answer 本文へテキスト追記せず、構造化フィールド（citations / attachedNotices /
  // attachedLeaflets / relatedLaws）のみで返す。UI が折りたたみカードで表示するため
  // 本文追記は完全な二重表示だった。モデルが自前で書いた免責・出典風テールも除去する。
  answer = stripAnswerTailBlocks(answer);

  // 構造化された出典・関連法令・もっと深く知る動線を計算
  const structuredCitations = buildStructuredCitations(relevantArticles);
  const relatedLaws = suggestRelatedLaws(message, relevantArticles);
  const digDeeperLinks = suggestDigDeeperLinks(message, relevantArticles);

  // Phase 4: 通達・リーフレットの自動添付（Layer A 条文紐付け + Layer B 応答引用 + Layer C クエリ）
  const attached = attachNoticesAndLeaflets({
    articles: relevantArticles,
    answer,
    query: message,
  });

  // Phase 2 Layer 3: adjacent tier では「直接答える条文は限定的」の見出しを冒頭に挿入
  if (fallbackDecision.tier === "adjacent" && fallbackDecision.headline) {
    answer = `${fallbackDecision.headline}\n\n${answer}`;
    if (fallbackDecision.egovFooter) {
      answer += `\n\n${fallbackDecision.egovFooter}`;
    }
  }

  // sourcesを整形（質問に該当するスニペットも生成）
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

  // ハルシネーション抑制: 範囲外法令名 + 過剰な推測表現を検出して警告
  // （警告は answer 本文へ追記せず scopeWarnings で返す＝UIの警告枠が表示する）
  const scopeWarnings: string[] = [];
  if (citationWarningNote) {
    scopeWarnings.push(citationWarningNote.trim());
  }
  // 短縮名に加えて正式名称も渡す: 50法令レジストリ外の収録法令
  // （労働施策総合推進法・過労死防止法等）の正当な引用が範囲外扱いされない
  const hitLawNames = relevantArticles.flatMap((a: LawArticle) => [a.lawShort, a.law]);
  const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawNames);
  if (outOfScopeRefs.length > 0) {
    const sample = outOfScopeRefs.slice(0, 3).join("、");
    scopeWarnings.push(
      `回答中の参照「${sample}」は提供データ（${LAW_SOURCE_COUNT}法令等＋通達DB）の範囲外のため、内容の確からしさは保証できません。e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`
    );
  }
  // 既存の架空法令検出も維持（後方互換）
  const suspectPattern = /通達第\d+条|関連通達|指針第\d+条/;
  if (suspectPattern.test(answer)) {
    const knownLawNames = new Set(relevantArticles.map((a: LawArticle) => a.law));
    const suspectMatches = answer.match(/「[^」]*通達[^」]*」|[^\s。、]*通達第\d+条[^\s。、]*/g) ?? [];
    const unverified = suspectMatches.filter(
      (m) => !Array.from(knownLawNames).some((law) => m.includes(law))
    );
    if (unverified.length > 0) {
      scopeWarnings.push(
        `回答中の一部法令名・条文（例：${unverified.slice(0, 2).join("、")}）は提供条文データでは確認できませんでした。e-Gov法令検索でご確認ください。`
      );
    }
  }
  // 推測表現が連発している場合の追加注記
  if (detectUngroundedAssertions(answer)) {
    scopeWarnings.push(
      "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。"
    );
  }

  // Phase 2 Layer 2 が警告を出した場合は信頼度を1段階降格
  let finalConfidence = confidence;
  if (citationLayer2Status === "warned") {
    if (finalConfidence === "high") finalConfidence = "medium";
    else if (finalConfidence === "medium") finalConfidence = "low";
    scopeWarnings.push(
      "応答中の条文引用に整合しない参照を検出したため、信頼度を一段階降格しました。"
    );
  }

  // Phase 2 Layer 3 が adjacent と判定した場合も信頼度を降格
  if (fallbackDecision.tier === "adjacent" && finalConfidence === "high") {
    finalConfidence = "medium";
  }

  const responsePayload: ChatbotResponse = {
    answer,
    sources,
    source_type,
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
  if (key) {
    setCachedResponse(key, responsePayload);
  }
  return NextResponse.json<ChatbotResponse>(responsePayload, {
    status: 200,
    headers: {
      "X-Cache-Hit": "false",
      "X-Citation-Layer1-Status": allowedCitations.length > 0 ? "applied" : "empty",
      "X-Citation-Layer2-Status": citationLayer2Status,
      "X-Citation-Layer3-Tier": fallbackDecision.tier,
      "X-Notice-Layer4-Count": String(attached.notices.length),
      "X-Leaflet-Layer4-Count": String(attached.leaflets.length),
    },
  });
}
