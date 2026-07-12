/**
 * 特定粉じん作業 特別教育 フルデッキ（企画 03章 P2・EDU-S3・量産の型に準拠）。
 *
 * 正本 se-36-29-dust（粉じん作業特別教育規程・昭和54年労働省告示第68号）の学科5科目の
 * 範囲を covers で機械照合。本教育は学科のみ4.5時間以上で実技の定めがない
 * （totalJitsugiHours: null）ため jitsugi-notice スライドは不要。
 * 統計・事例スライドは build-summary（harmful-substance 型）追従・dataAsOf 印字（04章）。
 */

import type { EduDeck } from "./types";

export const DUST_DECK: EduDeck = {
  slug: "dust",
  curriculumId: "se-36-29-dust",
  trackId: "default",
  title: "特定粉じん作業 特別教育",
  titleEn: "SPECIFIED DUST WORK SPECIAL EDUCATION",
  audience: "常時特定粉じん作業に係る業務に従事する労働者",
  basisDisplay:
    "安衛則第36条第29号／粉じん作業特別教育規程（昭和54年労働省告示第68号） ／ 学科4.5時間以上（実技の定めなし）",
  timetable: [
    { unitId: "dust-1", minutes: 60 },
    { unitId: "dust-2", minutes: 60 },
    { unitId: "dust-3", minutes: 30 },
    { unitId: "dust-4", minutes: 60 },
    { unitId: "dust-5", minutes: 60 },
  ],
  hazardSlugs: ["harmful-substance"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "特定粉じん作業 特別教育",
      titleEn: "SPECIFIED DUST WORK SPECIAL EDUCATION",
      covers: [],
      lead: "安衛則第36条第29号・粉じん作業特別教育規程（昭54告示68号）に対応した学科教材（学科4.5時間以上）。",
    },
    // --- 対象判定ガイド＋誤情報是正（冒頭・法定外の付加情報のため covers: []） ---
    {
      id: "guide",
      kind: "content",
      title: "「常時特定粉じん作業」に該当するか確認する",
      titleEn: "SCOPE CHECK",
      covers: [],
      lead: "本特別教育（安衛則第36条第29号）の対象は「常時特定粉じん作業に係る業務」に労働者を就かせるときです。",
      bullets: [
        { head: "特定粉じん作業とは", body: "粉じん障害防止規則別表第2に定める特定粉じん発生源における作業（研削・岩石裁断・鉱物等の破砕等の一部を除く動力を用いる作業等）" },
        { head: "「常時」の考え方", body: "作業に常態として従事することを指し、臨時・一時的な作業のみは対象外の判断が必要（事業者が実態で判断）" },
        { head: "対象外の粉じん作業", body: "特定粉じん作業に当たらない一般の粉じん作業は本特別教育の対象ではないが、粉じん則の他の措置義務は別途かかる" },
      ],
      note:
        "Web上には本教育を「学科3時間＋実技1時間」とする情報も見られますが、正本（粉じん作業特別教育規程）は学科4.5時間以上のみを定め、実技の規定はありません。本教材は正本に準拠します。",
    },
    // --- 科目1: 粉じんの発散防止及び作業場の換気の方法（dust-1・2項目・60分） ---
    {
      id: "gakka-1",
      kind: "content",
      title: "粉じんの発散防止及び作業場の換気の方法",
      titleEn: "DUST SUPPRESSION & VENTILATION",
      covers: ["dust-1"],
      lead: "粉じんの発散を防ぐ対策と、作業場の換気の種類・概要を理解する。",
      bullets: [
        { head: "粉じんの発散防止対策の種類及び概要", body: "湿式化（散水・注水）、密閉化、遠隔操作化等、発生源対策の種類と概要" },
        { head: "換気の種類及び概要", body: "全体換気・局所排気装置・プッシュプル型換気装置の種類と概要" },
      ],
    },
    // --- 科目2: 作業場の管理（dust-2・3項目・60分） ---
    {
      id: "gakka-2",
      kind: "content",
      title: "作業場の管理",
      titleEn: "WORKPLACE MANAGEMENT",
      covers: ["dust-2"],
      lead: "発散防止・換気設備の保守点検、作業環境の点検、清掃の方法を理解する。",
      bullets: [
        { head: "発散防止対策・換気設備の保守点検の方法", body: "局所排気装置等の定期自主検査・日常点検の要領" },
        { head: "作業環境の点検の方法", body: "作業環境測定等による粉じん濃度の点検・評価の考え方" },
        { head: "清掃の方法", body: "堆積粉じんの除去（湿式清掃・真空掃除機の使用等、二次発じん防止）" },
      ],
    },
    // --- 科目3: 呼吸用保護具の使用の方法（dust-3・1項目・30分） ---
    {
      id: "gakka-3",
      kind: "content",
      title: "呼吸用保護具の使用の方法",
      titleEn: "RESPIRATORY PROTECTION",
      covers: ["dust-3"],
      lead: "呼吸用保護具の種類・性能・使用方法・管理を理解する。",
      bullets: [
        { head: "呼吸用保護具の種類、性能、使用方法及び管理", body: "防じんマスク（取替式・使い捨て式）の区分別性能、フィットテスト、保守・保管・交換の管理" },
      ],
    },
    // --- 科目4: 粉じんに係る疾病及び健康管理（dust-4・3項目・60分） ---
    {
      id: "gakka-4",
      kind: "content",
      title: "粉じんに係る疾病及び健康管理",
      titleEn: "HEALTH EFFECTS & MANAGEMENT",
      covers: ["dust-4"],
      lead: "粉じんの有害性、じん肺等の疾病の病理・症状、健康管理の方法を理解する。",
      bullets: [
        { head: "粉じんの有害性", body: "遊離けい酸等の粉じんが肺に与える影響、じん肺の不可逆性" },
        { head: "粉じんによる疾病の病理及び症状", body: "じん肺の進行性・自覚症状に乏しい特徴、合併症（肺結核等）のリスク" },
        { head: "健康管理の方法", body: "じん肺健康診断（じん肺法）の受診、粉じん作業従事歴の記録・管理" },
      ],
    },
    // --- 科目5: 関係法令（dust-5・1項目・60分） ---
    {
      id: "gakka-5",
      kind: "content",
      title: "関係法令",
      titleEn: "RELATED LAW",
      covers: ["dust-5"],
      bullets: [
        {
          head: "労働安全衛生法令・粉じん障害防止規則・じん肺法令中の関係条項",
          body: "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則、粉じん障害防止規則、じん肺法及びじん肺法施行規則中の関係条項",
        },
      ],
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：有害物等との接触（粉じん・じん肺を含む）", covers: [], hazardSlug: "harmful-substance" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "harmful-substance" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "harmful-substance" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "特別教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
