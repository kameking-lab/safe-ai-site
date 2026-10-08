import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutomationConsultForm } from "./AutomationConsultForm";
vi.mock("@/lib/automation-consult/analytics", () => ({ trackAutomationEvent: vi.fn() }));
const referenceId = "AC-20261008-ABCDEF123456";
const response = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
function fill() {
  fireEvent.change(screen.getByLabelText(/返信先メール/), { target: { value: "reply@example.test" } });
  fireEvent.change(screen.getByLabelText(/困っている作業/), { target: { value: "毎週の集計と転記に時間がかかっています。" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
describe("compact LP consultation and honest retry", () => {
  beforeEach(() => { vi.unstubAllGlobals(); });
  it("submits only the required reply and task with optional defaults and displays the reference", async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, { ok: true, referenceId })); vi.stubGlobal("fetch", fetch);
    render(<AutomationConsultForm compact />); fill();
    expect(screen.queryByLabelText(/会社・団体名/)).toBeNull();
    expect(screen.queryByText(/無料相談/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await screen.findByText(`受付番号: ${referenceId}`);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ sourcePage: "/", name: "", desiredSupport: "", timing: "undecided", email: "reply@example.test" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["request_in_progress", "delivery_failed"])("freezes input and retries exactly the same payload and key for %s", async code => {
    const fetch = vi.fn().mockResolvedValueOnce(response(code === "request_in_progress" ? 409 : 503, { ok: false, error: { code, referenceId } })).mockResolvedValueOnce(response(200, { ok: true, referenceId })); vi.stubGlobal("fetch", fetch);
    render(<AutomationConsultForm compact />); fill();
    fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await screen.findByText(`照会番号: ${referenceId}`);
    const problem = screen.getByLabelText(/困っている作業/);
    expect(problem.matches(":disabled")).toBe(true);
    fireEvent.change(problem, { target: { value: "違う相談を新しく送ります。" } });
    expect(screen.queryByText(/受付されていません|受付は完了していません/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "同じ送信を確認する" }));
    await screen.findByText(`受付番号: ${referenceId}`);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe(fetch.mock.calls[0][1].headers["Idempotency-Key"]);
  });
  it("keeps the same key after a network timeout and prevents in-flight edits or double submits", async () => {
    let reject!: (error: Error) => void;
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((_resolve, no) => { reject = no; })).mockResolvedValueOnce(response(200, { ok: true, referenceId })); vi.stubGlobal("fetch", fetch);
    render(<AutomationConsultForm compact />); fill();
    const form = screen.getByLabelText(/返信先メール/).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/返信先メール/).matches(":disabled")).toBe(true);
    reject(new Error("network timeout"));
    await screen.findByText(/受付状況を確認できません/);
    fireEvent.click(screen.getByRole("button", { name: "同じ送信を確認する" }));
    await screen.findByText(`受付番号: ${referenceId}`);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe(fetch.mock.calls[0][1].headers["Idempotency-Key"]);
  });
  it.each(["queued", "dry-run"])("does not claim email delivery in %s mode", async deliveryMode => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { ok: true, referenceId, deliveryMode })));
    render(<AutomationConsultForm compact />); fill(); fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await screen.findByText(`受付番号: ${referenceId}`);
    expect(screen.queryByText(/受付メールを送信しました/)).toBeNull();
    expect(screen.getByText(deliveryMode === "queued" ? /送達完了はまだ確認していません/ : /実際のメール送信/)).not.toBeNull();
  });
  it("rejects a success-shaped response without a valid public reference", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { ok: true })));
    render(<AutomationConsultForm compact />); fill(); fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await screen.findByText(/受付状況を確認できません/);
    expect(screen.queryByText("相談を受け付けました")).toBeNull();
    expect(screen.getByLabelText(/困っている作業/).matches(":disabled")).toBe(true);
  });
  it("uses the server schema for email header controls before making any request", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<AutomationConsultForm compact />); fill();
    fireEvent.change(screen.getByLabelText(/呼び名/), { target: { value: "name\u0000hidden" } });
    fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await waitFor(() => expect(screen.getByLabelText(/呼び名/).getAttribute("aria-invalid")).toBe("true"));
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["delivery_failed", "rate_limited"], ["delivery_failed", "intake_unavailable"],
    ["timeout", "rate_limited"], ["timeout", "intake_unavailable"],
  ])("preserves prior uncertain %s across a later %s rejection", async (firstCode, secondCode) => {
    const fetch = vi.fn();
    if (firstCode === "timeout") fetch.mockRejectedValueOnce(new Error("timeout"));
    else fetch.mockResolvedValueOnce(response(503, { ok: false, error: { code: firstCode, referenceId } }));
    fetch.mockResolvedValueOnce(response(secondCode === "rate_limited" ? 429 : 503, { ok: false, error: { code: secondCode } }));
    fetch.mockResolvedValueOnce(response(200, { ok: true, referenceId }));
    vi.stubGlobal("fetch", fetch); render(<AutomationConsultForm compact />); fill();
    fireEvent.click(screen.getByRole("button", { name: "相談を送信する" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "同じ送信を確認する" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "同じ送信を確認する" }).hasAttribute("disabled")).toBe(false));
    expect(screen.getByLabelText(/困っている作業/).matches(":disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "同じ送信を確認する" }));
    await screen.findByText(`受付番号: ${referenceId}`);
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const call of fetch.mock.calls.slice(1)) {
      expect(call[1].body).toBe(fetch.mock.calls[0][1].body);
      expect(call[1].headers["Idempotency-Key"]).toBe(fetch.mock.calls[0][1].headers["Idempotency-Key"]);
    }
  });

});
