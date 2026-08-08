import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  AccidentNewsBrowser,
  buildAccidentNewsPageHref,
} from "./accident-news-browser";
import type { SeriousCase } from "@/lib/accident-news/serious-cases";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/components/home-safety-cockpit/transient-chat-link", () => ({
  TransientChatLink: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

const initialCase: SeriousCase = {
  id: "case-1",
  year: 2023,
  month: 7,
  description: "足場から墜落した",
  industry: "建設業",
  industryMedium: null,
  cause: "仮設物",
  type: "墜落、転落",
  workplaceSize: null,
  occurrenceTime: null,
  sameTypeTotal: 10,
  sameIndustryTotal: 20,
};

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  window.history.replaceState({}, "", "/");
});

describe("AccidentNewsBrowser URL privacy", () => {
  it("no-JavaScriptページングは構造化フィルタだけをGETへ残す", () => {
    expect(
      buildAccidentNewsPageHref(
        { industry: "建設業", type: "墜落、転落", year: "2023" },
        2,
      ),
    ).toBe(
      "/accident-news?industry=%E5%BB%BA%E8%A8%AD%E6%A5%AD&type=%E5%A2%9C%E8%90%BD%E3%80%81%E8%BB%A2%E8%90%BD&year=2023&page=2",
    );
  });

  it("任意キーワードをPOST本文だけで検索し、結果更新後もURLへ露出しない", async () => {
    window.history.replaceState({}, "", "/accident-news?industry=建設業");
    const privateCase = {
      ...initialCase,
      id: "case-private",
      description: "山田太郎 新宿A現場で足場から墜落した",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [privateCase],
        total: 1,
        page: 1,
        pageCount: 1,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AccidentNewsBrowser
        options={{
          industries: [{ value: "建設業", count: 1 }],
          types: [{ value: "墜落、転落", count: 1 }],
          years: [2023],
        }}
        selected={{ industry: "建設業", type: "", year: "", q: "" }}
        initialResult={{ cases: [initialCase], total: 1 }}
        initialPage={1}
        initialPageCount={1}
        corpusTotal={100}
        corpusYearRange="2019〜2023年"
      />,
    );

    const keyword = "山田太郎 新宿A現場";
    fireEvent.change(screen.getByLabelText("キーワード"), {
      target: { value: keyword },
    });
    fireEvent.submit(screen.getByLabelText("キーワード").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(privateCase.description)).toBeDefined();
    });
    expect(window.location.search).toBe("?industry=%E5%BB%BA%E8%A8%AD%E6%A5%AD");
    expect(window.location.href).not.toContain(encodeURIComponent(keyword));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/accident-news/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ q: keyword });
  });
});
