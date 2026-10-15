import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AutomationServicePromo } from "./automation-service-promo";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

const paused: AutomationConsultAvailability = {
  status: "paused", accepting: false, webFormEnabled: false, contactMode: null,
  intakeMode: null, retentionDays: null, label: "受付停止中", message: "停止中",
};

describe("consultation promotion", () => {
  it.each([
    [paused, "/services/automation"],
    [{ ...paused, status: "mail_available", accepting: true, contactMode: "mail_client" }, "/contact/automation-email"],
    [{ ...paused, status: "available", accepting: true, webFormEnabled: true, contactMode: "web_form" }, "/services/automation#consult-form"],
  ] as const)("shows consistent terms and the actual intake route", (availability, href) => {
    const { container } = render(<AutomationServicePromo position="education" availability={availability} />);
    expect(container.textContent).toContain("初回30分相談無料");
    expect(container.textContent).toContain("税込33,000円から");
    expect(screen.getByRole("link", { name: availability.accepting ? "現場業務の効率化を相談する" : "料金・受付状況を見る" }).getAttribute("href")).toBe(href);
    if (availability.contactMode === "mail_client") {
      expect(render(<AutomationServicePromo position="education" availability={availability} href="/services/automation#consult-form" />).container.querySelector("a")?.getAttribute("href")).toBe("/contact/automation-email");
    }
  });
});
