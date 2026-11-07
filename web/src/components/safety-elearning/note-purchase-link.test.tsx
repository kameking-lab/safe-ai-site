import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SafetyNotePurchaseLink } from "./note-purchase-link";

const { trackAffiliateClick } = vi.hoisted(() => ({ trackAffiliateClick: vi.fn() }));
vi.mock("@/lib/track-events", () => ({ trackAffiliateClick }));

describe("安全資格教材への外部リンク", () => {
  it("教材本文へ直接進み、既存クリック計測へ教材と講座だけを渡す", () => {
    render(<SafetyNotePurchaseLink noteKey="n45654cd0b84d" title="機械安全の教材" courseId="occupational-safety-consultant" />);
    const link = screen.getByRole("link", { name: /noteで無料部分・収録内容を確認する/ });
    const href = link.getAttribute("href");
    expect(href).toBe("https://note.com/anzen_ai_jp/n/n45654cd0b84d?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=safety_learning&utm_content=n45654cd0b84d");
    expect(link.getAttribute("rel")).toBe("sponsored noopener noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
    fireEvent.click(link);
    expect(trackAffiliateClick).toHaveBeenCalledWith({
      productId: "n45654cd0b84d",
      productName: "機械安全の教材",
      network: "other",
      url: href,
      page: "/e-learning/safety/occupational-safety-consultant",
    });
  });
});
