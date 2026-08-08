import type { LawArticle } from "@/data/laws";
import type {
  DigDeeperLink,
  RelatedLawLink,
  StructuredCitation,
} from "@/lib/chatbot-enrichment";
import type {
  AttachedLeaflet,
  AttachedNotice,
} from "@/lib/chatbot-notice-attachment";
import type { ChatbotSafetyKind } from "@/lib/chatbot-safety";
import type {
  LegalClarification,
  LegalConversationContext,
} from "@/lib/legal-conversation-context";
import type { NoticeHit } from "@/lib/notice-search";
import type { LawCategoryFilter } from "@/lib/rag-search";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatbotRequest = {
  message: string;
  history?: ChatTurn[];
  /** 生履歴ではなく許可済み作業条件だけを引き継ぐ経路向け。 */
  context?: LegalConversationContext;
  /** UIで現在の質問と全送信履歴を確認・匿名化済みであること。 */
  privacyConfirmed?: boolean;
  /** 法令カテゴリで検索の対象を絞る（"all" または lawShort 指定） */
  lawCategory?: LawCategoryFilter;
};

export type ChatbotSource = {
  law: string;
  lawShort?: string;
  article: string;
  lawNumber?: string;
  paragraph?: string;
  item?: string;
  parentLaw?: string;
  relatedLaws?: string[];
  effectiveOn?: string;
  /** 公開中の本文版と一致した最新改正の公布日。元法令の公布日ではない。 */
  amendmentPromulgatedOn?: string;
  /** e-Gov改正スナップショットと本文版が一致した履歴だけを返す。 */
  amendmentHistory?: LawArticle["amendmentHistory"];
  revision?: string;
  asOf?: string;
  applicationStatus?: "current" | "future" | "past" | "unknown";
  text: string;
  /** 条文中、質問に該当する箇所の前後を抜粋したスニペット */
  snippet?: string;
  /** 後方互換用。通常のAPI応答には全文を載せない。 */
  fullText?: string;
  /** 条文タイトル（「総則」「定義」等） */
  articleTitle?: string;
  /** 出典の所管省庁（国交省資料の場合のみ） */
  ministry?: string;
  /** 公式ページURL（外部出典の場合） */
  url?: string;
  /** 本文の機械的な出典確認状態。法的解釈・現在性の人手確認とは別。 */
  verificationStatus?: LawArticle["verificationStatus"];
  sourceKind?: LawArticle["sourceKind"];
  sourceFetchedAt?: string;
  humanReviewStatus?: LawArticle["humanReviewStatus"];
};

export type FollowupSuggestion = {
  /** ボタンのラベル（「もっと詳しく」等） */
  label: string;
  /** クリックされた際に送信される質問文 */
  prompt: string;
};

/**
 * 画面で回答後にだけ表示できる短い返答候補。
 * FollowupSuggestion と同じ形を保ち、旧クライアントとの相互運用を維持する。
 */
export type ChatbotQuickReply = FollowupSuggestion;

export type ChatbotResponse = {
  /** 後方互換の表示本文。必ず substantiveAnswer から始める。 */
  answer: string;
  /** 利用者が与えた情報だけで返せる、質問ではない実質回答。 */
  substantiveAnswer: string;
  /** 暫定回答で置いた前提。前提がなければ空配列。 */
  assumptions: string[];
  /** 結果が変わる主要条件。最大3件。 */
  conditions: string[];
  sources: ChatbotSource[];
  source_type: "rag" | "ai_inference" | "safety";
  confidence: "high" | "medium" | "low";
  /**
   * @deprecated 回答の正しさではなく検索順位スコアだったため、新規応答では送信しない。
   * 保存済み履歴との読み取り互換だけに残す。
   */
  confidenceScore?: number;
  /** フォローアップ質問サジェスト（最大3件、旧クライアント互換）。 */
  followups?: FollowupSuggestion[];
  /** 関連する厚労省通達・告示・指針（一次資料DB由来）— Phase 4 で attachedNotices に統合 */
  notices?: NoticeHit[];
  /** 構造化された出典（条文番号＋施行日＋発出機関） */
  citations: StructuredCitation[];
  /** 合わせて確認すべき法令の自動サジェスト */
  relatedLaws?: RelatedLawLink[];
  /** 「もっと深く知る」動線（事故事例・通達・業種別レポート） */
  digDeeperLinks?: DigDeeperLink[];
  /** 収録資料の範囲外の参照を検出した場合の警告（先頭に表示） */
  scopeWarnings?: string[];
  /** Phase 4: 条文紐付け/応答引用/クエリ で取得した通達・告示（最大5件、source 付き） */
  attachedNotices?: AttachedNotice[];
  /** Phase 4: 条文紐付けで取得した厚労省リーフレット（最大5件） */
  attachedLeaflets?: AttachedLeaflet[];
  safetyKind?: ChatbotSafetyKind;
  /** 条件不足時に一度に一問だけ示す確認質問。 */
  clarification?: LegalClarification;
  /** 回答後にだけ示す確認質問。不要なら null。 */
  clarificationQuestion: string | null;
  /** 回答後にだけ表示する小さな選択肢。最大3件。 */
  quickReplies: ChatbotQuickReply[];
  /** 同一タブでのみ引き継ぐ、許可済み作業条件。生会話や識別情報は含めない。 */
  context?: LegalConversationContext;
  /** Must remain true until semantic support of each claim is independently verified. */
  requiresHumanReview: true;
};

export type ChatbotResponseDraft = Omit<
  ChatbotResponse,
  | "substantiveAnswer"
  | "assumptions"
  | "conditions"
  | "citations"
  | "clarificationQuestion"
  | "quickReplies"
> &
  Partial<
    Pick<
      ChatbotResponse,
      | "substantiveAnswer"
      | "assumptions"
      | "conditions"
      | "citations"
      | "clarificationQuestion"
      | "quickReplies"
    >
  >;

/**
 * Only for an unrecoverable legacy/stale question-only payload. Active normal
 * routes are required to provide a topic-specific substantive answer and the
 * evaluation suites reject this fallback.
 */
export const CHATBOT_UNANSWERABLE_FALLBACK =
  "入力から確認対象を特定できないため、法的な要否や数値基準はまだ回答できません。確認したい作業名または設備名を一つ入力してください。";

const ANSWER_SECTION_NAMES = [
  "結論",
  "条件",
  "根拠",
  "適用時点",
  "次の質問",
] as const;

function sectionText(answer: string, section: (typeof ANSWER_SECTION_NAMES)[number]): string {
  const lines = answer.split("\n");
  const start = lines.findIndex((line) => line.trim() === section);
  if (start < 0) return "";
  const body: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const value = lines[index]!.trim();
    if (ANSWER_SECTION_NAMES.includes(value as (typeof ANSWER_SECTION_NAMES)[number])) {
      break;
    }
    if (/^回答基準日:/.test(value)) break;
    body.push(lines[index]!);
  }
  return body.join("\n").trim();
}

function answerConditions(answer: string): string[] {
  return sectionText(answer, "条件")
    .split("\n")
    .map((line) => line.trim().replace(/^[・●]\s*/, ""))
    .filter(Boolean)
    .slice(0, 3);
}

function firstSubstantiveText(answer: string): string {
  const conclusion = sectionText(answer, "結論");
  if (conclusion) return conclusion;
  const beforeQuestion = answer.split(/\n(?:次の質問|確認質問)\n/, 1)[0]?.trim() ?? "";
  return beforeQuestion;
}

/** 回答本文の末尾にある確認質問を、構造化された1件へ同期する。 */
export function withAnswerClarification(
  answer: string,
  clarification: LegalClarification | null | undefined,
): string {
  if (!clarification?.question.trim()) return answer.trim();
  const question = clarification.question.trim();
  const dateMatch = answer.match(/\n\n(回答基準日:\s*\d{4}-\d{2}-\d{2}\s+JST)\s*$/);
  const dateSuffix = dateMatch ? `\n\n${dateMatch[1]}` : "";
  const withoutDate = dateMatch ? answer.slice(0, dateMatch.index).trimEnd() : answer.trimEnd();
  const nextQuestionIndex = withoutDate.search(/\n次の質問\n/);
  const body = nextQuestionIndex >= 0
    ? withoutDate.slice(0, nextQuestionIndex).trimEnd()
    : withoutDate;
  return `${body}\n\n次の質問\n${question}${dateSuffix}`.trim();
}

/**
 * JSON/SSE/AI OFF/legacy adapter が同じ answer-first 契約を返すための最終境界。
 * 選択肢は確認質問に対応するものだけを採用し、回答前の分類UIへ転用しない。
 */
export function finalizeChatbotResponse(
  draft: ChatbotResponseDraft,
): ChatbotResponse {
  const answerQuestion = sectionText(draft.answer, "次の質問")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const temporalAnswerQuestion =
    answerQuestion && /(?:対象|適用).*(?:日付|時点)/.test(answerQuestion)
      ? answerQuestion
      : "";
  const clarificationQuestion =
    draft.clarificationQuestion?.trim() ||
    temporalAnswerQuestion ||
    draft.clarification?.question.trim() ||
    answerQuestion ||
    null;
  let answer = withAnswerClarification(
    draft.answer,
    clarificationQuestion
      ? { question: clarificationQuestion, options: draft.clarification?.options ?? [] }
      : null,
  );
  let substantiveAnswer =
    draft.substantiveAnswer?.trim() || firstSubstantiveText(answer);

  // 最終境界でも質問だけの通常応答を通さない。これは例外経路の説明文にもなる。
  if (!substantiveAnswer || substantiveAnswer === clarificationQuestion) {
    substantiveAnswer = CHATBOT_UNANSWERABLE_FALLBACK;
  }

  // A legacy caller or stale cache may still contain only the clarification.
  // Upgrade the visible answer as well as the structured field so every
  // rendering path (including no-JS and legacy clients) remains answer-first.
  if (!firstSubstantiveText(answer) || firstSubstantiveText(answer) === clarificationQuestion) {
    answer = withAnswerClarification(
      `結論\n${substantiveAnswer}`,
      clarificationQuestion
        ? {
            question: clarificationQuestion,
            options: draft.clarification?.options ?? [],
          }
        : null,
    );
  }

  const optionReplies = (draft.clarification?.options ?? []).map((option) => ({
    label: option,
    prompt: option,
  }));
  const quickReplies = (draft.quickReplies ?? optionReplies)
    .filter(
      (reply, index, values) =>
        Boolean(reply.label.trim() && reply.prompt.trim()) &&
        values.findIndex(
          (candidate) =>
            candidate.label.trim() === reply.label.trim() &&
            candidate.prompt.trim() === reply.prompt.trim(),
        ) === index,
    )
    .slice(0, 3);

  return {
    ...draft,
    answer,
    substantiveAnswer,
    assumptions: (draft.assumptions ?? []).filter(Boolean).slice(0, 3),
    conditions: (draft.conditions ?? answerConditions(answer))
      .filter(Boolean)
      .slice(0, 3),
    citations: draft.citations ?? [],
    clarificationQuestion,
    quickReplies,
    followups: draft.followups?.slice(0, 3),
    clarification: clarificationQuestion
      ? {
          question: clarificationQuestion,
          options: quickReplies.map((reply) => reply.label),
        }
      : undefined,
  };
}

export function isPureClarificationResponse(
  response: Pick<ChatbotResponse, "substantiveAnswer" | "clarificationQuestion">,
): boolean {
  return Boolean(
    response.clarificationQuestion &&
      response.substantiveAnswer.trim() === response.clarificationQuestion.trim(),
  );
}

/** 曖昧な質問へ暫定回答するときだけ、画面に出す最小限の前提を返す。 */
export function legalAnswerAssumptions(query: string): string[] {
  const normalized = query.normalize("NFKC").replace(/[\s　]/g, "");
  if (
    /(?:手すり|手摺)/.test(normalized) &&
    !/(?:足場|作業床|開口部|高所作業車)/.test(normalized)
  ) {
    return ["現場で一般的な足場の手すりを最有力として暫定回答します。"];
  }
  if (/(?:電気作業|電気工事|充電電路|活線|低圧電気|高圧電気)/.test(normalized)) {
    return ["電気工事の資格と、労働安全衛生法令上の教育・作業管理を分けて回答します。"];
  }
  if (/(?:有機溶剤|シンナー)/.test(normalized) && /屋内/.test(normalized)) {
    return ["法令上の有機溶剤業務を屋内作業場等で行う場合として暫定回答します。"];
  }
  return [];
}
