"use client";

/**
 * 作業開始前点検 記録のローカル保存。
 *
 * 車両系建設機械（安衛則第170条）、移動式クレーン（クレーン則第78条）、フォークリフト
 * （安衛則第151条の25）、高所作業車（安衛則第194条の27）等は、その日の作業を開始する
 * 前に点検を行うことが義務づけられている。本ツールは機種別の標準点検項目をひな形として
 * 提供し、点検結果・使用可否・異常時の措置を記録する。
 *
 * 点検項目は各規則の趣旨に基づく一般的なひな形であり、実機の取扱説明書・現場の状況に
 * 応じて事業者が定める。
 */

export type InspectionResult = "ok" | "ng" | "na";
export const INSPECTION_RESULT_JA: Record<InspectionResult, string> = { ok: "良", ng: "不良", na: "対象外" };

export type EquipKind =
  | "vehicle-construction"
  | "mobile-crane"
  | "forklift"
  | "aerial-platform"
  | "power-tool"
  | "other";

export const EQUIP_KIND_JA: Record<EquipKind, string> = {
  "vehicle-construction": "車両系建設機械",
  "mobile-crane": "移動式クレーン",
  forklift: "フォークリフト",
  "aerial-platform": "高所作業車",
  "power-tool": "電動工具",
  other: "その他",
};

/** 機種別の標準点検項目（関連規則の趣旨に基づく一般的なひな形）。 */
export const KIND_ITEMS: Record<EquipKind, string[]> = {
  "vehicle-construction": [
    "ブレーキ・クラッチの機能",
    "操作装置・走行装置の機能",
    "作業装置・油圧装置（漏れ・損傷）",
    "警報装置・前照灯・後方確認装置",
    "履帯・タイヤの状態",
    "燃料・油脂・冷却水の量と漏れ",
    "外観の損傷・取付けの緩み",
  ],
  "mobile-crane": [
    "巻過防止装置・過負荷警報等の安全装置",
    "ブレーキ・クラッチ・コントローラーの機能",
    "ワイヤロープ・チェーンの損傷・摩耗",
    "フック・外れ止め装置",
    "アウトリガー・据付けの状態",
    "油圧装置（漏れ・損傷）",
    "定格荷重表・作業半径の確認",
  ],
  forklift: [
    "制動装置・操縦装置の機能",
    "荷役装置・油圧装置（フォーク・マスト・チェーン）",
    "車輪・タイヤの状態",
    "前照灯・後照灯・方向指示器・警報装置",
    "バックレスト・ヘッドガードの状態",
    "燃料・バッテリー・油脂類",
    "外観の損傷・漏れ",
  ],
  "aerial-platform": [
    "制動装置・操作装置の機能",
    "作業床・手すり・中さんの状態",
    "作業装置・油圧装置（漏れ・損傷）",
    "非常停止・下降装置の機能",
    "アウトリガー・据付けの状態",
    "安全帯取付設備・表示",
    "外観の損傷・取付けの緩み",
  ],
  "power-tool": [
    "電源コード・プラグの損傷・被覆",
    "スイッチの動作・破損",
    "回転部・刃部・砥石の状態",
    "安全カバー・保護装置の有無",
    "漏電遮断器・アースの確認",
    "本体の損傷・異音・異臭",
  ],
  other: [
    "外観の損傷・取付けの状態",
    "安全装置・保護装置の機能",
    "可動部・作動の状態",
    "電源・燃料・油脂類",
    "異音・異臭・漏れ",
  ],
};

export type InspectionCheckItem = { key: string; label: string; result: InspectionResult };

export type InspectionRecord = {
  id: string;
  date: string;
  site: string;
  inspector: string;
  equipKind: EquipKind;
  equipName: string; // 機種・機番
  items: InspectionCheckItem[];
  usable: boolean; // 使用可否（不良があれば使用不可）
  abnormalAction: string; // 異常時の措置
  note: string;
  savedAt: string;
};

export type InspectionSummary = {
  id: string;
  date: string;
  site: string;
  equipKind: EquipKind;
  equipName: string;
  ngCount: number;
  usable: boolean;
  savedAt: string;
};

const LIST_KEY = "safe-ai:inspection-list:v1";
const BYID_KEY = "safe-ai:inspection-by-id:v1";
export const MAX_INSPECTION_LIST = 200;

// ---- 純関数（テスト対象） ----

export function itemsForKind(kind: EquipKind): InspectionCheckItem[] {
  return (KIND_ITEMS[kind] ?? KIND_ITEMS.other).map((label, i) => ({
    key: `${kind}-${i}`,
    label,
    result: "na" as InspectionResult,
  }));
}

export function summarizeInspection(rec: InspectionRecord): InspectionSummary {
  return {
    id: rec.id,
    date: rec.date,
    site: rec.site,
    equipKind: rec.equipKind,
    equipName: rec.equipName,
    ngCount: rec.items.filter((i) => i.result === "ng").length,
    usable: rec.usable,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["点検日", "現場", "点検者", "機種", "機種・機番", "点検項目", "結果"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function inspectionToCsv(rec: InspectionRecord): string {
  const rows = rec.items.map((it) =>
    [rec.date, rec.site, rec.inspector, EQUIP_KIND_JA[rec.equipKind], rec.equipName, it.label, INSPECTION_RESULT_JA[it.result]]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\r\n");
}

// ---- 永続化（window 依存） ----

function readRaw<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeRaw(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function newInspectionId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `inspect-${Date.now().toString(36)}-${rnd}`;
}

export function getInspectionList(): InspectionSummary[] {
  const list = readRaw<InspectionSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, InspectionRecord> {
  const byId = readRaw<Record<string, InspectionRecord>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getInspectionById(id: string): InspectionRecord | null {
  return getById()[id] ?? null;
}

export function saveInspection(rec: InspectionRecord): InspectionSummary[] {
  const summary = summarizeInspection(rec);
  const list = getInspectionList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_INSPECTION_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, InspectionRecord> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteInspection(id: string): InspectionSummary[] {
  const updated = getInspectionList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
