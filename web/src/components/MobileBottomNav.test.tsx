import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMobilePrimaryItems, MobileBottomNav } from "./MobileBottomNav";

vi.mock("@/lib/track-events", () => ({ trackEvent: vi.fn() }));

describe("MobileBottomNav", () => {
  it("夏季はホーム・熱中症・法令AI・学ぶ・メニューの5操作だけを常時表示する", () => {
    render(<MobileBottomNav date={new Date("2026-07-29T03:00:00Z")} />);
    const nav = screen.getByRole("navigation", {
      name: "モバイル ボトムナビゲーション",
    });
    const links = Array.from(nav.querySelectorAll("a"));
    expect(links.map((link) => link.textContent)).toEqual([
      "ホーム",
      "熱中症",
      "法令AI",
      "学ぶ",
      "メニュー",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/heat-illness-prevention",
      "/chatbot",
      "/education-certification",
      "/features",
    ]);
    expect(nav.querySelectorAll("button")).toHaveLength(0);
    for (const link of links) {
      expect(link.className).toContain("tap-target");
    }
  });

  it("JSTの夏季外は熱中症枠を今日の安全へ縮小し、他4操作を維持する", () => {
    const winter = getMobilePrimaryItems(
      new Date("2026-12-01T03:00:00Z"),
    );
    expect(winter.map((item) => item.label)).toEqual([
      "ホーム",
      "今日",
      "法令AI",
      "学ぶ",
      "メニュー",
    ]);
    expect(winter[1]?.href).toBe("/risk");
    render(<MobileBottomNav date={new Date("2026-12-01T03:00:00Z")} />);
    expect(screen.getByRole("link", { name: "メニュー" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "熱中症" })).toBeNull();
  });
});
