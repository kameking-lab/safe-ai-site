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

  it("データ差し替えと一覧再マウントでは再スクロールせず、新しいハッシュ遷移では着地する", async () => {
    expect(lawRevisionCores.length).toBeGreaterThan(13);
    const target = lawRevisionCores[12]!;
    const nextTarget = lawRevisionCores[13]!;
    const consumedHashRef = { current: null as string | null };
    const list = (revisions = lawRevisionCores) => (
      <LawRevisionList
        revisions={revisions}
        consumedHashRef={consumedHashRef}
        selectedRevisionId=""
        loadingRevisionId={null}
        onSelectSummary={vi.fn()}
        onSelectForQuestion={vi.fn()}
      />
    );
    window.history.replaceState(null, "", `/laws#rev-${target.id}`);
    const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const view = render(list());

      await waitFor(() => {
        expect(document.getElementById(`rev-${target.id}`)).not.toBeNull();
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      });
      fireEvent.change(screen.getByRole("textbox", { name: "キーワード" }), {
        target: { value: target.title },
      });
      expect(document.getElementById(`rev-${target.id}`)).not.toBeNull();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      view.rerender(list([...lawRevisionCores]));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      view.unmount();
      render(list());
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      window.history.replaceState(null, "", `/laws#rev-${nextTarget.id}`);
      fireEvent(window, new Event("hashchange"));
      await waitFor(() => {
        expect(document.getElementById(`rev-${nextTarget.id}`)).not.toBeNull();
        expect(scrollIntoView).toHaveBeenCalledTimes(2);
      });
    } finally {
      if (originalScroll) {
        Object.defineProperty(Element.prototype, "scrollIntoView", originalScroll);
      } else {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    }
  });
});
