import { isAnaphoricLegalFollowup } from "@/lib/legal-conversation-context";

const CONTEXT_DEPENDENT_QUERY =
  /^(?:(?:それ|その件|その場合|この件|この場合|先ほど|さっき|前の質問|上記|直前)(?:(?:について)?(?:どう|もう一度|詳しく)|(?:の)?(?:条件|内容)?(?:なら|の場合)|について|の|は|を|が|で|と)?|(?:どの|何の)?(?:通達|指針|ガイドライン|告示|判例)(?:は|ですか|なの)?|(?:条文|何条|何項|何号|公式原文|いつから|施行日|適用日|根拠|法源|法律|法令|換気|測定|記録|保存|点検|養生|運転|操作|作業指揮者|指揮者|条件|例外)(?:は|ですか|なの|について)?)$/;

const REPORT_RECIPIENT_QUERY =
  /^(?:(?:その)?(?:報告|連絡)(?:先)?(?:は|を)?(?:誰|どこ)(?:に|へ)?(?:報告|連絡)?(?:するの|する|しますか|します|すればいい|すべき|なの|ですか|か)?|(?:誰|どこ)(?:に|へ)(?:報告|連絡)(?:するの|する|しますか|します|すればいい|すべき|なの|ですか|か)?|(?:報告|連絡)先(?:は|が)?(?:誰|どこ)(?:ですか|なの|か)?)[?？]?$/;

const LAW_NAME =
  /(?:労働安全衛生法施行令|労働安全衛生規則|労働安全衛生法|安衛法施行令|安衛令|安衛則|安衛法|クレーン等安全規則|クレーン則|有機溶剤中毒予防規則|有機則|特定化学物質障害予防規則|特化則|石綿障害予防規則|石綿則)/;

const ARTICLE_REFERENCE =
  /第?\s*[0-9０-９一二三四五六七八九十百千]+\s*条(?:\s*の\s*[0-9０-９一二三四五六七八九十百千]+)?/;

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/^[\s　、。,.!?！？「」『』（）()]+/, "")
    .replace(/[\s　、。,.!?！？「」『』（）()]+$/, "")
    .replace(/\s+/g, "");
}

/**
 * A pronoun-only follow-up without usable history must be clarified before
 * retrieval. Guessing the omitted subject can attach an unrelated statute.
 */
export function needsPriorConversationContext(
  query: string,
  hasUsableHistory: boolean,
): boolean {
  if (hasUsableHistory) return false;
  const normalized = normalize(query);
  return (
    CONTEXT_DEPENDENT_QUERY.test(normalized) ||
    REPORT_RECIPIENT_QUERY.test(normalized) ||
    isAnaphoricLegalFollowup(normalized)
  );
}

/** True only when both a known law name and an article reference are explicit. */
export function hasExplicitLawArticleReference(query: string): boolean {
  const normalized = normalize(query);
  return LAW_NAME.test(normalized) && ARTICLE_REFERENCE.test(normalized);
}

export function buildContextClarificationAnswer(): string {
  return [
    "前の会話内容を確認できないため、「それ」「先ほど」などが何を指すか特定できません。",
    "法令名・条文番号・作業条件を含めて、確認したい内容を一文で入力してください。",
    "文脈を推測して別の法令を提示することはしません。",
  ].join("\n");
}

export function buildUnverifiedReferenceAnswer(query: string): string {
  return [
    `指定された法令・条文「${query}」を、現在の検証済み収録正本から一意に特定できませんでした。`,
    "似た条文や別法令を代わりの根拠として提示することはしません。",
    "e-Gov法令検索（https://laws.e-gov.go.jp/）で法令名・条番号・現行時点を確認してください。",
  ].join("\n");
}
