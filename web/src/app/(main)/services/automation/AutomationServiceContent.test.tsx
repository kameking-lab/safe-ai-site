import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AutomationServiceContent } from "./AutomationServiceContent";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

const AVAILABLE: AutomationConsultAvailability = {
  status: "available",
  accepting: true,
  webFormEnabled: true,
  contactMode: "web_form",
  intakeMode: "email",
  retentionDays: 30,
  label: "Webフォーム受付中",
  message: "初回30分の相談は無料です。",
};

const MAIL_AVAILABLE: AutomationConsultAvailability = {
  status: "mail_available",
  accepting: true,
  webFormEnabled: false,
  contactMode: "mail_client",
  intakeMode: null,
  retentionDays: null,
  label: "メール相談受付中",
  message: "お使いのメールアプリで相談文を作成します。",
};

const PAUSED: AutomationConsultAvailability = {
  status: "paused",
  accepting: false,
  webFormEnabled: false,
  contactMode: null,
  intakeMode: null,
  retentionDays: null,
  label: "受付停止中",
  message: "現在は受付を停止しています。",
};

describe("AutomationServiceContent", () => {
  it("受付停止時は初期画面の操作を料金1件に限定する", () => {
    const { container } = render(
      <AutomationServiceContent availability={PAUSED} />,
    );
    const overview = container.querySelector("#overview");
    expect(overview).not.toBeNull();
    expect(within(overview as HTMLElement).getAllByRole("link")).toHaveLength(1);
    expect(
      within(overview as HTMLElement)
        .getByRole("link", { name: "料金・事例を見る" })
        .getAttribute("href"),
    ).toBe("#pricing");
    expect(overview?.querySelectorAll('[data-primary-action="true"]')).toHaveLength(1);
    expect(overview?.querySelectorAll('[data-secondary-action="true"]')).toHaveLength(0);
  });

  it("開発方針は主領域で説明せず独立ページへリンクする", () => {
    render(<AutomationServiceContent availability={MAIL_AVAILABLE} />);
    expect(
      screen
        .getByRole("link", { name: "プロジェクトと編集方針を見る" })
        .getAttribute("href"),
    ).toBe("/about/project-story");
  });

  it("初期画面は主サービス・料金・実受付状態を短く示す", () => {
    const { container } = render(
      <AutomationServiceContent availability={MAIL_AVAILABLE} />,
    );
    const overview = container.querySelector("#overview") as HTMLElement;
    expect(
      within(overview).getByRole("heading", {
        level: 1,
        name: "業務自動化・講習を小さな一件から。",
      }),
    ).toBeDefined();
    expect(overview.textContent).toContain("初回30分は無料");
    expect(overview.textContent).toContain("税込33,000円から");
    expect(overview.textContent).toContain("メール相談受付中");
    expect((overview.textContent ?? "").length).toBeLessThanOrEqual(150);
    expect(overview.querySelectorAll('[data-primary-action="true"]')).toHaveLength(1);
    expect(overview.querySelectorAll('[data-secondary-action="true"]')).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("LCP候補の装飾画像を初期HTMLへ出さない", () => {
    const { container } = render(
      <AutomationServiceContent availability={AVAILABLE} />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector("[data-mascot-variant]")).toBeNull();
  });

  it("料金3件と想定例3件だけを常時描画する", () => {
    const { container } = render(
      <AutomationServiceContent availability={AVAILABLE} />,
    );
    expect(
      container.querySelector("[data-primary-pricing]")?.children,
    ).toHaveLength(3);
    const examples = container.querySelector("#model-cases") as HTMLElement;
    expect(within(examples).getAllByRole("article")).toHaveLength(3);
    expect(within(examples).getByText("週次CSV集計")).toBeDefined();
    expect(within(examples).getByText("KY・点検記録の月次集計")).toBeDefined();
    expect(within(examples).getByText("90分の社内AI研修")).toBeDefined();
    expect(container.querySelector("#faq")).toBeNull();
  });

  it("無料の安全研修・AI実務研修・低リスク建設計算を相談導線と分けて案内する", () => {
    render(<AutomationServiceContent availability={MAIL_AVAILABLE} />);
    for (const [name, href] of [
      ["無料の安全研修教材を見る", "/training/safety-seminars"],
      ["無料のAI実務研修を見る", "/training/ai-seminars"],
      ["建設計算ツールを見る", "/tools/construction-calculators"],
    ] as const) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
    expect(screen.queryByRole("link", { name: /許容荷重|構造計算|安全判定/u })).toBeNull();
  });

  it("答えに必要な4セクションを料金・事例・サービス・相談の順に持つ", () => {
    const { container } = render(
      <AutomationServiceContent availability={AVAILABLE} />,
    );
    const ids = [...container.querySelectorAll("[data-automation-service] > section[id]")].map(
      (section) => section.id,
    );
    expect(ids).toEqual([
      "overview",
      "pricing",
      "model-cases",
      "services",
      "consult-form",
    ]);
  });

  it("税込・範囲・納期・修正・対象外を料金欄で確認できる", () => {
    const { container } = render(
      <AutomationServiceContent availability={AVAILABLE} />,
    );
    const pricing = container.querySelector("#pricing") as HTMLElement;
    expect(pricing.textContent).toContain("表示額はすべて消費税込み");
    expect(pricing.textContent).toContain("33,000〜88,000円");
    expect(pricing.textContent).toContain("110,000〜440,000円");
    expect(pricing.textContent).toContain("軽微修正1回");
    expect(pricing.textContent).toContain("修正2回");
    expect(within(pricing).getByText("追加料金と対象外を確認")).toBeDefined();
    expect(pricing.textContent).toContain("見積前に費用は発生しません");
  });

  it("実メールアドレス・架空実績・価格保証を本文へ露出しない", () => {
    const { container } = render(
      <AutomationServiceContent availability={AVAILABLE} />,
    );
    const text = container.textContent ?? "";
    const privateRomanizedName = ["ka", "neta", "-", "yoshita"].join("");
    expect(text.toLowerCase()).not.toContain(privateRomanizedName);
    const privateEmailLocal = ["ken", "shi", ".y", "cc"].join("");
    expect(text.toLowerCase()).not.toContain(privateEmailLocal);
    expect(text).not.toMatch(/@outlook|@gmail/i);
    expect(text).not.toMatch(/業界最安|最安保証|満足度\d|導入実績\d|必ず削減/);
    expect(text).toContain("実在顧客の実績ではなく");
  });

  it("主要操作は44px以上で詳細はキーボード操作可能なsummaryを使う", () => {
    render(<AutomationServiceContent availability={AVAILABLE} />);
    expect(
      screen.getByRole("link", { name: "Webフォームで相談する" }).className,
    ).toContain("min-h-[44px]");
    const summary = screen
      .getByText("追加料金と対象外を確認")
      .closest("summary");
    expect(summary?.className).toContain("min-h-[44px]");
  });

  it("代表3料金と3事例をdetails外で先に表示する", () => {
    const { container } = render(
      <AutomationServiceContent availability={MAIL_AVAILABLE} />,
    );
    const pricing = container.querySelector("#pricing") as HTMLElement;
    const examples = container.querySelector("#model-cases") as HTMLElement;
    expect(pricing.querySelectorAll(":scope > div[data-primary-pricing] > article")).toHaveLength(3);
    expect(examples.querySelectorAll("article")).toHaveLength(3);
    expect(within(pricing).getByText("追加料金と対象外を確認").closest("details")?.open).toBe(false);
  });

  it("熱中症相談は粗い相談種別だけをフォームへ引き継ぐ", async () => {
    window.history.replaceState(
      null,
      "",
      "/services/automation?consultationType=wbgt-weather-notifications#consult-form",
    );
    render(<AutomationServiceContent availability={AVAILABLE} />);
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/相談種別/) as HTMLSelectElement).value,
      ).toBe("wbgt-weather-notifications");
    });
    expect(
      (screen.getByLabelText(/現在困っていること/) as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(screen.queryByLabelText(/返信用メールアドレス/)).toBeNull();
    window.history.replaceState(null, "", "/");
  });

  it("メール受付時はWebフォームを閉じ、利用者のメールアプリを使う", () => {
    const { container } = render(
      <AutomationServiceContent availability={MAIL_AVAILABLE} />,
    );
    expect(screen.queryByLabelText(/お名前・担当者名/)).toBeNull();
    expect(screen.queryByLabelText(/返信用メールアドレス/)).toBeNull();
    expect(
      container.querySelector('form[action="/contact/automation-email/draft"]'),
    ).not.toBeNull();
    expect(
      screen.getAllByRole("button", { name: "メールで相談する" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("textbox", { name: "コピー用の相談テンプレート" }),
    ).toHaveProperty("readOnly", true);
    expect(window.localStorage.length).toBe(0);
    expect(
      container.querySelector('[data-primary-action="true"]')?.getAttribute("href"),
    ).toBe("/contact/automation-email");
    expect(container.textContent).not.toContain("Webフォーム受付中");
  });
});
