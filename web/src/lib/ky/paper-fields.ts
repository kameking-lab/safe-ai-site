/**
 * F1（KY用紙 直接操作UI・方式確立）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * contentEditable を使わず「印刷シートのセル＝タップ標的、入力は専用エディタ」で
 * WYSIWYG を成立させる核心のデータ。Phase 1 はヘッダー6欄のみ。
 * Phase 2 で危険行（インデックス付きキー "risk.0.hazard"）・参加者等へ拡張する。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";

/** Phase 1 対象のヘッダー6欄 */
export const KY_HEADER_FIELD_ORDER = [
  "siteName",
  "projectName",
  "workDate",
  "weatherTemp",
  "foremanName",
  "coop1Name",
] as const;

export type KyPaperFieldKey = (typeof KY_HEADER_FIELD_ORDER)[number];

export type KyPaperFieldDef = {
  key: KyPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type: "text" | "date3" | "weatherTemp";
  /** InputWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 未記入判定（未記入セルのハイライトに使用） */
  isEmpty: (r: KyInstructionRecordState) => boolean;
  /** 記入順の次フィールド（エディタの「次の欄へ」送り） */
  next?: KyPaperFieldKey;
};

export const KY_HEADER_FIELDS: Record<KyPaperFieldKey, KyPaperFieldDef> = {
  siteName: {
    key: "siteName",
    label: "現場名",
    type: "text",
    voice: true,
    placeholder: "例: ○○ビル新築工事",
    isEmpty: (r) => r.siteName.trim() === "",
    next: "projectName",
  },
  projectName: {
    key: "projectName",
    label: "工事名・工区",
    type: "text",
    voice: true,
    placeholder: "例: 3工区 躯体",
    isEmpty: (r) => r.projectName.trim() === "",
    next: "workDate",
  },
  workDate: {
    key: "workDate",
    label: "作業日",
    type: "date3",
    isEmpty: (r) => !(r.workDateYear && r.workDateMonth && r.workDateDay),
    next: "weatherTemp",
  },
  weatherTemp: {
    key: "weatherTemp",
    label: "天気・気温",
    type: "weatherTemp",
    isEmpty: (r) => r.weather.trim() === "" && r.temperature.trim() === "",
    next: "foremanName",
  },
  foremanName: {
    key: "foremanName",
    label: "職長（リーダー）",
    type: "text",
    voice: true,
    placeholder: "氏名",
    isEmpty: (r) => r.foremanName.trim() === "",
    next: "coop1Name",
  },
  coop1Name: {
    key: "coop1Name",
    label: "元請会社",
    type: "text",
    voice: true,
    placeholder: "会社名",
    isEmpty: (r) => r.coop1Name.trim() === "",
  },
};

export function isKyPaperFieldKey(key: string): key is KyPaperFieldKey {
  return (KY_HEADER_FIELD_ORDER as readonly string[]).includes(key);
}

/** 未記入のヘッダー欄キー集合（EditableCell のハイライトに渡す） */
export function emptyKyHeaderFieldKeys(record: KyInstructionRecordState): Set<string> {
  const out = new Set<string>();
  for (const key of KY_HEADER_FIELD_ORDER) {
    if (KY_HEADER_FIELDS[key].isEmpty(record)) out.add(key);
  }
  return out;
}
