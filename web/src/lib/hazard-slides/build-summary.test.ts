import { describe, expect, it } from "vitest";
import { MEASURES_BY_TYPE } from "@/data/hazard-slides/measures-by-type";
import { QUIZ_BY_TYPE } from "@/data/hazard-slides/quiz-by-type";
import { CANONICAL_HAZARD_TYPES } from "@/lib/accidents/type-normalization";
import { findEntryByShort } from "@/lib/law-navi/permalink";
import { getHazardTypeSummaries, getHazardTypeSummary } from "./build-summary";

/**
 * 教育スライドの空白ページ防止（データ更新追従ガード）。
 * データJSONの更新でここが落ちたら、スライドのどこかが空になるサイン。
 */

// 死亡個票にもcurated事例にも実データが無い型（捏造禁止のため事例枠は
// 「収載事例なし」の正直表示で運用）。データ拡充で事例が入ったらここから外す。
const ALLOWED_EMPTY_CASES = new Set(["stepping-through"]);
// 死亡個票に1件も無い型（起因物・時間帯の分布が空になる）
const ALLOWED_EMPTY_DEATHS = new Set(["stepping-through", "overexertion"]);

describe("getHazardTypeSummaries", () => {
  const summaries = getHazardTypeSummaries();

  it("covers all 21 canonical types", () => {
    expect(summaries).toHaveLength(21);
    expect(new Set(summaries.map((s) => s.slug)).size).toBe(21);
  });

  it("every type has KPI / year trend / industries", () => {
    for (const s of summaries) {
      expect(s.kpi.injuriesLatestCount, `${s.slug} injuries`).not.toBeNull();
      expect(s.yearTrend.length, `${s.slug} yearTrend`).toBeGreaterThan(0);
      expect(s.topIndustries.length, `${s.slug} topIndustries`).toBeGreaterThan(0);
    }
  });

  it("deaths-based distributions exist except known-empty types", () => {
    for (const s of summaries) {
      if (ALLOWED_EMPTY_DEATHS.has(s.slug)) continue;
      expect(s.kpi.deathsTotal, `${s.slug} deathsTotal`).toBeGreaterThan(0);
      expect(s.topCauses.length, `${s.slug} topCauses`).toBeGreaterThan(0);
      expect(s.timeDistribution.length, `${s.slug} timeDistribution`).toBeGreaterThan(0);
    }
  });

  it("featured cases: at least 1 with mandatory source label, except known-empty types", () => {
    for (const s of summaries) {
      if (!ALLOWED_EMPTY_CASES.has(s.slug)) {
        expect(s.featuredCases.length, `${s.slug} featuredCases`).toBeGreaterThan(0);
      }
      for (const c of s.featuredCases) {
        expect(c.sourceLabel, `${s.slug}/${c.id} sourceLabel`).toBeTruthy();
        expect(c.summary, `${s.slug}/${c.id} summary`).toBeTruthy();
      }
      expect(s.featuredCases.length).toBeLessThanOrEqual(2);
    }
  });

  it("measures: headline + 5 checklist items for every type", () => {
    for (const s of summaries) {
      expect(s.measures.headline, `${s.slug} headline`).toBeTruthy();
      expect(s.measures.checklist.length, `${s.slug} checklist`).toBe(5);
    }
  });

  it("every measures lawRef resolves to a law-navi permalink (幽霊リンク0)", () => {
    for (const [slug, m] of Object.entries(MEASURES_BY_TYPE)) {
      for (const item of m.checklist) {
        if (!item.lawRef) continue;
        const entry = findEntryByShort(item.lawRef.lawShort, item.lawRef.articleNum);
        expect(entry, `${slug}: ${item.lawRef.lawShort} ${item.lawRef.articleNum}`).toBeDefined();
      }
    }
  });

  it("quiz: at least 1 question per type, ids globally unique, valid correctIndex", () => {
    const ids = new Set<string>();
    for (const [slug, questions] of Object.entries(QUIZ_BY_TYPE)) {
      expect(questions.length, `${slug} quiz`).toBeGreaterThan(0);
      for (const q of questions) {
        expect(ids.has(q.id), `duplicate quiz id ${q.id}`).toBe(false);
        ids.add(q.id);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(q.explanation, `${slug}/${q.id} explanation`).toBeTruthy();
      }
    }
  });

  it("dataAsOf footer strings are present (出典明記)", () => {
    for (const s of summaries) {
      expect(s.dataAsOf.injuries).toContain("確定値");
      expect(s.dataAsOf.sourceNote).toContain("厚生労働省");
    }
  });

  it("featured curated cases never use synthetic/preliminary provenance", () => {
    // buildFeaturedCases 内でフィルタ済みだが、出口でも確認（教材の捏造防止）
    for (const s of summaries) {
      for (const c of s.featuredCases) {
        expect(["curated", "mhlw-deaths"]).toContain(c.origin);
      }
    }
  });

  it("getHazardTypeSummary resolves by slug and rejects unknown", () => {
    expect(getHazardTypeSummary("fall")?.label).toBe("墜落・転落");
    expect(getHazardTypeSummary("nope")).toBeUndefined();
  });

  it("pins the double-count fix: fall aggregates readings+union variants", () => {
    const fall = getHazardTypeSummary("fall")!;
    // 死亡個票 2019-2024: compact「墜落、転落」1,062 + 2024「墜落、転落」186
    expect(fall.kpi.deathsTotal).toBe(1248);
    expect(CANONICAL_HAZARD_TYPES.find((t) => t.slug === "fall")?.mhlwLabel).toBe("墜落、転落");
  });
});
