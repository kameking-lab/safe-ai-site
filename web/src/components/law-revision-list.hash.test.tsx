import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import { LawRevisionList } from "./law-revision-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe("法改正一覧の個別着地", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/laws");
    window.localStorage.clear();
  });

  it("初期12件より後の改正へ一度だけスクロールし、後の絞り込みでは戻らない", async () => {
    expect(lawRevisionCores.length).toBeGreaterThan(12);
    const target = lawRevisionCores[12]!;
    window.history.replaceState(null, "", `/laws#rev-${target.id}`);
    const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <LawRevisionList
          revisions={lawRevisionCores}
          selectedRevisionId=""
          loadingRevisionId={null}
          onSelectSummary={vi.fn()}
          onSelectForQuestion={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(document.getElementById(`rev-${target.id}`)).not.toBeNull();
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      });
      fireEvent.change(screen.getByRole("textbox", { name: "キーワード" }), {
        target: { value: target.title },
      });
      expect(document.getElementById(`rev-${target.id}`)).not.toBeNull();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      if (originalScroll) {
        Object.defineProperty(Element.prototype, "scrollIntoView", originalScroll);
      } else {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    }
  });
});
