import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import IndustryLandingPage from "./page";
import { INDUSTRY_CONTENT_SLUGS } from "@/data/industries-content";

// 業種別ポータルは async サーバーコンポーネント。await して得た JSX を描画して検証する。
const slug = INDUSTRY_CONTENT_SLUGS[0];

describe("/industries/[industry] 柱C-10 コンサル相談カード", () => {
  it("下部のコンサル相談カードを堅牢な正規フォームへ誘導する", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: slug }) }));
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/services/automation#consult-form");
  });

  it("相談カードは編集主体と受付状態を示し、未検証の資格を表示しない", async () => {
    render(await IndustryLandingPage({ params: Promise.resolve({ industry: slug }) }));
    expect(screen.getByText(/業務改善の提供範囲を確認する/)).toBeDefined();
    expect(screen.getByText(/安全AIポータル編集部/)).toBeDefined();
    expect(screen.queryByText(/労働安全コンサルタント（土木）/)).toBeNull();
  });
});
