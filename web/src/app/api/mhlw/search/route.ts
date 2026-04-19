import { NextResponse } from "next/server";
import type { Accident } from "@/types/mhlw";
import meta from "@/data/aggregates-mhlw/meta.json";

export const dynamic = "force-dynamic";

const BLOB_PREFIX = "mhlw-accidents";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type SearchParams = {
  year: number | null;
  type: string | null;
  industry: string | null;
  keyword: string | null;
  limit: number;
  offset: number;
};

type SearchResponse = {
  ok: boolean;
  fallback: boolean;
  source: "blob" | "fallback" | "error";
  year: number | null;
  availableYears: number[];
  total: number;
  records: Accident[];
  message?: string;
  warning?: string;
};

function parseSearchParams(url: URL): SearchParams {
  const yearRaw = url.searchParams.get("year");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, limitRaw ? Number(limitRaw) || DEFAULT_LIMIT : DEFAULT_LIMIT)
  );
  const offset = Math.max(0, offsetRaw ? Number(offsetRaw) || 0 : 0);
  return {
    year,
    type: url.searchParams.get("type"),
    industry: url.searchParams.get("industry"),
    keyword: url.searchParams.get("q"),
    limit,
    offset,
  };
}

function matches(record: Accident, params: SearchParams): boolean {
  if (params.type) {
    if (!record.accidentType?.name || !record.accidentType.name.includes(params.type)) {
      return false;
    }
  }
  if (params.industry) {
    const major = record.industry?.majorName ?? "";
    const medium = record.industry?.mediumName ?? "";
    if (!major.includes(params.industry) && !medium.includes(params.industry)) {
      return false;
    }
  }
  if (params.keyword) {
    const hay = record.description ?? "";
    if (!hay.includes(params.keyword)) return false;
  }
  return true;
}

async function listYearShards(token: string): Promise<Map<number, string>> {
  const { list } = await import("@vercel/blob");
  const res = await list({ prefix: `${BLOB_PREFIX}/`, token });
  const byYear = new Map<number, string>();
  for (const b of res.blobs) {
    const m = b.pathname.match(/(\d{4})\.jsonl$/);
    if (!m) continue;
    byYear.set(Number(m[1]), b.url);
  }
  return byYear;
}

async function fetchAndFilter(
  url: string,
  params: SearchParams,
  token: string
): Promise<{ total: number; records: Accident[] }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok || !res.body) {
    throw new Error(`Blob fetch failed: ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let total = 0;
  const records: Accident[] = [];
  let seen = 0;

  const pushIfMatch = (line: string) => {
    if (!line) return;
    let record: Accident;
    try {
      record = JSON.parse(line) as Accident;
    } catch {
      return;
    }
    if (!matches(record, params)) return;
    total += 1;
    if (seen >= params.offset && records.length < params.limit) {
      records.push(record);
    }
    seen += 1;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      pushIfMatch(line);
      idx = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) pushIfMatch(buffer.trim());
  return { total, records };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseSearchParams(url);
  const availableYears = meta.accidents.years;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    const payload: SearchResponse = {
      ok: true,
      fallback: true,
      source: "fallback",
      year: params.year,
      availableYears,
      total: 0,
      records: [],
      message:
        "Vercel Blob が未接続のため、MHLW 50万件検索は利用できません。オーナー側で BLOB_READ_WRITE_TOKEN を設定してください。",
    };
    return NextResponse.json(payload);
  }

  try {
    const shards = await listYearShards(token);
    if (shards.size === 0) {
      const payload: SearchResponse = {
        ok: true,
        fallback: true,
        source: "fallback",
        year: params.year,
        availableYears,
        total: 0,
        records: [],
        message:
          "Blob 上に MHLW 事故データがまだアップロードされていません。scripts/etl/upload-to-blob.mjs を実行してください。",
      };
      return NextResponse.json(payload);
    }

    const requestedYearInvalid = params.year !== null && !shards.has(params.year);
    const targetYear =
      params.year && shards.has(params.year)
        ? params.year
        : Math.max(...shards.keys());
    const shardUrl = shards.get(targetYear)!;
    const { total, records } = await fetchAndFilter(shardUrl, params, token);

    const payload: SearchResponse = {
      ok: true,
      fallback: false,
      source: "blob",
      year: targetYear,
      availableYears: [...shards.keys()].sort((a, b) => a - b),
      total,
      records,
      ...(requestedYearInvalid && {
        warning: `指定された年 ${params.year} はデータが存在しないため、最新年 ${targetYear} にフォールバックしました。`,
      }),
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const payload: SearchResponse = {
      ok: false,
      fallback: true,
      source: "error",
      year: params.year,
      availableYears,
      total: 0,
      records: [],
      message,
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
