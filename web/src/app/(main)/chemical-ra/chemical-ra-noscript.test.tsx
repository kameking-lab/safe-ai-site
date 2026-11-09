import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChemicalRaNoScriptFallback } from "./chemical-ra-noscript";

describe("/chemical-ra JavaScriptなしの表示", () => {
  it("操作不能な入力を出さず、JavaScriptを有効にすれば判定できることとSDSの見る場所を示す", () => {
    const { container } = render(<ChemicalRaNoScriptFallback />);
    expect(screen.getByRole("heading", { name: "JavaScriptを有効にすると判定できます" })).toBeDefined();
    expect(container.querySelector("input, textarea, select, button")).toBeNull();
    expect(container.textContent).toContain("第3項（組成及び成分情報）");
    expect(container.textContent).not.toContain("CREATE-SIMPLEを開く");
  });

  it("サイト内のCAS別ページだけへ固定URLで進める", () => {
    const { container } = render(<ChemicalRaNoScriptFallback />);
    const hrefs = [...container.querySelectorAll("a[href]")].map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/chemical-database/108-88-3", "/chemical-database/67-56-1"]);
  });

  it("通常JS領域をno-JS時だけ隠し、fallbackをheader直後に置く", () => {
    const page = readFileSync(resolve(process.cwd(), "src/app/(main)/chemical-ra/page.tsx"), "utf8");
    expect(page).toContain('<div id="chemical-ra-js">');
    expect(page).toContain("#chemical-ra-js { display: none !important; }");
    expect(page).toContain("<ChemicalRaNoScriptFallback />");
    expect(page.indexOf("<ChemicalRaNoScriptFallback />")).toBeLessThan(page.indexOf('<div id="chemical-ra-js">'));
  });
});
