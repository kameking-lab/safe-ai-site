import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HubFilter } from "./hub-filter";
import type { AllIndustriesSummary } from "@/lib/accident-analysis";
import {
  TransientQueryBridgeProvider,
  useTransientQueryBridge,
} from "@/components/home-safety-cockpit/transient-query-bridge";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const industries: AllIndustriesSummary["industries"] = [
  {
    slug: "construction",
    label: "建設業",
    icon: "🏗",
    tagline: "墜落・転落の多い業種",
    colorClass: "amber",
    total: 100,
    fatal: 5,
    topType: "墜落、転落",
    topTypes: ["墜落、転落"],
    peakMonths: [7],
  },
];

afterEach(() => {
  replace.mockReset();
  push.mockReset();
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

function PendingQuestionProbe() {
  const { peekChatQuestion } = useTransientQueryBridge();
  return (
    <button
      type="button"
      onClick={() => {
        document.body.dataset.pendingQuestion =
          peekChatQuestion()?.question ?? "";
      }}
    >
      一時質問を確認
    </button>
  );
}

function renderHub({ probe = false }: { probe?: boolean } = {}) {
  return render(
    <TransientQueryBridgeProvider>
      <HubFilter
        industries={industries}
        yearRange={{ min: 2019, max: 2023 }}
      />
      {probe ? <PendingQuestionProbe /> : null}
    </TransientQueryBridgeProvider>,
  );
}

describe("HubFilter URL privacy", () => {
  it("入力キーワードは即時絞り込みに使い、固定選択変更後もURLへ送らない", () => {
    window.history.replaceState({}, "", "/accidents-reports");
    renderHub();
    const keyword = "山田太郎 新宿A現場";

    fireEvent.change(screen.getByRole("searchbox", { name: "事故内容・原因キーワード" }), {
      target: { value: keyword },
    });
    expect(screen.getByText("条件に合致する業種レポートはありません")).toBeDefined();
    expect(window.location.search).toBe("");
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("combobox", { name: "事故型フィルタ" }), {
      target: { value: "fall" },
    });
    expect(replace).toHaveBeenCalledWith(
      "/accidents-reports?type=fall",
      { scroll: false },
    );
    expect(JSON.stringify(replace.mock.calls)).not.toContain(keyword);
    expect(JSON.stringify(replace.mock.calls)).not.toContain(encodeURIComponent(keyword));
  });

  it("業種別の合成質問をURLやstorageへ残さず同一タブの一時メモリへ渡す", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "accident-chat-handoff" });
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.body.dataset.pendingQuestion;
    renderHub({ probe: true });

    const link = screen.getByRole("link", {
      name: "建設業の労働災害について安衛法AIチャットボットに質問する",
    });
    const expectedQuestion =
      "建設業で多い「墜落、転落」を防ぐために関係する安衛法上の義務は？";
    expect(link.getAttribute("href")).toBe("/chatbot");
    expect(link.getAttribute("href")).not.toContain(
      encodeURIComponent(expectedQuestion),
    );

    fireEvent.click(link);

    expect(push).toHaveBeenCalledWith("/chatbot");
    expect(JSON.stringify(push.mock.calls)).not.toContain(expectedQuestion);
    fireEvent.click(screen.getByRole("button", { name: "一時質問を確認" }));
    expect(document.body.dataset.pendingQuestion).toBe(expectedQuestion);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
