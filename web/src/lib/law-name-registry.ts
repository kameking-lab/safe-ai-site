import { LAW_METADATA } from "@/data/laws";

/**
 * lawShort ごとの追加コロキアル別名（LAW_METADATA の fullName と字面が異なる
 * 通称・別表記のみ）。ここに無い法令は fullName 一致だけで十分照合できる。
 * data/laws/law-metadata.ts（data班所有・単一ソース）を正本とし、ここでは
 * 通称の補完のみを保持する（chatbot-enrichment.ts / rag/synonyms.ts が重複定義していた分）。
 */
const EXTRA_ALIASES: Record<string, string[]> = {
  安衛令: ["労安衛令"],
  クレーン則: ["クレーン安全規則"],
  ボイラー則: ["ボイラー圧力容器則"],
  有機則: ["有機溶剤予防規則"],
  特化則: ["特定化学物質予防規則"],
  電離則: ["電離放射線規則"],
  石綿則: ["アスベスト則"],
  じん肺法: ["じん肺法施行規則"],
  労災保険法: ["労災法"],
  育介法: ["育児休業法", "育児・介護休業法"],
  均等法: ["男女雇用機会均等法"],
  労施法: ["労施総合法", "労働施策総合推進法"],
  パート有期法: ["パート・有期法", "パートタイム・有期雇用労働法"],
  派遣法: ["労働者派遣法"],
  VDTガイドライン: ["情報機器作業ガイドライン", "VDT指針"],
  メンタル指針: ["メンタルヘルス指針", "心の健康指針"],
  過重労働通達: ["過重労働対策通達"],
  熱中症通達: ["熱中症予防通達"],
  騒音指針: ["騒音障害防止指針"],
  振動指針: ["振動障害予防指針"],
  THP指針: ["健康保持増進指針"],
  化学物質RA指針: ["RA指針", "化学物質リスクアセスメント指針"],
};

/**
 * lawShort ⇄ 正式名・通称の同義語群（双方向）。
 * LAW_METADATA を単一ソースに自動生成し、EXTRA_ALIASES で通称のみ補う。
 */
export const LAW_ALIAS_GROUPS: string[][] = Object.entries(LAW_METADATA).map(
  ([lawShort, meta]) => [lawShort, meta.fullName, ...(EXTRA_ALIASES[lawShort] ?? [])]
);

/** 全 lawShort の集合（chatbot の範囲外引用判定などで利用）。 */
export const LAW_SHORT_SET: Set<string> = new Set(Object.keys(LAW_METADATA));

/** 全正式名の集合。 */
export const LAW_FULL_NAME_SET: Set<string> = new Set(
  Object.values(LAW_METADATA).map((m) => m.fullName)
);

/**
 * 2つの法令名表記（略称・正式名・通称）が同一法令を指すかどうかを判定する。
 * 例: `労災法` と `労災保険法` は同じ法律、`クレーン則` と `クレーン等安全規則` も同じ。
 */
export function isLawNameEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  for (const group of LAW_ALIAS_GROUPS) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}
