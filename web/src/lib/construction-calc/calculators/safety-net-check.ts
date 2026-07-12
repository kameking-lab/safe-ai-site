/**
 * 安全ネット（防網）の基準チェック — 許容落下高さ・ネット下部の空き・ネットの垂れ
 *
 * 根拠（一次資料で原文突合済み・Opus）:
 * - 労働安全衛生規則 第539条（作業床の設置等・防網）: 高さ2m以上で墜落のおそれのある
 *   箇所は作業床を設け、困難なときは防網を張り墜落制止用器具を使用する等の措置。
 * - 「墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針」
 *   （昭和51年8月6日 労働省 技術上の指針公示第8号。安衛法第28条第1項に基づく）。
 *   一次資料: 安全衛生情報センター（JAISH）に告示原文が公開されている。
 *   原文（Shift_JIS）を明示デコードのうえ突合。docs/construction-calc-sources/
 *   R5-safety-net-jaish-shou51-kokuji8.decoded.txt に保存。
 *
 * 告示 4−1 の算定式（原文のとおり。Ｌ＜Ａ／Ｌ≧Ａ の分岐は A を L で頭打ち＝
 * Aeff = max(A, L) に統一できる。原文「ただし A≦L の範囲では A=L とする」と一致）:
 *   定義  L = ネットの短辺の長さ〔m〕（複合ネットは構成ネット短辺の最小）
 *         A = ネット周辺の支持点の間隔〔m〕
 *   4−1−1 落下高さ H1（許容落下高さ・以下とすること）
 *         単体ネット  L<A: H1 = 0.25(L + 2A)   L≧A: H1 = 0.75L
 *         複合ネット  L<A: H1 = 0.20(L + 2A)   L≧A: H1 = 0.60L
 *   4−1−2 ネットの垂れ S（以下とすること。単体・複合とも係数0.25）
 *         L<A: S = 0.25(L + 2A)/3            L≧A: S = 0.75L/3
 *   4−1−3 ネット下部の空き H2（以上とすること）
 *         10cm網目  L<A: H2 = 0.85(L + 3A)/4  L≧A: H2 = 0.85L
 *          5cm網目  L<A: H2 = 0.95(L + 3A)/4  L≧A: H2 = 0.95L
 *         その他網目は 5cm と 10cm の直線補間（本計算機は 10cm/5cm の告示2点のみ提供）
 *
 * ※ 二次資料（足場業者サイト等）は垂れ S の係数を 0.20 と誤記するものがあるが、告示原文は
 *   0.25（S = H1単/3 と内的整合）。一次資料突合を優先し 0.25 を採用する。
 *
 * 判定は決定論的なしきい値チェック（AIは使わない）。強度・網目・支持点外力等の
 * 構造基準は入力に依存しない固定注記として cautions/warnings で明示する。
 */

import type { CalcCheckItem, CalcOutcome, CalcValues, ConstructionCalculator } from "../schema";
import { formatNumber } from "../schema";

/** ネット種別（落下高さ係数が異なる） */
export type NetType = "single" | "composite";

/** 網目（下部の空き H2 の係数が異なる。告示は10cm/5cmの2点を規定） */
export type MeshType = "m10" | "m5";

/** 落下高さ H1 の係数（4−1−1）: H1 = k × (L + 2·Aeff)、Aeff = max(A, L） */
export const H1_COEFF: Record<NetType, number> = {
  single: 0.25,
  composite: 0.2,
};

/** ネット下部の空き H2 の係数（4−1−3）: H2 = k × (L + 3·Aeff)/4 */
export const H2_COEFF: Record<MeshType, number> = {
  m10: 0.85,
  m5: 0.95,
};

/** 垂れ S の係数（4−1−2・単体複合共通）: S = 0.25 × (L + 2·Aeff)/3 */
export const S_COEFF = 0.25;

/** 網目の辺長上限〔cm〕（2−3） */
export const MESH_MAX_CM = 10;

/**
 * 告示 4−1 の3量を算定する純関数（テストで数値固定）。
 * Aeff = max(A, L)（原文「A≦L の範囲では A=L」）で L<A / L≧A の分岐を統一。
 */
export function computeNetLimits(params: {
  netType: NetType;
  meshType: MeshType;
  L: number;
  A: number;
}): { H1: number; S: number; H2: number; Aeff: number } {
  const { netType, meshType, L, A } = params;
  const Aeff = Math.max(A, L); // A≦L のとき A=L（＝L≧A分岐の 0.75L 等に一致）
  const H1 = H1_COEFF[netType] * (L + 2 * Aeff);
  const S = (S_COEFF * (L + 2 * Aeff)) / 3;
  const H2 = (H2_COEFF[meshType] * (L + 3 * Aeff)) / 4;
  return { H1, S, H2, Aeff };
}

const NET_TYPE_LABEL: Record<NetType, string> = {
  single: "単体ネット（1枚）",
  composite: "複合ネット（複数連結）",
};

const MESH_LABEL: Record<MeshType, string> = {
  m10: "10cm網目",
  m5: "5cm網目",
};

function computeSafetyNetCheck(values: CalcValues): CalcOutcome {
  const netType = String(values.netType) as NetType;
  const meshType = String(values.meshType) as MeshType;
  const L = values.shortSideL as number;
  const A = values.supportSpacingA as number;
  const fallHeight = values.fallHeight as number;
  const clearanceBelow = values.clearanceBelow as number;

  const { H1, S, H2, Aeff } = computeNetLimits({ netType, meshType, L, A });

  const fallOk = fallHeight <= H1 + 1e-9;
  const clearanceOk = clearanceBelow >= H2 - 1e-9;
  const ok = fallOk && clearanceOk;
  const capped = Aeff > A + 1e-9; // A<L で A=L に頭打ちした

  const items: CalcCheckItem[] = [
    {
      label: "落下高さ（作業床〜ネット取付位置）",
      value: `${formatNumber(fallHeight, 2)}m（許容 ${formatNumber(H1, 2)}m 以下）`,
      tone: fallOk ? "safe" : "danger",
      note: "告示4−1−1（許容落下高さ H1）",
    },
    {
      label: "ネット下部の空き（取付位置〜下方の床・設備）",
      value: `${formatNumber(clearanceBelow, 2)}m（必要 ${formatNumber(H2, 2)}m 以上）`,
      tone: clearanceOk ? "safe" : "danger",
      note: "告示4−1−3（ネット下部の空き H2）",
    },
    {
      label: "ネットの垂れ（参考値）",
      value: `${formatNumber(S, 2)}m 以下`,
      note: "告示4−1−2（S = 0.25(L+2A)/3）。取付後の網地最低部までの垂直距離",
    },
    {
      label: "計算に用いた支持点間隔 A",
      value: capped
        ? `${formatNumber(Aeff, 2)}m（入力 ${formatNumber(A, 2)}m を短辺長 L=${formatNumber(L, 2)}m で頭打ち）`
        : `${formatNumber(A, 2)}m`,
      note: capped ? "告示: A≦L の範囲では A=L として算定" : undefined,
    },
  ];

  const warnings: string[] = [];
  if (!fallOk) {
    warnings.push(
      `落下高さ ${formatNumber(fallHeight, 2)}m が許容落下高さ H1=${formatNumber(H1, 2)}m を超えています。ネット取付位置を上げる・支持点間隔Aや短辺Lを見直す等が必要です。`,
    );
  }
  if (!clearanceOk) {
    warnings.push(
      `ネット下部の空き ${formatNumber(clearanceBelow, 2)}m が必要値 H2=${formatNumber(H2, 2)}m 未満です。人がネットで受け止められた際に下方の床・設備へ衝突するおそれがあります。取付位置を上げる等の見直しが必要です。`,
    );
  }
  // 入力に依存しない告示の構造・管理基準（固定注記）
  warnings.push(
    "網目は辺長10cm以下、材料は合成繊維とすること（告示2−3・2−2）。網糸・縁綱・つり綱の強度、結節・仕立て・接続方法も告示3・2の基準を満たす製品を使用してください。",
  );
  warnings.push(
    "縁綱・つり綱は等速引張試験で引張強さ1,500kg以上、支持点は600kgの外力（連続架構物は F=200B〔B=支持点間隔m〕）に耐えること（告示3−1・4−2−1）。",
  );
  warnings.push(
    "使用開始後1年以内・以後6月以内ごとに試験用糸の等速引張試験を行うこと。人体相当の衝撃を受けたネット・強度不明のネット・未補修のネットは使用しないこと（告示4−4・4−6）。",
  );

  const cappedNote = capped ? `（支持点間隔Aは短辺長L=${formatNumber(L, 2)}mで頭打ち）` : "";

  return {
    tone: ok ? "safe" : "danger",
    headline: ok ? "基準内" : fallOk ? "下部の空き不足" : clearanceOk ? "落下高さ超過" : "基準超過",
    value: formatNumber(H1, 2),
    unit: "m",
    summary: ok
      ? `${NET_TYPE_LABEL[netType]}・${MESH_LABEL[meshType]}で、落下高さ ${formatNumber(fallHeight, 2)}m ≤ 許容 ${formatNumber(H1, 2)}m、下部の空き ${formatNumber(clearanceBelow, 2)}m ≥ 必要 ${formatNumber(H2, 2)}m を満たします${cappedNote}。`
      : `${[!fallOk ? "落下高さが許容を超過" : "", !clearanceOk ? "下部の空きが不足" : ""].filter(Boolean).join("・")}しています。告示の基準を満たすよう見直しが必要です。`,
    items,
    steps: [
      `支持点間隔の有効値 Aeff = max(A=${formatNumber(A, 2)}, L=${formatNumber(L, 2)}) = ${formatNumber(Aeff, 2)}m（告示: A≦L では A=L）`,
      `許容落下高さ H1 = ${H1_COEFF[netType]} × (L + 2·Aeff) = ${H1_COEFF[netType]} × (${formatNumber(L, 2)} + 2×${formatNumber(Aeff, 2)}) = ${formatNumber(H1, 2)}m（${NET_TYPE_LABEL[netType]}・告示4−1−1）`,
      `ネット下部の空き H2 = ${H2_COEFF[meshType]} × (L + 3·Aeff)/4 = ${H2_COEFF[meshType]} × (${formatNumber(L, 2)} + 3×${formatNumber(Aeff, 2)})/4 = ${formatNumber(H2, 2)}m（${MESH_LABEL[meshType]}・告示4−1−3）`,
      `ネットの垂れ S = 0.25 × (L + 2·Aeff)/3 = ${formatNumber(S, 2)}m（告示4−1−2）`,
      `判定: 落下高さ ${formatNumber(fallHeight, 2)}m ${fallOk ? "≤" : ">"} ${formatNumber(H1, 2)}m ／ 下部の空き ${formatNumber(clearanceBelow, 2)}m ${clearanceOk ? "≥" : "<"} ${formatNumber(H2, 2)}m → ${ok ? "基準内" : "要見直し"}`,
    ],
    warnings,
  };
}

export const safetyNetCheckCalculator: ConstructionCalculator = {
  slug: "safety-net-check",
  title: "安全ネット（防網）の基準チェック（告示・許容落下高さ／下部の空き）",
  shortTitle: "安全ネット基準",
  summary:
    "ネット種別・網目・短辺長・支持点間隔から、許容落下高さ・ネット下部の必要な空き・ネットの垂れを昭和51年労働省告示（技術上の指針公示第8号）の式で算定し、実際の落下高さ・下部空間が基準内かを判定します。",
  category: "ashiba",
  fields: [
    {
      kind: "select",
      id: "netType",
      label: "ネット種別",
      options: [
        { value: "single", label: "単体ネット（1枚）" },
        { value: "composite", label: "複合ネット（複数を連結）" },
      ],
      defaultValue: "single",
      help: "複数のネットをつなぎ合わせたものが複合ネット（許容落下高さの係数が小さくなる）",
    },
    {
      kind: "select",
      id: "meshType",
      label: "網目",
      options: [
        { value: "m10", label: "10cm網目" },
        { value: "m5", label: "5cm網目" },
      ],
      defaultValue: "m10",
      help: "告示は10cm・5cmの2点を規定。中間の網目は直線補間（辺長10cm以下が必須）",
      aiOptional: true,
    },
    {
      kind: "number",
      id: "shortSideL",
      label: "ネットの短辺の長さ L",
      unit: "m",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "正方形は一辺、長方形は短辺。複合ネットは構成ネット短辺の最小",
    },
    {
      kind: "number",
      id: "supportSpacingA",
      label: "支持点の間隔 A",
      unit: "m",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 5,
      help: "ネット周辺の支持点どうしの間隔。A≦L のときは計算上 A=L として扱います",
    },
    {
      kind: "number",
      id: "fallHeight",
      label: "落下高さ（作業床〜ネット取付位置の垂直距離）",
      unit: "m",
      min: 0,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      help: "墜落のおそれのある作業床等からネット支持面までの高さ",
    },
    {
      kind: "number",
      id: "clearanceBelow",
      label: "ネット下部の空き（取付位置〜下方の床・設備の垂直距離）",
      unit: "m",
      min: 0,
      max: 50,
      step: 0.1,
      defaultValue: 5,
      help: "ネット支持面から、下方で衝突のおそれのある床面・機械設備までの距離",
    },
  ],
  basis: [
    {
      label: "労働安全衛生規則 第539条（作業床の設置等・防網）",
      description:
        "高さ2m以上で墜落のおそれのある箇所は作業床の設置等の措置を講じ、困難なときは防網を張り墜落制止用器具を使用する等の措置を定めています。",
      lawNaviPath: "/law-navi/347M50002000032/539",
      egovUrl: "https://laws.e-gov.go.jp/law/347M50002000032#Mp-At_539",
    },
    {
      label:
        "墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針（昭和51年 労働省 技術上の指針公示第8号）",
      description:
        "許容落下高さ H1・ネットの垂れ S・ネット下部の空き H2 の算定式、網目（辺長10cm以下）・材料（合成繊維）・網糸/縁綱/つり綱の強度・支持点の外力（600kg 又は F=200B）・定期試験・使用制限を定めた技術上の指針（安衛法第28条第1項に基づく）。",
      egovUrl: "https://www.jaish.gr.jp/anzen/hor/hombun/hor1-7/hor1-7-8-1-0.htm",
    },
  ],
  cautions: [
    "本計算は告示の許容落下高さ・下部の空き・垂れの算定式に基づく適合確認です。網目・材料・結節・強度・支持点強度・定期試験・保管等の構造/管理基準は別途、告示の全項目を確認してください。",
    "その他の網目（5cm・10cm以外）のネット下部の空きは、告示に従い5cmと10cmの値の直線補間で求めてください（本計算機は告示規定の10cm・5cmの2点を提供）。",
    "防網は墜落制止用器具（フルハーネス等）の使用が困難な場合等の措置であり、可能な限り作業床の設置・墜落制止用器具の使用を優先してください（安衛則518〜521条・第539条）。",
    "支持点・取付部の構造強度、繰返し使用・経年劣化による強度低下、有害ガス暴露後の再試験は本計算の対象外です。",
  ],
  examples: [
    { label: "単体10cm網目 短辺3m・支持間隔5m（L<A）", values: { netType: "single", meshType: "m10", shortSideL: 3, supportSpacingA: 5, fallHeight: 3, clearanceBelow: 5 } },
    { label: "単体10cm網目 短辺7m・支持間隔3.75m（L≧A）", values: { netType: "single", meshType: "m10", shortSideL: 7, supportSpacingA: 3.75, fallHeight: 5, clearanceBelow: 6 } },
    { label: "複合ネット5cm網目 短辺3m・支持間隔5m", values: { netType: "composite", meshType: "m5", shortSideL: 3, supportSpacingA: 5, fallHeight: 2.6, clearanceBelow: 4 } },
  ],
  keywords: [
    "安全ネット",
    "ネット",
    "防網",
    "落下防止ネット",
    "墜落防止ネット",
    "落下高さ",
    "許容落下高さ",
    "下部の空き",
    "下方のあき",
    "ネットの垂れ",
    "たれ",
    "網目",
    "縁綱",
    "つり綱",
    "支持点",
    "墜落防止",
    "墜落",
    "539条",
  ],
  relatedArticles: [{ lawShort: "安衛則", articleNum: "第539条" }],
  compute: computeSafetyNetCheck,
};
