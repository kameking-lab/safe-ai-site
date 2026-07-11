import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import byYear from "@/data/aggregates-mhlw/accidents-by-year.json";
import byTypeIndustry from "@/data/aggregates-mhlw/accidents-by-type-industry.json";
import deathsByYear from "@/data/aggregates-mhlw/deaths-by-year.json";
import deathsCompact from "@/data/deaths-mhlw/compact.json";
import { ALL_ACCIDENT_TYPES } from "@/lib/types/domain";
import {
  ACCIDENT_TYPE_TO_HAZARD_SLUG,
  CANONICAL_HAZARD_TYPES,
  HAZARD_TYPE_ALIASES,
  getHazardType,
  normalizeHazardLabel,
  normalizeHazardType,
} from "./type-normalization";

/**
 * 災害の型 正規化層の機械固定。
 *
 * ここが落ちたら「データ更新で新しい表記ゆれが混入した」サイン。
 * HAZARD_TYPE_ALIASES にエイリアスを追加して正本21分類へ解決すること
 * （安易に unknown へ落とさない。分類の判断根拠は type-normalization.ts の
 * コメントに残す）。
 */

function collectYearMapKeys(map: Record<string, Record<string, number>>): string[] {
  const keys = new Set<string>();
  for (const inner of Object.values(map)) {
    for (const k of Object.keys(inner)) keys.add(k);
  }
  return [...keys];
}

describe("canonical hazard types", () => {
  it("is exactly the MHLW 21-category taxonomy", () => {
    expect(CANONICAL_HAZARD_TYPES).toHaveLength(21);
  });

  it("has unique slugs / labels / mhlwLabels / glyphs", () => {
    for (const field of ["slug", "label", "mhlwLabel", "glyph"] as const) {
      const values = CANONICAL_HAZARD_TYPES.map((t) => t[field]);
      expect(new Set(values).size, `${field} must be unique`).toBe(values.length);
    }
  });

  it("resolves both display label and mhlwLabel back to itself", () => {
    for (const t of CANONICAL_HAZARD_TYPES) {
      expect(normalizeHazardType(t.label), t.label).toBe(t.slug);
      expect(normalizeHazardType(t.mhlwLabel), t.mhlwLabel).toBe(t.slug);
    }
  });

  it("getHazardType round-trips every slug", () => {
    for (const t of CANONICAL_HAZARD_TYPES) {
      expect(getHazardType(t.slug)).toBe(t);
    }
  });
});

describe("alias dictionary covers every observed key (未知キー検知)", () => {
  it("accidents-by-year.json: all type keys resolve", () => {
    const unknown = collectYearMapKeys(byYear as Record<string, Record<string, number>>).filter(
      (k) => normalizeHazardType(k) === null,
    );
    expect(unknown, `unresolved keys: ${JSON.stringify(unknown)}`).toEqual([]);
  });

  it("accidents-by-type-industry.json: all type keys resolve", () => {
    const unknown = Object.keys(byTypeIndustry as Record<string, unknown>).filter(
      (k) => normalizeHazardType(k) === null,
    );
    expect(unknown, `unresolved keys: ${JSON.stringify(unknown)}`).toEqual([]);
  });

  it("deaths-by-year.json: all type keys resolve", () => {
    const unknown = collectYearMapKeys(deathsByYear as Record<string, Record<string, number>>).filter(
      (k) => normalizeHazardType(k) === null,
    );
    expect(unknown, `unresolved keys: ${JSON.stringify(unknown)}`).toEqual([]);
  });

  it("deaths-mhlw/compact.json: all entry types resolve", () => {
    const entries = (deathsCompact as { entries: Array<{ type: string | null }> }).entries;
    const unknown = [...new Set(entries.map((e) => e.type).filter((t): t is string => !!t))].filter(
      (k) => normalizeHazardType(k) === null,
    );
    expect(unknown, `unresolved keys: ${JSON.stringify(unknown)}`).toEqual([]);
  });

  it("deaths-mhlw/records-2024.jsonl: all accidentType names resolve", () => {
    const filePath = path.join(process.cwd(), "src", "data", "deaths-mhlw", "records-2024.jsonl");
    const raw = readFileSync(filePath, "utf8");
    const names = new Set<string>();
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const rec = JSON.parse(trimmed) as { accidentType?: { name?: string } | null };
      if (rec.accidentType?.name) names.add(rec.accidentType.name);
    }
    const unknown = [...names].filter((k) => normalizeHazardType(k) === null);
    expect(unknown, `unresolved keys: ${JSON.stringify(unknown)}`).toEqual([]);
  });

  it("AccidentType union (事例DB): all 22 values resolve and agree with the typed map", () => {
    for (const t of ALL_ACCIDENT_TYPES) {
      expect(normalizeHazardType(t), t).toBe(ACCIDENT_TYPE_TO_HAZARD_SLUG[t]);
    }
  });

  it("every alias points at an existing canonical slug", () => {
    const slugs = new Set(CANONICAL_HAZARD_TYPES.map((t) => t.slug));
    for (const [alias, slug] of Object.entries(HAZARD_TYPE_ALIASES)) {
      expect(slugs.has(slug), `${alias} -> ${slug}`).toBe(true);
    }
  });
});

describe("normalizeHazardType / normalizeHazardLabel", () => {
  it("handles null / empty / whitespace", () => {
    expect(normalizeHazardType(null)).toBeNull();
    expect(normalizeHazardType(undefined)).toBeNull();
    expect(normalizeHazardType("")).toBeNull();
    expect(normalizeHazardType("  ")).toBeNull();
    expect(normalizeHazardType(" 墜落、転落 ")).toBe("fall");
  });

  it("returns null for unknown keys (テストで検知するための契約)", () => {
    expect(normalizeHazardType("宇宙線")).toBeNull();
  });

  it("pins representative merges (二重計上の是正対象)", () => {
    // 集計JSONの読点表記と事例DBの中黒/短縮表記が同じ正本に合流する
    expect(normalizeHazardLabel("墜落、転落")).toBe("墜落・転落");
    expect(normalizeHazardLabel("墜落")).toBe("墜落・転落");
    expect(normalizeHazardLabel("はさまれ巻き込まれ")).toBe("はさまれ・巻き込まれ");
    expect(normalizeHazardLabel("崩壊、到壊")).toBe("崩壊・倒壊"); // ETL誤字
    expect(normalizeHazardLabel("墜落･転落")).toBe("墜落・転落"); // 半角中黒
    expect(normalizeHazardLabel("交通事故(道路)")).toBe("交通事故（道路）"); // 半角括弧
    expect(normalizeHazardLabel("#REF!")).toBe("分類不能"); // Excel参照エラー行
    // 事例DB細分値の厚労省分類への合流
    expect(normalizeHazardLabel("熱中症")).toBe("高温・低温の物との接触");
    expect(normalizeHazardLabel("酸素欠乏")).toBe("有害物等との接触");
    expect(normalizeHazardLabel("車両")).toBe("交通事故（その他）");
  });
});
