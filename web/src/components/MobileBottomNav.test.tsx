import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMobilePrimaryItems, MobileBottomNav } from "./MobileBottomNav";

vi.mock("@/lib/track-events", () => ({ trackEvent: vi.fn() }));

describe("MobileBottomNav", () => {
  it("季節キャンペーンを置かず、主機能5操作を常時表示する", () => {
    render(<MobileBottomNav date={new Date("2026-07-29T03:00:00Z")} />);
    const nav = screen.getByRole("navigation", {
      name: "モバイル ボトムナビゲーション",
    });
    const links = Array.from(nav.querySelectorAll("a"));
    expect(links.map((link) => link.textContent)).toEqual([
      "ホーム",
      "化学RA",
      "法令AI",
      "学ぶ",
      "メニュー",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/chemical-ra",
      "/chatbot",
      "/education-certification",
      "/features",
    ]);
    expect(nav.querySelectorAll("button")).toHaveLength(0);
    for (const link of links) {
      expect(link.className).toContain("tap-target");
    }
  });

  it("季節に関係なく化学物質RAを維持する", () => {
    const winter = getMobilePrimaryItems(
      new Date("2026-12-01T03:00:00Z"),
    );
    expect(winter.map((item) => item.label)).toEqual([
      "ホーム",
      "化学RA",
      "法令AI",
      "学ぶ",
      "メニュー",
    ]);
    expect(winter[1]?.href).toBe("/chemical-ra");
    render(<MobileBottomNav date={new Date("2026-12-01T03:00:00Z")} />);
    expect(screen.getByRole("link", { name: "メニュー" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "熱中症" })).toBeNull();
  });
});
