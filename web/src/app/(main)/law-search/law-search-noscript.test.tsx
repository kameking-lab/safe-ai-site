import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NoScriptLawSearch,
  safeArticleParam,
  safeLawParam,
} from "./law-search-noscript";

describe("/law-search JavaScriptなしの検索", () => {
  it("GETへ送る項目を許可済み法令名と条番号だけに限定する", () => {
    const { container } = render(
      <NoScriptLawSearch selectedLaw="all" articleNumber="" />,
    );
    const form = container.querySelector("form");
    expect(form?.getAttribute("action")).toBe("/law-search");
    expect(form?.getAttribute("method")).toBe("get");
    expect(
      [...container.querySelectorAll("[name]")].map((element) =>
        element.getAttribute("name"),
      ),
    ).toEqual(["law", "art"]);
    expect(container.querySelector('[name="q"]')).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(screen.getByText("URLへ送るのは選択した法令名と条番号だけです。")).toBeDefined();
  });

  it("未知の法令名・自由文・全角表記をサーバーで再検証する", () => {
    expect(safeLawParam("山田太郎 新宿A現場")).toBe("all");
    expect(safeArticleParam("山田太郎 新宿A現場")).toBe("");
    expect(safeArticleParam("６１２条の２")).toBe("第612条の2");

    const { container } = render(
      <NoScriptLawSearch
        selectedLaw="山田太郎 新宿A現場"
        articleNumber="足場の相談本文"
      />,
    );
    expect((container.querySelector('[name="law"]') as HTMLSelectElement).value).toBe("all");
    expect((container.querySelector('[name="art"]') as HTMLInputElement).value).toBe("");
    expect(container.textContent).not.toContain("山田太郎");
    expect(container.textContent).not.toContain("新宿A現場");
  });

  it("構造化条件から最大5件の収録条文と公式原文導線をSSRする", () => {
    const { container } = render(
      <NoScriptLawSearch
        selectedLaw="労働安全衛生法"
        articleNumber="第61条"
      />,
    );
    expect(screen.getByRole("heading", { name: "検索結果" })).toBeDefined();
    const results = container.querySelectorAll("ol > li");
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(container.textContent).toContain("労働安全衛生法 第61条");
    for (const link of container.querySelectorAll("ol a[href]")) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\/(?:e?laws\.)?e-gov\.go\.jp\//u);
      expect(link.textContent).toContain("e-Govで現行条文を確認");
    }
  });

  it("通常JS領域をno-JS時だけ隠し、自由質問qを復元しない", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/(main)/law-search/page.tsx"),
      "utf8",
    );
    expect(page).toContain('<div id="law-search-js">');
    expect(page).toContain("#law-search-js { display: none !important; }");
    expect(page).toContain("<NoScriptLawSearch");
    expect(page).toContain('const initialQuery = ""');
    expect(page).toContain('referrer: "no-referrer"');
    expect(page).not.toContain("params.q");
  });
});
