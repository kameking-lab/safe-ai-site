/**
 * KY全面再設計: 署名の整合（監査 P1-6 のバグ修正）。
 *
 * 旧実装は参加者を削除すると signatures[i] を delete するだけで、i より後ろの
 * 参加者の署名キーが付け替わらず、別人の署名が表示されるズレが起きていた。
 * 参加者配列の添字に追従して署名マップを詰め直す純粋関数を提供する。
 */
export type SignatureMap = Record<number, string>;

/** removedIndex を削除し、それ以降のキーを1つ前へ詰める */
export function reindexSignaturesOnRemove(
  sigs: SignatureMap,
  removedIndex: number
): SignatureMap {
  const next: SignatureMap = {};
  for (const [k, v] of Object.entries(sigs)) {
    const idx = Number(k);
    if (!Number.isInteger(idx)) continue;
    if (idx === removedIndex) continue; // 削除対象は捨てる
    const target = idx > removedIndex ? idx - 1 : idx;
    next[target] = v;
  }
  return next;
}

/** 署名済み（手書き画像 or テキスト署名）の件数を数える */
export function countSignatures(sigs: SignatureMap): number {
  return Object.values(sigs).filter((v) => typeof v === "string" && v.length > 5).length;
}
