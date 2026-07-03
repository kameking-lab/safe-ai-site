/**
 * S1（打合せ用紙 直接操作UI・第一弾）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * KYのcanvas方式（F1で確立・O10で実証）をそのまま踏襲: contentEditable を使わず
 * 「印刷シートのセル＝タップ標的、入力は専用エディタ」でWYSIWYGを成立させる核心のデータ。
 * 第一弾はヘッダー7欄（打合せ日・作業日・天気気温・作業所名・作業所長・主任等・作成担当者）のみ。
 * 各社マトリクス（動的行）・明日のイベント・搬入出・点検項目は後続弾で拡張する。
 */
import type { MeetingRecord } from "@/lib/meeting/schema";

/** 第一弾時点の欄（紙の記入順＝タイトル行→ヘッダー表 左上から）。 */
export const MEETING_PAPER_FIELD_ORDER = [
  "meetingDate",
  "workDate",
  "weatherTemp",
  "siteName",
  "siteManager",
  "supervisor",
  "author",
] as const;

export type MeetingPaperFieldKey = (typeof MEETING_PAPER_FIELD_ORDER)[number];

export type MeetingPaperFieldDef = {
  key: MeetingPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type: "text" | "date" | "date3" | "weatherTemp";
  /** InputWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 現在値の取得（type="text"|"date" のみ使用。date3/weatherTemp は専用UIで直接 record を読む） */
  get?: (r: MeetingRecord) => string;
  /** イミュータブル更新（type="text"|"date" のみ使用） */
  set?: (r: MeetingRecord, v: string) => Partial<MeetingRecord>;
  /** 未記入判定（未記入セルのハイライトに使用） */
  isEmpty: (r: MeetingRecord) => boolean;
  /** 記入順の次フィールド（エディタの「次の欄へ」送り） */
  next?: MeetingPaperFieldKey;
};

export const MEETING_PAPER_FIELDS: Record<MeetingPaperFieldKey, MeetingPaperFieldDef> = {
  meetingDate: {
    key: "meetingDate",
    label: "打合せ日（前日）",
    type: "date",
    get: (r) => r.meetingDate,
    set: (r, v) => ({ meetingDate: v }),
    isEmpty: (r) => r.meetingDate.trim() === "",
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
    next: "siteName",
  },
  siteName: {
    key: "siteName",
    label: "作業所名",
    type: "text",
    voice: true,
    placeholder: "例: ○○ビル新築工事",
    get: (r) => r.siteName,
    set: (r, v) => ({ siteName: v }),
    isEmpty: (r) => r.siteName.trim() === "",
    next: "siteManager",
  },
  siteManager: {
    key: "siteManager",
    label: "作業所長",
    type: "text",
    voice: true,
    placeholder: "氏名",
    get: (r) => r.siteManager,
    set: (r, v) => ({ siteManager: v }),
    isEmpty: (r) => r.siteManager.trim() === "",
    next: "supervisor",
  },
  supervisor: {
    key: "supervisor",
    label: "主任等",
    type: "text",
    voice: true,
    placeholder: "氏名",
    get: (r) => r.supervisor,
    set: (r, v) => ({ supervisor: v }),
    isEmpty: (r) => r.supervisor.trim() === "",
    next: "author",
  },
  author: {
    key: "author",
    label: "作成担当者",
    type: "text",
    voice: true,
    placeholder: "氏名",
    get: (r) => r.author,
    set: (r, v) => ({ author: v }),
    isEmpty: (r) => r.author.trim() === "",
  },
};

export function isMeetingPaperFieldKey(key: string): key is MeetingPaperFieldKey {
  return (MEETING_PAPER_FIELD_ORDER as readonly string[]).includes(key);
}

/** フィールド定義の解決（唯一の窓口。危険行のような動的欄が増えたら拡張する）。 */
export function getMeetingPaperFieldDef(key: MeetingPaperFieldKey): MeetingPaperFieldDef {
  return MEETING_PAPER_FIELDS[key];
}

/** 記入順の「次の欄」を返す（エディタの「次の欄へ」送り用）。 */
export function nextMeetingPaperFieldKey(key: MeetingPaperFieldKey): MeetingPaperFieldKey | undefined {
  return MEETING_PAPER_FIELDS[key].next;
}

/** 記入順（紙の上から下）で最初の未記入欄を返す（zoom-to-cell用）。 */
export function firstEmptyMeetingPaperFieldKey(record: MeetingRecord): MeetingPaperFieldKey | undefined {
  for (const key of MEETING_PAPER_FIELD_ORDER) {
    if (MEETING_PAPER_FIELDS[key].isEmpty(record)) return key;
  }
  return undefined;
}

/** 未記入の欄キー集合（EditableCell のハイライトに渡す）。 */
export function emptyMeetingPaperFieldKeys(record: MeetingRecord): Set<string> {
  const out = new Set<string>();
  for (const key of MEETING_PAPER_FIELD_ORDER) {
    if (MEETING_PAPER_FIELDS[key].isEmpty(record)) out.add(key);
  }
  return out;
}
