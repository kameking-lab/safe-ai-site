import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalcAiOnebox } from "./calc-ai-onebox";
import {
  clearConstructionCalcHandoffForTest,
  consumeConstructionCalcHandoff,
} from "@/lib/construction-calc/transient-handoff";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("CalcAiOnebox private navigation", () => {
  beforeEach(() => {
    router.push.mockClear();
    clearConstructionCalcHandoffForTest();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/construction-calc");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates to a fixed route and stages extracted dimensions only in memory", async () => {
    const prompt = "コンクリートを12.75m×8.25m×0.4m打設したい";
    const values = {
      calcMode: "rectangular",
      lengthDim: 12.75,
      widthDim: 8.25,
      heightDim: 0.4,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          matched: {
            slug: "concrete-volume",
            title: "生コンクリート数量の概算",
            values,
            questions: [],
          },
          candidates: [],
          message: "計算機を用意しました。",
          source: "fallback",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CalcAiOnebox />);
    fireEvent.change(screen.getByLabelText("計算したい内容（自由記述）"), {
      target: { value: prompt },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "計算機を探す" }));

    const link = await screen.findByRole("link", {
      name: "生コンクリート数量の概算を開く",
    });
    expect(link.getAttribute("href")).toBe(
      "/construction-calc/concrete-volume",
    );
    expect(link.getAttribute("href")).not.toContain("?");

    fireEvent.click(link);

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/construction-calc/concrete-volume",
      ),
    );
    expect(JSON.stringify(router.push.mock.calls)).not.toContain("12.75");
    expect(consumeConstructionCalcHandoff("concrete-volume")).toEqual({
      slug: "concrete-volume",
      values,
    });
    expect(window.location.search).toBe("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
