/**
 * F1（KY用紙 直接操作UI・方式確立）→ O10（Phase 2）: 用紙の欄 → 入力フィールドの対応マップ。
 *
 * contentEditable を使わず「印刷シートのセル＝タップ標的、入力は専用エディタ」で
 * WYSIWYG を成立させる核心のデータ。Phase 1 はヘッダー6欄のみだった。
 * Phase 2 第一弾で本日の作業内容・4R目標（チーム行動目標/重点実施項目/指差呼称）を追加。
 * Phase 2 第二弾で危険行（インデックス付きキー "risk.N.hazard"/"risk.N.eval"/"risk.N.reduction"、
 * 行数は record.riskRows.length に追従＝動的行・行追加に対応）を追加。参加者は次の段で拡張する。
 */
import type { KyInstructionRecordState, KyInstructionRiskRow } from "@/lib/types/operations";

/** Phase 2 時点の静的な欄（紙の記入順＝上から下）。危険行は record.riskRows.length に応じて動的に増える。 */
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

export type KyPaperStaticFieldKey = (typeof KY_PAPER_FIELD_ORDER)[number];

/** 危険行の3部位（危険のポイント／可能性・重大性／対策）。行番号は0始まり。 */
export type KyRiskFieldPart = "hazard" | "eval" | "reduction";
export type KyRiskFieldKey = `risk.${number}.${KyRiskFieldPart}`;

export type KyPaperFieldKey = KyPaperStaticFieldKey | KyRiskFieldKey;

export type KyPaperFieldDef = {
  key: KyPaperFieldKey;
  /** エディタ見出し（紙の欄名と一致させる） */
  label: string;
  /** エディタの出し分け */
  type: "text" | "textarea" | "date3" | "weatherTemp" | "riskEval";
  /** InputWithVoice/TextareaWithVoice を使うか（音声入力） */
  voice?: boolean;
  placeholder?: string;
  /** 現在値の取得（type="text"|"textarea" のみ使用。date3/weatherTemp/riskEval は専用UIで直接 record を読む） */
  get?: (r: KyInstructionRecordState) => string;
  /** イミュータブル更新（type="text"|"textarea" のみ使用） */
  set?: (r: KyInstructionRecordState, v: string) => Partial<KyInstructionRecordState>;
  /** 未記入判定（未記入セルのハイライトに使用） */
  isEmpty: (r: KyInstructionRecordState) => boolean;
  /** type="riskEval" のときの対象行インデックス */
  riskIndex?: number;
  /** 記入順の次フィールド（エディタの「次の欄へ」送り）。静的欄のみ。危険行は nextKyPaperFieldKey で解決。 */
  next?: KyPaperFieldKey;
};

export const KY_PAPER_FIELDS: Record<KyPaperStaticFieldKey, KyPaperFieldDef> = {
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
    // 危険行（動的・record.riskRows.length に追従）へ渡す。行0は常に存在する（既定値5行）。
    next: "risk.0.hazard",
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

const RISK_FIELD_KEY_RE = /^risk\.(\d+)\.(hazard|eval|reduction)$/;

/** 危険行キーの組み立て（行インデックス0始まり）。 */
export function riskFieldKey(index: number, part: KyRiskFieldPart): KyRiskFieldKey {
  return `risk.${index}.${part}`;
}

/** 危険行キーの分解。静的欄キーや不正な文字列には null を返す。 */
export function parseRiskFieldKey(key: string): { index: number; part: KyRiskFieldPart } | null {
  const m = RISK_FIELD_KEY_RE.exec(key);
  if (!m) return null;
  return { index: Number(m[1]), part: m[2] as KyRiskFieldPart };
}

export function isKyPaperFieldKey(key: string): key is KyPaperFieldKey {
  if ((KY_PAPER_FIELD_ORDER as readonly string[]).includes(key)) return true;
  return parseRiskFieldKey(key) !== null;
}

function riskRowGet(index: number, part: "hazard" | "reduction") {
  return (r: KyInstructionRecordState): string => r.riskRows[index]?.[part] ?? "";
}

function riskRowSet(index: number, part: "hazard" | "reduction") {
  return (r: KyInstructionRecordState, v: string): Partial<KyInstructionRecordState> => ({
    riskRows: r.riskRows.map((row, i): KyInstructionRiskRow => (i === index ? { ...row, [part]: v } : row)),
  });
}

/** 危険行1行分のフィールド定義（hazard/eval/reduction の3部位）を組み立てる。 */
function buildRiskFieldDef(index: number, part: KyRiskFieldPart): KyPaperFieldDef {
  const key = riskFieldKey(index, part);
  const rowNo = index + 1;
  if (part === "hazard") {
    return {
      key,
      label: `危険のポイント（${rowNo}）`,
      type: "textarea",
      voice: true,
      get: riskRowGet(index, "hazard"),
      set: riskRowSet(index, "hazard"),
      isEmpty: (r) => (r.riskRows[index]?.hazard ?? "").trim() === "",
    };
  }
  if (part === "reduction") {
    return {
      key,
      label: `対策（${rowNo}）`,
      type: "textarea",
      voice: true,
      get: riskRowGet(index, "reduction"),
      set: riskRowSet(index, "reduction"),
      isEmpty: (r) => (r.riskRows[index]?.reduction ?? "").trim() === "",
    };
  }
  return {
    key,
    label: `可能性・重大性（${rowNo}）`,
    type: "riskEval",
    riskIndex: index,
    // 可能性・重大性は既定値(1)を必ず持ち「未記入」概念が無いためハイライト対象外
    isEmpty: () => false,
  };
}

/** フィールド定義の解決（静的欄・危険行の両方に対応する唯一の窓口）。 */
export function getKyPaperFieldDef(key: KyPaperFieldKey): KyPaperFieldDef {
  const risk = parseRiskFieldKey(key);
  if (risk) return buildRiskFieldDef(risk.index, risk.part);
  return KY_PAPER_FIELDS[key as KyPaperStaticFieldKey];
}

/**
 * 記入順の「次の欄」を返す（エディタの「次の欄へ」送り用）。危険行数は record.riskRows.length に
 * 追従するため、最終行の対策の次は record を見て teamGoal へ折り返す。
 */
export function nextKyPaperFieldKey(key: KyPaperFieldKey, record: KyInstructionRecordState): KyPaperFieldKey | undefined {
  const risk = parseRiskFieldKey(key);
  if (!risk) return KY_PAPER_FIELDS[key as KyPaperStaticFieldKey].next;
  if (risk.part === "hazard") return riskFieldKey(risk.index, "eval");
  if (risk.part === "eval") return riskFieldKey(risk.index, "reduction");
  const isLastRow = risk.index >= record.riskRows.length - 1;
  return isLastRow ? "teamGoal" : riskFieldKey(risk.index + 1, "hazard");
}

/** 未記入の欄キー集合（EditableCell のハイライトに渡す）。危険行は現在の行数ぶんを含む。 */
export function emptyKyPaperFieldKeys(record: KyInstructionRecordState): Set<string> {
  const out = new Set<string>();
  for (const key of KY_PAPER_FIELD_ORDER) {
    if (KY_PAPER_FIELDS[key].isEmpty(record)) out.add(key);
  }
  for (let i = 0; i < record.riskRows.length; i++) {
    for (const part of ["hazard", "eval", "reduction"] as const) {
      const fieldKey = riskFieldKey(i, part);
      if (getKyPaperFieldDef(fieldKey).isEmpty(record)) out.add(fieldKey);
    }
  }
  return out;
}
