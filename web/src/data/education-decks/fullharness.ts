/**
 * フルハーネス型墜落制止用器具 特別教育 フルデッキ（旗艦・企画 03章 P1・EDU-S2様式）。
 *
 * 正本 se-36-41-fullharness（規程第24条）の学科4科目・実技1科目の範囲を covers で機械照合。
 * 網羅ゲート（lib/education-curriculum/coverage.ts）が緑になるよう全 scopeItem を1枚以上でカバーする。
 * 統計・事例スライドは build-summary（fall 型）追従・dataAsOf 印字（04章）。
 */

import type { EduDeck } from "./types";

export const FULLHARNESS_DECK: EduDeck = {
  slug: "fullharness",
  curriculumId: "se-36-41-fullharness",
  trackId: "default",
  title: "フルハーネス型墜落制止用器具 特別教育",
  titleEn: "FULL-BODY HARNESS SPECIAL EDUCATION",
  audience: "高さ2m以上の作業床がない箇所でフルハーネス型墜落制止用器具を用いて作業する労働者",
  basisDisplay:
    "安衛則第36条第41号／安全衛生特別教育規程（昭47労告92号）第24条 ／ 学科4.5時間＋実技1.5時間（計6時間以上）",
  timetable: [
    { unitId: "fh-gakka-1", minutes: 60 },
    { unitId: "fh-gakka-2", minutes: 120 },
    { unitId: "fh-gakka-3", minutes: 60 },
    { unitId: "fh-gakka-4", minutes: 30 },
    { unitId: "fh-jitsugi-1", minutes: 90 },
  ],
  hazardSlugs: ["fall"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "フルハーネス型墜落制止用器具 特別教育",
      titleEn: "FULL-BODY HARNESS SPECIAL EDUCATION",
      covers: [],
      lead: "安衛則第36条第41号・安全衛生特別教育規程第24条に対応した学科教材（学科4.5時間＋実技1.5時間）。",
    },
    // --- 科目1: 作業に関する知識（fh-gakka-1・3項目） ---
    {
      id: "gakka-1",
      kind: "content",
      title: "作業に用いる設備と作業の方法",
      titleEn: "WORK EQUIPMENT & METHODS",
      covers: ["fh-gakka-1"],
      lead: "高所作業に用いる設備の種類・構造・取扱い、点検・整備、作業の方法を理解する。",
      bullets: [
        { head: "設備の種類・構造・取扱い方法", body: "足場・作業床・親綱・取付設備・高所作業車等の種類と構造、正しい取扱い" },
        { head: "設備の点検及び整備の方法", body: "始業前点検・定期点検の要領、損傷・劣化の判定と整備" },
        { head: "作業の方法", body: "墜落リスクを下げる作業手順・段取り・共同作業の合図" },
      ],
    },
    // --- 科目2: 墜落制止用器具に関する知識（fh-gakka-2・5項目） ---
    {
      id: "gakka-2a",
      kind: "content",
      title: "フルハーネス・ランヤードの種類と構造・装着",
      titleEn: "HARNESS & LANYARD",
      covers: ["fh-gakka-2/s1", "fh-gakka-2/s2"],
      lead: "墜落制止用器具の中核。器具の種類・構造と正しい装着を身につける。",
      bullets: [
        { head: "フルハーネス及びランヤードの種類及び構造", body: "第一種／第二種ランヤード、ショックアブソーバの原理と規格" },
        { head: "フルハーネスの装着の方法", body: "胸・腿・肩ベルトのねじれ・緩みを排し、D環位置を正す装着手順" },
      ],
    },
    {
      id: "gakka-2b",
      kind: "content",
      title: "ランヤードの取付け・選定と器具の点検・関連器具",
      titleEn: "ANCHORING & INSPECTION",
      covers: ["fh-gakka-2/s3", "fh-gakka-2/s4", "fh-gakka-2/s5"],
      bullets: [
        { head: "ランヤードの取付け設備等への取付け方法及び選定方法", body: "取付点はD環より高い位置、自由落下距離・クリアランス・振り子を計算して選定" },
        { head: "墜落制止用器具の点検及び整備の方法", body: "縫製・金具・アブソーバの損傷確認、落下衝撃品の廃棄基準" },
        { head: "墜落制止用器具の関連器具の使用方法", body: "回収器具・垂直親綱・スライド式墜落制止装置等の使用" },
      ],
    },
    // --- 科目3: 労働災害の防止に関する知識（fh-gakka-3・6項目） ---
    {
      id: "gakka-3a",
      kind: "content",
      title: "墜落・落下・感電の防止措置",
      titleEn: "HAZARD PREVENTION",
      covers: ["fh-gakka-3/s1", "fh-gakka-3/s2", "fh-gakka-3/s3"],
      bullets: [
        { head: "墜落による労働災害の防止のための措置", body: "作業床・手すり・親綱・開口部養生など墜落を防ぐ本質安全対策" },
        { head: "落下物による危険防止のための措置", body: "工具の落下防止・立入禁止・防網・保護帽の徹底" },
        { head: "感電防止のための措置", body: "充電電路の防護・離隔距離・停電作業の確認" },
      ],
    },
    {
      id: "gakka-3b",
      kind: "content",
      title: "保護帽・事故発生時の措置とその他の危険",
      titleEn: "HELMET & INCIDENT RESPONSE",
      covers: ["fh-gakka-3/s4", "fh-gakka-3/s5", "fh-gakka-3/s6"],
      bullets: [
        { head: "保護帽の使用方法及び保守点検の方法", body: "あごひも確実装着、耐用年数・損傷時の交換" },
        { head: "事故発生時の措置", body: "宙吊り（サスペンショントラウマ）対応・救助・119通報・応急処置" },
        { head: "その他作業に伴う災害及びその防止方法", body: "熱中症・墜落以外の複合リスクと防止" },
      ],
    },
    // --- 科目4: 関係法令（fh-gakka-4・1項目） ---
    {
      id: "gakka-4",
      kind: "content",
      title: "関係法令",
      titleEn: "RELATED LAW",
      covers: ["fh-gakka-4"],
      bullets: [
        { head: "法、令及び安衛則中の関係条項", body: "安衛法第59条第3項（特別教育）、安衛則第36条第41号・第518〜521条、墜落制止用器具の規格（平31厚労省告示第11号＝器具規格）" },
      ],
      note: "告示第11号は器具の構造規格。教育科目の根拠は規程第24条（両者は別物）。",
    },
    // --- 実技の非代替宣言（fh-jitsugi-1） ---
    {
      id: "jitsugi-notice",
      kind: "jitsugi-notice",
      title: "実技「墜落制止用器具の使用方法等」は本教材では実施できません",
      covers: [],
      lead:
        "実技科目「墜落制止用器具の使用方法等」（1.5時間以上）は、講師と同一場所での対面実施が必要です。本スライドは実技の代替にはなりません。",
      bullets: [
        { head: "装着の方法", body: "フルハーネスの装着（対面で実習）" },
        { head: "ランヤードの取付け設備等への取付け方法", body: "取付け実習（対面で実習）" },
        { head: "墜落による労働災害防止のための措置", body: "実地での確認" },
        { head: "点検及び整備の方法", body: "器具の点検実習（対面で実習）" },
      ],
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：墜落・転落", covers: [], hazardSlug: "fall" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "fall" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "fall" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "特別教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
