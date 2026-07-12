/**
 * 第1種酸素欠乏危険作業 特別教育 フルデッキ（企画 03章 P2・EDU-S5・量産の型に準拠）。
 *
 * 正本 se-36-26-oxygen／トラック type-1（酸素欠乏危険作業特別教育規程・昭和57年労働省告示第132号
 * 第1条）の学科5科目・全範囲項目を covers で機械照合。学科4時間以上のみで実技の定めはない。
 * 硫化水素中毒を含む「第2種」は別デッキ oxygen-2（trackId: type-2）。
 * 統計・事例スライドは build-summary（harmful-substance 型）追従・dataAsOf 印字（04章）。
 */

import type { EduDeck } from "./types";

export const OXYGEN_1_DECK: EduDeck = {
  slug: "oxygen-1",
  curriculumId: "se-36-26-oxygen",
  trackId: "type-1",
  title: "第1種酸素欠乏危険作業 特別教育",
  titleEn: "OXYGEN DEFICIENCY HAZARD (TYPE 1) SPECIAL EDUCATION",
  audience: "第1種酸素欠乏危険作業（硫化水素の発生のおそれがない酸素欠乏危険場所）に係る業務に従事する労働者",
  basisDisplay:
    "安衛則第36条第26号／酸素欠乏危険作業特別教育規程（昭和57年労働省告示第132号）第1条 ／ 第1種・学科4時間以上（実技の定めなし）",
  timetable: [
    { unitId: "o1-1", minutes: 30 },
    { unitId: "o1-2", minutes: 30 },
    { unitId: "o1-3", minutes: 60 },
    { unitId: "o1-4", minutes: 60 },
    { unitId: "o1-5", minutes: 60 },
  ],
  hazardSlugs: ["harmful-substance"],
  slides: [
    {
      id: "cover",
      kind: "cover",
      title: "第1種酸素欠乏危険作業 特別教育",
      titleEn: "OXYGEN DEFICIENCY HAZARD (TYPE 1) SPECIAL EDUCATION",
      covers: [],
      lead: "安衛則第36条第26号・酸素欠乏危険作業特別教育規程（昭57告示132号）第1条に対応した学科教材（学科4時間以上）。",
    },
    // --- 科目1: 酸素欠乏の発生の原因（o1-1・2項目・30分） ---
    {
      id: "gakka-1",
      kind: "content",
      title: "酸素欠乏の発生の原因",
      titleEn: "CAUSES OF OXYGEN DEFICIENCY",
      covers: ["o1-1"],
      lead: "酸素欠乏がなぜ・どこで発生するかを理解する。",
      bullets: [
        { head: "酸素欠乏の発生の原因", body: "酸素の消費（腐敗・酸化・呼吸等）や酸素以外のガスによる置換で酸素濃度が低下する仕組み" },
        { head: "酸素欠乏の発生しやすい場所", body: "マンホール、タンク内部、井戸、サイロ、船倉等の密閉・半密閉空間" },
      ],
    },
    // --- 科目2: 酸素欠乏症の症状（o1-2・2項目・30分） ---
    {
      id: "gakka-2",
      kind: "content",
      title: "酸素欠乏症の症状",
      titleEn: "SYMPTOMS",
      covers: ["o1-2"],
      bullets: [
        { head: "酸素欠乏による危険性", body: "自覚症状が乏しいまま急激に意識を失うことがあり、他の災害類型に比べて死亡に至りやすい" },
        { head: "酸素欠乏症の主な症状", body: "頭痛・めまい・判断力低下から、重篤な場合は意識消失・死亡に至る段階的な症状" },
      ],
    },
    // --- 科目3: 空気呼吸器等の使用の方法（o1-3・1項目・60分） ---
    {
      id: "gakka-3",
      kind: "content",
      title: "空気呼吸器等の使用の方法",
      titleEn: "RESPIRATORY EQUIPMENT",
      covers: ["o1-3"],
      bullets: [
        {
          head: "空気呼吸器、酸素呼吸器若しくは送気マスク又は換気装置の使用方法及び保守点検の方法",
          body: "自給式呼吸器・送気マスクの正しい着用手順と、使用前点検・保守管理の方法。防毒・防じんマスクは酸欠場所では使用不可",
        },
      ],
    },
    // --- 科目4: 事故の場合の退避及び救急そ生の方法（o1-4・3項目・60分） ---
    {
      id: "gakka-4",
      kind: "content",
      title: "事故の場合の退避及び救急そ生の方法",
      titleEn: "EVACUATION & RESUSCITATION",
      covers: ["o1-4"],
      lead: "二次災害（救助者自身の被災）を防ぐ退避・救助の方法と、救急そ生の方法を理解する。",
      bullets: [
        { head: "墜落制止用器具等並びに救出用の設備及び器具の使用方法並びに保守点検の方法", body: "要救助者を引き上げる救出用三脚・巻上げ機等の使用方法と点検" },
        { head: "人工呼吸の方法", body: "呼吸停止時の人工呼吸の手順" },
        { head: "人工そ生器の使用方法", body: "人工蘇生器の使用手順" },
      ],
      note: "救助者が防護具なしに進入し二次被災するケースが多いため、必ず空気呼吸器等を着用してから退避・救助にあたること。",
    },
    // --- 科目5: その他酸素欠乏症の防止に関し必要な事項（o1-5・2項目・60分） ---
    {
      id: "gakka-5",
      kind: "content",
      title: "その他酸素欠乏症の防止に関し必要な事項",
      titleEn: "RELATED LAW & PREVENTION",
      covers: ["o1-5"],
      bullets: [
        { head: "関係法令", body: "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則及び酸素欠乏症等防止規則中の関係条項" },
        { head: "酸素欠乏症を防止するため当該業務について必要な事項", body: "作業前の酸素濃度測定、換気の実施、監視人の配置等の防止措置" },
      ],
    },
    // --- データ層: 統計 → 事例 → 確認テスト（04章） ---
    { id: "statistics", kind: "statistics", title: "最新統計：有害物等との接触（酸素欠乏を含む）", covers: [], hazardSlug: "harmful-substance" },
    { id: "cases", kind: "cases", title: "実事例（出典付き）", covers: [], hazardSlug: "harmful-substance" },
    { id: "quiz", kind: "quiz", title: "確認テスト", covers: [], hazardSlug: "harmful-substance" },
    // --- 実施チェックリスト・利用条件・CTA ---
    { id: "checklist", kind: "checklist", title: "特別教育 実施チェックリスト", covers: [] },
    { id: "terms", kind: "terms", title: "この教材の利用条件", covers: [] },
    { id: "cta", kind: "cta", title: "カスタマイズ・出張講習のご案内", covers: [] },
  ],
};
