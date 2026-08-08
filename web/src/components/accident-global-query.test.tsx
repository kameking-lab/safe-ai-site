import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccidentDatabasePanel } from "./accident-database-panel";
import { QuickAccidentSearch } from "./accidents/quick-accident-search";
import { EasyJapaneseProvider } from "@/contexts/easy-japanese-context";
import type { AccidentCase } from "@/lib/types/domain";
import { clearTransientAccidentKeyword } from "@/lib/accidents/transient-search";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const base: AccidentCase = {
  id: "heat-001",
  title: "熱中症で作業員が搬送",
  occurredOn: "2026-07-01",
  type: "熱中症",
  workCategory: "建設業",
  severity: "重傷",
  summary: "高温環境で熱中症を発症した",
  mainCauses: ["暑熱環境"],
  preventionPoints: ["手順を確認"],
  source: { site: "テスト", url: "https://example.test/heat" },
};

afterEach(() => {
  window.history.replaceState({}, "", "/");
  clearTransientAccidentKeyword();
  replace.mockReset();
});

describe("AccidentDatabasePanel global query handoff", () => {
  it("uses ?q= as the initial accident keyword and removes unrelated cases", async () => {
    window.history.replaceState({}, "", "/accidents?q=%E7%86%B1%E4%B8%AD%E7%97%87");
    const unrelated: AccidentCase = {
      ...base,
      id: "fall-001",
      title: "足場から墜落",
      type: "墜落",
      summary: "開口部から墜落した",
      source: { site: "テスト", url: "https://example.test/fall" },
    };
    render(
      <EasyJapaneseProvider>
        <AccidentDatabasePanel
          cases={[base, unrelated]}
          allCases={[base, unrelated]}
          selectedType="すべて"
          selectedCategory="すべて"
          onSelectType={() => undefined}
          onSelectCategory={() => undefined}
          status="success"
        />
      </EasyJapaneseProvider>,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("熱中症で作業員が搬送");
      expect(document.body.textContent).not.toContain("足場から墜落");
    });
  });

  it("PF-009: restores query and 1-based pagination from the internal URL", async () => {
    window.history.replaceState(
      {},
      "",
      "/accidents?acc_kw=%E7%86%B1%E4%B8%AD%E7%97%87&acc_page=2",
    );
    const cases = Array.from({ length: 45 }, (_, index) => ({
      ...base,
      id: `heat-${String(index).padStart(3, "0")}`,
      title: `熱中症事例 ${String(index).padStart(2, "0")}`,
    }));
    render(
      <EasyJapaneseProvider>
        <AccidentDatabasePanel
          cases={cases}
          allCases={cases}
          selectedType="すべて"
          selectedCategory="すべて"
          onSelectType={() => undefined}
          onSelectCategory={() => undefined}
          status="success"
        />
      </EasyJapaneseProvider>,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("2 / 2");
      expect(document.body.textContent).toContain("熱中症事例 40");
      expect(document.body.textContent).not.toContain("熱中症事例 00");
    });
    expect(window.location.search).toContain("acc_kw=");
    expect(window.location.search).toContain("acc_page=2");
  });

  it("クイック検索とDB直接入力をメモリ内で反映し、本文をURLへ出さない", async () => {
    window.history.replaceState({}, "", "/accidents?acc_industries=construction");
    const privateCase: AccidentCase = {
      ...base,
      id: "private-001",
      title: "山田太郎 新宿A現場の転落",
      type: "墜落",
      summary: "足場から転落した",
    };
    render(
      <EasyJapaneseProvider>
        <QuickAccidentSearch />
        <AccidentDatabasePanel
          cases={[base, privateCase]}
          allCases={[base, privateCase]}
          selectedType="すべて"
          selectedCategory="すべて"
          onSelectType={() => undefined}
          onSelectCategory={() => undefined}
          status="success"
        />
      </EasyJapaneseProvider>,
    );

    const quickKeyword = "山田太郎 新宿A現場";
    fireEvent.change(
      screen.getByRole("searchbox", { name: "事故事例キーワード検索" }),
      { target: { value: quickKeyword } },
    );
    fireEvent.submit(
      screen
        .getByRole("searchbox", { name: "事故事例キーワード検索" })
        .closest("form")!,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain(privateCase.title);
      expect(document.body.textContent).not.toContain(base.title);
    });
    expect(window.location.search).toBe("?acc_industries=construction");
    expect(window.location.href).not.toContain(encodeURIComponent(quickKeyword));
    expect(replace).not.toHaveBeenCalledWith(
      expect.stringContaining("acc_kw"),
      expect.anything(),
    );

    const directKeyword = "熱中症";
    fireEvent.change(screen.getByLabelText("キーワード検索"), {
      target: { value: directKeyword },
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(base.title);
      expect(document.body.textContent).not.toContain(privateCase.title);
    });
    expect(window.location.search).toBe("?acc_industries=construction");
    expect(window.location.href).not.toContain(encodeURIComponent(directKeyword));
  });

  it("replays a memory-only quick search submitted before the database mounts", async () => {
    window.history.replaceState({}, "", "/accidents?acc_type=墜落");
    render(
      <EasyJapaneseProvider>
        <QuickAccidentSearch />
      </EasyJapaneseProvider>,
    );
    const keyword = "フォークリフト";
    const quickInput = screen.getByRole("searchbox", {
      name: "事故事例キーワード検索",
    });
    fireEvent.change(quickInput, { target: { value: keyword } });
    fireEvent.submit(quickInput.closest("form")!);

    render(
      <EasyJapaneseProvider>
        <AccidentDatabasePanel
          cases={[base]}
          allCases={[base]}
          selectedType="すべて"
          selectedCategory="すべて"
          onSelectType={() => undefined}
          onSelectCategory={() => undefined}
          status="success"
        />
      </EasyJapaneseProvider>,
    );

    await waitFor(() =>
      expect(
        (document.querySelector("#accident-keyword") as HTMLInputElement).value,
      ).toBe(keyword),
    );
    expect(window.location.search).toBe(`?acc_type=${encodeURIComponent("墜落")}`);
    expect(window.location.href).not.toContain(encodeURIComponent(keyword));
  });
});
