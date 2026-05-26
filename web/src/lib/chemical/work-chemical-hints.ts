/**
 * 作業内容テキストから「化学物質を扱う作業か」を推定し、化学物質RAへの導線を出すための
 * 純粋ヘルパー（Phase B / 化学物質RA監査 P0-1 統合動線）。
 *
 * 目的: KY・打合せ書の作業内容に化学物質を扱う作業（塗装・溶接・洗浄等）が含まれるとき、
 * 「この作業で扱う化学物質の規制・ばく露注意を見る」リンク（/chemical-ra?name=...）を提示する。
 * 社長コンセプト「現場のめんどくさいを解決」「KY/打合せ書と一体運用」に直結。
 *
 * 重要（創作禁止の遵守）:
 *  - ここで持つのは「この作業では一般にこの種の化学物質を扱うことが多い」という**作業と物質の一般的関連**のみ。
 *    法規制の該当判定は一切行わない（規制内容は /chemical-database 側の出典付きデータが担う）。
 *  - 返す suggestedQuery は検索プリフィル用の物質・区分名であり、断定的な規制主張ではない。
 *  - 該当が曖昧なときは matched=false（誤誘導しない）。
 */

export interface ChemicalWorkHint {
  /** 化学物質を扱う作業の可能性が高いか。 */
  matched: boolean;
  /** マッチした作業キーワード（重複排除）。 */
  keywords: string[];
  /** RA画面プリフィル用の代表物質・区分名（先頭マッチ由来）。未マッチ時 null。 */
  suggestedQuery: string | null;
}

/**
 * 作業キーワード → 代表的な化学物質/区分名（検索プリフィル用）。
 * 「一般にその作業で扱うことが多い物質の種類」を示す関連であり、規制該当の主張ではない。
 */
const WORK_PATTERNS: { keywords: string[]; substance: string }[] = [
  { keywords: ["塗装", "ペンキ", "塗料", "吹付塗装", "ローラー塗"], substance: "有機溶剤" },
  { keywords: ["シンナー", "ラッカー"], substance: "トルエン" },
  { keywords: ["溶接", "溶断", "ガウジング", "アーク溶接", "半自動溶接"], substance: "溶接ヒューム" },
  { keywords: ["洗浄", "脱脂", "クリーニング", "拭き取り洗浄"], substance: "有機溶剤" },
  { keywords: ["接着", "接着剤", "ボンド", "のり付け"], substance: "有機溶剤" },
  { keywords: ["防水", "ウレタン", "ウレタン防水"], substance: "イソシアネート" },
  { keywords: ["エポキシ", "エポキシ樹脂"], substance: "エポキシ樹脂" },
  { keywords: ["FRP", "樹脂成形", "ポリエステル樹脂", "積層"], substance: "スチレン" },
  { keywords: ["はんだ", "半田", "ハンダ"], substance: "鉛" },
  { keywords: ["めっき", "メッキ", "電気めっき"], substance: "めっき" },
  { keywords: ["はつり", "研磨", "切断", "ケレン", "ブラスト", "サンダー"], substance: "粉じん（じん肺）" },
  { keywords: ["コンクリート研削", "石材加工", "穿孔"], substance: "結晶質シリカ" },
  { keywords: ["石綿", "アスベスト", "吹付け石綿"], substance: "石綿" },
  { keywords: ["酸洗", "酸処理"], substance: "酸（腐食性）" },
  { keywords: ["くん蒸", "燻蒸", "防腐", "防蟻"], substance: "有機溶剤" },
  { keywords: ["ガソリン", "灯油", "軽油", "燃料給油"], substance: "ガソリン" },
];

/**
 * 作業内容テキストから化学物質作業ヒントを推定する純粋関数。
 * @param text KYや打合せ書の作業内容（複数行可）。
 */
export function detectChemicalWork(text: string | null | undefined): ChemicalWorkHint {
  const t = typeof text === "string" ? text : "";
  if (!t.trim()) return { matched: false, keywords: [], suggestedQuery: null };

  const hitKeywords: string[] = [];
  let firstSubstance: string | null = null;
  for (const pat of WORK_PATTERNS) {
    for (const kw of pat.keywords) {
      if (t.includes(kw)) {
        hitKeywords.push(kw);
        if (firstSubstance === null) firstSubstance = pat.substance;
      }
    }
  }
  const keywords = Array.from(new Set(hitKeywords));
  return {
    matched: keywords.length > 0,
    keywords,
    suggestedQuery: firstSubstance,
  };
}

/** /chemical-ra へのプリフィルURL（suggestedQuery があれば name= を付与）。 */
export function chemicalRaHref(hint: ChemicalWorkHint): string {
  if (hint.suggestedQuery) {
    return `/chemical-ra?name=${encodeURIComponent(hint.suggestedQuery)}`;
  }
  return "/chemical-ra";
}
