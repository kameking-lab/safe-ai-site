import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import ConstructionCalculatorDetailPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("/tools/construction-calculators/[slug]", () => {
  it("公開12件だけを静的生成し、式とJavaScript無効fallbackをSSRする", async () => {
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
    expect(html).toContain("計算フォームを準備しています");
    expect(html).not.toContain("<form");
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
