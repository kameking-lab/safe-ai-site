import type { ChatbotEffectiveDateStatus, ChatbotSource } from "./chatbot-contract";
import { legalDateTextToGregorian } from "./legal-answer-temporal";

function validDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function effectiveDates(value: string): (string | null)[] {
  const normalized = value.normalize("NFKC");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return [validDate(normalized) ? normalized : null];
  const dates = normalized.match(/(?:(?:令和|平成|昭和)\s*(?:元|\d{1,2})|20\d{2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/g);
  return dates?.map(legalDateTextToGregorian) ?? [null];
}

/** Check the requested application date, not the separate audit/basis date. */
export function legalResponseConsistency(
  sources: readonly ChatbotSource[],
  explicit?: ChatbotEffectiveDateStatus,
): { asOf: string | null; warning?: string } {
  const dates = [...new Set(sources.flatMap((source) => source.asOf ? [source.asOf] : []))];
  const target = explicit?.asOf ?? (dates.length === 1 ? dates[0] : null);
  const invalid = dates.some((date) => !validDate(date)) ||
    (explicit?.asOf != null && !validDate(explicit.asOf));
  if (invalid || dates.length > 1 || (target && dates.some((date) => date !== target))) {
    return { asOf: validDate(target) ? target : null,
      warning: "出典の回答対象日が一致しないか、日付を確認できません。対象日をそろえた条文の確認が必要です。" };
  }
  const currentSources = sources.filter((source) => source.applicationStatus === "current");
  if (currentSources.some((source) => !validDate(source.asOf) ||
    (source.effectiveOn !== undefined && effectiveDates(source.effectiveOn)
      .some((date) => !date || date > source.asOf!)))) {
    return { asOf: target,
      warning: "施行中とされた出典に、対象日の不明な条文または対象日より後の施行日が含まれています。対象日版の確認が必要です。" };
  }
  if (explicit?.status === "current" && (sources.length === 0 || sources.some((source) => source.applicationStatus !== "current" || !validDate(source.asOf)))) {
    return { asOf: target,
      warning: "施行中という回答表示を、すべての引用出典の対象日・施行状態で裏付けられていません。" };
  }
  return { asOf: target };
}
