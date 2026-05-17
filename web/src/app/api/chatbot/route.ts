import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchRelevantArticlesWithScore, buildContextFromArticles, formatSourceCitations, type LawCategoryFilter } from "@/lib/rag-search";
import { searchRelevantNotices, NOTICE_BINDING_LABELS, type NoticeHit } from "@/lib/notice-search";
import type { LawArticle } from "@/data/laws";
import { searchMlitResources, type MlitResource } from "@/data/mlit-resources";
import { AI_DISCLAIMER_SYSTEM_INSTRUCTION, AI_LEGAL_DISCLAIMER } from "@/lib/gemini";
import {
  buildStructuredCitations,
  formatCitationTriples,
  suggestRelatedLaws,
  suggestDigDeeperLinks,
  detectOutOfScopeLawReferences,
  detectUngroundedAssertions,
  type StructuredCitation,
  type RelatedLawLink,
  type DigDeeperLink,
} from "@/lib/chatbot-enrichment";

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
  /** 関連する厚労省通達・告示・指針（一次資料DB由来） */
  notices?: NoticeHit[];
  /** 構造化された出典（条文番号＋施行日＋発出機関） */
  citations?: StructuredCitation[];
  /** 合わせて確認すべき法令の自動サジェスト */
  relatedLaws?: RelatedLawLink[];
  /** 「もっと深く知る」動線（事故事例・通達・業種別レポート） */
  digDeeperLinks?: DigDeeperLink[];
  /** RAG コーパス範囲外の参照を検出した場合の警告（先頭に表示） */
  scopeWarnings?: string[];
};

type ApiErrorBody = {
  error: string;
  retryable: boolean;
};

function jsonError(status: number, message: string, retryable = false) {
  return NextResponse.json<ApiErrorBody>({ error: message, retryable }, { status });
}

const SYSTEM_PROMPT = `あなたは労働安全衛生法の専門家AIアシスタントです。
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
10. 法令条文を引用する際は、「○○則第XX条」だけでなく可能な限り「○○則第XX条（施行：YYYY年MM月、所管：厚生労働省）」のように「条文番号＋施行日＋発出機関」の3点セットで明示すること。施行日が提供条文の文中に明記されていない場合は省略してよく、根拠なく日付を作らないこと
11. 参照法令条文に含まれない法令（例：架空の通達番号、根拠不明のガイドライン名）を断定的に引用してはならない。範囲外の場合は必ず「本ツールの提供データ範囲外のため、e-Gov・MHLW公式情報でご確認ください」と明示的に断ること

資格系質問（フォークリフト・クレーン・玉掛け・酸欠・有機溶剤などの「運転に必要な資格は？」「教育は何が必要？」型の質問）への回答ルール：
- 結論を本文の先頭に1〜2文で必ず明記する。例：「最大荷重1t以上のフォークリフトの運転には『フォークリフト運転技能講習』の修了が必要です（労働安全衛生法第61条第1項、労働安全衛生法施行令第20条第11号）。1t未満は特別教育（安衛則第36条第5号）で足ります。」
- 結論の直後に、法令名・条番号を括弧付きで併記する
- 参照条文に安衛法第61条（就業制限）または安衛法施行令第20条が含まれている場合は、必ずその条番号を回答中に直接引用する
- 施行令第20条を引用する際は必ず「第○号」（例：第11号、第6号）の号番号を明示すること。号番号なしに「施行令第20条」とだけ書くことは禁止
- 「明確な規定が見つかりません」型の回答は、参照条文に第61条・施行令第20条のいずれも含まれない場合に限る

回答の形式：
- まず質問への直接的な回答（結論）を述べる
- 次に根拠となる条文を引用する（「根拠：安衛法第○条」等）
- 必要に応じて補足説明を加える
${AI_DISCLAIMER_SYSTEM_INSTRUCTION}`;

function buildUserPrompt(question: string, context: string, mlitContext: string): string {
  const mlitSection = mlitContext
    ? `\n\n【関連する所管省庁の公式ガイドライン・通達（参考）】\n${mlitContext}\n\nこれらの資料が直接該当する場合のみ、回答末尾に所管省庁名と資料名を明示してください。`
    : "";
  return `以下の法令条文を参照して、質問に答えてください。

【参照法令条文】
${context}${mlitSection}

【質問】
${question}

上記の法令条文のみに基づいて回答してください。
- 結論を本文先頭に断定形で1〜2文で書き、直後に法令名・条番号を括弧付きで併記してください。
- 参照条文に質問への明確な答えがある場合に「明確な規定は見つかりませんでした」とぼかすことは禁止です。参照条文を引用して結論を出してください。
- 参照条文を読んでも該当論点の規定が本当に見つからない場合に限り、その旨を述べた上で e-Gov での確認を案内してください。`;
}

/** MLIT資料をプロンプト用テキストに整形 */
function buildMlitContext(resources: MlitResource[]): string {
  if (resources.length === 0) return "";
  return resources
    .map(
      (r) =>
        `- ${r.publisher}（${r.bureau}）「${r.title}」 ${r.publishedDate ? `(${r.publishedDate})` : ""} カテゴリ:${r.category}/${r.subcategory}`
    )
    .join("\n");
}

/** MLIT資料をChatbotSource形式に変換 */
function mlitToSource(r: MlitResource): ChatbotSource {
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

/** 条文テキストから質問キーワード周辺を抜粋したスニペットを生成 */
function buildSnippet(text: string, query: string, maxLen = 140): string {
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

/** 直近の会話履歴を最大10ターンに制限してGeminiの contents 形式に変換 */
function buildHistoryContents(history: ChatTurn[] | undefined) {
  if (!history || history.length === 0) return [];
  const recent = history.slice(-10);
  return recent.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));
}

/** 質問と関連条文から、フォローアップ候補を生成 */
function buildFollowups(question: string, articles: LawArticle[]): FollowupSuggestion[] {
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

  const lawCategory: LawCategoryFilter = body?.lawCategory ?? "all";
  const relatedNotices = searchRelevantNotices(message, 3);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    // APIキー未設定時もRAG検索による条文引用は提供する
    const { articles } = searchRelevantArticlesWithScore(message, 5, lawCategory);
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
    return NextResponse.json<ChatbotResponse>(
      {
        answer: fallbackAnswer,
        sources,
        source_type: articles.length > 0 || mlitMatches.length > 0 ? "rag" : "ai_inference",
        confidence: articles.length > 0 || mlitMatches.length > 0 ? "medium" : "low",
        followups: buildFollowups(message, articles),
        notices: relatedNotices,
        citations: buildStructuredCitations(articles),
        relatedLaws: suggestRelatedLaws(message, articles),
        digDeeperLinks: suggestDigDeeperLinks(message, articles),
      },
      { status: 200 }
    );
  }

  // RAG: 関連条文の検索（スコア付き）
  const { articles: allRelevant, normalizedScore } = searchRelevantArticlesWithScore(message, 10, lawCategory);
  // MLIT資料の関連検索（所管省庁資料の追加コンテキスト）
  const mlitMatches = searchMlitResources(message, 3);

  // 信頼度が 0.5 未満の条文は無関係とみなして除外。
  // 閾値を 0.7 → 0.5 に引き下げた背景: RAG コーパスを安衛法・安衛則・特化則・
  // 有機則の主要条文まで拡充したことで、部分マッチでも十分に正答に寄与する条文が
  // 当たるようになったため（「6問テストで正解率を上げる」導線）。
  const CONFIDENCE_THRESHOLD = 0.5;
  const relevantArticles = normalizedScore >= CONFIDENCE_THRESHOLD ? allRelevant : [];
  const context = buildContextFromArticles(relevantArticles);

  const hasRagHits = relevantArticles.length > 0;
  const source_type: "rag" | "ai_inference" = hasRagHits ? "rag" : "ai_inference";
  // 信頼度判定の精度を向上：
  // - high  : スコア>=0.75 かつ 上位2件以上ヒット（複数条文が裏付け）
  // - medium: それ以外でRAGヒットあり
  // - low   : RAGヒットなし
  const confidence: "high" | "medium" | "low" = hasRagHits
    ? (normalizedScore >= 0.75 && relevantArticles.length >= 2) ? "high" : "medium"
    : "low";
  const confidenceScore = Math.round(normalizedScore * 100) / 100;

  // 低信頼時はe-Gov誘導のテンプレートを返す（AI呼び出しをスキップ）
  if (!hasRagHits) {
    const mlitSources = mlitMatches.map(mlitToSource);
    const mlitNote = mlitMatches.length > 0
      ? `\n\n📘 参考までに、関連する所管省庁の公式資料が見つかりました：\n` +
        mlitMatches
          .map((r) => `・${r.publisher}（${r.bureau}）「${r.title}」`)
          .join("\n")
      : "";
    return NextResponse.json<ChatbotResponse>(
      {
        answer:
          "⚠️ この質問は本ツールの提供データ範囲外の可能性があります。確証ある回答ができません。\n\n" +
          "ご質問に合致する法令条文を十分な確信度で特定できませんでした。\n\n" +
          (relatedNotices.length > 0
            ? "ただし、以下の通達・告示が関連する可能性があります（下部の「関連通達」セクションをご参照ください）。\n\n"
            : "") +
          "最新・正確な条文は以下のe-Gov法令検索でご確認ください：\n" +
          "https://laws.e-gov.go.jp/\n\n" +
          "質問を具体的にしていただくか、対象の法令名（例：労働安全衛生規則、有機則、クレーン則）を含めて再度お尋ねください。\n" +
          "※ 本回答はあくまで参考情報です。法的判断は労働安全コンサルタント等の専門家にご相談ください。" +
          mlitNote,
        sources: mlitSources,
        source_type: mlitMatches.length > 0 ? "rag" : "ai_inference",
        confidence: "low",
        confidenceScore,
        followups: [
          { label: "🔁 別の言い方で質問", prompt: `${message}（別の言い方で再度質問させてください。法令名や条文番号を含めた言い方で教えてください）` },
          { label: "📚 関連する法令を調べる", prompt: `${message} に関連する労働安全衛生法令にはどのようなものがありますか？` },
        ],
        notices: relatedNotices,
        citations: [],
        relatedLaws: [],
        digDeeperLinks: suggestDigDeeperLinks(message, []),
        scopeWarnings: [
          "本ツールの提供データ範囲（33法令＋関連通達・告示）では確証ある回答が得られない質問です。e-Gov・厚生労働省公式情報をご確認ください。",
        ],
      },
      { status: 200 }
    );
  }

  // Gemini Flash API呼び出し（多ターン会話対応）
  let answer: string;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = buildUserPrompt(message, context, buildMlitContext(mlitMatches));
    const historyContents = buildHistoryContents(body?.history);
    const result = historyContents.length > 0
      ? await model.startChat({ history: historyContents }).sendMessage(userPrompt)
      : await model.generateContent(userPrompt);
    answer = result.response.text();
  } catch (err) {
    console.error("[chatbot] Gemini API error:", err instanceof Error ? err.message : String(err));
    const isOverload =
      err instanceof Error && err.message.toLowerCase().includes("quota");
    return jsonError(
      503,
      isOverload
        ? "AIサービスの利用制限に達しました。しばらくしてから再試行してください。"
        : "AIサービスへの接続に失敗しました。しばらくしてから再試行してください。",
      true
    );
  }

  // 構造化された出典・関連法令・もっと深く知る動線を計算
  const structuredCitations = buildStructuredCitations(relevantArticles);
  const relatedLaws = suggestRelatedLaws(message, relevantArticles);
  const digDeeperLinks = suggestDigDeeperLinks(message, relevantArticles);

  // 出典引用を「条文番号＋施行日＋発出機関」の3点セットで追記
  if (structuredCitations.length > 0) {
    answer += formatCitationTriples(structuredCitations);
  } else if (relevantArticles.length > 0) {
    answer += formatSourceCitations(relevantArticles);
  }
  if (mlitMatches.length > 0) {
    const ministryRefs = [
      ...new Set(mlitMatches.map((r) => `${r.publisher}（${r.bureau}）`)),
    ].slice(0, 3);
    answer += `\n\n🏛 所管省庁資料: ${ministryRefs.join("、")}`;
  }

  // 関連通達を回答末尾に追記（拘束力レベル付き）
  if (relatedNotices.length > 0) {
    answer += "\n\n【関連通達・告示】\n";
    for (const n of relatedNotices) {
      const num = n.noticeNumber ? `${n.noticeNumber}・` : "";
      const date = n.issuedDateRaw ? `${n.issuedDateRaw}・` : "";
      answer += `- ${num}${date}${n.title}（${NOTICE_BINDING_LABELS[n.bindingLevel]}）\n`;
    }
  }

  // 合わせて確認すべき法令を回答本文末に追記
  if (relatedLaws.length > 0) {
    answer += "\n\n【合わせて確認すべき法令】\n";
    for (const r of relatedLaws) {
      answer += `- ${r.lawShort}（${r.fullName}）: ${r.reason}\n`;
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
  const scopeWarnings: string[] = [];
  const hitLawShorts = relevantArticles.map((a: LawArticle) => a.lawShort);
  const outOfScopeRefs = detectOutOfScopeLawReferences(answer, hitLawShorts);
  if (outOfScopeRefs.length > 0) {
    const sample = outOfScopeRefs.slice(0, 3).join("、");
    answer +=
      `\n\n⚠️ 注記：回答中の「${sample}」は本ツールの提供データ（33法令＋通達DB）の範囲外の参照のため、` +
      `e-Gov法令検索および厚生労働省公式情報で必ずご確認ください。`;
    scopeWarnings.push(
      `回答中の参照「${sample}」は提供データ範囲外のため、内容の確からしさは保証できません。`
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
      answer +=
        "\n\n⚠️ 注記：上記回答中の一部法令名・条文（例：" +
        unverified.slice(0, 2).join("、") +
        "）は提供条文データでは確認できませんでした。e-Gov法令検索でご確認ください。";
    }
  }
  // 推測表現が連発している場合の追加注記
  if (detectUngroundedAssertions(answer)) {
    scopeWarnings.push(
      "回答に推測表現が複数含まれます。法的判断には e-Gov 法令検索および専門家への相談を推奨します。"
    );
  }

  return NextResponse.json<ChatbotResponse>(
    {
      answer,
      sources,
      source_type,
      confidence,
      confidenceScore,
      followups: buildFollowups(message, relevantArticles),
      notices: relatedNotices,
      citations: structuredCitations,
      relatedLaws,
      digDeeperLinks,
      scopeWarnings: scopeWarnings.length > 0 ? scopeWarnings : undefined,
    },
    { status: 200 }
  );
}
