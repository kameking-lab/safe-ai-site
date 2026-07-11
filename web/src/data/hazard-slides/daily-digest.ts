import { MEASURES_BY_TYPE } from "@/data/hazard-slides/measures-by-type";
import { QUIZ_BY_TYPE } from "@/data/hazard-slides/quiz-by-type";
import {
  CANONICAL_HAZARD_TYPES,
  type CanonicalHazardType,
  type HazardTypeSlug,
} from "@/lib/accidents/type-normalization";

/**
 * 朝礼・サイネージ向け「本日の型」日替わりダイジェスト。
 *
 * クライアント（/ky/morning・/signage は client component）から使うため、
 * fs を要する build-summary ではなく軽量な辞書（対策・クイズ・型メタ）だけで組む。
 * 統計値はスライド本体（/education/hazard-slides/[slug]）で見せる。
 */

export type HazardDailyDigest = CanonicalHazardType & {
  headline: string;
  /** 対策チェックの先頭3項目（テキストのみ） */
  checkPoints: string[];
  /** その型の確認クイズ1問目の設問（朝礼の問いかけ用） */
  quizQuestion: string;
  href: string;
};

/** 朝礼で扱う実務型（総括分類の「その他・分類不能」は日替わりローテから除外） */
const ROTATION_EXCLUDED: ReadonlySet<HazardTypeSlug> = new Set(["other", "unclassifiable"]);

export const HAZARD_DAILY_ROTATION: readonly HazardDailyDigest[] = CANONICAL_HAZARD_TYPES.filter(
  (t) => !ROTATION_EXCLUDED.has(t.slug),
).map((t) => ({
  ...t,
  headline: MEASURES_BY_TYPE[t.slug].headline,
  checkPoints: MEASURES_BY_TYPE[t.slug].checklist.slice(0, 3).map((c) => c.text),
  quizQuestion: QUIZ_BY_TYPE[t.slug][0]?.question ?? "",
  href: `/education/hazard-slides/${t.slug}`,
}));

/**
 * 日付シードで「本日の型」を決める（SignageAccidentEducation と同じシード式＝
 * 同日は全端末で同じ型・翌日に自動で替わる）。
 */
export function pickHazardOfTheDay(now: Date, fixedSlug?: string | null): HazardDailyDigest {
  if (fixedSlug) {
    const fixed = HAZARD_DAILY_ROTATION.find((d) => d.slug === fixedSlug);
    if (fixed) return fixed;
  }
  const seed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  return HAZARD_DAILY_ROTATION[seed % HAZARD_DAILY_ROTATION.length];
}
