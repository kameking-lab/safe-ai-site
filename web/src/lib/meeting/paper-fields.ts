/**
 * S1（打合せ用紙 直接操作UI）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * KYのcanvas方式（F1で確立・O10で実証）をそのまま踏襲: contentEditable を使わず
 * 「印刷シートのセル＝タップ標的、入力は専用エディタ」でWYSIWYGを成立させる核心のデータ。
 * 第一弾はヘッダー7欄（打合せ日・作業日・天気気温・作業所名・作業所長・主任等・作成担当者）。
 * 第二弾で明日のイベント5欄＋統括安全責任者コメントを追加（記入順チェーンの続き）。
 * 第三弾で各社マトリクス（インデックスではなくidキー "contractor.<id>.<part>"。KYの危険行と違い
 * 行の並び替え・階層(元請/1次/2次/3次)・削除を持つため、位置ではなくidで欄を特定する）を追加。
 * 対象はcompany(階層＋業者名)/workContent/machines/risk(重大性・可能性)/safetyInstructions/
 * responsibleName/actualCount の7部位。
 * 第四弾で各社マトリクスの残り3部位（qualifications=必要資格・predictedDisasters=予想災害は
 * タグ選択、plannedCount=予定人員は固定プルダウン）を追加し、7部位すべてcanvas対応が完了。
 * 印刷シートの列順（業者→作業内容→使用機械→必要資格→予定→予想災害→重/可→安全衛生指示事項→
 * 責任者→実績）に合わせ machines と risk の間に挿入。appendNote（印刷シート非掲載）のみ対象外。
 * 第五弾で搬入出（deliveries、動的行・id始まりのキー "delivery.<id>.<part>"。物/時刻/場所の3部位。
 * 各社マトリクスと同型だがタグ/プルダウンが無いため全部位type="text"）を追加。記入順チェーンは
 * その他(free)の次→搬入出1行目→…→最終行の次→統括安全責任者コメント、に挿入。
 * 第六弾で点検項目8カテゴリ（カテゴリ単位のキー "checklist.<categoryKey>"。カテゴリ内の項目は
 * 固定構造＝行の追加・削除・並び替えを持たないため、危険行/各社マトリクスのようなid採番は不要で
 * カテゴリのkeyをそのまま識別子に使う）を追加。記入順チェーンは統括安全責任者コメントの次→
 * 1カテゴリ目→…→最終カテゴリの次→次欄なし（用紙全体の記入順チェーンの終端）。○/×/－は既定値(na)が
 * 「該当無」という正当な回答でもあるため、リスク欄(重大性・可能性)と同じ扱いで未記入ハイライト・
 * zoom-to-cellの対象外にする（誤って「未記入」と誤認させない）。
 * 第七弾でAI提案（作業内容欄の🤖ボタン）をエディタ統合。第八弾で履歴サジェスト（datalist、
 * historyList プロパティで対象欄と datalist id を紐付け）をcanvas内へ提供。既定切替は未着手。
 */
import {
  computePriority,
  DEFAULT_CHECKLIST,
  type ChecklistStatus,
  type ContractorType,
  type MeetingContractorRow,
  type MeetingDeliveryRow,
  type MeetingRecord,
} from "@/lib/meeting/schema";

/** 現時点の静的な欄（紙の記入順＝タイトル行→ヘッダー表→下段左ブロック）。各社マトリクスは動的（後述）。 */
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

export type MeetingPaperStaticFieldKey = (typeof MEETING_PAPER_FIELD_ORDER)[number];

/** 各社マトリクス1行分の10部位（id始まりのキー。行の追加・削除・並び替えに追従する）。 */
export type MeetingContractorFieldPart =
  | "company"
  | "workContent"
  | "machines"
  | "qualifications"
  | "plannedCount"
  | "predictedDisasters"
  | "risk"
  | "safetyInstructions"
  | "responsibleName"
  | "actualCount";

export const CONTRACTOR_FIELD_PARTS: readonly MeetingContractorFieldPart[] = [
  "company",
  "workContent",
  "machines",
  "qualifications",
  "plannedCount",
  "predictedDisasters",
  "risk",
  "safetyInstructions",
  "responsibleName",
  "actualCount",
];

/** タグ選択(type="contractorTags")が対象とする2部位。 */
export type MeetingContractorTagPart = "qualifications" | "predictedDisasters";

export type MeetingContractorFieldKey = `contractor.${string}.${MeetingContractorFieldPart}`;

/** 搬入出予定1行分の3部位(id始まりのキー。行の追加に追従する)。 */
export type MeetingDeliveryFieldPart = "item" | "time" | "place";

export const DELIVERY_FIELD_PARTS: readonly MeetingDeliveryFieldPart[] = ["item", "time", "place"];

export type MeetingDeliveryFieldKey = `delivery.${string}.${MeetingDeliveryFieldPart}`;

/** 点検項目1カテゴリぶんのキー(カテゴリkeyそのものを識別子に使う。項目は固定構造のため個別idは不要)。 */
export type MeetingChecklistFieldKey = `checklist.${string}`;

export type MeetingPaperFieldKey =
  | MeetingPaperStaticFieldKey
  | MeetingContractorFieldKey
  | MeetingDeliveryFieldKey
  | MeetingChecklistFieldKey;

export type MeetingPaperFieldDef = {
  key: MeetingPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type:
    | "text"
    | "textarea"
    | "date"
    | "date3"
    | "weatherTemp"
    | "contractorCompany"
    | "contractorRisk"
    | "contractorTags"
    | "contractorPlannedCount"
    | "checklist";
  /** InputWithVoice/TextareaWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 現在値の取得（type="text"|"textarea"|"date" のみ使用。他は専用UIで直接 record を読む） */
  get?: (r: MeetingRecord) => string;
  /** イミュータブル更新（type="text"|"textarea"|"date" のみ使用） */
  set?: (r: MeetingRecord, v: string) => Partial<MeetingRecord>;
  /** 未記入判定（未記入セルのハイライトに使用） */
  isEmpty: (r: MeetingRecord) => boolean;
  /** type="contractorCompany"|"contractorRisk"|"contractorTags"|"contractorPlannedCount" のときの対象行id */
  contractorId?: string;
  /** type="contractorTags" のとき、対象の配列部位（qualifications/predictedDisasters） */
  tagField?: MeetingContractorTagPart;
  /** type="checklist" のときの対象カテゴリkey */
  checklistCategoryKey?: string;
  /** 記入順の次フィールド（エディタの「次の欄へ」送り）。静的欄のみ。各社マトリクスは nextMeetingPaperFieldKey で解決。 */
  next?: MeetingPaperFieldKey;
  /** 履歴サジェスト用 datalist id（従来UIの list= と同じ候補源。type="text"|"contractorCompany" のみ使用）。 */
  historyList?: string;
};

export const MEETING_PAPER_FIELDS: Record<MeetingPaperStaticFieldKey, MeetingPaperFieldDef> = {
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
    historyList: "mtg-sites",
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
    historyList: "mtg-managers",
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
    historyList: "mtg-supervisors",
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
    // 各社マトリクス（動的行）へ渡す。行が1件も無い場合のみここ(safetyMeeting)へ直接続く（nextMeetingPaperFieldKeyで分岐）。
    next: "safetyMeeting",
    historyList: "mtg-authors",
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

const CONTRACTOR_FIELD_KEY_RE = /^contractor\.([^.]+)\.(company|workContent|machines|qualifications|plannedCount|predictedDisasters|risk|safetyInstructions|responsibleName|actualCount)$/;
const DELIVERY_FIELD_KEY_RE = /^delivery\.([^.]+)\.(item|time|place)$/;
const CHECKLIST_FIELD_KEY_RE = /^checklist\.([^.]+)$/;

/** 各社マトリクスの欄キー組み立て（行id指定）。 */
export function contractorFieldKey(id: string, part: MeetingContractorFieldPart): MeetingContractorFieldKey {
  return `contractor.${id}.${part}`;
}

/** 各社マトリクスの欄キー分解。静的欄キーや不正な文字列には null を返す。 */
export function parseContractorFieldKey(key: string): { id: string; part: MeetingContractorFieldPart } | null {
  const m = CONTRACTOR_FIELD_KEY_RE.exec(key);
  if (!m) return null;
  return { id: m[1]!, part: m[2] as MeetingContractorFieldPart };
}

/** 搬入出予定の欄キー組み立て（行id指定）。 */
export function deliveryFieldKey(id: string, part: MeetingDeliveryFieldPart): MeetingDeliveryFieldKey {
  return `delivery.${id}.${part}`;
}

/** 搬入出予定の欄キー分解。静的欄キーや不正な文字列には null を返す。 */
export function parseDeliveryFieldKey(key: string): { id: string; part: MeetingDeliveryFieldPart } | null {
  const m = DELIVERY_FIELD_KEY_RE.exec(key);
  if (!m) return null;
  return { id: m[1]!, part: m[2] as MeetingDeliveryFieldPart };
}

/** 点検項目カテゴリの欄キー組み立て（カテゴリkey指定）。 */
export function checklistFieldKey(categoryKey: string): MeetingChecklistFieldKey {
  return `checklist.${categoryKey}`;
}

/** 点検項目カテゴリの欄キー分解。静的欄キーや不正な文字列には null を返す。 */
export function parseChecklistFieldKey(key: string): { categoryKey: string } | null {
  const m = CHECKLIST_FIELD_KEY_RE.exec(key);
  if (!m) return null;
  return { categoryKey: m[1]! };
}

export function isMeetingPaperFieldKey(key: string): key is MeetingPaperFieldKey {
  if ((MEETING_PAPER_FIELD_ORDER as readonly string[]).includes(key)) return true;
  if (parseContractorFieldKey(key) !== null) return true;
  if (parseDeliveryFieldKey(key) !== null) return true;
  return parseChecklistFieldKey(key) !== null;
}

function findContractor(r: MeetingRecord, id: string): MeetingContractorRow | undefined {
  return r.contractors.find((c) => c.id === id);
}

function findDelivery(r: MeetingRecord, id: string): MeetingDeliveryRow | undefined {
  return r.deliveries.find((d) => d.id === id);
}

type ContractorTextPart = "workContent" | "machines" | "safetyInstructions" | "responsibleName" | "actualCount";

function contractorTextGet(id: string, field: ContractorTextPart) {
  return (r: MeetingRecord): string => findContractor(r, id)?.[field] ?? "";
}

function contractorTextSet(id: string, field: ContractorTextPart) {
  return (r: MeetingRecord, v: string): Partial<MeetingRecord> => ({
    contractors: r.contractors.map((c) => (c.id === id ? { ...c, [field]: v } : c)),
  });
}

/** 各社マトリクス1行分のフィールド定義（7部位）を組み立てる。 */
function buildContractorFieldDef(id: string, part: MeetingContractorFieldPart): MeetingPaperFieldDef {
  const key = contractorFieldKey(id, part);
  switch (part) {
    case "company":
      return {
        key,
        label: "業者名・階層",
        type: "contractorCompany",
        contractorId: id,
        isEmpty: (r) => (findContractor(r, id)?.companyName ?? "").trim() === "",
        historyList: "mtg-companies",
      };
    case "workContent":
      return {
        key,
        label: "作業内容",
        type: "textarea",
        voice: true,
        placeholder: "例: 3F鉄骨建方、ボルト本締め",
        get: contractorTextGet(id, "workContent"),
        set: contractorTextSet(id, "workContent"),
        isEmpty: (r) => (findContractor(r, id)?.workContent ?? "").trim() === "",
      };
    case "machines":
      return {
        key,
        label: "使用機械",
        type: "text",
        voice: true,
        placeholder: "例: バックホウ、ダンプ",
        get: contractorTextGet(id, "machines"),
        set: contractorTextSet(id, "machines"),
        isEmpty: (r) => (findContractor(r, id)?.machines ?? "").trim() === "",
        historyList: "mtg-machines",
      };
    case "qualifications":
      return {
        key,
        label: "必要資格",
        type: "contractorTags",
        contractorId: id,
        tagField: "qualifications",
        isEmpty: (r) => (findContractor(r, id)?.qualifications.length ?? 0) === 0,
      };
    case "plannedCount":
      return {
        key,
        label: "予定人員",
        type: "contractorPlannedCount",
        contractorId: id,
        isEmpty: (r) => (findContractor(r, id)?.plannedCount ?? "").trim() === "",
      };
    case "predictedDisasters":
      return {
        key,
        label: "予想災害",
        type: "contractorTags",
        contractorId: id,
        tagField: "predictedDisasters",
        isEmpty: (r) => (findContractor(r, id)?.predictedDisasters.length ?? 0) === 0,
      };
    case "risk":
      return {
        key,
        label: "リスク（重大性・可能性）",
        type: "contractorRisk",
        contractorId: id,
        // 重大性・可能性は既定値(1)を必ず持ち「未記入」概念が無いためハイライト対象外（KYのriskEvalと同じ扱い）
        isEmpty: () => false,
      };
    case "safetyInstructions":
      return {
        key,
        label: "安全衛生指示事項",
        type: "textarea",
        voice: true,
        placeholder: "指示内容",
        get: contractorTextGet(id, "safetyInstructions"),
        set: contractorTextSet(id, "safetyInstructions"),
        isEmpty: (r) => (findContractor(r, id)?.safetyInstructions ?? "").trim() === "",
      };
    case "responsibleName":
      return {
        key,
        label: "協力会社責任者",
        type: "text",
        voice: true,
        placeholder: "氏名",
        get: contractorTextGet(id, "responsibleName"),
        set: contractorTextSet(id, "responsibleName"),
        isEmpty: (r) => (findContractor(r, id)?.responsibleName ?? "").trim() === "",
        historyList: "mtg-responsibles",
      };
    case "actualCount":
      return {
        key,
        label: "実績人員（当日）",
        type: "text",
        placeholder: "人数",
        get: contractorTextGet(id, "actualCount"),
        set: contractorTextSet(id, "actualCount"),
        isEmpty: (r) => (findContractor(r, id)?.actualCount ?? "").trim() === "",
      };
  }
}

const DELIVERY_FIELD_LABEL: Record<MeetingDeliveryFieldPart, string> = { item: "搬入出（物）", time: "時刻", place: "場所" };
const DELIVERY_FIELD_PLACEHOLDER: Record<MeetingDeliveryFieldPart, string> = { item: "例: 生コン", time: "例: 9:00", place: "例: 東側ゲート" };

function deliveryTextGet(id: string, part: MeetingDeliveryFieldPart) {
  return (r: MeetingRecord): string => findDelivery(r, id)?.[part] ?? "";
}

function deliveryTextSet(id: string, part: MeetingDeliveryFieldPart) {
  return (r: MeetingRecord, v: string): Partial<MeetingRecord> => ({
    deliveries: r.deliveries.map((d) => (d.id === id ? { ...d, [part]: v } : d)),
  });
}

/** 搬入出予定1行分のフィールド定義（物/時刻/場所の3部位）を組み立てる。 */
function buildDeliveryFieldDef(id: string, part: MeetingDeliveryFieldPart): MeetingPaperFieldDef {
  return {
    key: deliveryFieldKey(id, part),
    label: DELIVERY_FIELD_LABEL[part],
    type: "text",
    voice: part === "item",
    placeholder: DELIVERY_FIELD_PLACEHOLDER[part],
    get: deliveryTextGet(id, part),
    set: deliveryTextSet(id, part),
    isEmpty: (r) => (findDelivery(r, id)?.[part] ?? "").trim() === "",
  };
}

/** カテゴリkey→標準ラベル（公式8カテゴリぶん。カスタム/クラウド取込のカテゴリは汎用ラベルにフォールバック）。 */
const CHECKLIST_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(DEFAULT_CHECKLIST.map((c) => [c.key, c.label]));

/** 点検項目1カテゴリぶんのフィールド定義を組み立てる。 */
function buildChecklistFieldDef(categoryKey: string): MeetingPaperFieldDef {
  const label = CHECKLIST_CATEGORY_LABEL[categoryKey] ?? "点検項目";
  return {
    key: checklistFieldKey(categoryKey),
    label: `点検（${label}）`,
    type: "checklist",
    checklistCategoryKey: categoryKey,
    // 既定値(na=該当無)が正当な回答でもあるため、リスク欄(重大性・可能性)と同じくハイライト対象外。
    isEmpty: () => false,
  };
}

/** フィールド定義の解決（静的欄・各社マトリクス・搬入出・点検項目の全てに対応する唯一の窓口）。 */
export function getMeetingPaperFieldDef(key: MeetingPaperFieldKey): MeetingPaperFieldDef {
  const c = parseContractorFieldKey(key);
  if (c) return buildContractorFieldDef(c.id, c.part);
  const d = parseDeliveryFieldKey(key);
  if (d) return buildDeliveryFieldDef(d.id, d.part);
  const chk = parseChecklistFieldKey(key);
  if (chk) return buildChecklistFieldDef(chk.categoryKey);
  return MEETING_PAPER_FIELDS[key as MeetingPaperStaticFieldKey];
}

/**
 * 記入順の「次の欄」を返す（エディタの「次の欄へ」送り用）。各社マトリクスは record.contractors の
 * 並び順に追従するため、作成担当者(author)の次は1行目のcompany欄へ、最終行の最終部位の次は
 * 安全大会(safetyMeeting)へ折り返す。行が1件も無い場合は author→safetyMeeting に直接続く。
 * 搬入出（deliveries）も同様に record.deliveries の並び順に追従し、その他(free)の次は
 * 1行目のitem欄へ、最終行の最終部位の次は統括安全責任者コメントへ折り返す。行が1件も無い場合は
 * free→supervisorComment に直接続く。
 * 点検項目（checklist）は record.checklist の並び順に追従し、統括安全責任者コメントの次は
 * 1カテゴリ目へ、最終カテゴリの次は次欄なし（用紙全体の記入順チェーンの終端）。カテゴリが1件も
 * 無い場合は supervisorComment で従来どおりチェーンが終わる。
 */
export function nextMeetingPaperFieldKey(key: MeetingPaperFieldKey, record: MeetingRecord): MeetingPaperFieldKey | undefined {
  const c = parseContractorFieldKey(key);
  if (c) {
    const partIndex = CONTRACTOR_FIELD_PARTS.indexOf(c.part);
    if (partIndex < CONTRACTOR_FIELD_PARTS.length - 1) {
      return contractorFieldKey(c.id, CONTRACTOR_FIELD_PARTS[partIndex + 1]!);
    }
    const rowIndex = record.contractors.findIndex((row) => row.id === c.id);
    const nextRow = rowIndex >= 0 ? record.contractors[rowIndex + 1] : undefined;
    return nextRow ? contractorFieldKey(nextRow.id, CONTRACTOR_FIELD_PARTS[0]!) : "safetyMeeting";
  }
  const d = parseDeliveryFieldKey(key);
  if (d) {
    const partIndex = DELIVERY_FIELD_PARTS.indexOf(d.part);
    if (partIndex < DELIVERY_FIELD_PARTS.length - 1) {
      return deliveryFieldKey(d.id, DELIVERY_FIELD_PARTS[partIndex + 1]!);
    }
    const rowIndex = record.deliveries.findIndex((row) => row.id === d.id);
    const nextRow = rowIndex >= 0 ? record.deliveries[rowIndex + 1] : undefined;
    return nextRow ? deliveryFieldKey(nextRow.id, DELIVERY_FIELD_PARTS[0]!) : "supervisorComment";
  }
  const chk = parseChecklistFieldKey(key);
  if (chk) {
    const catIndex = record.checklist.findIndex((cat) => cat.key === chk.categoryKey);
    const nextCat = catIndex >= 0 ? record.checklist[catIndex + 1] : undefined;
    return nextCat ? checklistFieldKey(nextCat.key) : undefined;
  }
  const staticDef = MEETING_PAPER_FIELDS[key as MeetingPaperStaticFieldKey];
  if (key === "author" && record.contractors.length > 0) {
    return contractorFieldKey(record.contractors[0]!.id, CONTRACTOR_FIELD_PARTS[0]!);
  }
  if (key === "free" && record.deliveries.length > 0) {
    return deliveryFieldKey(record.deliveries[0]!.id, DELIVERY_FIELD_PARTS[0]!);
  }
  if (key === "supervisorComment" && record.checklist.length > 0) {
    return checklistFieldKey(record.checklist[0]!.key);
  }
  return staticDef.next;
}

/** 記入順（紙の上から下、各社マトリクスの動的挿入込み）で最初の未記入欄を返す（zoom-to-cell用）。 */
export function firstEmptyMeetingPaperFieldKey(record: MeetingRecord): MeetingPaperFieldKey | undefined {
  let key: MeetingPaperFieldKey | undefined = MEETING_PAPER_FIELD_ORDER[0];
  const seen = new Set<string>();
  while (key && !seen.has(key)) {
    if (getMeetingPaperFieldDef(key).isEmpty(record)) return key;
    seen.add(key);
    key = nextMeetingPaperFieldKey(key, record);
  }
  return undefined;
}

/** 未記入の欄キー集合（EditableCell のハイライトに渡す）。各社マトリクス・搬入出は現在の行数ぶんを含む。 */
export function emptyMeetingPaperFieldKeys(record: MeetingRecord): Set<string> {
  const out = new Set<string>();
  for (const key of MEETING_PAPER_FIELD_ORDER) {
    if (MEETING_PAPER_FIELDS[key].isEmpty(record)) out.add(key);
  }
  for (const c of record.contractors) {
    for (const part of CONTRACTOR_FIELD_PARTS) {
      const fieldKey = contractorFieldKey(c.id, part);
      if (getMeetingPaperFieldDef(fieldKey).isEmpty(record)) out.add(fieldKey);
    }
  }
  for (const dRow of record.deliveries) {
    for (const part of DELIVERY_FIELD_PARTS) {
      const fieldKey = deliveryFieldKey(dRow.id, part);
      if (getMeetingPaperFieldDef(fieldKey).isEmpty(record)) out.add(fieldKey);
    }
  }
  for (const cat of record.checklist) {
    const fieldKey = checklistFieldKey(cat.key);
    if (getMeetingPaperFieldDef(fieldKey).isEmpty(record)) out.add(fieldKey);
  }
  return out;
}

/** リスク欄の重大性/可能性を更新し優先度を自動再計算する（エディタ・キャンバス共通で使う純粋関数）。 */
export function setContractorRiskField(
  record: MeetingRecord,
  id: string,
  field: "severity" | "likelihood",
  value: number
): Partial<MeetingRecord> {
  return {
    contractors: record.contractors.map((c) => {
      if (c.id !== id) return c;
      const risk = { ...c.risk, [field]: value };
      risk.priority = computePriority(risk.severity, risk.likelihood);
      return { ...c, risk };
    }),
  };
}

/** 業者名・階層(type)を更新する（エディタ・キャンバス共通で使う純粋関数）。 */
export function setContractorCompanyField(
  record: MeetingRecord,
  id: string,
  patch: { type?: ContractorType; companyName?: string }
): Partial<MeetingRecord> {
  return {
    contractors: record.contractors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

/** 必要資格・予想災害のタグ配列を更新する（エディタ・キャンバス共通で使う純粋関数）。 */
export function setContractorTagsField(
  record: MeetingRecord,
  id: string,
  field: MeetingContractorTagPart,
  values: string[]
): Partial<MeetingRecord> {
  return {
    contractors: record.contractors.map((c) => (c.id === id ? { ...c, [field]: values } : c)),
  };
}

/** 予定人員（固定プルダウン）を更新する（エディタ・キャンバス共通で使う純粋関数）。 */
export function setContractorPlannedCountField(record: MeetingRecord, id: string, value: string): Partial<MeetingRecord> {
  return {
    contractors: record.contractors.map((c) => (c.id === id ? { ...c, plannedCount: value } : c)),
  };
}

/** 点検項目1件のステータス(○/×/－)を更新する（エディタ・キャンバス共通で使う純粋関数。クラシック表示の inline 更新とも同型）。 */
export function setChecklistItemStatus(
  record: MeetingRecord,
  categoryKey: string,
  itemKey: string,
  status: ChecklistStatus
): Partial<MeetingRecord> {
  return {
    checklist: record.checklist.map((c) =>
      c.key === categoryKey ? { ...c, items: c.items.map((i) => (i.key === itemKey ? { ...i, status } : i)) } : c
    ),
  };
}
