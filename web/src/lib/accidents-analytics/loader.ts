import { readFileSync } from "node:fs";
import path from "node:path";
import deathsCompact from "@/data/deaths-mhlw/compact.json";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase } from "@/lib/types/domain";

/**
 * Server-only loader for the analytics dashboard.
 *
 * Combines three data sources:
 *  1. compact.json (MHLW deaths 2019-2023, 4,043 entries with type/industry/cause/time/size)
 *  2. records-2024.jsonl (MHLW deaths 2024, 739 entries with prefecture/age)
 *  3. curated cases (real-accident-cases-*.ts, ~290 entries with severity/causes/prevention)
 *
 * The combined dataset feeds case-level aggregations; pre-computed JSON
 * aggregates in src/data/aggregates-mhlw/ feed full-DB scale views.
 */

export type CombinedCase = {
  id: string;
  /** YYYY-MM-DD when available, else just YYYY */
  occurredOn: string;
  year: number;
  month: number | null;
  type: string | null;
  industry: string | null;
  industryMedium: string | null;
  prefecture: string | null;
  cause: string | null;
  workplaceSize: string | null;
  occurrenceTime: string | null;
  age: string | null;
  /** Only curated cases have severity; deaths records are implicitly fatal */
  severity: "軽傷" | "中等傷" | "重傷" | "死亡";
  /** Curated cases carry weekday info via occurredOn parse */
  weekday: string | null;
  source: "curated" | "mhlw-deaths-compact" | "mhlw-deaths-2024";
};

type CompactRecord = {
  id: string;
  year: number;
  month: number | null;
  description: string;
  industry: string | null;
  industryMedium: string | null;
  cause: string | null;
  type: string | null;
  workplaceSize: string | null;
  occurrenceTime: string | null;
};

type CompactJson = {
  generatedAt: string;
  total: number;
  entries: CompactRecord[];
};

type DeathsRecord2024 = {
  id: string;
  year: number;
  month: number;
  occurrenceTime: string | null;
  description: string | null;
  prefecture?: string | null;
  industry?: { majorName?: string; mediumName?: string } | null;
  workplaceSize?: string | null;
  cause?: { majorName?: string } | null;
  accidentType?: { name?: string } | null;
  age?: string | null;
  gender?: string | null;
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

function parseWeekday(iso: string | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return WEEKDAY_JA[d.getDay()];
}

function parseYearMonth(iso: string | undefined): { year: number; month: number | null } {
  if (!iso) return { year: 0, month: null };
  const m = iso.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return { year: 0, month: null };
  return {
    year: Number(m[1]),
    month: m[2] ? Number(m[2]) : null,
  };
}

function load2024Records(): DeathsRecord2024[] {
  // src/data/deaths-mhlw/records-2024.jsonl ships in the repo. Read via fs
  // so this only runs at build time / on the server.
  const filePath = path.join(process.cwd(), "src", "data", "deaths-mhlw", "records-2024.jsonl");
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const out: DeathsRecord2024[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines silently — these jsonl files are author-managed.
    }
  }
  return out;
}

function fromCompact(rec: CompactRecord): CombinedCase {
  return {
    id: rec.id,
    occurredOn: rec.month ? `${rec.year}-${String(rec.month).padStart(2, "0")}` : String(rec.year),
    year: rec.year,
    month: rec.month ?? null,
    type: rec.type,
    industry: rec.industry,
    industryMedium: rec.industryMedium,
    prefecture: null,
    cause: rec.cause,
    workplaceSize: rec.workplaceSize,
    occurrenceTime: rec.occurrenceTime,
    age: null,
    severity: "死亡",
    weekday: null,
    source: "mhlw-deaths-compact",
  };
}

function from2024(rec: DeathsRecord2024): CombinedCase {
  return {
    id: rec.id,
    occurredOn: `${rec.year}-${String(rec.month).padStart(2, "0")}`,
    year: rec.year,
    month: rec.month,
    type: rec.accidentType?.name ?? null,
    industry: rec.industry?.majorName ?? null,
    industryMedium: rec.industry?.mediumName ?? null,
    prefecture: rec.prefecture ?? null,
    cause: rec.cause?.majorName ?? null,
    workplaceSize: rec.workplaceSize ?? null,
    occurrenceTime: rec.occurrenceTime ?? null,
    age: rec.age ?? null,
    severity: "死亡",
    weekday: null,
    source: "mhlw-deaths-2024",
  };
}

function fromCurated(c: AccidentCase): CombinedCase {
  const { year, month } = parseYearMonth(c.occurredOn);
  return {
    id: c.id,
    occurredOn: c.occurredOn,
    year,
    month,
    type: c.type,
    industry: c.workCategory,
    industryMedium: c.industry_detail ?? null,
    prefecture: null,
    cause: c.mainCauses[0] ?? null,
    workplaceSize: c.company_size ?? null,
    occurrenceTime: null,
    age: null,
    severity: c.severity,
    weekday: parseWeekday(c.occurredOn),
    source: "curated",
  };
}

let cached: CombinedCase[] | null = null;

/**
 * Load all accident-level records combined. The result is cached for the
 * lifetime of the Node process (build-time + per-request server cache).
 */
export function loadCombinedCases(): CombinedCase[] {
  if (cached) return cached;
  const compactJson = deathsCompact as unknown as CompactJson;
  const compact = compactJson.entries.map(fromCompact);
  const recs2024 = load2024Records().map(from2024);
  const curated = getAccidentCasesDataset().map(fromCurated);
  cached = [...compact, ...recs2024, ...curated];
  return cached;
}

export type LoaderMeta = {
  totalCombined: number;
  curated: number;
  mhlwDeaths: number;
  yearMin: number;
  yearMax: number;
};

export function getLoaderMeta(): LoaderMeta {
  const cases = loadCombinedCases();
  const years = cases.map((c) => c.year).filter((y) => y > 0);
  return {
    totalCombined: cases.length,
    curated: cases.filter((c) => c.source === "curated").length,
    mhlwDeaths: cases.filter((c) => c.source !== "curated").length,
    yearMin: years.length ? Math.min(...years) : 0,
    yearMax: years.length ? Math.max(...years) : 0,
  };
}
