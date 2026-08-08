import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutomationConsultForm } from "./AutomationConsultForm";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@/lib/track-events", () => ({ trackEvent }));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function fillStepOne() {
  fireEvent.change(screen.getByLabelText(/相談種別/), {
    target: { value: "automation" },
  });
  fireEvent.change(screen.getByLabelText(/現在困っていること/), {
    target: { value: "毎週5つのCSVを手作業で結合し、重複を確認しています。" },
  });
  fireEvent.change(screen.getByLabelText(/自動化・講習・資料作成の希望/), {
    target: { value: "CSVを自動で結合し、定型レポートを作成したいです。" },
  });
  fireEvent.click(screen.getByRole("button", { name: /返信先の入力へ進む/ }));
}

function fillStepTwo() {
  fireEvent.change(screen.getByLabelText(/お名前・担当者名/), {
    target: { value: "山田 太郎" },
  });
  fireEvent.change(screen.getByLabelText(/返信用メールアドレス/), {
    target: { value: "yamada@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/会社・団体名/), {
    target: { value: "テスト建設" },
  });
  fireEvent.change(screen.getByLabelText(/現在利用しているツール/), {
    target: { value: "Excel" },
  });
  fireEvent.change(screen.getByLabelText(/希望時期/), {
    target: { value: "within-1-month" },
  });
  fireEvent.change(screen.getByLabelText(/予算帯/), {
    target: { value: "100000-300000" },
  });
  fireEvent.change(screen.getByLabelText(/オンライン・現地等の希望/), {
    target: { value: "online" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /個人情報の取扱いに同意する/ }));
}

describe("AutomationConsultForm", () => {
  beforeEach(() => {
    trackEvent.mockClear();
    vi.unstubAllGlobals();
  });

  it("必須エラーの要約へフォーカスし、項目とエラーを関連付ける", async () => {
    render(<AutomationConsultForm />);
    fireEvent.click(screen.getByRole("button", { name: /返信先の入力へ進む/ }));

    const summary = await screen.findByRole("alert");
    expect(document.activeElement).toBe(summary);
    const type = screen.getByLabelText(/相談種別/);
    expect(type.getAttribute("aria-invalid")).toBe("true");
    expect(type.getAttribute("aria-describedby")).toContain("automation-consult-type-error");
    expect(
      screen.getByRole("link", { name: /相談種別：相談種別を選択してください/ }).getAttribute("href"),
    ).toBe("#automation-consult-type");
    expect(
      trackEvent.mock.calls.some(
        ([event]) => event === "automation_form_validation_error",
      ),
    ).toBe(true);
  });

  it("熱中症導線は相談種別だけを初期選択し、本文やPIIを補わない", () => {
    render(
      <AutomationConsultForm initialConsultationType="heat-illness-training" />,
    );
    expect(
      (screen.getByLabelText(/相談種別/) as HTMLSelectElement).value,
    ).toBe("heat-illness-training");
    expect(
      (screen.getByLabelText(/現在困っていること/) as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      (
        screen.getByLabelText(
          /自動化・講習・資料作成の希望/,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");
  });

  it("URL prefillをallowlist境界で解決し、ページ本体を動的SSRにしない", async () => {
    window.history.replaceState(
      null,
      "",
      "/services/automation?consultationType=training-materials#consult-form",
    );
    render(<AutomationConsultForm />);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/相談種別/) as HTMLSelectElement).value,
      ).toBe("training-materials");
    });
    expect(
      (screen.getByLabelText(/現在困っていること/) as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      (
        screen.getByLabelText(
          /自動化・講習・資料作成の希望/,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    window.history.replaceState(null, "", "/");
  });

  it("未知・複数queryをprefillへ混入させない", async () => {
    window.history.replaceState(
      null,
      "",
      "/services/automation?consultationType=training&email=hidden%40example.test",
    );
    render(<AutomationConsultForm />);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/相談種別/) as HTMLSelectElement).value,
      ).toBe("");
    });
    expect(document.body.textContent).not.toContain("hidden@example.test");
    window.history.replaceState(null, "", "/");
  });

  it("PF-064 UTM付きの安全な相談種別だけを引き継ぎ、UTM値はform stateへ入れない", async () => {
    window.history.replaceState(
      null,
      "",
      "/services/automation?consultationType=training&utm_source=home&utm_medium=cta",
    );
    render(<AutomationConsultForm />);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/相談種別/) as HTMLSelectElement).value,
      ).toBe("training");
    });
    expect(document.body.textContent).not.toContain("utm_source");
    window.history.replaceState(null, "", "/");
  });

  it("PF-065 入力中の再読み込みを警告し、PIIを永続保存しない", () => {
    render(<AutomationConsultForm />);
    const problem = screen.getByLabelText(/現在困っていること/);
    fireEvent.focus(problem);
    fireEvent.change(problem, {
      target: { value: "入力途中の相談内容です" },
    });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("段階入力し、API契約に一致する本文とIdempotency-Keyを送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        ok: true,
        referenceId: "AUTO-PRIVATE-001",
        receivedAt: "2026-07-23T10:00:00+09:00",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AutomationConsultForm />);
    fillStepOne();
    expect(screen.getByRole("heading", { name: "返信先と希望条件を教えてください" })).toBeDefined();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: /無料相談を送信/ }));

    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/automation-consult");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/^[A-Za-z0-9._:-]{16,100}$/);
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      consultationType: "automation",
      name: "山田 太郎",
      email: "yamada@example.com",
      organization: "テスト建設",
      timing: "within-1-month",
      budget: "100000-300000",
      deliveryPreference: "online",
      privacyConsent: true,
      website: "",
      sourcePage: "/services/automation",
    });
    expect(screen.queryByText("AUTO-PRIVATE-001")).toBeNull();
  });

  it("送信中の連打を1回に抑え、同じ相談を二重送信しない", async () => {
    let resolveFetch: ((value: ReturnType<typeof jsonResponse>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof jsonResponse>>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<AutomationConsultForm />);
    fillStepOne();
    fillStepTwo();
    const submit = screen.getByRole("button", { name: /無料相談を送信/ });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    resolveFetch?.(jsonResponse(200, { ok: true, referenceId: "PRIVATE" }));
    await screen.findByRole("status");
  });

  it("preview dry-runを正式受付や実メール送信として表示しない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          ok: true,
          referenceId: "AUTO-PRIVATE-DRYRUN",
          deliveryMode: "dry-run",
        }),
      ),
    );
    render(<AutomationConsultForm />);
    fillStepOne();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: /無料相談を送信/ }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("入力内容を検証しました");
    expect(status.textContent).toContain("実際のメール送信");
    expect(status.textContent).toContain("正式な相談受付");
    expect(status.textContent).not.toContain("AUTO-PRIVATE-DRYRUN");
    expect(screen.queryByText("相談を受け付けました")).toBeNull();
  });

  it("配信未設定や配信失敗を成功と表示しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(503, {
        ok: false,
        error: { code: "delivery_not_configured", message: "internal detail" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AutomationConsultForm />);
    fillStepOne();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: /無料相談を送信/ }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("相談受付の準備中");
    expect(alert.textContent).not.toContain("internal detail");
    expect(screen.queryByText("相談を受け付けました")).toBeNull();
  });

  it("本文・氏名・メール・会社名・受付番号をanalyticsへ渡さない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { ok: true, referenceId: "AUTO-SECRET-123" }),
      ),
    );
    render(<AutomationConsultForm />);
    fillStepOne();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: /無料相談を送信/ }));
    await screen.findByRole("status");

    const analyticsPayload = JSON.stringify(trackEvent.mock.calls);
    expect(analyticsPayload).not.toContain("山田");
    expect(analyticsPayload).not.toContain("yamada@example.com");
    expect(analyticsPayload).not.toContain("テスト建設");
    expect(analyticsPayload).not.toContain("CSVを自動");
    expect(analyticsPayload).not.toContain("AUTO-SECRET-123");
    expect(trackEvent).toHaveBeenCalledWith("automation_form_success", {
      page: "/services/automation",
      consultation_type: "automation",
      budget_band: "100000-300000",
      success: true,
    });
  });

  it("入力をlocalStorageへ保存せず、HTMLとして解釈しない", async () => {
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<AutomationConsultForm />);
    fireEvent.change(screen.getByLabelText(/現在困っていること/), {
      target: { value: '<img src=x onerror="alert(1)">毎週の集計を自動化したい' },
    });
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it("フォーム開始イベントは最初の操作時に一度だけ送る", async () => {
    render(<AutomationConsultForm />);
    const select = screen.getByLabelText(/相談種別/);
    fireEvent.focus(select);
    fireEvent.blur(select);
    fireEvent.focus(screen.getByLabelText(/現在困っていること/));
    await waitFor(() => {
      expect(
        trackEvent.mock.calls.filter(([event]) => event === "automation_form_start"),
      ).toHaveLength(1);
    });
  });
});
