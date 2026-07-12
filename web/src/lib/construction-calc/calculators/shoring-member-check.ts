/**
 * 土止め支保工の部材基準チェック（安衛則第368条〜第375条）
 *
 * 根拠（労働安全衛生規則。条文本文で確認済み）:
 * - 第368条（材料）: 著しい損傷・変形・腐食があるものを使用してはならない。
 * - 第369条（構造）: 地山の形状・地質・地層・き裂・含水・湧水・凍結・埋設物等の状態に応じた
 *   堅固な構造とすること（現地条件に応じた判断のため本チェックでは項目化せず注意喚起のみ）。
 * - 第370条（組立図）: あらかじめ組立図を作成し、これにより組み立てること。
 * - 第371条（部材の取付け等）:
 *     一号 切りばり・腹おこしは矢板・くい等に確実に取り付け、脱落を防止すること
 *     二号 圧縮材（火打ちを除く）の継手は突合せ継手とすること
 *     三号 切りばり・火打ちの接続部及び交さ部は当て板をあててボルトにより緊結し、
 *          溶接により接合する等の方法により堅固なものとすること
 * - 第372条（切りばり等の作業＝令第6条第10号の作業）:
 *     一号 関係者以外の立入りを禁止する旨を表示する等の方法により禁止すること
 *     二号 材料・器具・工具の上げ下ろしにはつり綱・つり袋等を使用させること
 * - 第373条（点検）: 設置後7日をこえない期間ごと、中震以上の地震の後、及び大雨等により
 *   地山が急激に軟弱化するおそれのある事態が生じた後に点検し、異常があれば直ちに補強・補修。
 * - 第374条（作業主任者の選任）: 地山の掘削及び土止め支保工作業主任者技能講習修了者を選任。
 * - 第375条（作業主任者の職務）: 作業方法の決定・直接指揮、材料・器具工具の点検、
 *   要求性能墜落制止用器具等・保護帽の使用状況の監視。
 *
 * 掘削勾配計算機（excavation-slope）で基準勾配を確保できない場合、および土圧計算機
 * （earth-pressure-shoring）で側圧を算定した場合の、土止め支保工そのものの遵守事項の
 * 受け皿として結線する。判定は決定論的なルール表（AIは使わない）。断面照査（許容応力度
 * 計算）は側圧の算定結果に基づき別途行う必要があり、本チェックには含まない。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export const SHORING_INSPECTION_INTERVAL_MAX_DAYS = 7;

export type YesNo = "yes" | "no";
export type RecentEventStatus = "none" | "done" | "pending";

function computeShoringMemberCheck(values: CalcValues): CalcOutcome {
  const materialCondition = values.materialCondition as "sound" | "damaged";
  const hasAssemblyDrawing = values.hasAssemblyDrawing as YesNo;
  const memberJointFixed = values.memberJointFixed as YesNo;
  const compressionJointButt = values.compressionJointButt as YesNo;
  const crossingSectionFixed = values.crossingSectionFixed as YesNo;
  const entryRestricted = values.entryRestricted as YesNo;
  const daysSinceInspection = values.daysSinceInspection as number;
  const recentEventInspection = values.recentEventInspection as RecentEventStatus;
  const hasSupervisor = values.hasSupervisor as YesNo;

  const items: CalcCheckItem[] = [];

  items.push({
    label: "部材の状態（第368条・材料）",
    value: materialCondition === "sound" ? "著しい損傷・変形・腐食なし" : "著しい損傷・変形・腐食あり",
    tone: materialCondition === "sound" ? "safe" : "danger",
    note: "安衛則第368条",
  });
  items.push({
    label: "組立図（第370条）",
    value: hasAssemblyDrawing === "yes" ? "作成済み・組立図どおりに施工" : "未作成、または組立図によらず施工",
    tone: hasAssemblyDrawing === "yes" ? "safe" : "danger",
    note: "安衛則第370条",
  });
  items.push({
    label: "切りばり・腹おこしの取付け（第371条1号）",
    value: memberJointFixed === "yes" ? "矢板・くい等に確実に取付け（脱落防止）" : "取付けが不確実",
    tone: memberJointFixed === "yes" ? "safe" : "danger",
    note: "安衛則第371条一号",
  });
  items.push({
    label: "圧縮材の継手（第371条2号）",
    value: compressionJointButt === "yes" ? "突合せ継手" : "突合せ継手以外",
    tone: compressionJointButt === "yes" ? "safe" : "danger",
    note: "安衛則第371条二号",
  });
  items.push({
    label: "接続部・交差部の緊結（第371条3号）",
    value: crossingSectionFixed === "yes" ? "当て板＋ボルト緊結／溶接等で堅固" : "緊結が不十分",
    tone: crossingSectionFixed === "yes" ? "safe" : "danger",
    note: "安衛則第371条三号",
  });
  items.push({
    label: "立入禁止の表示（第372条1号）",
    value: entryRestricted === "yes" ? "表示等により禁止措置あり" : "表示等の措置なし",
    tone: entryRestricted === "yes" ? "safe" : "danger",
    note: "安衛則第372条一号",
  });

  const inspectionOk = daysSinceInspection <= SHORING_INSPECTION_INTERVAL_MAX_DAYS;
  items.push({
    label: "定期点検の間隔（第373条）",
    value: `前回点検から${formatNumber(daysSinceInspection, 0)}日経過（${SHORING_INSPECTION_INTERVAL_MAX_DAYS}日以内ごと）`,
    tone: inspectionOk ? "safe" : "danger",
    note: "安衛則第373条",
  });
  const eventLabel =
    recentEventInspection === "none"
      ? "該当なし"
      : recentEventInspection === "done"
        ? "該当あり・点検済み"
        : "該当あり・未点検";
  items.push({
    label: "中震以上の地震・大雨等（急激な軟弱化のおそれ）後の点検（第373条）",
    value: eventLabel,
    tone: recentEventInspection === "pending" ? "danger" : "safe",
    note: "安衛則第373条（周期に関わらず直ちに点検）",
  });

  items.push({
    label: "土止め支保工作業主任者の選任（第374条）",
    value: hasSupervisor === "yes" ? "選任済み" : "未選任",
    tone: hasSupervisor === "yes" ? "safe" : "danger",
    note: "安衛則第374条",
  });

  const failures = items.filter((i) => i.tone === "danger");
  const ok = failures.length === 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(`${failures.map((f) => f.label).join("・")}が基準を満たしていません。直ちに是正してください。`);
  }
  warnings.push(
    "材料・器具・工具を上げ下ろしするときは、つり綱・つり袋等を使用させてください（安衛則第372条二号）。",
  );
  warnings.push(
    "土止め支保工作業主任者には、作業方法の決定・直接指揮、材料・器具工具の点検、要求性能墜落制止用器具等・保護帽の使用状況の監視を行わせてください（安衛則第375条）。",
  );
  warnings.push(
    "構造（第369条）は地山の形状・地質・地層・き裂・含水・湧水・凍結・埋設物等の状態に応じた堅固なものとする必要があります。現地条件の確認・断面照査は専門技術者が行ってください。",
  );
  warnings.push(
    "本チェックは第368条〜第375条の主要な遵守事項の抜粋です。側圧（設計外力）の算定は土圧計算機（土圧の概算）等で別途行い、部材の許容応力度計算はその結果に基づいて行ってください。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    value: ok ? undefined : String(failures.length),
    unit: ok ? undefined : "項目",
    summary: ok
      ? "入力した条件は、安衛則第368条〜第375条の主要な遵守事項の範囲内です。"
      : `${failures.map((f) => f.label).join("・")}が基準を満たしていません。`,
    items,
    steps: [
      `部材（材料・組立図・取付け・継手・緊結・立入禁止）の6項目のうち、基準不適合 ${
        items.slice(0, 6).filter((i) => i.tone === "danger").length
      } 件`,
      `点検（第373条）: 前回点検から${formatNumber(daysSinceInspection, 0)}日（${SHORING_INSPECTION_INTERVAL_MAX_DAYS}日以内ごと） / 地震・大雨等の該当状況「${eventLabel}」`,
      `作業主任者の選任（第374条）: ${hasSupervisor === "yes" ? "選任済み" : "未選任"}`,
      `判定: 基準不適合の項目 ${failures.length} 件 → ${ok ? "適合" : "不適合"}`,
    ],
    warnings,
  };
}

export const shoringMemberCheckCalculator: ConstructionCalculator = {
  slug: "shoring-member-check",
  title: "土止め支保工の部材基準チェック（安衛則368〜375条）",
  shortTitle: "土止め支保工チェック",
  summary:
    "材料・組立図・部材の取付け・継手・緊結・立入禁止・点検周期・作業主任者選任を、労働安全衛生規則第368条〜第375条の遵守事項に沿って一括判定します。掘削勾配計算機で基準勾配を確保できない場合や、土圧計算機で側圧を算定した後の受け皿として使用してください。",
  fields: [
    {
      kind: "select",
      id: "materialCondition",
      label: "部材の状態",
      options: [
        { value: "sound", label: "著しい損傷・変形・腐食なし" },
        { value: "damaged", label: "著しい損傷・変形・腐食あり" },
      ],
      defaultValue: "sound",
      help: "安衛則第368条（材料）",
    },
    {
      kind: "select",
      id: "hasAssemblyDrawing",
      label: "組立図",
      options: [
        { value: "yes", label: "作成済み・組立図どおりに施工" },
        { value: "no", label: "未作成、または組立図によらず施工" },
      ],
      defaultValue: "yes",
      help: "安衛則第370条",
    },
    {
      kind: "select",
      id: "memberJointFixed",
      label: "切りばり・腹おこしの取付け",
      options: [
        { value: "yes", label: "矢板・くい等に確実に取付け（脱落防止）" },
        { value: "no", label: "取付けが不確実" },
      ],
      defaultValue: "yes",
      help: "安衛則第371条一号",
    },
    {
      kind: "select",
      id: "compressionJointButt",
      label: "圧縮材の継手",
      options: [
        { value: "yes", label: "突合せ継手" },
        { value: "no", label: "突合せ継手以外" },
      ],
      defaultValue: "yes",
      help: "安衛則第371条二号（火打ちを除く）",
    },
    {
      kind: "select",
      id: "crossingSectionFixed",
      label: "接続部・交差部の緊結",
      options: [
        { value: "yes", label: "当て板＋ボルト緊結／溶接等で堅固" },
        { value: "no", label: "緊結が不十分" },
      ],
      defaultValue: "yes",
      help: "安衛則第371条三号",
    },
    {
      kind: "select",
      id: "entryRestricted",
      label: "立入禁止の表示",
      options: [
        { value: "yes", label: "表示等により禁止措置あり" },
        { value: "no", label: "表示等の措置なし" },
      ],
      defaultValue: "yes",
      help: "安衛則第372条一号",
    },
    {
      kind: "number",
      id: "daysSinceInspection",
      label: "前回点検からの経過日数",
      unit: "日",
      min: 0,
      max: 60,
      step: 1,
      defaultValue: 3,
      help: "7日をこえない期間ごとに点検（安衛則第373条）",
    },
    {
      kind: "select",
      id: "recentEventInspection",
      label: "中震以上の地震・大雨等（急激な軟弱化のおそれ）",
      options: [
        { value: "none", label: "該当なし" },
        { value: "done", label: "該当あり・その後点検済み" },
        { value: "pending", label: "該当あり・まだ点検していない" },
      ],
      defaultValue: "none",
      help: "該当時は7日周期によらず直ちに点検（安衛則第373条）",
      aiOptional: true,
    },
    {
      kind: "select",
      id: "hasSupervisor",
      label: "土止め支保工作業主任者の選任",
      options: [
        { value: "yes", label: "選任済み" },
        { value: "no", label: "未選任" },
      ],
      defaultValue: "yes",
      help: "安衛則第374条",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第368条・第369条（材料・構造）",
      description:
        "著しい損傷・変形・腐食がある材料の使用禁止（368条）、地山の状態に応じた堅固な構造とすること（369条）。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_368",
    },
    {
      label: "労働安全衛生規則 第370条（組立図）",
      description: "あらかじめ組立図を作成し、これにより組み立てなければなりません。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_370",
    },
    {
      label: "労働安全衛生規則 第371条（部材の取付け等）",
      description: "切りばり・腹おこしの取付け、圧縮材の継手（突合せ継手）、接続部・交差部の緊結の基準。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_371",
    },
    {
      label: "労働安全衛生規則 第372条（切りばり等の作業）",
      description: "関係者以外の立入り禁止、材料・器具工具の上げ下ろしにつり綱・つり袋等の使用。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_372",
    },
    {
      label: "労働安全衛生規則 第373条（点検）",
      description: "設置後7日をこえない期間ごと、中震以上の地震後、大雨等の後に点検し、異常があれば直ちに補強・補修。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_373",
    },
    {
      label: "労働安全衛生規則 第374条・第375条（作業主任者の選任・職務）",
      description: "地山の掘削及び土止め支保工作業主任者技能講習修了者の選任と、その職務（作業指揮・点検・保護具の監視）。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_374",
    },
  ],
  cautions: [
    "本チェックは第368条〜第375条の主要な遵守事項の抜粋です。部材の断面照査（許容応力度計算）は土圧計算機（土圧の概算）等で求めた設計外力に基づき別途行ってください。",
    "第369条（構造）は現地の地山条件（形状・地質・地層・き裂・含水・湧水・凍結・埋設物等）に応じた判断が必要です。専門技術者による確認を前提としてください。",
    "点検は記録（点検表）を残し、異常を認めたときは直ちに補強・補修してください。本チェックの経過日数入力は目安です。",
  ],
  examples: [
    {
      label: "全項目適合・点検3日前",
      values: {
        materialCondition: "sound",
        hasAssemblyDrawing: "yes",
        memberJointFixed: "yes",
        compressionJointButt: "yes",
        crossingSectionFixed: "yes",
        entryRestricted: "yes",
        daysSinceInspection: 3,
        recentEventInspection: "none",
        hasSupervisor: "yes",
      },
    },
    {
      label: "組立図なし・点検10日経過（NG例）",
      values: {
        materialCondition: "sound",
        hasAssemblyDrawing: "no",
        memberJointFixed: "yes",
        compressionJointButt: "yes",
        crossingSectionFixed: "yes",
        entryRestricted: "yes",
        daysSinceInspection: 10,
        recentEventInspection: "none",
        hasSupervisor: "yes",
      },
    },
    {
      label: "地震後まだ点検していない（NG例）",
      values: {
        materialCondition: "sound",
        hasAssemblyDrawing: "yes",
        memberJointFixed: "yes",
        compressionJointButt: "yes",
        crossingSectionFixed: "yes",
        entryRestricted: "yes",
        daysSinceInspection: 2,
        recentEventInspection: "pending",
        hasSupervisor: "yes",
      },
    },
  ],
  keywords: [
    "土止め支保工",
    "切りばり",
    "腹おこし",
    "矢板",
    "くい",
    "点検",
    "作業主任者",
    "組立図",
    "部材",
    "地山掘削",
    "支保工点検",
    "中震",
  ],
  relatedSlugs: ["earth-pressure-shoring", "excavation-slope"],
  compute: computeShoringMemberCheck,
};
