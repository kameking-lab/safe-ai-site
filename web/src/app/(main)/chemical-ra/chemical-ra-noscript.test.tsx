import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChemicalRaNoScriptFallback } from "./chemical-ra-noscript";

describe("/chemical-ra JavaScriptなしの確認導線", () => {
  it("操作不能な入力を出さず、物質名・CASを確認する手順を示す", () => {
    const { container } = render(<ChemicalRaNoScriptFallback />);
    expect(
      screen.getByRole("heading", { name: "物質名・CAS番号を確認" }),
    ).toBeDefined();
    expect(container.querySelector("input, textarea, select, button")).toBeNull();
    expect(container.querySelector("[disabled]")).toBeNull();
    expect(container.textContent).toContain("SDS第1項");
    expect(container.textContent).toContain("一致しない場合は評価せず");
  });

  it("NITE・公式評価へ固定URLで進める", () => {
    const { container } = render(<ChemicalRaNoScriptFallback />);
    const expected = [
      "https://www.nite.go.jp/chem/chrip/chrip_search/systemTop",
      "https://anzeninfo.mhlw.go.jp/ras/user/anzen/kag/default.aspx",
    ];
    const hrefs = [...container.querySelectorAll("a[href]")].map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual(expected);
    for (const href of hrefs) {
      expect(new URL(href!, "https://www.anzen-ai-portal.jp").search).toBe("");
    }
  });

  it("外部リンクを別タブで安全に開く", () => {
    const { container } = render(<ChemicalRaNoScriptFallback />);
    const external = container.querySelectorAll('a[href^="https://"]');
    expect(external).toHaveLength(2);
    for (const link of external) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("通常JS領域をno-JS時だけ隠し、fallbackをheader直後に置く", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/(main)/chemical-ra/page.tsx"),
      "utf8",
    );
    expect(page).toContain('<div id="chemical-ra-js">');
    expect(page).toContain("#chemical-ra-js { display: none !important; }");
    expect(page).toContain("<ChemicalRaNoScriptFallback />");
    expect(page.indexOf("<ChemicalRaNoScriptFallback />")).toBeLessThan(
      page.indexOf('<div id="chemical-ra-js">'),
    );
  });
});
