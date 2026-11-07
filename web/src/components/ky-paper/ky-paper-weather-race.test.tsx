import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KyPaperView } from "./ky-paper-view";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("KY paper deferred weather", () => {
  it.each(["date", "region", "manual"])("discards a late response after %s changes", async (change) => {
    let resolveWeather!: (response: Response) => void;
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((input: string, init?: RequestInit) => {
      if (input === "/api/weather-forecast") {
        signal = init?.signal ?? undefined;
        return new Promise<Response>((resolve) => { resolveWeather = resolve; });
      }
      return Promise.resolve(new Response("{}", { status: 503 }));
    }));
    render(<KyPaperView consultAvailability={getAutomationConsultAvailability({})} />);
    const weather = screen.getByPlaceholderText("天気") as HTMLInputElement;
    fireEvent.change(weather, { target: { value: "手入力" } });
    fireEvent.click(screen.getByRole("button", { name: "自動取得" }));
    if (change === "date") {
      const day = screen.getByLabelText("日", { exact: true }) as HTMLSelectElement;
      fireEvent.change(day, { target: { value: day.value === "1" ? "2" : "1" } });
    }
    if (change === "region") fireEvent.change(screen.getByLabelText("地域", { exact: true }), { target: { value: "kinki" } });
    if (change === "manual") fireEvent.change(weather, { target: { value: "現場で確認" } });
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      resolveWeather(new Response(JSON.stringify({ regions: [{
        regionId: "kanto", days: [{ date: new Date().toLocaleDateString("en-CA"), weatherLabel: "旧応答", maxTempC: 35 }],
      }] })));
    });
    expect(weather.value).toBe(change === "manual" ? "現場で確認" : "手入力");
    expect(screen.queryByText(/の予報を取得しました/)).toBeNull();
    expect(screen.queryByText(/作業日・地域に一致する予報を取得できません/)).toBeNull();
  });
});
