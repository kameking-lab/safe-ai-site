/**
 * F1（KY用紙 直接操作UI・方式確立）→ O10（Phase 2）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * contentEditable を使わず「印刷シートのセル＝タップ標的、入力は専用エディタ」で
 * WYSIWYG を成立させる核心のデータ。Phase 1 はヘッダー6欄のみだった。
 * Phase 2 第一弾で本日の作業内容・4R目標（チーム行動目標/重点実施項目/指差呼称）を追加。
 * 危険行（インデックス付きキー "risk.0.hazard"）・参加者は次の段で拡張する。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";

/** Phase 2 時点の全欄（紙の記入順＝上から下） */
export const KY_PAPER_FIELD_ORDER = [
  "siteName",
  "projectName",
  "workDate",
  "weatherTemp",
  "foremanName",
  "coop1Name",
  "workDetail",
  "teamGoal",
  "priorityItems",
  "pointingCall",
] as const;

export type KyPaperFieldKey = (typeof KY_PAPER_FIELD_ORDER)[number];

export type KyPaperFieldDef = {
  key: KyPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type: "text" | "textarea" | "date3" | "weatherTemp";
  /** InputWithVoice/TextareaWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 現在値の取得（type="text"|"textarea" のみ使用。date3/weatherTemp は専用UIで直接 record を読む） */
  get?: (r: KyInstructionRecordState) => string;
  /** イミュータブル更新（type="text"|"textarea" のみ使用） */
  set?: (r: KyInstructionRecordState, v: string) => Partial<KyInstructionRecordState>;
  /** 未記入判定（未記入セルのハイライトに使用） */
  isEmpty: (r: KyInstructionRecordState) => boolean;
  /** 記入順の次フィールド（エディタの「次の欄へ」送り） */
  next?: KyPaperFieldKey;
};

export const KY_PAPER_FIELDS: Record<KyPaperFieldKey, KyPaperFieldDef> = {
  siteName: {
    key: "siteName",
    label: "現場名",
    type: "text",
    voice: true,
    placeholder: "例: ○○ビル新築工事",
    get: (r) => r.siteName,
    set: (r, v) => ({ siteName: v }),
    isEmpty: (r) => r.siteName.trim() === "",
    next: "projectName",
  },
  projectName: {
    key: "projectName",
    label: "工事名・工区",
    type: "text",
    voice: true,
    placeholder: "例: 3工区 躯体",
    get: (r) => r.projectName,
    set: (r, v) => ({ projectName: v }),
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
    get: (r) => r.foremanName,
    set: (r, v) => ({ foremanName: v }),
    isEmpty: (r) => r.foremanName.trim() === "",
    next: "coop1Name",
  },
  coop1Name: {
    key: "coop1Name",
    label: "元請会社",
    type: "text",
    voice: true,
    placeholder: "会社名",
    get: (r) => r.coop1Name,
    set: (r, v) => ({ coop1Name: v }),
    isEmpty: (r) => r.coop1Name.trim() === "",
    next: "workDetail",
  },
  workDetail: {
    key: "workDetail",
    label: "本日の作業内容",
    type: "textarea",
    voice: true,
    placeholder: "例: 3F鉄骨建方、ボルト本締め",
    get: (r) => r.workRows[0]?.workDetail ?? "",
    set: (r, v) => ({ workRows: r.workRows.map((row, i) => (i === 0 ? { ...row, workDetail: v } : row)) }),
    isEmpty: (r) => (r.workRows[0]?.workDetail ?? "").trim() === "",
    next: "teamGoal",
  },
  teamGoal: {
    key: "teamGoal",
    label: "チーム行動目標",
    type: "textarea",
    voice: true,
    placeholder: "例: 高所では必ず親綱に掛けてから移動しよう",
    get: (r) => r.teamGoal,
    set: (r, v) => ({ teamGoal: v }),
    isEmpty: (r) => r.teamGoal.trim() === "",
    next: "priorityItems",
  },
  priorityItems: {
    key: "priorityItems",
    label: "重点実施項目",
    type: "textarea",
    voice: true,
    placeholder: "今日必ずやること",
    get: (r) => r.priorityItems,
    set: (r, v) => ({ priorityItems: v }),
    isEmpty: (r) => r.priorityItems.trim() === "",
    next: "pointingCall",
  },
  pointingCall: {
    key: "pointingCall",
    label: "指差呼称（ヨシ！）",
    type: "text",
    voice: true,
    placeholder: "例: 親綱 ヨシ！ 足元 ヨシ！",
    get: (r) => r.pointingCall,
    set: (r, v) => ({ pointingCall: v }),
    isEmpty: (r) => r.pointingCall.trim() === "",
  },
};

export function isKyPaperFieldKey(key: string): key is KyPaperFieldKey {
  return (KY_PAPER_FIELD_ORDER as readonly string[]).includes(key);
}

/** 未記入の欄キー集合（EditableCell のハイライトに渡す） */
export function emptyKyPaperFieldKeys(record: KyInstructionRecordState): Set<string> {
  const out = new Set<string>();
  for (const key of KY_PAPER_FIELD_ORDER) {
    if (KY_PAPER_FIELDS[key].isEmpty(record)) out.add(key);
  }
  return out;
}
