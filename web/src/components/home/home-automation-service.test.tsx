import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeAutomationService } from "./home-automation-service";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

vi.mock("@/lib/track-events", () => ({ trackEvent: vi.fn() }));

describe("HomeAutomationService", () => {
  it("主要タスク直後で、代表例・最低料金・受付状態を短く明示する", () => {
    const availability: AutomationConsultAvailability = {
      status: "available",
      accepting: true,
      webFormEnabled: true,
      contactMode: "web_form",
      intakeMode: "email",
      retentionDays: 30,
      label: "Webフォーム受付中",
      message: "受付中です。",
    };
    render(<HomeAutomationService availability={availability} />);
    expect(
      screen.getByRole("heading", {
        name: "安全管理や定型業務の自動化をご相談ください",
      }),
    ).toBeDefined();
    for (const label of [
      "業務自動化",
      "安全衛生業務の効率化",
      "AI活用相談",
      "講習・研修",
      "講習会資料",
      "マニュアル・手順書",
    ]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getByText(/初回30分無料/)).toBeDefined();
    expect(screen.getByText(/税込33,000円から/)).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain(
      "Webフォーム受付中",
    );
    expect(
      screen.getByRole("link", { name: /無料相談を始める/ }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "料金を見る" })).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "自動化例を見る" })
        .getAttribute("href"),
    ).toBe("/automation-examples");
    expect(
      screen.getByText("講習・研修"),
    ).toBeDefined();
  });

  it("provider未設定時はメール相談を実際に利用できる導線へ案内する", () => {
    render(
      <HomeAutomationService
        availability={{
          status: "mail_available",
          accepting: true,
          webFormEnabled: false,
          contactMode: "mail_client",
          intakeMode: null,
          retentionDays: null,
          label: "メール相談受付中",
          message: "メールアプリから送信します。",
        }}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "メール相談受付中",
    );
    expect(
      screen.getByRole("link", { name: /メールで相談する/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: /メールで相談する/ }).getAttribute(
        "href",
      ),
    ).toBe("/contact/automation-email");
    expect(
      screen.getByRole("link", { name: /料金を見る/ }),
    ).toBeDefined();
    expect(screen.queryByText(/受付準備中/)).toBeNull();
  });
});
