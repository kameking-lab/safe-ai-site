import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import ConstructionCalculatorDetailPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("/tools/construction-calculators/[slug]", () => {
  it("statically generates published tools and renders blank disabled inputs with No-JS guidance", async () => {
    expect(dynamicParams).toBe(false);
    expect(generateStaticParams()).toEqual(
      constructionCalculatorRegistry.map(({ slug }) => ({ slug })),
    );
    const node = await ConstructionCalculatorDetailPage({
      params: Promise.resolve({ slug: "concrete-quantity" }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(node);
    expect(html).toContain("コンクリート数量・生コン車台数");
    expect(html).toContain("直方体 V=L×W×H");
    expect(html).toContain("JavaScriptを使わずに確認する");
    const page = document.createElement("div");
    page.innerHTML = html;
    const form = page.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    const numericInputs = form?.querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(numericInputs?.length).toBeGreaterThan(0);
    for (const input of numericInputs ?? []) {
      expect(input.value).toBe("");
      expect(input.required).toBe(true);
    }
    expect(page.querySelector("[data-calculator-loading]")).toBeNull();
    expect(page.querySelector("#calculator-result-title")).toBeNull();
    expect(html).toContain("JavaScriptが無効な間は計算や履歴保存を使えません");
    expect(html).not.toContain("安全です");
    expect(html).not.toContain("法令に適合します");
  });

  it("self canonicalで、入力queryをURL正本にせずnoindexにする", async () => {
    const canonical = await generateMetadata({
      params: Promise.resolve({ slug: "slope-angle-length" }),
      searchParams: Promise.resolve({}),
    });
    const queried = await generateMetadata({
      params: Promise.resolve({ slug: "slope-angle-length" }),
      searchParams: Promise.resolve({ value: "10", unit: "m" }),
    });
    expect(canonical.alternates?.canonical).toBe(
      "/tools/construction-calculators/slope-angle-length",
    );
    expect(canonical.robots).toEqual({ index: true, follow: true });
    expect(queried.alternates?.canonical).toBe(
      "/tools/construction-calculators/slope-angle-length",
    );
    expect(queried.robots).toEqual({ index: false, follow: true });
  });
});
