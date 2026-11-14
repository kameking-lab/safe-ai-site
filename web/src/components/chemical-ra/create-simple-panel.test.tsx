import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import substancesJson from "@/data/create-simple/substances.json";
import { CreateSimplePanel } from "./create-simple-panel";
import { substanceFromOfficial, type OfficialSubstanceRecord } from "@/lib/create-simple/official";
import { saveRecord } from "@/lib/create-simple/records";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }), usePathname: () => "/chemical-ra" }));

const all = substancesJson as unknown as { source: unknown; substances: Array<[string, ...unknown[]]> };
const subset = { source: all.source, substances: all.substances.filter((r) => ["108-88-3", "67-64-1"].includes(r[0])) };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(subset)));
  localStorage.clear();
});

it("URLの公開CAS番号を物質詳細から引き継ぐ", async () => {
  window.history.replaceState({},"","/chemical-ra?cas=67-64-1");
  try {
    render(<CreateSimplePanel />);
    await waitFor(() => expect(screen.getByRole("list", {name:"判定する物質"}).textContent).toContain("アセトン"));
  } finally {window.history.replaceState({},"","/");}
});
it("URLから任意の自由入力を引き継がない", () => {
  window.history.replaceState({},"","/chemical-ra?cas=arbitrary-text");
  try {render(<CreateSimplePanel />);expect((screen.getByLabelText("物質名またはCAS番号") as HTMLInputElement).value).toBe("");}
  finally {window.history.replaceState({},"","/");}
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function choose(group: string, option: string) {
  fireEvent.click(within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", { name: new RegExp(option) }));
}

describe("化学物質リスクアセスメント画面", () => {
  it.each(["両手と手首", "両腕の肘から先"])("トルエン・%s・手袋なし・室温で数値と全経路の判定を表示する", async (area) => {
    render(<CreateSimplePanel initialQuery="108-88-3" />);
    await screen.findByRole("button", {name:"トルエンを外す"});
    choose("1回（1日）に扱う量", "中量");choose("換気", "窓・換気扇");
    fireEvent.change(screen.getByLabelText(/1日の作業時間/), {target:{value:"8"}});
    fireEvent.change(screen.getByLabelText("日数"), {target:{value:"5"}});
    choose("皮膚に付く範囲", area);
    expect(screen.getByRole("radio", {name:"粉体"}).hasAttribute("disabled")).toBe(true);
    const routes=screen.getByRole("list", {name:"経路別のリスクレベル"});
    expect(routes.textContent).not.toContain("—");expect(routes.textContent).toContain("レベル4（大きい）");expect(routes.textContent).toContain("★★★★");
    expect(screen.getByText(/推定 .*ppm／ばく露限界値/)).toBeDefined();
    expect(screen.getByText(/吸収量 .*mg\/日／経皮ばく露限界値/)).toBeDefined();
    expect(document.body.textContent).not.toContain('「」');
  });
  it("保存済みの液体のみを粉体とする条件には、製品の状態を直す案内を出す", async()=>{
    const toluene=all.substances.find(r=>r[0]==="108-88-3")! as unknown as OfficialSubstanceRecord;
    saveRecord({title:"不整合な保存条件",components:[{substance:substanceFromOfficial(toluene,1),contentPercent:100}],conditions:{productType:2,amountLevel:2,spray:false,largeArea:false,ventilation:"B",controlVelocityConfirmed:false,workingHours:8,frequencyType:"weekly",frequencyDays:5,exposureVariation:"small",contactArea:1500,glove:"none",gloveTraining:"none",processTemperature:null,ignitionSourceRemoved:false,explosiveAtmospherePrevented:false,organicOrMetalNearby:true,airOrWaterContact:true}});
    render(<CreateSimplePanel/>);
    fireEvent.click(await screen.findByRole("button",{name:/^不整合な保存条件/}));
    expect(screen.getByText(/あと「製品の状態/)).toBeDefined();expect(document.body.textContent).not.toContain('「」');
    choose("製品の状態","液体");
    expect(screen.getByText("いちばん高いリスクレベル")).toBeDefined();
  });
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
