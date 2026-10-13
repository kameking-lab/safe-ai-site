import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";
import { TransientQueryBridgeProvider } from "./home-safety-cockpit/transient-query-bridge";

function renderPanel() {
  return render(
    <TransientQueryBridgeProvider>
      <ChemicalRaPanel />
    </TransientQueryBridgeProvider>,
  );
}

// useSearchParams を mock（client panel が参照する）
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("ChemicalRaPanel 見出し階層（多重h1の是正）", () => {
  it("パネルは h1 を持たない（ページ側 PageHeader が唯一の h1）", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll("h1").length).toBe(0);
  });

  it("通常時は説明カードより検索入力を先に示す", () => {
    const { container } = renderPanel();
    expect(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ })).toBeTruthy();
    expect(container.querySelectorAll("[data-warning-card]")).toHaveLength(0);
    expect(screen.queryByText(/曖昧な物質は自動確定しません/)).toBeNull();
  });

  it("初期候補を3件に絞り、作業記録は任意で開閉する", () => {
    const { container } = renderPanel();
    expect(container.querySelectorAll("[data-chemical-quick-substance='true']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-primary-action='true']")).toHaveLength(1);
    expect(container.querySelector("#chemical-ra-work-conditions")).toBeNull();
    expect((screen.getByRole("button", { name: "公的情報を確認" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ }), {
      target: { value: "トルエン" },
    });
    expect((screen.getByRole("button", { name: "公的情報を確認" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /必要な人向け：作業条件・測定値を記録する/ }));

    expect(container.querySelector("#chemical-ra-work-conditions")).toBeTruthy();
    const workContent = screen.getByLabelText("作業内容（任意）— 最新SDS・公式ツール確認用のメモ") as HTMLTextAreaElement;
    fireEvent.change(workContent, { target: { value: "屋内塗装" } });
    fireEvent.click(screen.getByRole("button", { name: "作業条件・測定値の記録を閉じる" }));
    expect(container.querySelector("#chemical-ra-work-conditions")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /必要な人向け：作業条件・測定値を記録する/ }));
    expect((screen.getByLabelText("作業内容（任意）— 最新SDS・公式ツール確認用のメモ") as HTMLTextAreaElement).value).toBe("屋内塗装");
  });
  it("換気の一括選択・詳細変更・未確認が同じ条件を表示する", () => {
    renderPanel();
    fireEvent.change(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ }), { target: { value: "トルエン" } });
    fireEvent.click(screen.getByRole("button", { name: /必要な人向け：作業条件・測定値を記録する/ }));
    const summary = screen.getByLabelText("換気") as HTMLSelectElement;
    const general = screen.getByLabelText("全体換気") as HTMLSelectElement;
    const local = screen.getByLabelText("局所排気") as HTMLSelectElement;
    fireEvent.change(summary, { target: { value: "both" } });
    expect(general.value).toBe("yes");
    expect(local.value).toBe("yes");
    fireEvent.change(local, { target: { value: "no" } });
    expect(summary.value).toBe("general");
    fireEvent.change(general, { target: { value: "unknown" } });
    expect(summary.value).toBe("");
    expect(local.value).toBe("no");
    fireEvent.change(summary, { target: { value: "local" } });
    expect(general.value).toBe("no");
    expect(local.value).toBe("yes");
    fireEvent.change(summary, { target: { value: "" } });
    expect(general.value).toBe("unknown");
    expect(local.value).toBe("unknown");
  });

  it("作業メモなしで公的情報を確認し、結果を記録欄より先に示す", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        chemicalName: "トルエン",
        casNumber: "108-88-3",
        ghsHazards: [],
        ppeRecommendations: [],
        safetyMeasures: [],
        emergencyMeasures: [],
        regulatoryNotes: [],
        aiStatus: "disabled_for_safety",
        assessmentStatus: "unavailable",
        assessmentNotice: "公式SDSと公式ツールで確認してください。",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderPanel();
    fireEvent.change(screen.getByRole("combobox", { name: /物質名・CAS番号・SDS記載名/ }), {
      target: { value: "トルエン" },
    });
    fireEvent.click(screen.getByRole("button", { name: "公的情報を確認" }));
    await waitFor(() => expect(container.querySelector("[data-chemical-ra-result]")).toBeTruthy());
    const request = fetchMock.mock.calls.find(([url]) => url === "/api/chemical-ra");
    expect(request).toBeTruthy();
    expect(JSON.parse(request![1].body).workContent).toBe("");
    expect(container.querySelector("#chemical-ra-work-conditions")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /必要な人向け：作業条件・測定値を記録する/ }));
    expect(container.querySelector("[data-chemical-ra-result]")!.compareDocumentPosition(container.querySelector("#chemical-ra-work-conditions")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

});
