import type { JmaWarningsByIso, JmaMapLevel } from "@/lib/jma/jma-data";

export type DangerAlertInput = {
  jmaHeadline: string | null;
  warnings: { code: string; status: string }[];
};

const LEVEL_RANK: Record<JmaMapLevel, number> = {
  none: 0,
  advisory: 1,
  warning: 2,
  special: 3,
};

// 無人キオスク(/signage/display)の全画面赤アラート自動発動に使う入力を、
// 都道府県別警報データ(byIso)から組み立てる純関数。
//
// SignageDangerAlert は受け取った headline / warnings[].status をキーワード照合し、
// 「警報/特別警報/暴風…」に一致すると自動発動する。そのため注意報(advisory)を渡すと
// 「大雨注意報」等で誤発動してしまう。無人運用で誤った全画面警報を出さないよう、
// ここで warning(警報) 以上のレベルだけを抽出して渡す。
// headline は最も深刻なレベルの発表見出しを1件採用する。
export function deriveDangerAlertInput(byIso: JmaWarningsByIso | undefined): DangerAlertInput {
  if (!byIso) return { jmaHeadline: null, warnings: [] };

  const warnings: { code: string; status: string }[] = [];
  let bestHeadline: string | null = null;
  let bestRank = 0;

  for (const region of Object.values(byIso)) {
    for (const entry of region.entries) {
      // 個別の警報項目のうち、警報・特別警報レベルだけを採用（注意報は除外）
      for (const w of entry.warnings) {
        if (!w.status) continue;
        const rank = LEVEL_RANK[w.level ?? "none"] ?? 0;
        if (rank < LEVEL_RANK.warning) continue;
        warnings.push({ code: w.code ?? "", status: w.status });
      }
      // ヘッドラインは最も深刻なレベルの発表見出しを採用（警報レベル以上のみ）
      const entryRank = LEVEL_RANK[entry.level] ?? 0;
      if (entry.headline && entryRank >= LEVEL_RANK.warning && entryRank > bestRank) {
        bestRank = entryRank;
        bestHeadline = entry.headline;
      }
    }
  }

  return { jmaHeadline: bestHeadline, warnings: dedupeWarnings(warnings) };
}

function dedupeWarnings(
  items: { code: string; status: string }[],
): { code: string; status: string }[] {
  const seen = new Set<string>();
  const out: { code: string; status: string }[] = [];
  for (const it of items) {
    const key = `${it.code}|${it.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
