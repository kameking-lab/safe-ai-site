import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import {
  HomeSafetyCockpitClient,
  type HomeHeatSlideSummary,
} from "./home-safety-cockpit-client";
import { TransientQueryBridgeProvider } from "./transient-query-bridge";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  prefetch: vi.fn(),
  search: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    prefetch: mocks.prefetch,
  }),
}));

vi.mock("@/lib/chemical/search-client", () => ({
  searchChemicalCatalog: mocks.search,
  confirmChemicalCatalogSelection: mocks.confirm,
}));

const slides: HomeHeatSlideSummary[] = Array.from(
  { length: 15 },
  (_, index) => ({
    id:
      index === 1
        ? "wbgt-provenance"
        : index === 5
          ? "work-plan"
          : index === 12
            ? "emergency-response"
            : index === 14
              ? "summary-quiz"
              : `slide-${index + 1}`,
    eyebrow: index === 0 ? "今日のリスク" : `要点${index + 1}`,
    title: `テストスライド${index + 1}`,
    lead: `要点本文${index + 1}`,
    fieldAction: `現場確認${index + 1}`,
  }),
);

const toluene: MergedChemical = {
  cas: "108-88-3",
  primaryName: "トルエン",
  aliases: [],
  flags: {
    carcinogenic: false,
    concentration: true,
    skin: false,
    label_sds: true,
  },
  appliedDates: {},
  notes: [],
  entryCount: 1,
};

const mixedXylene: MergedChemical = {
  ...toluene,
  cas: "1330-20-7",
  primaryName: "キシレン（異性体混合物）",
};

const orthoXylene: MergedChemical = {
  ...toluene,
  cas: "95-47-6",
  primaryName: "o-キシレン",
};

function renderCockpit() {
  return render(
    <TransientQueryBridgeProvider>
      <HomeSafetyCockpitClient slides={slides} />
    </TransientQueryBridgeProvider>,
  );
}

beforeEach(() => {
  mocks.push.mockReset();
  mocks.prefetch.mockReset();
  mocks.search.mockReset();
  mocks.confirm.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("offline test boundary")),
  );
  vi.stubGlobal("crypto", {
    randomUUID: () => "cockpit-one-shot-test-id",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeSafetyCockpit", () => {
  it("renders four direct services, WBGT first, four text tabs, and one mascot", () => {
    const { container } = renderCockpit();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "今日の安全コックピット",
      }),
    ).toBeTruthy();
    expect(screen.getByText("地域未選択")).toBeTruthy();
    expect(screen.getByText("1 / 15")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "化学物質を検索" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("安衛法AIへの質問")).toBeTruthy();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "暑さ",
      "スライド",
      "化学物質",
      "法令AI",
    ]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelectorAll("[data-mascot-guide]")).toHaveLength(1);
    expect(
      container
        .querySelector("[data-mascot-guide]")
        ?.getAttribute("data-mascot-image-variant"),
    ).toBe("pointing");
  });

  it("supports arrow, Home, and End keyboard navigation for tabs and slides", () => {
    renderCockpit();

    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs[1]!, { key: "End" });
    expect(tabs[3]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs[3]!, { key: "Home" });
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    const carousel = screen.getByRole("region", {
      name: "熱中症を防ぐ現場ブリーフィング",
    });
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(screen.getByText("2 / 15")).toBeTruthy();
    fireEvent.keyDown(carousel, { key: "End" });
    expect(screen.getByText("15 / 15")).toBeTruthy();
    fireEvent.keyDown(carousel, { key: "Home" });
    expect(screen.getByText("1 / 15")).toBeTruthy();
    fireEvent.touchStart(carousel, {
      changedTouches: [{ clientX: 240 }],
    });
    fireEvent.touchEnd(carousel, {
      changedTouches: [{ clientX: 120 }],
    });
    expect(screen.getByText("2 / 15")).toBeTruthy();
  });

  it("resolves a unique alias to an allowlisted area in one submit and stores only the coarse ID", async () => {
    renderCockpit();
    const input = screen.getByLabelText(
      "地域を入力してWBGT・熱中症警戒情報を見る",
    );

    fireEvent.change(input, { target: { value: "とうきょう" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/risk?area=tokyo-shinjuku",
      ),
    );
    expect(
      window.localStorage.getItem("safe-ai:coarse-area-id:v1"),
    ).toBe("tokyo-shinjuku");
    expect(JSON.stringify(window.localStorage)).not.toContain("とうきょう");
  });

  it("does not silently choose an ambiguous area", () => {
    renderCockpit();
    const input = screen.getByLabelText(
      "地域を入力してWBGT・熱中症警戒情報を見る",
    );

    fireEvent.change(input, { target: { value: "中央区" } });
    fireEvent.submit(input.closest("form")!);

    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(1);
    expect(screen.getByRole("alert").textContent).toContain(
      "同名の地域が複数",
    );
  });

  it("does not request geolocation until verified official-boundary resolution is available", () => {
    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    try {
      renderCockpit();
      expect(getCurrentPosition).not.toHaveBeenCalled();

      fireEvent.click(
        screen.getByRole("button", { name: "現在地の扱いを確認" }),
      );
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain(
        "位置情報は要求していません",
      );
    } finally {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: originalGeolocation,
      });
    }
  });

  it("server-confirms a unique CAS candidate and opens RA without re-entry", async () => {
    mocks.search.mockResolvedValue([toluene]);
    mocks.confirm.mockResolvedValue(toluene);
    renderCockpit();
    const input = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });

    fireEvent.change(input, { target: { value: "トルエン" } });
    await waitFor(() => expect(mocks.search).toHaveBeenCalledWith(
      "トルエン",
      8,
      expect.any(AbortSignal),
    ));
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith(
        "108-88-3",
        "トルエン",
        "トルエン",
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start");
  });

  it("does not auto-confirm a sole partial-match result", async () => {
    mocks.search.mockResolvedValue([toluene]);
    renderCockpit();
    const input = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });

    fireEvent.change(input, { target: { value: "トル" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start"),
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("opens ambiguous results without assigning a CAS and fails closed on API errors", async () => {
    mocks.search.mockResolvedValueOnce([mixedXylene, orthoXylene]);
    const { unmount } = renderCockpit();
    const input = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });

    fireEvent.change(input, { target: { value: "キシレン" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start"),
    );
    expect(mocks.confirm).not.toHaveBeenCalled();
    unmount();

    mocks.push.mockReset();
    mocks.search.mockReset();
    mocks.search.mockRejectedValueOnce(new TypeError("network unavailable"));
    renderCockpit();
    const retryInput = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });
    fireEvent.change(retryInput, { target: { value: "未知物質" } });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "通信を確認できない",
      ),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.submit(retryInput.closest("form")!);
    expect(mocks.push).toHaveBeenCalledWith("/chemical-ra#chemical-ra-start");
  });

  it("stops direct chemical navigation while offline without claiming zero results", async () => {
    const online = vi
      .spyOn(window.navigator, "onLine", "get")
      .mockReturnValue(false);
    renderCockpit();
    const input = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });

    fireEvent.change(input, { target: { value: "108-88-3" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "0件・収載外とは判定しません",
      ),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    online.mockRestore();
  });

  it("blocks PII-shaped chemical text before search or URL navigation", async () => {
    renderCockpit();
    const input = screen.getByRole("combobox", {
      name: "化学物質を検索",
    });

    fireEvent.change(input, {
      target: { value: "audit.person@example.invalid" },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "個人情報・健康情報",
      ),
    );
    expect(mocks.search).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("hands off a safe chat question in memory without URL or storage exposure", async () => {
    renderCockpit();
    const question = "足場の特別教育は必要？";
    const input = screen.getByLabelText("安衛法AIへの質問");

    fireEvent.change(input, { target: { value: question } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/chatbot"),
    );
    expect(mocks.push.mock.calls.flat().join(" ")).not.toContain(question);
    expect(window.location.href).not.toContain(encodeURIComponent(question));
    expect(JSON.stringify(window.localStorage)).not.toContain(question);
    expect(JSON.stringify(window.sessionStorage)).not.toContain(question);
  });

  it("does not stage or navigate a chat question while offline", async () => {
    const online = vi
      .spyOn(window.navigator, "onLine", "get")
      .mockReturnValue(false);
    renderCockpit();
    const input = screen.getByLabelText("安衛法AIへの質問");

    fireEvent.change(input, { target: { value: "安衛法第61条" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "安全確認を完了できないため送信していません",
      ),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.activeElement).toBe(input);
    online.mockRestore();
  });

  it("blocks emergency and PII text before navigation and keeps Shift+Enter as a newline action", async () => {
    renderCockpit();
    const input = screen.getByLabelText("安衛法AIへの質問");

    fireEvent.change(input, {
      target: { value: "現場で作業員が倒れて呼吸がありません" },
    });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await waitFor(() =>
      expect(
        document.querySelector("[data-home-chat-emergency]"),
      ).toBeTruthy(),
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("119");
    expect(screen.getByRole("alert").textContent).toContain("AED");

    fireEvent.change(input, {
      target: { value: "連絡先はtest@example.comです" },
    });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    await waitFor(() =>
      expect(
        document.querySelector("[data-home-chat-privacy]"),
      ).toBeTruthy(),
    );
    expect(mocks.push).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "足場の教育" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
