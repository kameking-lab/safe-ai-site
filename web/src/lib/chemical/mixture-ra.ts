/**
 * 混合物RA 合成リスク集約（Phase B P2-4・純粋関数）。
 *
 * 複数成分の「実在データ（各成分の規制法ファミリー・有害性フラグ）」を集約するのみで、
 * ばく露濃度の数値計算（ATE等）は行わない（信頼できる数値データが無いため＝創作回避）。
 * GHS Additivity は「各成分の危険性区分の和集合」と「最重大の有害性の特定」という
 * 定性的集約で表現し、最終分類は公式SDS・専門家によると明示する（UI側）。
 */

export interface MixtureComponentInput {
  name: string;
  cas: string;
  /** 質量%（or 体積%。UI側で単位を保持）。未入力は null。 */
  weightPercent: number | null;
  /** この成分に該当する規制法ファミリー名（呼び出し側が実データから解決） */
  lawFamilies: string[];
  /** この成分の主要有害性ラベル（呼び出し側が実データ flags から解決） */
  hazards: string[];
}

export interface MixtureAggregate {
  componentCount: number;
  /** 合計% （入力されたもののみ合算） */
  totalPercent: number;
  /** 全成分の規制法ファミリー和集合 */
  lawFamilies: string[];
  /** 全成分の有害性和集合 */
  hazards: string[];
  /** いずれかの成分が発がん性を持つか（混合物で最重要の注意） */
  hasCarcinogen: boolean;
  /** 警告（合計%が100でない等） */
  warnings: string[];
}

function uniqInOrder(values: Iterable<string>): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** 成分配列を集約する。数値ばく露計算はせず、実データの和集合と合計%・警告のみ。 */
export function aggregateMixture(components: readonly MixtureComponentInput[]): MixtureAggregate {
  const lawFamilies = uniqInOrder(components.flatMap((c) => c.lawFamilies));
  const hazards = uniqInOrder(components.flatMap((c) => c.hazards));
  const totalPercent = components.reduce(
    (sum, c) => sum + (typeof c.weightPercent === "number" && isFinite(c.weightPercent) ? c.weightPercent : 0),
    0
  );
  const hasCarcinogen = hazards.some((h) => h.includes("発がん"));

  const warnings: string[] = [];
  if (components.length < 2) {
    warnings.push("混合物RAは2成分以上で評価してください。");
  }
  const entered = components.filter((c) => typeof c.weightPercent === "number");
  if (entered.length > 0) {
    const rounded = Math.round(totalPercent * 10) / 10;
    if (rounded > 100.0) warnings.push(`成分の合計が ${rounded}% で100%を超えています。`);
    else if (rounded < 99.9 && entered.length === components.length)
      warnings.push(`成分の合計が ${rounded}% です（残りは未記載成分の可能性）。`);
  }

  return {
    componentCount: components.length,
    totalPercent: Math.round(totalPercent * 100) / 100,
    lawFamilies,
    hazards,
    hasCarcinogen,
    warnings,
  };
}

/** MergedChemical.flags から有害性ラベルを導出（実データのみ）。 */
export function hazardsFromFlags(flags: {
  carcinogenic?: boolean;
  skin?: boolean;
  concentration?: boolean;
  label_sds?: boolean;
}): string[] {
  const out: string[] = [];
  if (flags.carcinogenic) out.push("発がんのおそれ");
  if (flags.skin) out.push("皮膚等障害のおそれ");
  if (flags.concentration) out.push("濃度基準値あり");
  if (flags.label_sds) out.push("ラベル表示・SDS交付対象");
  return out;
}
