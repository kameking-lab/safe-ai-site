import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CertFinderPage from "./page";
import { TransientQueryBridgeProvider } from "@/components/home-safety-cockpit/transient-query-bridge";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <header>
      <h1>{title}</h1>
    </header>
  ),
}));

async function renderPage(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const ui = await CertFinderPage({
    searchParams: Promise.resolve(searchParams),
  });
  return render(
    <TransientQueryBridgeProvider>{ui}</TransientQueryBridgeProvider>,
  );
}

describe("/education-certification/finder server query boundary", () => {
  it("serverでallowlist queryをtyped初期値にしてからclientへ渡す", async () => {
    await renderPage({
      q: "玉掛け",
      industry: "construction",
      role: "safety-manager",
    });

    expect(
      screen.getByText("前ページの条件を引き継ぎました"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", {
        name: /フリー入力/,
      }) as HTMLInputElement).value,
    ).toBe("玉掛け");
    expect(
      screen
        .getByRole("button", { name: "建設業" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      (screen.getByRole("textbox", {
        name: "立場・担当",
      }) as HTMLInputElement).value,
    ).toBe("安全衛生担当者");
  });

  it("Next.jsが重複値をstring[]で渡した場合は全prefillを拒否する", async () => {
    await renderPage({
      q: ["足場", "石綿"],
      industry: "construction",
    });

    expect(
      screen.getByText("URLの条件は引き継いでいません"),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", {
        name: /フリー入力/,
      }) as HTMLInputElement).value,
    ).toBe("");
    expect(
      screen
        .getByRole("button", { name: "建設業" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("未知のraw queryをDOMや入力へ渡さない", async () => {
    const raw = "private-field-<script>alert(1)</script>";
    const { container } = await renderPage({
      q: raw,
      unknown: "private-site-name",
    });

    expect(
      screen.getByText("URLの条件は引き継いでいません"),
    ).toBeTruthy();
    expect(container.textContent).not.toContain(raw);
    expect(container.textContent).not.toContain("private-site-name");
    expect(container.innerHTML).not.toContain("<script>alert(1)</script>");
  });

  it("queryなしの直接訪問は空状態を維持する", async () => {
    await renderPage({});

    expect(
      screen.queryByText("前ページの条件を引き継ぎました"),
    ).toBeNull();
    expect(
      screen.queryByText("URLの条件は引き継いでいません"),
    ).toBeNull();
    expect(
      (screen.getByRole("textbox", {
        name: /フリー入力/,
      }) as HTMLInputElement).value,
    ).toBe("");
  });
});
