import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GigWorkPage from "@/app/(main)/laws/gig-work/page";
import BcpPage from "@/app/(main)/laws/bcp/page";
import FreelancePage from "@/app/(main)/laws/freelance-rosai/page";

describe("unfinished public reading boundaries", () => {
  it("keeps the unfinished warning while removing unsupported claims and unavailable links", () => {
    const gig = renderToStaticMarkup(<GigWorkPage />), bcp = renderToStaticMarkup(<BcpPage />), freelance = renderToStaticMarkup(<FreelancePage />);
    for (const html of [gig, bcp, freelance]) expect(html).toContain("骨組み公開中");
    expect(gig).toContain("事業者が作業を中止");
    expect(gig).toContain("学生でも年齢を個別に確認");
    expect(gig).not.toContain("安衛則第13条"); expect(gig).not.toContain("労基則第60条");
    expect(gig).not.toContain("断る権利"); expect(gig).not.toContain("危険作業の拒否権");
    expect(bcp).toContain("作業場の通路・換気・避難"); expect(bcp).toContain("労働契約法 第5条");
    expect(freelance).not.toContain("全国300万"); expect(freelance).not.toContain('href="/diversity/foreign-workers"');
    expect(gig).toContain('href="/ky"'); expect(gig).toContain('href="/laws/freelance-rosai"');
    expect(gig).toContain('https://laws.e-gov.go.jp/law/329M50002000013/20210401_502M60000100203');
  });
});
