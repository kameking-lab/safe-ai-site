import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessFundingGuide } from "./business-funding-guide";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";
const MAIL: AutomationConsultAvailability = {
  status: "mail_available",
  accepting: true,
  webFormEnabled: false,
  contactMode: "mail_client",
  intakeMode: null,
  retentionDays: null,
  label: "メール相談受付中",
  message: "",
};

describe("目的別の補助金ガイド", () => {
  it("1回の選択で対象企業・費用・率・期限を表示し、詳しい条件は折り畳む", () => {
    const { container } = render(<BusinessFundingGuide availability={MAIL} />);
    expect(screen.getByRole("button", { name: "AI研修" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "業務自動化" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    for (const article of screen.getAllByRole("article")) {
      const card = within(article);
      for (const label of [
        "対象企業・受講者",
        "対象費用",
        "率・上限",
        "事前手続き",
        "期限（日本時間）",
      ])
        expect(card.getByText(label)).toBeDefined();
      expect(card.getByText("必要条件・対象外・申請の流れ").closest("details")?.open).toBe(false);
    }
    fireEvent.click(screen.getByRole("button", { name: "安全教育" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("article").textContent).toContain("建設労働者技能実習");
    expect(container.querySelector("noscript")).not.toBeNull();
    expect(renderToStaticMarkup(<BusinessFundingGuide availability={MAIL} />)).toContain(
      "display:block!important",
    );
  });
  it("相談受付に応じて正規導線へつなぎ、有償申請書作成と準備支援を分ける", () => {
    const { container } = render(<BusinessFundingGuide availability={MAIL} />);
    expect(screen.getByRole("link", { name: "補助金も含めて相談する" }).getAttribute("href")).toBe(
      "/contact/automation-email",
    );
    expect(container.textContent).toContain("有償の申請書作成・提出代行");
    expect(container.textContent).toContain("社会保険労務士等の法令上対応可能な専門家");
    expect(container.textContent).toContain(
      "提携専門家や当サービスの認定・登録、採択・支給は保証していません",
    );
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-14");
  });
  it("受付停止中は新規相談を促さず、Web受付は同じ相談欄へ移動する", () => {
    const { rerender } = render(
      <BusinessFundingGuide
        availability={{ ...MAIL, accepting: false, contactMode: null, label: "受付停止中" }}
      />,
    );
    expect(screen.queryByRole("link", { name: "補助金も含めて相談する" })).toBeNull();
    rerender(
      <BusinessFundingGuide
        availability={{ ...MAIL, contactMode: "web_form", webFormEnabled: true }}
      />,
    );
    expect(screen.getByRole("link", { name: "補助金も含めて相談する" }).getAttribute("href")).toBe(
      "#consult-form",
    );
    rerender(
      <BusinessFundingGuide
        availability={{ ...MAIL, contactMode: "web_form", webFormEnabled: true }}
        standalone
      />,
    );
    expect(screen.getByRole("link", { name: "補助金も含めて相談する" }).getAttribute("href")).toBe(
      "/services/automation#consult-form",
    );
  });
});
