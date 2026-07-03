import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanBuilderClient } from "./plan-builder-client";

/**
 * 生成失敗（silent failure）の回帰ガード（2026-07-04）。
 * 従来はgenerateSupportPlanの例外をcatchでnullに潰すだけで、
 * 結論カードが「未生成」のまま変化せず、押す前後で画面が区別できなかった。
 */
vi.mock("@/lib/treatment-balance-engine", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/treatment-balance-engine")
  >("@/lib/treatment-balance-engine");
  return {
    ...actual,
    generateSupportPlan: () => {
      throw new Error("Unknown illness condition");
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlanBuilderClient の生成失敗フィードバック", () => {
  it("生成に失敗した場合、未生成時と異なる警告の結論カードを表示する", () => {
    render(<PlanBuilderClient />);

    expect(
      screen.getByRole("status", { name: "いまの状態: プラン未作成" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "両立支援プランを生成" }),
    );

    expect(
      screen.getByRole("status", {
        name: "いまの状態: プラン生成に失敗しました",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("status", { name: "いまの状態: プラン未作成" })).toBeNull();
    expect(screen.queryByLabelText("生成された両立支援プラン")).toBeNull();
  });
});
