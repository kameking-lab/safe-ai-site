import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeLP } from "./home-lp";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

const unavailable: HomeLatestAccidentNews = { status: "unavailable", checkedAt: "2026-10-08T00:00:00Z", items: [], sourceLabel: "報道RSS", sourceUrl: "https://news.google.com/", message: "未取得" };
const paused: AutomationConsultAvailability = { status: "paused", accepting: false, webFormEnabled: false, contactMode: null, intakeMode: null, retentionDays: null, label: "受付停止中", message: "停止中" };

describe("the approved homepage LP", () => {
  it("keeps immediate tools and origin readable without a form or interaction", () => {
    const { container } = render(<HomeLP availability={paused} latestNews={unavailable} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "道具を使う" }).getAttribute("href")).toBe("#tools");
    expect([...container.querySelectorAll<HTMLAnchorElement>("[data-lp-tool]")].map((a) => a.getAttribute("href"))).toEqual(["/chatbot", "/chemical-database", "/laws", "/accident-news", "/accidents-analytics", "/tools/construction-calculators", "/goods"]);
    expect(container.textContent).toContain("現場に向き合う時間を、もっと。");
    expect(container.textContent).not.toContain("死亡事故で同僚を失いました");
    expect(container.querySelectorAll("[data-lp-use]")).toHaveLength(3);
    expect(container.querySelector("[data-information-preview]")?.textContent).toContain("条文や出典、集計の対象");
    expect(container.querySelector("[data-ky-scene]")).toBeNull();
    expect(screen.getByRole("link", { name: "KY用紙" }).getAttribute("href")).toBe("/ky/paper");
    expect(container.textContent).toContain("帳票は現場ごとに書式や運用が異なります");
    expect(new Set([...container.querySelectorAll("img")].map(img => img.getAttribute("src"))).size).toBe(6);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelectorAll('[data-lp-news="law"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-lp-news="accident"]')).toHaveLength(1);
    expect(container.textContent).toContain("事故がなかったことを示すものではありません");
  });

  it.each([
    [paused, "/services/automation"],
    [{ ...paused, status: "mail_available", accepting: true, contactMode: "mail_client", label: "メール相談受付中" }, "/contact/automation-email"],
    [{ ...paused, status: "available", accepting: true, webFormEnabled: true, contactMode: "web_form", intakeMode: "email", label: "Webフォーム受付中" }, "/services/automation#consult-form"],
  ] as const)("routes consultation according to the existing actual availability", (availability, href) => {
    render(<HomeLP availability={availability} latestNews={unavailable} />);
    expect(screen.getByRole("link", { name: "自動化について相談する" }).getAttribute("href")).toBe(href);
  });

  it("shows only the first current report with its source and unresolved verification", () => {
    const report = { id: "fixture", publicId: "public-fixture", title: "既存報道の見出し", href: "https://example.com/report", publishedAt: "2026-10-08T00:00:00Z", publisher: "報道媒体", industry: "業種未確認", accidentType: "事故型未確認", contextAccidentType: "unknown", contextWorkCategory: "unknown", summary: "", measure: "", verification: "reported-unverified" } as const;
    render(<HomeLP availability={paused} latestNews={{ ...unavailable, status: "live", items: [report, { ...report, title: "二番目の報道" }] }} />);
    expect(screen.getByRole("link", { name: "既存報道の見出し" }).getAttribute("href")).toBe(report.href);
    expect(screen.queryByText("二番目の報道")).toBeNull();
    expect(screen.getByText(/報道見出し・原因未確認/)).toBeTruthy();
  });

  it("replays the optional greeting only when the user asks", () => {
    const { container } = render(<HomeLP availability={paused} latestNews={unavailable} />);
    const image = container.querySelector("[data-mascot-greeting]");
    fireEvent.click(screen.getByRole("button", { name: "チワワにあいさつ" }));
    expect(container.querySelector("[data-mascot-greeting]")).not.toBe(image);
    expect(screen.getByRole("status").textContent).toBe("今日も、一つずつ確認していこう。");
  });
});
