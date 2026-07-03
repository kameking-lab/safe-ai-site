import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ContributeClient } from "./contribute-client";

// fetchContributeContext は fetch(`/api/meeting/contribute/:token`) を叩くだけなので、
// グローバル fetch を差し替えて GET レスポンスの形だけ模倣する（Supabase 未設定のdev環境でも検証可能に）。
function mockContext(mine: null | { contributionId: string; payload: Record<string, unknown>; submittedAt: string }, historyCount = 0) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      context: { siteName: "○○ビル新築工事", workDate: "2026-07-03" },
      mine,
      historyCount,
    }),
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("/safety-diary/contribute/[token] 柱0 結論カード（協力会社入力フォーム）", () => {
  it("未送信（初めて開く）: 結論カードで『未送信』と分かる", async () => {
    mockContext(null);
    render(<ContributeClient token="tok-1" />);
    await waitFor(() => expect(screen.getByRole("status")).toBeDefined());
    expect(screen.getByRole("status").textContent).toContain("未送信");
  });

  it("編集中（前回の送信あり・再訪問）: 結論カードで『編集中』と分かる", async () => {
    mockContext({ contributionId: "cid-1", payload: { companyName: "○○建設" }, submittedAt: "2026-07-02T00:00:00Z" }, 2);
    render(<ContributeClient token="tok-2" />);
    await waitFor(() => expect(screen.getByRole("status")).toBeDefined());
    expect(screen.getByRole("status").textContent).toContain("編集中");
  });

  it("送信済み（送信直後）: 結論カードで『送信済み』に切り替わり、続けて編集するボタンが44px", async () => {
    mockContext(null);
    render(<ContributeClient token="tok-3" />);
    await waitFor(() => expect(screen.getByRole("status")).toBeDefined());

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, contributionId: "cid-new", submittedAt: "2026-07-03T00:00:00Z" }),
    } as Response);
    const companyInput = screen.getByPlaceholderText("例: ○○建設");
    fireEvent.change(companyInput, { target: { value: "△△工業" } });
    fireEvent.click(screen.getByRole("button", { name: /この内容で送信/ }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("送信済み"));
    const continueButton = screen.getByRole("button", { name: "続けて編集する" });
    expect(continueButton.className).toContain("min-h-[44px]");
  });

  it("結論カードは1画面1枚のみ（role=status が単一）", async () => {
    mockContext(null);
    render(<ContributeClient token="tok-4" />);
    await waitFor(() => expect(screen.getAllByRole("status").length).toBe(1));
  });
});
