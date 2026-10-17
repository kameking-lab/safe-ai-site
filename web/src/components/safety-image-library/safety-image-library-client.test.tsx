import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafetyImageLibraryCardTheme } from "@/data/safety-image-library/client-metadata";
import { SafetyImageLibraryClient } from "./safety-image-library-client";
import { HUB_PATH, listStorageKey } from "./library-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => HUB_PATH }));

const themes: SafetyImageLibraryCardTheme[] = Array.from({ length: 45 }, (_, index) => ({
  order: index + 1,
  slug: `helmet-${index + 1}`,
  title: `保護帽 ${index + 1}`,
  category: "protective-equipment",
  categoryLabel: "保護具",
  signFormat: "平板標識",
  recommendedSize: "A4",
  commonWording: "保護帽",
  multilingualPriority: "high",
  editableNumber: false,
  texts: { ja: "保護帽", vi: "helmet", "zh-CN": "helmet", en: "helmet", id: "helmet" },
  tags: ["保護帽"],
  uses: ["掲示"],
  orientation: "landscape",
  recommended: false,
  previewPath: "/sign-test.png",
  detailPath: `/materials/safety-images/helmet-${index + 1}`,
}));

type SavedList = {
  query: string;
  category: string;
  sort: string;
  visibleCount: number;
  scrollY: number;
};

const readSaved = (): SavedList => JSON.parse(window.sessionStorage.getItem(listStorageKey(HUB_PATH))!);

function chooseLatestVisibleFilters() {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "保護帽" } });
  fireEvent.change(screen.getByLabelText("カテゴリ"), { target: { value: "protective-equipment" } });
  fireEvent.change(screen.getByLabelText("並び順"), { target: { value: "new" } });
  fireEvent.click(screen.getByRole("button", { name: /次の20点を表示/ }));
}

function openFirstDetail(container: HTMLElement) {
  fireEvent.click(container.querySelector("article a")!);
}

describe("SafetyImageLibraryClient navigation snapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", HUB_PATH);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 10000 });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("writes current filters, count and scroll on explicit detail navigation during delayed restoration", () => {
    window.sessionStorage.setItem(listStorageKey(HUB_PATH), JSON.stringify({ scrollY: 90000 }));
    const { container } = render(<SafetyImageLibraryClient themes={themes} />);
    act(() => vi.advanceTimersByTime(0));
    chooseLatestVisibleFilters();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 513 });

    openFirstDetail(container);
    expect(readSaved()).toMatchObject({
      query: "保護帽", category: "protective-equipment", sort: "new", visibleCount: 40, scrollY: 513,
    });
    fireEvent.scroll(window);
    act(() => vi.advanceTimersByTime(1200));
    expect(readSaved().scrollY).toBe(513);
  });

  it("saves a second explicit navigation even with a cached leaving flag, then resumes auto-save after Back", () => {
    const { container } = render(<SafetyImageLibraryClient themes={themes} />);
    act(() => vi.advanceTimersByTime(0));
    openFirstDetail(container);
    const firstSnapshot = window.sessionStorage.getItem(listStorageKey(HUB_PATH));

    chooseLatestVisibleFilters();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 731 });
    fireEvent.scroll(window);
    expect(window.sessionStorage.getItem(listStorageKey(HUB_PATH))).toBe(firstSnapshot);

    openFirstDetail(container);
    expect(readSaved()).toMatchObject({
      query: "保護帽", category: "protective-equipment", sort: "new", visibleCount: 40, scrollY: 731,
    });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    act(() => vi.advanceTimersByTime(0));
    act(() => vi.advanceTimersByTime(80));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "保護帽 1" } });
    expect(readSaved().query).toBe("保護帽 1");
  });
});
