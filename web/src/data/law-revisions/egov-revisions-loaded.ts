/**
 * P1-1: e-Gov 法令API v2 ETL（scripts/etl/egov-revisions-fetch.ts）が生成した
 * 構造データ法改正を読み込む。月次GitHub Actionが egov-revisions.json を差分更新する。
 */
import type { LawRevisionCore } from "@/lib/types/domain";
import egovData from "./egov-revisions.json";

type EgovPayload = {
  fetchedAt?: string;
  total?: number;
  skipped?: number;
  revisions?: unknown[];
};

const data = egovData as EgovPayload;

/** e-Gov 由来の法改正（構造データ。内容解釈なし・出典明示） */
export const egovLawRevisions: LawRevisionCore[] = Array.isArray(data.revisions)
  ? (data.revisions as unknown as LawRevisionCore[])
  : [];

export const egovRevisionsMeta = {
  fetchedAt: data.fetchedAt ?? null,
  total: data.total ?? egovLawRevisions.length,
  skipped: data.skipped ?? 0,
};
