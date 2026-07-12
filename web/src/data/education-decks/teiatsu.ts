/**
 * 低圧電気取扱業務 特別教育 フルデッキ（企画 03章 P2・EDU-S4・量産の型に準拠）。
 *
 * 正本 se-36-4-teiatsu（安全衛生特別教育規程・昭和47年労働省告示第92号 第6条）の学科5科目の
 * 範囲を covers で機械照合。実技「低圧の活線作業及び活線近接作業の方法」は業務内容で法定時間が
 * 分岐する（活線作業等は7時間以上／開閉器の操作のみの業務は1時間以上）ため、jitsugi-notice
 * スライドでこの分岐を明示する（対面実施が必要で本教材では代替不可）。
 * 統計・事例スライドは build-summary（electric-shock 型）追従・dataAsOf 印字（04章）。
 */

import type { EduDeck } from "./types";

export const TEIATSU_DECK: EduDeck = {
  slug: "teiatsu",
  curriculumId: "se-36-4-teiatsu",
  trackId: "default",
  title: "低圧電気取扱業務 特別教育",
  titleEn: "LOW-VOLTAGE ELECTRICAL WORK SPECIAL EDUCATION",
  audience: "低圧の充電電路の敷設・修理等の業務（活線作業・活線近接作業を含む）に従事する労働者",
  basisDisplay:
    "安衛則第36条第4号／安全衛生特別教育規程（昭和47年労働省告示第92号）第6条 ／ 学科7時間以上＋実技7時間以上（開閉器の操作のみの業務は実技1時間以上）",
  timetable: [
    { unitId: "te-gakka-1", minutes: 60 },
    { unitId: "te-gakka-2", minutes: 120 },
    { unitId: "te-gakka-3", minutes: 60 },
    { unitId: "te-gakka-4", minutes: 120 },
    { unitId: "te-gakka-5", minutes: 60 },
    { unitId: "te-jitsugi-1", minutes: 420 },
  ],
  hazardSlugs: ["electric-shock"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "低圧電気取扱業務 特別教育",
      titleEn: "LOW-VOLTAGE ELECTRICAL WORK SPECIAL EDUCATION",
      covers: [],
      lead: "安衛則第36条第4号・安全衛生特別教育規程（昭47告示92号）第6条に対応した学科教材（学科7時間以上＋実技7時間以上）。",
    },
    // --- 科目1: 低圧の電気に関する基礎知識（te-gakka-1・5項目・60分） ---
    {
      id: "gakka-1",
      kind: "content",
      title: "低圧の電気に関する基礎知識",
      titleEn: "BASICS OF LOW-VOLTAGE ELECTRICITY",
      covers: ["te-gakka-1"],
      lead: "低圧の電気の危険性と、短絡・漏電・接地・電気絶縁の基礎を理解する。",
      bullets: [
        { head: "低圧の電気の危険性", body: "感電（電流経路・通電時間による人体への影響）、電気火傷、電気火災の危険性" },
        { head: "短絡", body: "短絡（ショート）発生時のアーク・過電流の危険性" },
        { head: "漏電", body: "絶縁劣化による漏電と感電・火災リスク" },
        { head: "接地", body: "感電防止のための接地（アース）の目的と方法" },
        { head: "電気絶縁", body: "絶縁の役割と絶縁劣化の要因（湿気・経年劣化・損傷）" },
      ],
    },
    // --- 科目2: 低圧の電気設備に関する基礎知識（te-gakka-2・5項目・120分） ---
    {
      id: "gakka-2",
      kind: "content",
      title: "低圧の電気設備に関する基礎知識",
      titleEn: "LOW-VOLTAGE ELECTRICAL EQUIPMENT",
      covers: ["te-gakka-2"],
      lead: "配電設備から電気使用設備までの構造・種類と、保守及び点検の基礎を理解する。",
      bullets: [
        { head: "配電設備", body: "受電設備から分岐する配電盤・分電盤等の種類と構造" },
        { head: "変電設備", body: "変圧器等、電圧を変成する設備の種類と構造" },
        { head: "配線", body: "電線・ケーブルの種類、屋内配線の方法" },
        { head: "電気使用設備", body: "電動機・電熱器等、電気を使用する設備の種類" },
        { head: "保守及び点検", body: "電気設備の日常点検・定期点検の要領" },
      ],
    },
    // --- 科目3: 低圧用の安全作業用具に関する基礎知識（te-gakka-3・6項目・60分） ---
    {
      id: "gakka-3a",
      kind: "content",
      title: "絶縁用保護具・防具と活線作業用器具・検電器",
      titleEn: "PROTECTIVE EQUIPMENT & DETECTORS",
      covers: ["te-gakka-3/s1", "te-gakka-3/s2", "te-gakka-3/s3", "te-gakka-3/s4"],
      lead: "低圧作業に用いる安全作業用具の種類と役割を理解する。",
      bullets: [
        { head: "絶縁用保護具", body: "絶縁手袋・絶縁衣等、作業者の身体を絶縁する保護具" },
        { head: "絶縁用防具", body: "充電部に取り付けて絶縁する防具（絶縁シート等）" },
        { head: "活線作業用器具", body: "活線状態のまま安全に作業するための絶縁棒等の器具" },
        { head: "検電器", body: "充電の有無を確認する検電器の使用方法" },
      ],
    },
    {
      id: "gakka-3b",
      kind: "content",
      title: "その他の安全作業用具と管理",
      titleEn: "OTHER TOOLS & MANAGEMENT",
      covers: ["te-gakka-3/s5", "te-gakka-3/s6"],
      bullets: [
        { head: "その他の安全作業用具", body: "短絡接地器具等、上記以外の安全作業用具" },
        { head: "管理", body: "安全作業用具の定期点検・耐圧試験・保管の管理方法" },
      ],
    },
    // --- 科目4: 低圧の活線作業及び活線近接作業の方法（te-gakka-4・6項目・120分） ---
    {
      id: "gakka-4a",
      kind: "content",
      title: "充電電路の防護・絶縁保護と停電電路の措置",
      titleEn: "PROTECTION & DE-ENERGIZING",
      covers: ["te-gakka-4/s1", "te-gakka-4/s2", "te-gakka-4/s3"],
      lead: "活線作業・活線近接作業の危険を下げる防護と、停電作業時の措置を理解する。",
      bullets: [
        { head: "充電電路の防護", body: "絶縁用防具等による充電電路の防護措置" },
        { head: "作業者の絶縁保護", body: "絶縁用保護具の着用による作業者の絶縁保護" },
        { head: "停電電路に対する措置", body: "停電確認・検電・短絡接地等、停電作業の安全確保手順" },
      ],
    },
    {
      id: "gakka-4b",
      kind: "content",
      title: "作業管理・救急処置と災害防止",
      titleEn: "WORK CONTROL & EMERGENCY",
      covers: ["te-gakka-4/s4", "te-gakka-4/s5", "te-gakka-4/s6"],
      bullets: [
        { head: "作業管理", body: "作業指揮者の配置、作業手順の徹底" },
        { head: "救急処置", body: "感電負傷者への心肺蘇生等の救急処置" },
        { head: "災害防止", body: "感電・アーク災害の防止のための総合的な対策" },
      ],
    },
    // --- 科目5: 関係法令（te-gakka-5・1項目・60分） ---
    {
      id: "gakka-5",
      kind: "content",
      title: "関係法令",
      titleEn: "RELATED LAW",
      covers: ["te-gakka-5"],
      bullets: [
        { head: "法、令及び安衛則中の関係条項", body: "安衛法第59条第3項（特別教育）、安衛則第36条第4号・第329〜354条（電気による危険の防止）" },
      ],
    },
    // --- 実技の非代替宣言（te-jitsugi-1・業務区分分岐を明示） ---
    {
      id: "jitsugi-notice",
      kind: "jitsugi-notice",
      title: "実技「低圧の活線作業及び活線近接作業の方法」は本教材では実施できません",
      covers: [],
      lead:
        "実技科目は講師と同一場所での対面実施が必要です。本スライドは実技の代替にはなりません。" +
        "法定時間は業務内容で分岐します：活線作業・活線近接作業等の業務は7時間以上、開閉器の操作のみの業務は1時間以上（規程第6条第3項）。",
      bullets: [
        { head: "充電電路の防護（対面実習）", body: "絶縁用防具の取付け実習" },
        { head: "作業者の絶縁保護（対面実習）", body: "絶縁用保護具の着用実習" },
        { head: "停電電路に対する措置（対面実習）", body: "検電・短絡接地の実習" },
        { head: "救急処置（対面実習）", body: "感電時の救急処置実習" },
      ],
      note: "開閉器の操作のみの業務は実技1時間以上（規程第6条第3項ただし書）。業務区分の判定は事業者が行ってください。",
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：感電", covers: [], hazardSlug: "electric-shock" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "electric-shock" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "electric-shock" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "特別教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
