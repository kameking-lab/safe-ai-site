/**
 * KY参加者の一括選択ヘルパー（純粋関数）。
 *
 * 職長は毎朝「いつもの班」を選ぶ。1人ずつチェックすると常用6名で6タップ＝手袋では苦痛。
 * ここでは「常用をまとめて」「協力会社ごとに全員」をワンタップで実現するための、
 * 参加者配列に対する純粋な加減算を提供する（UI/localStorageから独立＝テスト可能）。
 */
import type { KyInstructionParticipant } from "@/lib/types/operations";
import {
  WORKER_AFFILIATION_LABELS,
  type Worker,
  type WorkerAffiliation,
} from "@/lib/ky/workers-master";

const EMPTY: KyInstructionParticipant = { name: "", qualNo: "", preWork: "", onExit: "" };

/**
 * 既存の参加者配列へ作業員群を追加した新配列を返す。
 * - 既に選択済みの氏名は重複追加しない
 * - 空き行があればそこを埋め、無ければ末尾に追加（既存 toggleWorker と同じ作法）
 * - 追加すべき新規が無ければ元の参照をそのまま返す
 */
export function addParticipants(
  participants: KyInstructionParticipant[],
  workers: Worker[],
): KyInstructionParticipant[] {
  const existing = new Set(participants.filter((p) => p.name.trim()).map((p) => p.name));
  const fresh = workers.filter((w) => w.name.trim() && !existing.has(w.name));
  if (fresh.length === 0) return participants;
  const next = [...participants];
  for (const w of fresh) {
    const entry: KyInstructionParticipant = { name: w.name, qualNo: w.qualNo, preWork: "", onExit: "" };
    const emptyIdx = next.findIndex((p) => !p.name.trim());
    if (emptyIdx >= 0) next[emptyIdx] = entry;
    else next.push(entry);
  }
  return next;
}

/**
 * 指定した氏名群を参加者からクリア（空行化）した新配列を返す。
 * マスター由来の選択だけを消し、手入力の氏名は names に含めなければ温存される。
 * 変化が無ければ元の参照をそのまま返す。
 */
export function clearParticipants(
  participants: KyInstructionParticipant[],
  names: Iterable<string>,
): KyInstructionParticipant[] {
  const set = new Set(names);
  let changed = false;
  const next = participants.map((p) => {
    if (p.name.trim() && set.has(p.name)) {
      changed = true;
      return { ...EMPTY };
    }
    return p;
  });
  return changed ? next : participants;
}

export type WorkerGroup = {
  affiliation: WorkerAffiliation;
  label: string;
  members: Worker[];
};

/** 所属区分ごとにグルーピング（自社→協力1→2→3順、メンバー0のグループは除外）。 */
export function groupWorkersByAffiliation(workers: Worker[]): WorkerGroup[] {
  const order: WorkerAffiliation[] = ["self", "coop1", "coop2", "coop3"];
  return order
    .map((affiliation) => ({
      affiliation,
      label: WORKER_AFFILIATION_LABELS[affiliation],
      members: workers.filter((w) => w.affiliation === affiliation),
    }))
    .filter((g) => g.members.length > 0);
}
