import { describe, expect, it, vi } from "vitest";

const permanentRedirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ permanentRedirect }));

import StrategyPage from "./page";

describe("/strategy legacy route", () => {
  it("現行の年次計画ジェネレーターへ恒久リダイレクトする", () => {
    StrategyPage();
    expect(permanentRedirect).toHaveBeenCalledWith("/strategy/plan-generator");
  });
});
