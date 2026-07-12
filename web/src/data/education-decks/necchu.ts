/**
 * 熱中症予防 労働衛生教育 フルデッキ（通達ベース・企画 03章 P1最優先・EDU-S1様式）。
 *
 * 正本 circular-necchu の「管理者に対する教育（225分）」トラックの事項・範囲を covers で機械照合。
 * 特別教育ではない（通達・ガイドラインベース）ことを表紙・各ページで明示（01章§C）。
 * 統計・事例スライドは build-summary（hot-cold-contact 型）追従・dataAsOf 印字（04章）。
 * ※3階建て（管理者/職長/作業従事者）の職長・作業者トラックと対象別タイムテーブルは EDU-S1 で拡張。
 */

import type { EduDeck } from "./types";

export const NECCHU_DECK: EduDeck = {
  slug: "necchu",
  curriculumId: "circular-necchu",
  trackId: "manager",
  title: "熱中症予防 労働衛生教育（管理者向け）",
  titleEn: "HEAT ILLNESS PREVENTION — FOR MANAGERS",
  audience: "熱中症予防管理者・衛生管理者・安全衛生推進者等（管理者に対する教育225分）",
  basisDisplay:
    "安衛則第612条の2（令和7年6月1日施行）／基発0520第6号／熱中症対策ガイドライン（基発0318第1号）第3の5 ／ 管理者教育225分（特別教育ではありません）",
  timetable: [
    { unitId: "nc-mgr-1", minutes: 30 },
    { unitId: "nc-mgr-2", minutes: 150 },
    { unitId: "nc-mgr-3", minutes: 15 },
    { unitId: "nc-mgr-4", minutes: 15 },
    { unitId: "nc-mgr-5", minutes: 15 },
  ],
  hazardSlugs: ["hot-cold-contact"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "熱中症予防 労働衛生教育（管理者向け）",
      titleEn: "HEAT ILLNESS PREVENTION — FOR MANAGERS",
      covers: [],
      lead:
        "安衛則第612条の2および基発0318第1号ガイドライン第3の5に基づく労働衛生教育（特別教育ではありません）。管理者教育225分。",
    },
    // --- 事項1: 熱中症の症状（nc-mgr-1・5項目・30分） ---
    {
      id: "mgr-1",
      kind: "content",
      title: "熱中症の症状と発生の仕組み",
      titleEn: "SYMPTOMS",
      covers: ["nc-mgr-1"],
      lead: "熱中症の概要と、体温・体液の調節、発生の仕組みと症状を理解する。",
      bullets: [
        { head: "熱中症の概要", body: "高温多湿環境で体温調節が破綻して起こる健康障害" },
        { head: "職場における熱中症の特徴", body: "屋外・高温作業場での発生、重症化・死亡に至る危険性" },
        { head: "体温の調節", body: "産熱と放熱のバランス、発汗と皮膚血流による放熱" },
        { head: "体液の調節", body: "発汗による水分・塩分（電解質）の喪失" },
        { head: "熱中症が発生する仕組みと症状", body: "Ⅰ度（めまい・こむら返り）〜Ⅲ度（意識障害）の重症度分類" },
      ],
    },
    // --- 事項2: 熱中症の予防方法（nc-mgr-2・6項目・150分） ---
    {
      id: "mgr-2a",
      kind: "content",
      title: "WBGTと作業環境管理・作業管理",
      titleEn: "WBGT & CONTROL",
      covers: ["nc-mgr-2/s1", "nc-mgr-2/s2", "nc-mgr-2/s3"],
      lead: "予防の中核（150分）。WBGTに基づく評価と、環境・作業の両面からの管理。",
      bullets: [
        { head: "熱中症リスク要因とWBGT", body: "WBGTの意味とWBGT基準値に基づく作業のリスク評価" },
        { head: "作業環境管理", body: "WBGT値の低減（遮熱・送風・冷房）、休憩場所の整備" },
        { head: "作業管理", body: "作業時間の短縮、暑熱順化、水分及び塩分の摂取、服装、作業中の巡視" },
      ],
    },
    {
      id: "mgr-2b",
      kind: "content",
      title: "健康管理・労働衛生教育・予防対策事例",
      titleEn: "HEALTH & EDUCATION",
      covers: ["nc-mgr-2/s4", "nc-mgr-2/s5", "nc-mgr-2/s6"],
      bullets: [
        { head: "健康管理", body: "健康診断結果に基づく対応、日常の健康管理、作業従事者の健康状態の確認" },
        { head: "労働衛生教育", body: "作業従事者への教育の重要性、教育内容及び教育方法" },
        { head: "熱中症予防対策事例", body: "現場で効果を上げた予防対策の具体例" },
      ],
    },
    // --- 事項3: 緊急時の救急処置（nc-mgr-3・2項目・15分） ---
    {
      id: "mgr-3",
      kind: "content",
      title: "緊急時の救急処置と報告体制",
      titleEn: "EMERGENCY RESPONSE",
      covers: ["nc-mgr-3"],
      bullets: [
        { head: "報告体制の整備及び周知・手順等の作成及び周知", body: "緊急連絡網・対応手順の事前整備と周知" },
        { head: "緊急時の救急措置", body: "涼所搬送・冷却（首・脇・鼠径部）・意識障害は即119・医療機関搬送" },
      ],
    },
    // --- 事項4: 熱中症の事例（nc-mgr-4・1項目・15分） ---
    {
      id: "mgr-4",
      kind: "content",
      title: "熱中症の災害事例",
      titleEn: "CASE STUDIES",
      covers: ["nc-mgr-4"],
      bullets: [{ head: "熱中症の災害事例", body: "実際の業務上熱中症の発生状況と原因・対策（次頁の統計・事例と接続）" }],
    },
    // --- 事項5: 関係法令等（nc-mgr-5・1項目・15分） ---
    {
      id: "mgr-5",
      kind: "content",
      title: "関係法令等",
      titleEn: "RELATED LAW",
      covers: ["nc-mgr-5"],
      bullets: [
        { head: "熱中症の関係法令等", body: "安衛則第612条の2（報告体制の整備・措置手順の作成・関係者への周知）、基発0520第6号、基発0318第1号ガイドライン" },
      ],
      note: "旧「基発0420第3号」は基発0318第1号ガイドラインで廃止済み（本教材は現行通達に準拠）。",
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：高温・低温の物との接触", covers: [], hazardSlug: "hot-cold-contact" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "hot-cold-contact" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "hot-cold-contact" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
