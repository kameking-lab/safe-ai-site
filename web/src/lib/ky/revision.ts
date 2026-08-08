import type { KyInstructionRecordState } from "@/lib/types/operations";

/**
 * KY本文の変更検知用revision。電子署名・認証・改ざん防止hashではない。
 * 承認状態そのものは除外し、入力・確認・候補根拠を含む本文変更だけを検出する。
 */
export function kyContentRevision(
  record: KyInstructionRecordState,
): string {
  const { approval: _approval, ...content } = record;
  const text = JSON.stringify(content);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ky-v1-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length.toString(36)}`;
}
