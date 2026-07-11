/**
 * 法令エンティティの名称解決（CASレス告示名・群指定の第一級対応。一窓化 2026-07-11）
 *
 * 「溶接ヒューム」のようにCAS番号を持たない令別表収載名や、群指定名を
 * CAS番号と同格に解決する。サーバー専用（legal-profile API から使用）。
 * 解決の正しさは substance-legal-audit.test.ts（nameKeys整合）と
 * legal-profile ルートのテストが担保する。
 */
import { CAS_LAW_INDEX, CAS_LAW_INDEX_BY_CAS, type CasLawIndexEntry } from "@/data/legal/cas-law-index";
import { OTHER_LAWS_CAS_INDEX_BY_CAS } from "@/data/legal/other-laws-cas-index";
import { normalizeCas, normalizeText } from "./cas-text-helpers";

const CAS_PATTERN = /^\d{2,7}-\d{2,3}-\d{1,2}$/;

/** 名称の照合キー正規化（空白・中点・記号ゆれを吸収） */
export function normalizeNameKey(s: string): string {
  return normalizeText(s)
    .replace(/[・･]/g, "")
    .replace(/[（(].*?[)）]/g, "")
    .trim();
}

let _nameMap: Map<string, CasLawIndexEntry> | null = null;
function nameMap(): Map<string, CasLawIndexEntry> {
  if (_nameMap) return _nameMap;
  const m = new Map<string, CasLawIndexEntry>();
  for (const e of CAS_LAW_INDEX) {
    for (const key of [e.label, ...(e.nameKeys ?? [])]) {
      const k = normalizeNameKey(key);
      if (k && !m.has(k)) m.set(k, e);
    }
  }
  _nameMap = m;
  return m;
}

export type ResolvedLegalEntity = {
  /** プロファイル・タグ導出に使うキー（CAS または疑似CAS） */
  key: string;
  label: string;
  /** CASを持たない告示名・群指定名か */
  casless: boolean;
  matchedBy: "cas" | "name";
};

/**
 * 入力（CAS番号または名称）を法令エンティティに解決する。
 * - CAS形式 → cas-law-index / other-laws-index のキーとして照合
 * - 名称 → cas-law-index の label / nameKeys の正規化完全一致
 * 未解決は null（＝法令索引上の突合対象でない。DB検索・収載外判定は呼び出し側）
 */
export function resolveLegalEntity(query: string): ResolvedLegalEntity | null {
  const q = query.trim();
  if (!q) return null;
  const cas = normalizeCas(q);
  if (CAS_PATTERN.test(cas)) {
    const entry = CAS_LAW_INDEX_BY_CAS.get(cas) ?? OTHER_LAWS_CAS_INDEX_BY_CAS.get(cas);
    if (entry) return { key: cas, label: entry.label, casless: false, matchedBy: "cas" };
    // 索引未収載のCASもプロファイル未突合として有効なキー
    return { key: cas, label: cas, casless: false, matchedBy: "cas" };
  }
  const hit = nameMap().get(normalizeNameKey(q));
  if (hit) {
    return {
      key: hit.cas,
      label: hit.label,
      casless: !CAS_PATTERN.test(hit.cas),
      matchedBy: "name",
    };
  }
  return null;
}
