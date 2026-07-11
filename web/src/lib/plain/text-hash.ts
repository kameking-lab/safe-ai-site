/**
 * 現場ことば版（plain layer）の原文スナップショット・ハッシュ。
 *
 * 目的: 各 plain エントリが「どの原文テキストに対する言い換えか」を
 * sourceTextHash として固定し、コーパス側の条文が改正で更新されたら
 * ハッシュ不一致＝stale と機械判定する（改正追従の土台）。
 *
 * node:crypto に依存しない純TS実装（FNV-1a 32bit を2シードで連結した
 * 64bit 相当の16進16桁）。ビルド時SSG・vitest・スクリプトのどこでも
 * 同一値になる決定的ハッシュ。暗号用途ではなく変更検知用途。
 */

function fnv1a32(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // FNV prime 16777619 の乗算（32bit オーバーフロー安全化）
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** 原文テキスト → 16進16桁のスナップショット・ハッシュ。 */
export function plainSourceHash(text: string): string {
  const a = fnv1a32(text, 0x811c9dc5); // 標準 offset basis
  const b = fnv1a32(text, 0x01000193); // 第2シード（衝突耐性の補強）
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
