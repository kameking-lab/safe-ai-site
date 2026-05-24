/**
 * P0-006 (usability-audit-day2-2026-05-24):
 * plan-generator 過去計画 localStorage 履歴のユニットテスト。
 */

import { describe, expect, test, beforeEach } from "vitest";
import {
  clearPlanHistory,
  loadLatestPlan,
  loadPlanHistory,
  recordPlanHistory,
} from "./history";

// jsdom 環境では window.localStorage が利用可能 (vitest 標準環境)
beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  clearPlanHistory();
});

describe("recordPlanHistory + loadPlanHistory", () => {
  test("空の状態で loadPlanHistory は空配列を返す", () => {
    expect(loadPlanHistory()).toEqual([]);
  });

  test("recordPlanHistory が保存・loadPlanHistory が新しい順 (年違いは別件)", () => {
    recordPlanHistory({
      id: "p1",
      previewHref: "/strategy/plan-generator/preview/c-s-2025",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2025,
      organizationName: "サンプル工務店",
      generatedAt: "2025-04-01T00:00:00.000Z",
    });
    recordPlanHistory({
      id: "p2",
      previewHref: "/strategy/plan-generator/preview/c-s-2026",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2026,
      organizationName: "サンプル工務店",
      generatedAt: "2026-04-01T00:00:00.000Z",
    });
    const list = loadPlanHistory();
    expect(list).toHaveLength(2);
    // 新しい順: p2 (2026) → p1 (2025)
    expect(list[0].id).toBe("p2");
    expect(list[1].id).toBe("p1");
  });

  test("同一 industry/scale/fiscalYear は上書き、別年は別件", () => {
    recordPlanHistory({
      id: "p2025-a",
      previewHref: "/strategy/plan-generator/preview/a",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2025,
      organizationName: null,
      generatedAt: "2025-04-01T00:00:00.000Z",
    });
    recordPlanHistory({
      id: "p2025-b",
      previewHref: "/strategy/plan-generator/preview/b",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2025,
      organizationName: "更新後",
      generatedAt: "2025-05-01T00:00:00.000Z",
    });
    recordPlanHistory({
      id: "p2026",
      previewHref: "/strategy/plan-generator/preview/c",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2026,
      organizationName: null,
      generatedAt: "2026-04-01T00:00:00.000Z",
    });
    const list = loadPlanHistory();
    expect(list).toHaveLength(2);
    // 新しい順: 2026 → 2025(更新後)
    expect(list[0].id).toBe("p2026");
    expect(list[1].id).toBe("p2025-b");
    expect(list[1].organizationName).toBe("更新後");
  });

  test("最大3件まで保持 (古いものから自動切り捨て)", () => {
    for (let i = 0; i < 5; i += 1) {
      recordPlanHistory({
        id: `p${i}`,
        previewHref: `/p/${i}`,
        industry: "construction",
        industryLabel: "建設業",
        scale: "small",
        scaleLabel: "小規模",
        fiscalYear: 2020 + i,
        organizationName: null,
        generatedAt: `${2020 + i}-04-01T00:00:00.000Z`,
      });
    }
    const list = loadPlanHistory();
    expect(list).toHaveLength(3);
    // 最新3件のみ: 2024 / 2023 / 2022
    expect(list.map((h) => h.fiscalYear)).toEqual([2024, 2023, 2022]);
  });

  test("loadLatestPlan は最新1件を返す", () => {
    recordPlanHistory({
      id: "p2024",
      previewHref: "/p/2024",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2024,
      organizationName: null,
      generatedAt: "2024-04-01T00:00:00.000Z",
    });
    recordPlanHistory({
      id: "p2026",
      previewHref: "/p/2026",
      industry: "manufacturing",
      industryLabel: "製造業",
      scale: "medium",
      scaleLabel: "中規模",
      fiscalYear: 2026,
      organizationName: null,
      generatedAt: "2026-04-01T00:00:00.000Z",
    });
    expect(loadLatestPlan()?.id).toBe("p2026");
  });

  test("clearPlanHistory で全件削除", () => {
    recordPlanHistory({
      id: "p",
      previewHref: "/p",
      industry: "construction",
      industryLabel: "建設業",
      scale: "small",
      scaleLabel: "小規模",
      fiscalYear: 2025,
      organizationName: null,
      generatedAt: "2025-04-01T00:00:00.000Z",
    });
    expect(loadPlanHistory()).toHaveLength(1);
    clearPlanHistory();
    expect(loadPlanHistory()).toHaveLength(0);
  });
});
