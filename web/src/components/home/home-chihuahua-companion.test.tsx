import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeChihuahuaCompanion } from "./home-chihuahua-companion";

let reduce = false;
let intersect: (entries: { isIntersecting: boolean }[]) => void;
let motionListeners: Set<() => void>;
const disconnect = vi.fn();
const strip = () => document.querySelector<HTMLImageElement>("[data-pet-strip]");
function motion(value: boolean) {
  act(() => { reduce = value; motionListeners.forEach(callback => callback()); });
}
function viewport(value: boolean) { act(() => intersect([{ isIntersecting: value }])); }

beforeEach(() => {
  reduce = false;
  motionListeners = new Set();
  disconnect.mockClear();
  vi.stubGlobal("matchMedia", () => ({ matches: reduce,
    addEventListener: (_: string, fn: () => void) => motionListeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => motionListeners.delete(fn) }));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect = disconnect;
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("approved companion motion controls", () => {
  it("SSR and offscreen output use only the small static image", () => {
    const html = renderToString(<HomeChihuahuaCompanion />);
    expect(html).toContain("/static.webp");
    expect(html).not.toContain("/idle.webp");
    render(<HomeChihuahuaCompanion />);
    expect(strip()).toBeNull();
    viewport(true);
    expect(strip()?.getAttribute("src")).toContain("/idle.webp");
    expect(strip()?.getAttribute("data-pet-playing")).toBe("false");
    fireEvent.load(strip()!);
    expect(strip()?.getAttribute("data-pet-playing")).toBe("true");
  });

  it("loads only the selected state and stops loading while paused", () => {
    render(<HomeChihuahuaCompanion />); viewport(true);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "waving" } });
    expect(strip()?.getAttribute("src")).toContain("/waving.webp");
    expect(document.querySelectorAll("[data-pet-strip]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "わんこの動きを停止" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "review" } });
    expect(strip()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "わんこの動きを再開" }));
    expect(strip()?.getAttribute("src")).toContain("/review.webp");
  });

  it("preserves manual stop through dynamic motion changes and hide/restore", () => {
    render(<HomeChihuahuaCompanion />); viewport(true);
    fireEvent.click(screen.getByRole("button", { name: "わんこの動きを停止" }));
    motion(true);
    expect((screen.getByRole("button", { name: "端末の設定で動きを停止中" }) as HTMLButtonElement).disabled).toBe(true);
    motion(false);
    expect(strip()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "安全わんこを非表示" }));
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "安全わんこを再表示" }));
    expect(screen.getByRole("button", { name: "わんこの動きを再開" })).toBeDefined();
    expect(strip()).toBeNull();
  });

  it("does not fetch strips under initial reduced motion; dynamic changes stop active motion", () => {
    reduce = true;
    render(<HomeChihuahuaCompanion />); viewport(true);
    expect(strip()).toBeNull();
    motion(false); expect(strip()).not.toBeNull();
    motion(true); expect(strip()).toBeNull();
    expect((document.querySelector("[data-pet-static]") as HTMLElement).style.visibility).toBe("visible");
  });

  it("stops offscreen and cleans up subscriptions on unmount", () => {
    const view = render(<HomeChihuahuaCompanion />); viewport(true);
    expect(strip()).not.toBeNull();
    viewport(false); expect(strip()).toBeNull();
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(motionListeners.size).toBe(0);
  });

  it("unloads motion in a hidden document and restores it only when visible", () => {
    render(<HomeChihuahuaCompanion />); viewport(true);
    const visibility = vi.spyOn(document, "visibilityState", "get");
    act(() => { visibility.mockReturnValue("hidden"); document.dispatchEvent(new Event("visibilitychange")); });
    expect(strip()).toBeNull();
    act(() => { visibility.mockReturnValue("visible"); document.dispatchEvent(new Event("visibilitychange")); });
    expect(strip()).not.toBeNull();
    visibility.mockRestore();
  });

  it("keeps the static fallback on image failure", () => {
    render(<HomeChihuahuaCompanion />); viewport(true);
    fireEvent.error(strip()!);
    expect(strip()).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("静止画");
  });
});
