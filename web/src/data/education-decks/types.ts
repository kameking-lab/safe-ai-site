/**
 * 無償教材デッキの型（企画 02章 層2「デッキ→法定項目の対応表」/ 04章「データ層スライド」）。
 *
 * デッキは既存 hazard-slides SlideDeck 基盤（view/present/print の3モード）で描画する。
 * 各スライドは `covers`（このスライドがカバーする法定項目 = 層1の scopeKey）を持ち、
 * カリキュラム網羅ゲート（lib/education-curriculum/coverage.ts）が機械照合する。
 * 統計・事例など法定外の付加価値スライドは `covers: []`（法定項目の水増しに使えない）。
 */

import type { HazardTypeSlug } from "@/lib/accidents/type-normalization";

export type DeckSlideKind =
  | "cover" // 表紙（根拠・データ基準日・位置づけ文）
  | "content" // 法定科目スライド（covers を持つ）
  | "jitsugi-notice" // 実技の非代替宣言カード
  | "checklist" // 実施チェックリスト
  | "statistics" // 最新統計（build-summary 追従・dataAsOf 印字）
  | "cases" // 実事例（出典付き）
  | "quiz" // 確認テスト
  | "terms" // 利用条件（ご自由にお使いください）
  | "cta"; // カスタマイズ・出張講習のご案内

export type DeckBullet = { head: string; body?: string };
export type DeckTable = { headers: string[]; rows: string[][]; footnote?: string };

export type EduSlide = {
  /** デッキ内で一意（present モードのハッシュにも使う）。 */
  id: string;
  kind: DeckSlideKind;
  title: string;
  titleEn?: string;
  /**
   * このスライドがカバーする法定項目。scopeKey（"unitId/sN"）または unitId（科目全体）。
   * 法定外スライドは []。網羅ゲートが照合する唯一のソース。
   */
  covers: string[];
  lead?: string;
  bullets?: DeckBullet[];
  table?: DeckTable;
  note?: string;
  /** statistics/cases スライドで参照する災害の型（build-summary から解決）。 */
  hazardSlug?: HazardTypeSlug;
};

/** 標準タイムテーブル（科目別配分）。時間充足ゲート（hours-shortfall）の照合対象。 */
export type DeckTimetableEntry = { unitId: string; minutes: number };

export type EduDeck = {
  /** URL & 識別子（/education/pack/<slug>）。 */
  slug: string;
  curriculumId: string;
  /** 照合対象トラック（curriculum.tracks の trackId）。 */
  trackId: string;
  title: string;
  titleEn?: string;
  /** 対象者の1行説明。 */
  audience: string;
  /**
   * 表紙・配布物に表示する根拠表記（則条番号・告示番号・科目/時間）。
   * basis-display-missing ゲートは curriculum.basis.ruleRef の包含を検査する。
   */
  basisDisplay: string;
  /** 標準タイムテーブル（科目別配分・分）。 */
  timetable: DeckTimetableEntry[];
  /** 統計スライドで追従する災害の型（hazard-mapping と整合）。 */
  hazardSlugs: HazardTypeSlug[];
  slides: EduSlide[];
};
