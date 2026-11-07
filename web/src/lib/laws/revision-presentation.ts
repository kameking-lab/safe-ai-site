import type { LawRevision } from "@/lib/types/domain";
import { compactLawRevisionSummary } from "./revision-summary";

export const CABINET_ORDER_196_SOURCE = {
  revisionId: "lr-egov-347CO0000000318-20261001",
  url: "https://www.mhlw.go.jp/content/11300000/001736042.pdf",
  label: "厚生労働省掲載・政令第196号の本文",
} as const;

export function lawRevisionHeadline(revision: LawRevision): string {
  return revision.id === CABINET_ORDER_196_SOURCE.revisionId
    ? "関係政令の整備に関する政令（令和8年政令第196号）"
    : revision.title;
}

/** 法令番号は発令形式の一次情報。政令を省令扱いにしない。 */
export function lawRevisionKindLabel(revision: LawRevision): string {
  if (/政令第[一二三四五六七八九十百千〇零0-9０-９]+号/.test(revision.revisionNumber)) {
    return "政令";
  }
  switch (revision.kind) {
    case "law": return "法律";
    case "cabinet_order": return "政令";
    case "ordinance": return "省令";
    case "guideline": return "ガイドライン";
    case "other": return "告示";
    default: return "通達";
  }
}

/** 構造データにない改正内容を法令名から推測しない。 */
export function lawRevisionFacts(revision: LawRevision) {
  const target = revision.id === CABINET_ORDER_196_SOURCE.revisionId
    ? "作業環境測定法施行令の附則（安衛令に収録された抜粋）"
    : revision.title.split("（", 1)[0]?.trim() || "対象法令を原文で確認";
  const substantiveText = compactLawRevisionSummary(revision.summary)
    .replace(/^[^。]*の最新改正。?/, "")
    .replace(/改正法令「[^」]+」。?/, "")
    .trim();
  const change = revision.id === CABINET_ORDER_196_SOURCE.revisionId
    ? "労働安全衛生法の制定年・法律番号の引用を削除。安衛令の本則変更ではありません。"
    : substantiveText || "内容未確認（原文で確認）";
  return {
    target,
    change,
    effectiveDate: revision.enforcement_date?.trim() || null,
  };
}
