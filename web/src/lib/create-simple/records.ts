/**
 * 化学物質リスクアセスメントの記録（この端末の localStorage に保存）と CSV 出力。
 */
import { assessCreateSimple } from "./assess";
import {
  AMOUNT_LABEL,
  CONTACT_AREA_LABEL,
  GLOVE_LABEL,
  GLOVE_TRAINING_LABEL,
  PROPERTY_TYPE_LABEL,
  RISK_LEVEL_LABEL,
  VENTILATION_LABEL,
  WORKING_HOURS_LABEL,
  formatNumber,
  volatilityLabel,
} from "./labels";
import type { CsAssessmentInput, CsComponent, CsConditions } from "./types";

export const CS_RECORDS_STORAGE_KEY = "anzen-ai:chemical-ra:create-simple:v1";
const MAX_RECORDS = 200;

export interface CsSavedRecord {
  id: string;
  savedAt: string;
  /** 作業名（例: 製品Aの小分け作業） */
  title: string;
  conditions: CsConditions;
  components: CsComponent[];
}

function isRecord(value: unknown): value is CsSavedRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CsSavedRecord>;
  return (
    typeof v.id === "string" &&
    typeof v.savedAt === "string" &&
    typeof v.title === "string" &&
    typeof v.conditions === "object" &&
    v.conditions !== null &&
    Array.isArray(v.components)
  );
}

export function parseRecords(raw: string | null): CsSavedRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

export function loadRecords(storage: Pick<Storage, "getItem"> | null = safeStorage()): CsSavedRecord[] {
  if (!storage) return [];
  try {
    return parseRecords(storage.getItem(CS_RECORDS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveRecord(
  record: Omit<CsSavedRecord, "id" | "savedAt"> & { id?: string; savedAt?: string },
  storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage(),
): CsSavedRecord {
  const full: CsSavedRecord = {
    ...record,
    id: record.id ?? `ra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: record.savedAt ?? new Date().toISOString(),
  };
  if (storage) {
    const list = loadRecords(storage).filter((r) => r.id !== full.id);
    list.unshift(full);
    storage.setItem(CS_RECORDS_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
  }
  return full;
}

export function deleteRecord(id: string, storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage()): void {
  if (!storage) return;
  const list = loadRecords(storage).filter((r) => r.id !== id);
  storage.setItem(CS_RECORDS_STORAGE_KEY, JSON.stringify(list));
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CS_CSV_HEADER = [
  "保存日時",
  "作業名",
  "製品の性状",
  "物質名",
  "CAS番号",
  "含有率(%)",
  "揮発性/飛散性",
  "取扱量",
  "スプレー作業",
  "換気",
  "制御風速の確認",
  "1日の作業時間",
  "頻度",
  "皮膚に付く範囲",
  "手袋",
  "手袋の教育",
  "ばく露限界値(8時間)",
  "推定ばく露濃度(8時間・上限)",
  "吸入(8時間)",
  "推定ばく露濃度(短時間)",
  "吸入(短時間)",
  "経皮吸収量(mg/day)",
  "経皮吸収",
  "合計(吸入+経皮)",
  "危険性(爆発・火災等)",
  "法規制等",
];

export function recordsToCsv(records: CsSavedRecord[]): string {
  const rows: string[] = [CS_CSV_HEADER.map(csvCell).join(",")];
  for (const record of records) {
    const input: CsAssessmentInput = { conditions: record.conditions, components: record.components };
    const result = assessCreateSimple(input);
    const c = record.conditions;
    result.components.forEach((r, i) => {
      const comp = record.components[i];
      const unit = r.unit ?? "";
      const oel8 = r.oel8h !== null ? `${formatNumber(r.oel8h)} ${unit}` : r.acrMax !== null ? `管理目標濃度 ${formatNumber(r.acrMax * 0.1)}〜${formatNumber(r.acrMax)} ${unit}` : "";
      rows.push(
        [
          new Date(record.savedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
          record.title,
          PROPERTY_TYPE_LABEL[c.productType],
          r.name,
          r.cas ?? "",
          comp?.contentPercent ?? "",
          volatilityLabel(r.propertyType, r.volatility),
          AMOUNT_LABEL[c.productType][c.amountLevel],
          c.spray ? "あり" : "なし",
          VENTILATION_LABEL[c.ventilation],
          c.ventilation === "D" || c.ventilation === "E" ? (c.controlVelocityConfirmed ? "確認済み" : "未確認") : "",
          WORKING_HOURS_LABEL[c.workingHours],
          c.frequencyType === "weekly" ? `週${c.frequencyDays}日` : `月${c.frequencyDays}日`,
          c.contactArea !== null ? CONTACT_AREA_LABEL[c.contactArea] : "",
          GLOVE_LABEL[c.glove],
          GLOVE_TRAINING_LABEL[c.gloveTraining],
          oel8,
          r.inhalation.status === "ok" ? `${formatNumber(r.inhalation.exposure8h)} ${unit}` : "",
          r.inhalation.status === "ok" ? RISK_LEVEL_LABEL[r.inhalation.level8h] : "-",
          r.inhalation.status === "ok" ? `${formatNumber(r.inhalation.exposureShort)} ${unit}` : "",
          r.inhalation.status === "ok" && r.inhalation.levelShort ? RISK_LEVEL_LABEL[r.inhalation.levelShort] : "-",
          r.dermal.status === "ok" ? formatNumber(r.dermal.absorption) : "",
          r.dermal.status === "ok" ? RISK_LEVEL_LABEL[r.dermal.level] : "-",
          r.total.status === "ok" ? RISK_LEVEL_LABEL[r.total.level] : "-",
          r.physical.status === "ok" ? RISK_LEVEL_LABEL[r.physical.level] : "-",
          r.regulations.join("・"),
        ]
          .map(csvCell)
          .join(","),
      );
    });
  }
  return rows.join("\r\n");
}
