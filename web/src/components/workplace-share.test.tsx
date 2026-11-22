import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPTIONAL_TRACKING_CONSENT_KEY } from "@/lib/analytics-privacy";
import { workplaceShareUrl } from "@/lib/workplace-share";
import { WorkplaceShare } from "./workplace-share";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/track-events", () => ({ trackEvent }));

const url = workplaceShareUrl("/morning-briefing", "scaffold-fall");
const summary = "手すりと開口部を確認。\n出典：https://www.mhlw.go.jp/";
const writeText = vi.fn();

function openShare() {
  render(<WorkplaceShare kind="morning" title="足場の朝礼" summary={summary} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "職場に共有" }));
}

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  trackEvent.mockClear();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(navigator, "share");
  localStorage.clear();
});

describe("職場への共有", () => {
  it("出典と公開の着地リンクをコピー・LINE向けに入れ、コピー成功を1回計測する", async () => {
    openShare();
    expect(screen.queryByRole("button", { name: "共有シートを開く" })).toBeNull();
    expect(screen.getByRole("link", { name: "Xで共有" })).toBeDefined();
    expect(trackEvent).not.toHaveBeenCalled();

    const expected = `足場の朝礼\n${summary}\n\nhttps://www.anzen-ai-portal.jp/morning-briefing?utm_source=share#scaffold-fall`;
    const lineUrl = new URL((screen.getByRole("link", { name: "LINEで送る" }) as HTMLAnchorElement).href);
    expect(lineUrl.searchParams.get("text")).toBe(expected);
    fireEvent.click(screen.getByRole("button", { name: "要点とリンクをコピー" }));
    expect(await screen.findByText("コピーしました")).toBeDefined();
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(trackEvent.mock.calls).toEqual([["workplace_share", { content_kind: "morning", method: "copy" }]]);
  });

  it("共有シートの取消しは数えず、次の成功だけ数える", async () => {
    const nativeShare = vi.fn().mockRejectedValueOnce(new DOMException("", "AbortError")).mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: nativeShare });
    openShare();
    const button = screen.getByRole("button", { name: "共有シートを開く" });
    fireEvent.click(button);
    expect(trackEvent).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(nativeShare).toHaveBeenLastCalledWith({ title: "足場の朝礼", text: `足場の朝礼\n${summary}`, url });
    await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(1));
    expect(trackEvent).toHaveBeenCalledWith("workplace_share", { content_kind: "morning", method: "native" });
  });

  it("コピーを拒否されたときは手動で選択できる共有文を表示する", async () => {
    writeText.mockRejectedValue(new DOMException("", "NotAllowedError"));
    openShare();
    fireEvent.click(screen.getByRole("button", { name: "要点とリンクをコピー" }));
    const manualCopy = await screen.findByRole<HTMLTextAreaElement>("textbox", { name: "共有文を選択してコピー" });
    expect(manualCopy.value).toContain(url);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("RAの計測は許可時に方式だけを送り、GAに共有文を送らない", async () => {
    const fetchEvent = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchEvent);
    render(<WorkplaceShare kind="chemical_ra" title="RA結果" summary="物質：トルエン" url={workplaceShareUrl("/chemical-ra")} />);
    fireEvent.click(screen.getByRole("button", { name: "結果の要約を共有" }));
    const copy = screen.getByRole("button", { name: "要点とリンクをコピー" });
    fireEvent.click(copy);
    await screen.findByText("コピーしました");
    expect(fetchEvent).not.toHaveBeenCalled();

    localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, "granted");
    fireEvent.click(copy);
    await waitFor(() => expect(fetchEvent).toHaveBeenCalledTimes(1));
    expect(fetchEvent).toHaveBeenCalledWith("/api/chemical-ra/share-event", {
      method: "POST",
      headers: { "X-Share-Method": "copy" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true,
    });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
