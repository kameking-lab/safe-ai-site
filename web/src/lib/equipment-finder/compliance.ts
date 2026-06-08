/**
 * 保護具の「適合区分」を spec / regulations から導出する純関数。
 *
 * 安全担当が選定根拠として最重視するのは「この保護具が法令・規格に適合しているか」。
 * DB の spec（例: "国家検定 DS2", "労検 飛来・落下物用", "JIS T 8165:2018"）と
 * regulations（根拠法令・告示）から、検定/承認/規格適合のバッジを1つ導出する。
 *
 * 捏造はしない: DB に存在するマーカー文字列のみを根拠に判定し、
 * 何も該当しなければ null（バッジ非表示）を返す。
 */
export type ComplianceTone = "amber" | "blue";

export type ComplianceBadge = {
  /** バッジ表示ラベル */
  label: string;
  /** 表示色のトーン（国家検定・型式承認=amberで強調 / JIS=blue） */
  tone: ComplianceTone;
};

/**
 * spec と regulations を1本の検索文字列にまとめる。
 */
function haystack(spec: string | undefined, regulations: string[] | undefined): string {
  return [spec ?? "", ...(regulations ?? [])].join(" ");
}

/**
 * 適合区分バッジを1つだけ導出する。
 * 優先度: 国家検定 > 労検(保護帽等の検定) > 型式承認(桜マーク等) > JIS規格適合。
 * いずれも該当しなければ null。
 */
export function deriveComplianceBadge(
  spec: string | undefined,
  regulations: string[] | undefined
): ComplianceBadge | null {
  const hay = haystack(spec, regulations);
  if (/国家検定|検定合格/.test(hay)) {
    return { label: "国家検定品", tone: "amber" };
  }
  if (/労検/.test(hay)) {
    return { label: "労検合格品", tone: "amber" };
  }
  if (/桜マーク|型式承認/.test(hay)) {
    return { label: "型式承認品", tone: "amber" };
  }
  if (/JIS/.test(hay)) {
    return { label: "JIS規格適合", tone: "blue" };
  }
  return null;
}

/**
 * 根拠法令・規格チップ用に regulations を整形（trim + 空除去 + 重複除去）。
 * 多すぎる場合に備えて上限を設けられるようにする。
 */
export function formatRegulations(
  regulations: string[] | undefined,
  limit = 4
): string[] {
  if (!regulations) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of regulations) {
    const r = raw.trim();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
