/**
 * S1（打合せ用紙 直接操作UI）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * KYのcanvas方式（F1で確立・O10で実証）をそのまま踏襲: contentEditable を使わず
 * 「印刷シートのセル＝タップ標的、入力は専用エディタ」でWYSIWYGを成立させる核心のデータ。
 * 第一弾はヘッダー7欄（打合せ日・作業日・天気気温・作業所名・作業所長・主任等・作成担当者）。
 * 第二弾で明日のイベント5欄＋統括安全責任者コメントを追加（記入順チェーンの続き）。
 * 各社マトリクス（動的・階層行）・搬入出・点検項目は後続弾で拡張する。
 */
import type { MeetingRecord } from "@/lib/meeting/schema";

/** 現時点の欄（紙の記入順＝タイトル行→ヘッダー表→下段左ブロック）。 */
export const MEETING_PAPER_FIELD_ORDER = [
  "meetingDate",
  "workDate",
  "weatherTemp",
  "siteName",
  "siteManager",
  "supervisor",
  "author",
  "safetyMeeting",
  "inspection",
  "patrol",
  "tomorrowGoal",
  "free",
  "supervisorComment",
] as const;

export type MeetingPaperFieldKey = (typeof MEETING_PAPER_FIELD_ORDER)[number];

export type MeetingPaperFieldDef = {
  key: MeetingPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type: "text" | "textarea" | "date" | "date3" | "weatherTemp";
  /** InputWithVoice/TextareaWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 現在値の取得（type="text"|"textarea"|"date" のみ使用。date3/weatherTemp は専用UIで直接 record を読む） */
  get?: (r: MeetingRecord) => string;
  /** イミュータブル更新（type="text"|"textarea"|"date" のみ使用） */
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
    next: "safetyMeeting",
  },
  safetyMeeting: {
    key: "safetyMeeting",
    label: "安全大会",
    type: "textarea",
    voice: true,
    placeholder: "予定・内容",
    get: (r) => r.tomorrowEvents.safetyMeeting,
    set: (r, v) => ({ tomorrowEvents: { ...r.tomorrowEvents, safetyMeeting: v } }),
    isEmpty: (r) => r.tomorrowEvents.safetyMeeting.trim() === "",
    next: "inspection",
  },
  inspection: {
    key: "inspection",
    label: "検査",
    type: "textarea",
    voice: true,
    placeholder: "予定・内容",
    get: (r) => r.tomorrowEvents.inspection,
    set: (r, v) => ({ tomorrowEvents: { ...r.tomorrowEvents, inspection: v } }),
    isEmpty: (r) => r.tomorrowEvents.inspection.trim() === "",
    next: "patrol",
  },
  patrol: {
    key: "patrol",
    label: "パトロール",
    type: "textarea",
    voice: true,
    placeholder: "予定・内容",
    get: (r) => r.tomorrowEvents.patrol,
    set: (r, v) => ({ tomorrowEvents: { ...r.tomorrowEvents, patrol: v } }),
    isEmpty: (r) => r.tomorrowEvents.patrol.trim() === "",
    next: "tomorrowGoal",
  },
  tomorrowGoal: {
    key: "tomorrowGoal",
    label: "明日の安全目標",
    type: "textarea",
    voice: true,
    placeholder: "例: 高所作業の墜落防止を徹底する",
    get: (r) => r.tomorrowEvents.tomorrowGoal,
    set: (r, v) => ({ tomorrowEvents: { ...r.tomorrowEvents, tomorrowGoal: v } }),
    isEmpty: (r) => r.tomorrowEvents.tomorrowGoal.trim() === "",
    next: "free",
  },
  free: {
    key: "free",
    label: "その他",
    type: "textarea",
    voice: true,
    placeholder: "自由記入",
    get: (r) => r.tomorrowEvents.free,
    set: (r, v) => ({ tomorrowEvents: { ...r.tomorrowEvents, free: v } }),
    isEmpty: (r) => r.tomorrowEvents.free.trim() === "",
    next: "supervisorComment",
  },
  supervisorComment: {
    key: "supervisorComment",
    label: "統括安全責任者コメント",
    type: "textarea",
    voice: true,
    placeholder: "コメント",
    get: (r) => r.supervisorComment,
    set: (r, v) => ({ supervisorComment: v }),
    isEmpty: (r) => r.supervisorComment.trim() === "",
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
