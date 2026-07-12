/**
 * 第2種酸素欠乏危険作業 特別教育 フルデッキ（企画 03章 P2・EDU-S5・量産の型に準拠）。
 *
 * 正本 se-36-26-oxygen／トラック type-2（酸素欠乏危険作業特別教育規程・昭和57年労働省告示第132号
 * 第2条）の学科5科目・全範囲項目を covers で機械照合。第2種は硫化水素中毒のおそれがある場所を含み、
 * 学科5.5時間以上・実技の定めはない。第1種は別デッキ oxygen-1（trackId: type-1）。
 * 統計・事例スライドは build-summary（harmful-substance 型）追従・dataAsOf 印字（04章）。
 */

import type { EduDeck } from "./types";

export const OXYGEN_2_DECK: EduDeck = {
  slug: "oxygen-2",
  curriculumId: "se-36-26-oxygen",
  trackId: "type-2",
  title: "第2種酸素欠乏危険作業 特別教育",
  titleEn: "OXYGEN DEFICIENCY HAZARD (TYPE 2) SPECIAL EDUCATION",
  audience: "第2種酸素欠乏危険作業（硫化水素中毒のおそれがある酸素欠乏危険場所）に係る業務に従事する労働者",
  basisDisplay:
    "安衛則第36条第26号／酸素欠乏危険作業特別教育規程（昭和57年労働省告示第132号）第2条 ／ 第2種・学科5.5時間以上（硫化水素中毒を含む・実技の定めなし）",
  timetable: [
    { unitId: "o2-1", minutes: 60 },
    { unitId: "o2-2", minutes: 60 },
    { unitId: "o2-3", minutes: 60 },
    { unitId: "o2-4", minutes: 60 },
    { unitId: "o2-5", minutes: 90 },
  ],
  hazardSlugs: ["harmful-substance"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "第2種酸素欠乏危険作業 特別教育",
      titleEn: "OXYGEN DEFICIENCY HAZARD (TYPE 2) SPECIAL EDUCATION",
      covers: [],
      lead:
        "安衛則第36条第26号・酸素欠乏危険作業特別教育規程（昭57告示132号）第2条に対応した学科教材" +
        "（学科5.5時間以上・硫化水素中毒のおそれがある場所を含む）。",
    },
    // --- 科目1: 酸素欠乏等の発生の原因（o2-1・2項目・60分） ---
    {
      id: "gakka-1",
      kind: "content",
      title: "酸素欠乏等の発生の原因",
      titleEn: "CAUSES OF OXYGEN DEFICIENCY & H2S",
      covers: ["o2-1"],
      lead: "酸素欠乏に加え、硫化水素（H2S）が発生する原因と場所を理解する。",
      bullets: [
        { head: "酸素欠乏等の発生の原因", body: "酸素の消費・置換に加え、汚泥・海水等の腐敗による硫化水素の発生機序" },
        { head: "酸素欠乏等の発生しやすい場所", body: "し尿槽、汚水槽、海水が滞留するピット等、硫化水素が発生しうる場所" },
      ],
    },
    // --- 科目2: 酸素欠乏症等の症状（o2-2・2項目・60分） ---
    {
      id: "gakka-2",
      kind: "content",
      title: "酸素欠乏症等の症状",
      titleEn: "SYMPTOMS",
      covers: ["o2-2"],
      bullets: [
        { head: "酸素欠乏等による危険性", body: "硫化水素は高濃度で嗅覚が麻痺し臭いで気づけなくなるため、酸素欠乏と同様かそれ以上に急激に重篤化する危険性がある" },
        { head: "酸素欠乏症等の主な症状", body: "酸素欠乏症の症状に加え、硫化水素中毒特有の眼・気道刺激、意識消失、呼吸停止" },
      ],
    },
    // --- 科目3: 空気呼吸器等の使用の方法（o2-3・1項目・60分） ---
    {
      id: "gakka-3",
      kind: "content",
      title: "空気呼吸器等の使用の方法",
      titleEn: "RESPIRATORY EQUIPMENT",
      covers: ["o2-3"],
      bullets: [
        {
          head: "空気呼吸器、酸素呼吸器若しくは送気マスク又は換気装置の使用方法及び保守点検の方法",
          body: "自給式呼吸器・送気マスクの正しい着用手順と使用前点検・保守管理。硫化水素用防毒マスクは高濃度環境では使用不可",
        },
      ],
    },
    // --- 科目4: 事故の場合の退避及び救急そ生の方法（o2-4・3項目・60分） ---
    {
      id: "gakka-4",
      kind: "content",
      title: "事故の場合の退避及び救急そ生の方法",
      titleEn: "EVACUATION & RESUSCITATION",
      covers: ["o2-4"],
      lead: "硫化水素中毒でも酸素欠乏症と同様、救助者の二次被災防止が最優先事項となる。",
      bullets: [
        { head: "墜落制止用器具等並びに救出用の設備及び器具の使用方法並びに保守点検の方法", body: "要救助者を引き上げる救出用三脚・巻上げ機等の使用方法と点検" },
        { head: "人工呼吸の方法", body: "呼吸停止時の人工呼吸の手順" },
        { head: "人工そ生器の使用方法", body: "人工蘇生器の使用手順" },
      ],
      note: "硫化水素中毒は酸欠と並び救助者を含む複数名が同時に被災する事例が多い。必ず空気呼吸器等を着用してから退避・救助にあたること。",
    },
    // --- 科目5: その他酸素欠乏症等の防止に関し必要な事項（o2-5・2項目・90分） ---
    {
      id: "gakka-5",
      kind: "content",
      title: "その他酸素欠乏症等の防止に関し必要な事項",
      titleEn: "RELATED LAW & PREVENTION",
      covers: ["o2-5"],
      bullets: [
        { head: "関係法令", body: "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則及び酸素欠乏症等防止規則中の関係条項" },
        { head: "酸素欠乏症等を防止するため当該業務について必要な事項", body: "作業前の酸素濃度・硫化水素濃度測定、換気の実施、監視人の配置等の防止措置" },
      ],
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：有害物等との接触（酸素欠乏・硫化水素中毒を含む）", covers: [], hazardSlug: "harmful-substance" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "harmful-substance" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "harmful-substance" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "特別教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
