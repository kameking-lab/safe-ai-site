import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import IndustryLandingPage from "./page";
import { INDUSTRY_CONTENT_SLUGS } from "@/data/industries-content";

// 業種別ポータルは async サーバーコンポーネント。await して得た JSX を描画して検証する。
const slug = INDUSTRY_CONTENT_SLUGS[0];

describe("/industries/[industry] 柱C-10 コンサル相談カード", () => {
  it("下部にコンサル相談カードを表示し /contact?tab=business へ誘導する", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: slug }) }));
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links.some((h) => h?.startsWith("/contact?tab=business&industry="))).toBe(true);
  });

  it("相談カードの文言が労働安全コンサルタントの実務経験に言及する", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: slug }) }));
    expect(screen.getByText(/コンサルタントに相談する/)).toBeDefined();
    expect(screen.getByText(/労働安全コンサルタント（土木）/)).toBeDefined();
  });
});
