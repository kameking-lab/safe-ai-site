/**
 * 安全工程打合せ書及び安全衛生指示書（北海道労働局公式版ベース＋独自拡張）のデータモデル。
 * KYの設計（手書き normalize・1-3評価・evalScore流用）を踏襲。zod非依存で全制御する。
 *
 * 注: 点検項目は建設現場で一般的な標準項目を初期値として用意（カスタマイズで増減可）。
 * 特定の条番号を断定せず、現場の実務点検カテゴリに沿う。
 */
import { evalScore } from "@/lib/ky/pulldown-options";

export type ContractorType = "元請" | "1次" | "2次" | "3次";
export const CONTRACTOR_TYPES: readonly ContractorType[] = ["元請", "1次", "2次", "3次"];

/** 天気プルダウンの選択肢（クラシック表示・canvas第一弾の天気エディタで共有）。 */
export const MEETING_WEATHER_OPTIONS: readonly string[] = ["晴れ", "曇り", "雨", "雪", "強風", "猛暑", "厳寒"];

export type ChecklistStatus = "ok" | "ng" | "na"; // ○ / × / 該当無

export type MeetingRiskEval = {
  /** 重大性 1-3 */
  severity: number;
  /** 可能性 1-3 */
  likelihood: number;
  /** 優先度 1(低)-4(最優先)。既定は重大性×可能性から自動、手動上書き可 */
  priority: number;
};

export type MeetingContractorRow = {
  id: string;
  type: ContractorType;
  /** 階層: 親業者の行id（1次の下の2次など）。null=最上位 */
  parentId: string | null;
  companyName: string;
  workContent: string;
  /** 使用機械（カンマ区切り自由記述） */
  machines: string;
  qualifications: string[];
  /** 予定人員（プルダウン文字列。"" 可） */
  plannedCount: string;
  predictedDisasters: string[];
  risk: MeetingRiskEval;
  safetyInstructions: string;
  /** 協力会社責任者（マスター選択） */
  responsibleName: string;
  /** 実績人員（当日記入） */
  actualCount: string;
  /** 右側追記欄（元請担当職員が作業ごとに追記） */
  appendNote: string;
};

export type MeetingChecklistItem = { key: string; label: string; status: ChecklistStatus };
export type MeetingChecklistCategory = { key: string; label: string; items: MeetingChecklistItem[] };

export type MeetingDeliveryRow = { id: string; item: string; time: string; place: string };

export type MeetingTomorrowEvents = {
  safetyMeeting: string; // 安全大会
  inspection: string; // 検査
  patrol: string; // パトロール
  tomorrowGoal: string; // 明日の安全目標
  free: string; // 自由記入
};

export type MeetingMachine = { name: string; count: number };

export type MeetingRecord = {
  id: string;
  workDateYear: string;
  workDateMonth: string;
  workDateDay: string;
  weather: string;
  temperature: string;
  siteName: string;
  siteManager: string; // 作業所長
  supervisor: string; // 主任等
  author: string; // 作成担当者
  meetingDate: string; // 打合せ日（前日記入・YYYY-MM-DD）
  contractors: MeetingContractorRow[];
  tomorrowEvents: MeetingTomorrowEvents;
  deliveries: MeetingDeliveryRow[];
  supervisorComment: string; // 統括安全責任者コメント
  checklist: MeetingChecklistCategory[];
  machines: MeetingMachine[]; // 使用機械リスト（自動集計）
  savedAt: string;
};

/** 8カテゴリの標準点検項目（建設現場の一般的項目。カスタマイズで増減可） */
export const DEFAULT_CHECKLIST: { key: string; label: string; items: string[] }[] = [
  { key: "general", label: "一般事項", items: ["朝礼・KY実施", "新規入場者教育", "保護具着用（ヘルメット・安全帯）", "立入禁止措置", "整理整頓（4S）"] },
  { key: "excavation", label: "掘削", items: ["土止め支保工", "法面の点検", "埋設物の確認", "酸欠・有害ガス測定"] },
  { key: "machine", label: "機械", items: ["始業前点検", "誘導員の配置", "接触防止措置", "有資格者の運転"] },
  { key: "crane", label: "クレーン", items: ["定格荷重の表示", "アウトリガー張出し", "玉掛け方法・有資格", "旋回範囲の立入禁止"] },
  { key: "scaffold", label: "足場", items: ["手すり・中桟・幅木", "壁つなぎ", "昇降設備", "最大積載荷重の表示", "組立解体時の親綱"] },
  { key: "electric", label: "電気", items: ["漏電遮断器", "アース", "被覆損傷の確認", "活線近接作業の防護"] },
  { key: "public", label: "公衆災害", items: ["仮囲い・養生", "歩行者通路の確保", "第三者立入防止", "落下物防護"] },
  { key: "hazmat", label: "危険物", items: ["火気使用の許可", "消火器の配置", "保管・表示", "換気"] },
];

const VALID_STATUS: readonly ChecklistStatus[] = ["ok", "ng", "na"];

export function newMeetingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `mtg-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function buildDefaultChecklist(): MeetingChecklistCategory[] {
  return DEFAULT_CHECKLIST.map((c) => ({
    key: c.key,
    label: c.label,
    items: c.items.map((label, i) => ({ key: `${c.key}-${i}`, label, status: "na" as ChecklistStatus })),
  }));
}

export function emptyContractorRow(type: ContractorType = "1次", parentId: string | null = null): MeetingContractorRow {
  return {
    id: newMeetingId(),
    type,
    parentId,
    companyName: "",
    workContent: "",
    machines: "",
    qualifications: [],
    plannedCount: "",
    predictedDisasters: [],
    risk: { severity: 1, likelihood: 1, priority: 1 },
    safetyInstructions: "",
    responsibleName: "",
    actualCount: "",
    appendNote: "",
  };
}

export function emptyDeliveryRow(): MeetingDeliveryRow {
  return { id: newMeetingId(), item: "", time: "", place: "" };
}

/** 重大性×可能性 → 優先度（1-4）。KYの evalScore（Phase5）を流用して整合させる */
export function computePriority(severity: number, likelihood: number): number {
  const score = evalScore(clamp(likelihood, 1, 3), clamp(severity, 1, 3));
  if (score >= 9) return 4;
  if (score >= 6) return 3;
  if (score >= 3) return 2;
  return 1;
}

export const PRIORITY_LABEL: Record<number, string> = {
  1: "Ⅰ（許容）",
  2: "Ⅱ（注意）",
  3: "Ⅲ（対策要）",
  4: "Ⅳ（最優先）",
};

export function aggregateMachines(contractors: MeetingContractorRow[]): MeetingMachine[] {
  const map = new Map<string, number>();
  for (const c of contractors) {
    for (const raw of (c.machines || "").split(/[,、\n]/)) {
      const name = raw.trim();
      if (!name) continue;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

export function buildDefaultMeetingRecord(): MeetingRecord {
  const d = new Date();
  const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const firstRow = emptyContractorRow("元請", null);
  return {
    id: newMeetingId(),
    workDateYear: String(tomorrow.getFullYear()),
    workDateMonth: String(tomorrow.getMonth() + 1),
    workDateDay: String(tomorrow.getDate()),
    weather: "",
    temperature: "",
    siteName: "",
    siteManager: "",
    supervisor: "",
    author: "",
    meetingDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    contractors: [firstRow],
    tomorrowEvents: { safetyMeeting: "", inspection: "", patrol: "", tomorrowGoal: "", free: "" },
    deliveries: [emptyDeliveryRow()],
    supervisorComment: "",
    checklist: buildDefaultChecklist(),
    machines: [],
    savedAt: new Date().toISOString(),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function normalizeRisk(raw: unknown): MeetingRiskEval {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const severity = clamp(Number(r.severity ?? 1), 1, 3);
  const likelihood = clamp(Number(r.likelihood ?? 1), 1, 3);
  const priority = clamp(Number(r.priority ?? computePriority(severity, likelihood)), 1, 4);
  return { severity, likelihood, priority };
}

function normalizeContractor(raw: unknown): MeetingContractorRow {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type = CONTRACTOR_TYPES.includes(r.type as ContractorType) ? (r.type as ContractorType) : "1次";
  return {
    id: str(r.id) || newMeetingId(),
    type,
    parentId: typeof r.parentId === "string" ? r.parentId : null,
    companyName: str(r.companyName),
    workContent: str(r.workContent),
    machines: str(r.machines),
    qualifications: strArray(r.qualifications),
    plannedCount: str(r.plannedCount),
    predictedDisasters: strArray(r.predictedDisasters),
    risk: normalizeRisk(r.risk),
    safetyInstructions: str(r.safetyInstructions),
    responsibleName: str(r.responsibleName),
    actualCount: str(r.actualCount),
    appendNote: str(r.appendNote),
  };
}

function normalizeChecklist(raw: unknown): MeetingChecklistCategory[] {
  const def = buildDefaultChecklist();
  if (!Array.isArray(raw)) return def;
  // 既存の status を key で引き継ぎつつ、定義済みカテゴリ構造を保つ
  const savedStatus = new Map<string, ChecklistStatus>();
  for (const cat of raw) {
    const items = (cat && typeof cat === "object" ? (cat as Record<string, unknown>).items : null) as unknown;
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      if (typeof o.key === "string" && VALID_STATUS.includes(o.status as ChecklistStatus)) {
        savedStatus.set(o.key, o.status as ChecklistStatus);
      }
    }
  }
  // カスタム追加カテゴリ/項目も保持
  const customCats = Array.isArray(raw)
    ? raw
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .filter((c) => typeof c.key === "string" && !def.some((d) => d.key === c.key))
        .map((c) => ({
          key: String(c.key),
          label: str(c.label, String(c.key)),
          items: Array.isArray(c.items)
            ? c.items
                .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
                .map((i, idx) => ({
                  key: str(i.key) || `${String(c.key)}-${idx}`,
                  label: str(i.label),
                  status: VALID_STATUS.includes(i.status as ChecklistStatus) ? (i.status as ChecklistStatus) : "na",
                }))
            : [],
        }))
    : [];
  return [
    ...def.map((c) => ({ ...c, items: c.items.map((it) => ({ ...it, status: savedStatus.get(it.key) ?? it.status })) })),
    ...customCats,
  ];
}

export function normalizeMeetingRecord(raw: unknown): MeetingRecord {
  const base = buildDefaultMeetingRecord();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const contractors = Array.isArray(r.contractors) && r.contractors.length > 0
    ? r.contractors.map(normalizeContractor)
    : base.contractors;
  const deliveriesRaw = Array.isArray(r.deliveries) ? r.deliveries : [];
  const deliveries = deliveriesRaw.length > 0
    ? deliveriesRaw.map((d) => {
        const o = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
        return { id: str(o.id) || newMeetingId(), item: str(o.item), time: str(o.time), place: str(o.place) };
      })
    : base.deliveries;
  const ev = (r.tomorrowEvents && typeof r.tomorrowEvents === "object" ? r.tomorrowEvents : {}) as Record<string, unknown>;
  return {
    id: str(r.id) || base.id,
    workDateYear: str(r.workDateYear, base.workDateYear),
    workDateMonth: str(r.workDateMonth, base.workDateMonth),
    workDateDay: str(r.workDateDay, base.workDateDay),
    weather: str(r.weather),
    temperature: str(r.temperature),
    siteName: str(r.siteName),
    siteManager: str(r.siteManager),
    supervisor: str(r.supervisor),
    author: str(r.author),
    meetingDate: str(r.meetingDate, base.meetingDate),
    contractors,
    tomorrowEvents: {
      safetyMeeting: str(ev.safetyMeeting),
      inspection: str(ev.inspection),
      patrol: str(ev.patrol),
      tomorrowGoal: str(ev.tomorrowGoal),
      free: str(ev.free),
    },
    deliveries,
    supervisorComment: str(r.supervisorComment),
    checklist: normalizeChecklist(r.checklist),
    machines: aggregateMachines(contractors),
    savedAt: str(r.savedAt) || new Date().toISOString(),
  };
}
