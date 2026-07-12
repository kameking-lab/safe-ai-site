/**
 * 型枠支保工の基準チェック（安衛則237〜242条・パイプサポート/鋼管支柱）
 *
 * 根拠:
 * - 労働安全衛生規則 第242条（型枠支保工についての措置）:
 *   第六号（パイプサポートを支柱とする場合）
 *     イ: パイプサポートを3本以上継いで用いないこと
 *     ロ: パイプサポートを継いで用いるときは、4以上のボルト又は専用の金具を用いて継ぐこと
 *     ハ: 高さが3.5mを超えるときは、高さ2m以内ごとに水平つなぎを2方向に設け、
 *         かつ、水平つなぎの変位を防止すること
 *   第七号（鋼管[単管]を支柱とする場合）:
 *     高さ2m以内ごとに水平つなぎを2方向に設け、かつ、水平つなぎの変位を防止すること 等
 * - 第240条（沈下・滑動の防止・接続部/交差部の緊結 等）
 * - 第239条（組立図の作成）／第237条（材料）／第238条（主要な部分の鋼材）
 * - 第246条（型枠支保工の組立て等作業主任者の選任）
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

export const SHORING_LIMITS = {
  /** パイプサポートを継いで用いる本数の上限（3本以上継がない → 2本まで） 242条6号イ */
  pipeMaxJoints: 2,
  /** 継ぐ場合の最少ボルト/専用金具数 242条6号ロ */
  pipeJointMinBolts: 4,
  /** パイプサポート: 水平つなぎが必要になる高さ 242条6号ハ */
  pipeTieRequiredOverHeightM: 3.5,
  /** パイプサポート: 水平つなぎの鉛直間隔上限（高さ3.5m超のとき） 242条6号ハ */
  pipeTieIntervalMaxM: 2,
  /** 鋼管（単管）支柱: 水平つなぎの鉛直間隔上限 242条7号 */
  steelPipeTieIntervalMaxM: 2,
} as const;

export type ShoringSupportType = "pipe" | "steel_pipe";

export const SHORING_SUPPORT_LABELS: Record<ShoringSupportType, string> = {
  pipe: "パイプサポート",
  steel_pipe: "鋼管（単管）",
};

function computeFormworkShoring(values: CalcValues): CalcOutcome {
  const supportType = String(values.supportType) as ShoringSupportType;
  const height = values.height as number;
  const jointCount = values.jointCount as number; // 継いで用いる本数（1=継がない）
  const boltCount = values.boltCount as number; // 継手のボルト/専用金具数
  const tieInterval = values.tieInterval as number; // 水平つなぎの鉛直間隔

  const items: CalcCheckItem[] = [];

  if (supportType === "pipe") {
    // 6号イ: 3本以上継がない
    const jointOk = jointCount <= SHORING_LIMITS.pipeMaxJoints;
    items.push({
      label: "パイプサポートの継ぎ本数",
      value: `${jointCount}本継ぎ（限度 ${SHORING_LIMITS.pipeMaxJoints}本まで）`,
      tone: jointOk ? "safe" : "danger",
      note: "安衛則242条6号イ（3本以上継いで用いない）",
    });
    // 6号ロ: 継ぐときは4以上のボルト/専用金具
    if (jointCount >= 2) {
      const boltOk = boltCount >= SHORING_LIMITS.pipeJointMinBolts;
      items.push({
        label: "継手のボルト・専用金具数",
        value: `${boltCount}個（4以上必要）`,
        tone: boltOk ? "safe" : "danger",
        note: "安衛則242条6号ロ",
      });
    }
    // 6号ハ: 高さ3.5m超は2m以内ごと水平つなぎ2方向
    const tieRequired = height > SHORING_LIMITS.pipeTieRequiredOverHeightM;
    if (tieRequired) {
      const tieOk = tieInterval <= SHORING_LIMITS.pipeTieIntervalMaxM + 1e-9;
      items.push({
        label: "水平つなぎの鉛直間隔（高さ3.5m超）",
        value: `${formatNumber(tieInterval, 2)}m（2m以内・2方向が必要）`,
        tone: tieOk ? "safe" : "danger",
        note: "安衛則242条6号ハ（水平つなぎの変位防止も必要）",
      });
    } else {
      items.push({
        label: "水平つなぎ（高さ3.5m以下）",
        value: `高さ${formatNumber(height, 1)}m → 3.5m以下のため6号ハの高さ条件に該当せず`,
        tone: "safe",
        note: "安衛則242条6号ハ",
      });
    }
  } else {
    // 鋼管（単管）支柱: 高さ2m以内ごと水平つなぎ2方向
    const tieOk = tieInterval <= SHORING_LIMITS.steelPipeTieIntervalMaxM + 1e-9;
    items.push({
      label: "水平つなぎの鉛直間隔（鋼管支柱）",
      value: `${formatNumber(tieInterval, 2)}m（2m以内・2方向が必要）`,
      tone: tieOk ? "safe" : "danger",
      note: "安衛則242条7号（水平つなぎの変位防止も必要）",
    });
  }

  const failures = items.filter((i) => i.tone === "danger");
  const ok = failures.length === 0;

  const warnings: string[] = [];
  if (!ok) {
    warnings.push(`${failures.map((f) => f.label).join("・")}が基準を満たしていません。是正が必要です。`);
  }
  if (height >= 3.5 || supportType === "steel_pipe") {
    warnings.push(
      "支柱の脚部の固定・沈下防止（敷板・敷角等）、接続部・交差部の緊結が必要です（安衛則240条）。",
    );
  }
  warnings.push(
    "型枠支保工を組み立てるときは組立図を作成し、これにより組み立てる必要があります（安衛則239条）。",
  );
  warnings.push(
    "型枠支保工の組立て・解体の作業には、型枠支保工の組立て等作業主任者の選任が必要です（安衛則246条）。コンクリート打設中は異常の有無を監視してください。",
  );
  warnings.push(
    "本チェックは主要な基準の抜粋です。設計荷重（コンクリート・鉄筋・作業荷重・型枠質量、及び水平荷重）に基づく構造検討（安衛則241条）は別途必要です。",
  );

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準適合" : "基準不適合",
    value: ok ? undefined : String(failures.length),
    unit: ok ? undefined : "項目",
    summary: ok
      ? `入力した${SHORING_SUPPORT_LABELS[supportType]}支柱の条件は、安衛則第242条の主要基準の範囲内です。`
      : `${failures.map((f) => f.label).join("・")}が基準を満たしていません。`,
    items,
    steps: [
      `支柱種類: ${SHORING_SUPPORT_LABELS[supportType]} / 高さ ${formatNumber(height, 1)}m`,
      supportType === "pipe"
        ? `パイプサポート: 継ぎ ${jointCount}本 ≤ 2本 / 継手ボルト ${boltCount}個 ≥ 4個 / 高さ3.5m超の水平つなぎ ${formatNumber(tieInterval, 2)}m ≤ 2m を確認（242条6号）`
        : `鋼管支柱: 水平つなぎ ${formatNumber(tieInterval, 2)}m ≤ 2m（2方向）を確認（242条7号）`,
      `判定: 基準不適合の項目 ${failures.length} 件 → ${ok ? "適合" : "不適合"}`,
    ],
    warnings,
  };
}

export const formworkShoringCheckCalculator: ConstructionCalculator = {
  slug: "formwork-shoring-check",
  title: "型枠支保工の基準チェック（安衛則242条）",
  shortTitle: "型枠支保工チェック",
  summary:
    "パイプサポート・鋼管支柱の継ぎ本数・継手ボルト数・水平つなぎ間隔を入力すると、労働安全衛生規則第242条の基準（3本以上継がない・継手4ボルト以上・高さ3.5m超は2m以内ごと水平つなぎ2方向 等）への適合を判定します。",
  fields: [
    {
      kind: "select",
      id: "supportType",
      label: "支柱の種類",
      options: [
        { value: "pipe", label: "パイプサポート" },
        { value: "steel_pipe", label: "鋼管（単管）" },
      ],
      defaultValue: "pipe",
      help: "パイプサポートが最も一般的",
    },
    {
      kind: "number",
      id: "height",
      label: "支保工の高さ",
      unit: "m",
      min: 0.5,
      max: 15,
      step: 0.1,
      defaultValue: 3,
      help: "スラブ下端までの支柱の高さ",
    },
    {
      kind: "number",
      id: "jointCount",
      label: "パイプサポートの継ぎ本数",
      unit: "本",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 1,
      help: "継がずに1本で使う場合は1（鋼管支柱では無視）",
    },
    {
      kind: "number",
      id: "boltCount",
      label: "継手のボルト・専用金具数",
      unit: "個",
      min: 0,
      max: 12,
      step: 1,
      defaultValue: 4,
      help: "継いで使うとき4以上（1本使いなら無視）",
    },
    {
      kind: "number",
      id: "tieInterval",
      label: "水平つなぎの鉛直間隔",
      unit: "m",
      min: 0.5,
      max: 6,
      step: 0.1,
      defaultValue: 2,
      help: "水平つなぎを設ける上下方向の間隔",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第242条（型枠支保工についての措置）",
      description:
        "パイプサポート（3本以上継がない・継手4ボルト以上・高さ3.5m超は2m以内ごと水平つなぎ2方向）、鋼管支柱（2m以内ごと水平つなぎ2方向）等の措置を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_242",
    },
    {
      label: "労働安全衛生規則 第240条（型枠支保工の措置）",
      description: "支柱の沈下防止・脚部の滑動防止、支柱の継手・接続部/交差部の緊結を定めています。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_240",
    },
    {
      label: "労働安全衛生規則 第239条・第241条（組立図・構造）",
      description: "組立図の作成義務、設計荷重（鉛直・水平荷重）に基づく構造の基準。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_239",
    },
    {
      label: "労働安全衛生規則 第246条（型枠支保工の組立て等作業主任者）",
      description: "型枠支保工の組立て・解体の作業には作業主任者の選任が必要です。",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_246",
    },
  ],
  cautions: [
    "本チェックは第242条の主要な数値基準の抜粋です。設計荷重に基づく支柱の許容荷重・座屈の検討（241条）は別途必要です。",
    "支柱の脚部固定・沈下防止・水平荷重に対する措置（240条）、敷板・根がらみは現地で確認してください。",
    "鋼管枠・組立鋼柱・木材を支柱とする場合は別の基準（242条各号）が適用されます。",
  ],
  examples: [
    { label: "パイプサポート 高さ3m・1本使い", values: { supportType: "pipe", height: 3, jointCount: 1, boltCount: 4, tieInterval: 2 } },
    { label: "高さ4mで水平つなぎ2.5m（NG例）", values: { supportType: "pipe", height: 4, jointCount: 2, boltCount: 4, tieInterval: 2.5 } },
  ],
  keywords: [
    "型枠",
    "支保工",
    "パイプサポート",
    "サポート",
    "支柱",
    "水平つなぎ",
    "スラブ",
    "コンクリート",
    "打設",
    "せき板",
    "根太",
    "大引",
  ],
  relatedSlugs: ["formwork-lateral-pressure", "beam-deflection"],
  compute: computeFormworkShoring,
};
