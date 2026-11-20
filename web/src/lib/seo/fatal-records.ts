import "server-only";
import { createHash } from "node:crypto";
import compact from "@/data/deaths-mhlw/compact.json";
import evidence from "@/data/deaths-mhlw/verified-sources.json";
import { withoutEmergencyNumberSentences } from "@/lib/accident-news/public-record-display";

export type VerifiedFatalRecord = (typeof compact.entries)[number];
type RecordEvidence = { row: number; officialId: string; sha256: string };
const recordEvidence: Record<string, RecordEvidence> = evidence.records;
const sourceFiles = new Map(evidence.files.map((file) => [file.year, file]));
export const FATAL_RECORDS_VERIFIED_ON = evidence.verifiedOn;

function digest(record: VerifiedFatalRecord): string {
  return createHash("sha256").update(JSON.stringify([
    record.id, record.year, record.month, record.description, record.industry,
    record.industryMedium, record.cause, record.type, record.workplaceSize, record.occurrenceTime,
  ])).digest("hex");
}

// Only exact, unambiguous matches to the official XLSX row are published.
// A later data edit invalidates the binding until the source is checked again.
export const VERIFIED_FATAL_RECORDS = compact.entries.filter((record) =>
  record.description.trim().length >= 80 && Boolean(record.type && record.industry) &&
  sourceFiles.has(record.year) &&
  recordEvidence[record.id]?.sha256 === digest(record),
);
export const VERIFIED_FATAL_RECORD_YEARS = [
  ...new Set(VERIFIED_FATAL_RECORDS.map((record) => record.year)),
].sort((a, b) => b - a);

const byId = new Map(VERIFIED_FATAL_RECORDS.map((record) => [record.id, record]));
export function getVerifiedFatalRecord(id: string) { return byId.get(id); }
export function fatalRecordSource(record: VerifiedFatalRecord) {
  const file = sourceFiles.get(record.year);
  const row = recordEvidence[record.id];
  if (!file || !row) throw new Error("Verified fatal record source is missing");
  return { ...file, ...row, verifiedOn: evidence.verifiedOn, termsUrl: evidence.termsUrl };
}
export function fatalRecordDescription(record: VerifiedFatalRecord): string {
  return withoutEmergencyNumberSentences(record.description);
}

export function fatalRecordTitle(record: VerifiedFatalRecord): string {
  const summary = fatalRecordDescription(record).replace(/\s+/gu, " ").trim();
  return `${record.year}年・${record.type ?? "死亡災害"}｜${summary.slice(0, 45)}${summary.length > 45 ? "…" : ""}（${record.id}）`;
}
