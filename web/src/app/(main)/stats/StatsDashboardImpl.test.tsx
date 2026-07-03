import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/language-context";
import { FuriganaProvider } from "@/contexts/furigana-context";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import { StatsDashboardImpl } from "./StatsDashboardImpl";

function renderDashboard() {
  return render(
    <LanguageProvider>
      <FuriganaProvider>
        <EasyJapaneseProvider>
          <StatsDashboardImpl />
        </EasyJapaneseProvider>
      </FuriganaProvider>
    </LanguageProvider>,
  );
}

function mockFetch(byUrl: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      const key = Object.keys(byUrl).find((k) => url.includes(k));
      return Promise.resolve({
        ok: key !== undefined,
        json: () => Promise.resolve(key !== undefined ? byUrl[key] : {}),
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const ga4Stats = {
  period: "30d",
  source: "ga4",
  generatedAt: "2026-07-03T00:00:00.000Z",
  summary: {
    dau: 12,
    mau: 340,
    pv: 12345,
    avgSessionSec: 90,
    bounceRate: 0.4,
    deltas: { dau: 0, mau: 0, pv: 0, avgSessionSec: 0, bounceRate: 0 },
  },
  features: [],
  pages: [],
  sources: [],
  flow: [],
  conversions: { amazonClicks: 0, rakutenClicks: 0, ctr: 0, byPage: [] },
  chatbot: { totalQuestions: 0, avgResponseMs: 0, byCategory: [] },
  insights: { unusedFeatures: [], growingFeatures: [], summary: "" },
};

const mockStats = { ...ga4Stats, source: "mock" as const };

describe("StatsDashboardImpl 柱0結論カード", () => {
  it("GA4接続時: 期間内PV実績をデカ数字で結論カードに表示する", async () => {
    mockFetch({ "/api/stats?": ga4Stats });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("アクセス実績")).toBeDefined();
    });
    const card = screen.getByRole("status", { name: "いまの状態: アクセス実績" });
    expect(card.textContent).toContain("12,345");
    expect(card.textContent).toContain("PV");
  });

  it("未接続時: サンプル値は出さず「未接続」を結論カードに表示する", async () => {
    mockFetch({ "/api/stats?": mockStats });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("未接続")).toBeDefined();
    });
    const card = screen.getByRole("status", { name: "いまの状態: 未接続" });
    expect(card.textContent).not.toContain("12,345");
  });

  it("取得失敗時: エラー表示のみで「読み込み中…」が残留しない＋再試行で復帰する", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/stats?")) {
          if (fail) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
          return Promise.resolve({ ok: true, json: () => Promise.resolve(ga4Stats) });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }),
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/データ取得に失敗しました/)).toBeDefined();
    });
    expect(screen.queryByText("読み込み中…")).toBeNull();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => {
      expect(screen.getByText("アクセス実績")).toBeDefined();
    });
    expect(screen.queryByText(/データ取得に失敗しました/)).toBeNull();
  });
});
