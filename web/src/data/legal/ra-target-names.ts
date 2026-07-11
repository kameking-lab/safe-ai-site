/**
 * RA対象物（表示・通知対象物質）の名称ベース該否判定層（P1-9・2026-07-11）
 *
 * 正本: ra-target-names-snapshot.json（scripts/etl/build-ra-target-names-snapshot.py が
 * e-Gov現行の 安衛令別表第9（群指定33号）＋ 安衛則別表第2（個別名称2,276）から機械生成）。
 *
 * 用途: CASレス告示名（溶接ヒューム等）・群指定名について「リスクアセスメント対象物
 * （安衛法57条・57条の2の表示・通知対象物）か」を名称突合で3値に確定する。
 * #874 では CASレス物質の RA 該否の断定を避けていた＝この層で根拠付き断定に置換。
 *
 * 判定規則（偽陽性ゼロを最優先・空白で欺かない）:
 *  - 正規化完全一致（別表第2 個別名称 or 別表第9 群名称）→ designated（項/号の根拠つき）
 *  - 不一致でも названиеが群的表現（「〜化合物」「〜及びその」「〜塩類」）→ unverified
 *    （別表第9 の群と粒度が異なるだけの可能性が残るため断定しない）
 *  - 不一致かつ単体名称 → not-designated（両別表は名称列挙として網羅的）
 *
 * サーバー専用（legal-profile API から使用）。クライアントへは同梱しない。
 */
import snapshot from "./ra-target-names-snapshot.json";
import { normalizeNameKey } from "@/lib/chemical/legal-entity-resolver";

type SnapshotShape = {
  meta: {
    retrievedAt: string;
    reiBeppyo9: { lawId: string; revisionId: string; sha256: string; count: number };
    kisokuBeppyo2: { lawId: string; revisionId: string; sha256: string; count: number };
  };
  reiBeppyo9: { go: string; name: string }[];
  kisokuBeppyo2: { item: string; name: string; note?: string }[];
};

const SNAP = snapshot as SnapshotShape;
export const RA_TARGET_NAMES_META = SNAP.meta;

export type RaTargetNameCheck = {
  status: "designated" | "not-designated" | "unverified";
  /** designated のとき: 該当行の根拠（法令・項/号） */
  basis?: { lawId: string; provision: string };
  /** 該当行の正式名称（表記ゆれの確認用） */
  matchedName?: string;
  scopeNote?: string;
};

let _b2: Map<string, { item: string; name: string; note?: string }> | null = null;
let _b9: Map<string, { go: string; name: string }> | null = null;

function b2(): Map<string, { item: string; name: string; note?: string }> {
  if (!_b2) {
    _b2 = new Map();
    for (const e of SNAP.kisokuBeppyo2) {
      const k = normalizeNameKey(e.name);
      if (k && !_b2.has(k)) _b2.set(k, e);
    }
  }
  return _b2;
}

function b9(): Map<string, { go: string; name: string }> {
  if (!_b9) {
    _b9 = new Map();
    for (const e of SNAP.reiBeppyo9) {
      const k = normalizeNameKey(e.name);
      if (k && !_b9.has(k)) _b9.set(k, e);
    }
  }
  return _b9;
}

/** 名称が群的表現（粒度不一致で偽陰性になり得る）か */
function isGroupLikeName(label: string): boolean {
  return /化合物|及びその|塩類|混合物/.test(label);
}

/**
 * 名称（告示名・群指定名・物質名）で RA対象物の該否を判定する。
 * 呼び出し側は法令エンティティとして解決済みの label を渡すこと。
 */
export function checkRaTargetByName(label: string): RaTargetNameCheck {
  // CAS番号など名称でないラベルは名称突合の対象外（非該当に倒さない）
  if (/^[\d-]+$/.test(label.trim())) return { status: "unverified" };
  const k = normalizeNameKey(label);
  if (!k) return { status: "unverified" };

  const hit2 = b2().get(k);
  if (hit2) {
    return {
      status: "designated",
      basis: {
        lawId: SNAP.meta.kisokuBeppyo2.lawId,
        provision: `安衛則別表第2 第${hit2.item}項`,
      },
      matchedName: hit2.name,
      ...(hit2.note ? { scopeNote: hit2.note } : {}),
    };
  }
  const hit9 = b9().get(k);
  if (hit9) {
    return {
      status: "designated",
      basis: {
        lawId: SNAP.meta.reiBeppyo9.lawId,
        provision: `安衛令別表第9 第${hit9.go}号`,
      },
      matchedName: hit9.name,
    };
  }
  if (isGroupLikeName(label)) {
    // 例:「マンガン及びその化合物」⊃ 別表第9第30号「マンガン及びその無機化合物」＝
    // 名称の粒度が異なるだけの可能性があるため断定しない
    return {
      status: "unverified",
      scopeNote: "群指定名は別表第9の群名称と粒度が異なる可能性があるため名称一致では断定しない",
    };
  }
  return {
    status: "not-designated",
    scopeNote:
      "安衛令別表第9（群指定）・安衛則別表第2（個別名称2,276）のいずれにも名称非収載。構成成分（例: 溶接ヒュームのマンガン）が個別に該当する場合がある",
  };
}
