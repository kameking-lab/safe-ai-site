import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import substancesJson from "@/data/create-simple/substances.json";
import { CreateSimplePanel } from "./create-simple-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }), usePathname: () => "/chemical-ra" }));

const all = substancesJson as unknown as { source: unknown; substances: Array<[string, ...unknown[]]> };
const subset = { source: all.source, substances: all.substances.filter((r) => ["108-88-3", "67-64-1"].includes(r[0])) };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(subset)));
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function choose(group: string, option: string) {
  fireEvent.click(within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", { name: new RegExp(option) }));
}

describe("化学物質リスクアセスメント画面", () => {
  it("物質→条件を選ぶとその場でリスクレベルと下げる対策が出て、対策を当てると再判定される", async () => {
    render(<CreateSimplePanel />);
    fireEvent.change(screen.getByLabelText("物質名またはCAS番号"), { target: { value: "トルエン" } });
    fireEvent.click(await screen.findByRole("button", { name: /トルエン.*CAS 108-88-3/ }));
    expect(screen.getByRole("list", { name: "判定する物質" }).textContent).toContain("トルエン");
    expect(screen.getByText(/あと「取扱量・換気・1日の作業時間・頻度」/)).toBeDefined();

    choose("1回（1日）に扱う量", "中量");
    choose("換気", "窓・換気扇");
    fireEvent.change(screen.getByLabelText(/1日の作業時間/), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("日数"), { target: { value: "5" } });

    expect(await screen.findByText("いちばん高いリスクレベル")).toBeDefined();
    expect(screen.getByRole("heading", { name: "レベルを下げるには" })).toBeDefined();
    const applyButtons = screen.getAllByRole("button", { name: "この条件にする" });
    expect(applyButtons.length).toBeGreaterThan(0);
    fireEvent.click(applyButtons[0]);
    expect(await screen.findByText(/対策後の条件にしました/)).toBeDefined();
    expect(screen.getByText("厚生労働省 CREATE-SIMPLE の手法に基づく計算")).toBeDefined();
    expect(document.body.textContent).not.toContain("CREATE-SIMPLEを開く");
  });

  it("保存すると記録一覧に出て、CSVで書き出せる", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    render(<CreateSimplePanel initialQuery="67-64-1" />);
    await waitFor(() => expect(screen.getByRole("list", { name: "判定する物質" }).textContent).toContain("アセトン"));
    choose("1回（1日）に扱う量", "少量");
    choose("換気", "局所排気（ドラフト");
    choose("局所排気装置の制御風速", "測って確認している");
    fireEvent.change(screen.getByLabelText(/1日の作業時間/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("日数"), { target: { value: "3" } });
    fireEvent.change(await screen.findByLabelText("記録の名前（作業名）"), { target: { value: "器具の洗浄" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("heading", { name: "保存した記録（1）" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "全件CSV" }));
    expect(createObjectURL).toHaveBeenCalled();
  });
});
