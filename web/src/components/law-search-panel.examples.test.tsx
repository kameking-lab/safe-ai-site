import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LawSearchPanel } from "./law-search-panel";
import { TransientQueryBridgeProvider } from "./home-safety-cockpit/transient-query-bridge";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/dynamic", async () => {
  const { LawSearchResults } = await import("./law-search-results");
  return { default: () => LawSearchResults };
});

describe("law example scope", () => {
  it("replaces previous conditions and shows only the intended law's article 61", () => {
    const { container } = render(<TransientQueryBridgeProvider>
      <LawSearchPanel initialQuery="賃金" initialArticleNumQuery="第21条" initialSelectedLaw="労働基準法" />
    </TransientQueryBridgeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "安衛法 第61条" }));
    expect((screen.getByRole("searchbox", { name: "法令フリーワード検索" }) as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("searchbox", { name: "条番号で検索" }) as HTMLInputElement).value).toBe("第61条");
    expect((screen.getByRole("combobox", { name: "法令で絞り込む" }) as HTMLSelectElement).value).toBe("労働安全衛生法");
    const articles = [...container.querySelectorAll("article")];
    expect(articles).toHaveLength(1);
    expect(articles[0]?.textContent).toContain("安衛法");
    expect(articles[0]?.textContent).toContain("第61条");
    expect(articles[0]?.textContent).not.toContain("労基法");
    fireEvent.click(screen.getByRole("button", { name: "熱中症 安衛則612条の2" }));
    expect((screen.getByRole("combobox", { name: "法令で絞り込む" }) as HTMLSelectElement).value).toBe("労働安全衛生規則");
    expect((screen.getByRole("searchbox", { name: "条番号で検索" }) as HTMLInputElement).value).toBe("第612条の2");
  });
});
