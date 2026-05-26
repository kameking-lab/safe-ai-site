/**
 * SDS（安全データシート）AI抽出の型とパーサ（Phase B P2-1・純粋関数）。
 *
 * /api/chemical/sds-extract が Gemini Vision で SDS PDF から抽出した JSON を検証・正規化する。
 * 抽出はAI生成のため「参考」。法的判断は公式SDS・専門家による（UIで免責明示）。
 */

export interface SdsExtraction {
  /** 製品名・物質名 */
  productName: string;
  /** CAS番号（取得できた代表値。不明は空） */
  cas: string;
  /** GHS分類（区分の要約・箇条） */
  ghs: string[];
  /** 物理化学的性質（引火点・沸点・外観等の要約） */
  physicalChemical: string;
  /** 取扱い・保管上の注意 */
  handling: string;
  /** 適用される可能性のある法令（AIが読み取った範囲・参考） */
  applicableLaws: string[];
  /** 推奨される対策・保護具 */
  measures: string;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStrArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => asStr(x)).filter((s) => s.length > 0);
  }
  // 文字列で改行/読点区切りの場合も許容
  if (typeof v === "string") {
    return v
      .split(/[\n、,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

/**
 * Gemini の生レスポンス（JSON文字列 or オブジェクト）を SdsExtraction に正規化する。
 * 解析不能・空のときは null。
 */
export function parseSdsExtraction(raw: unknown): SdsExtraction | null {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    // ```json ... ``` フェンスを除去して JSON 抽出
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) return null;

  const out: SdsExtraction = {
    productName: asStr(obj.productName ?? obj.name ?? obj.物質名 ?? obj.製品名),
    cas: asStr(obj.cas ?? obj.casNumber ?? obj.CAS),
    ghs: asStrArray(obj.ghs ?? obj.ghsClassification ?? obj.GHS分類),
    physicalChemical: asStr(obj.physicalChemical ?? obj.physical ?? obj.物理化学的性質),
    handling: asStr(obj.handling ?? obj.取扱い注意 ?? obj.precautions),
    applicableLaws: asStrArray(obj.applicableLaws ?? obj.laws ?? obj.適用法令),
    measures: asStr(obj.measures ?? obj.対策 ?? obj.protectiveEquipment),
  };

  // 物質名もCASも空なら抽出失敗扱い。
  if (!out.productName && !out.cas) return null;
  return out;
}
