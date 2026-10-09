import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import { CONSTRUCTION_CALCULATOR_HISTORY_KEY } from "@/lib/construction-calculator-history";
import { ConstructionCalculatorClient } from "./construction-calculator-client";

const clipboardWrite = vi.fn().mockResolvedValue(undefined);
const print = vi.fn();
const createObjectURL = vi.fn(() => "blob:test-calculation");
const revokeObjectURL = vi.fn();
const anchorClick = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: clipboardWrite } });
  Object.defineProperty(window, "print", { configurable: true, value: print });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  Object.defineProperty(HTMLAnchorElement.prototype, "click", { configurable: true, value: anchorClick });
});
describe.each(constructionCalculatorRegistry)("$title の共通UI", (definition) => {
  it("明示計算後だけ結果を表示し、copy・PDF・CSV・履歴・resetを同じresultで扱う", async () => {
    const fixture = definition.testFixtures.find((item) => item.kind === "normal" && item.expectedOk);
    expect(fixture).toBeDefined();
    const { testFixtures: _testFixtures, ...publicDefinition } = definition;
    const { container, getByRole } = render(
      <ConstructionCalculatorClient definition={publicDefinition} defaultInput={fixture?.input ?? {}} />,
    );

    await waitFor(() => expect(container.querySelector("form")).not.toBeNull());
    expect(container.querySelector("#calculation-result-title")).toBeNull();
    fireEvent.click(getByRole("button", { name: "計算する" }));
    await waitFor(() => expect(container.querySelector("#calculation-result-title")).not.toBeNull());

    fireEvent.click(getByRole("button", { name: "結果をコピー" }));
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledTimes(1));
    fireEvent.click(getByRole("button", { name: "CSV" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    fireEvent.click(getByRole("button", { name: "PDF保存（印刷画面）" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(screen.getByText("ブラウザーの印刷画面で「PDFに保存」を選べます。")).toBeTruthy();

    const history = JSON.parse(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY) ?? "[]") as unknown[];
    expect(history).toHaveLength(1);
    fireEvent.click(getByRole("button", { name: /入力をリセット/u }));
    expect(container.querySelector("#calculation-result-title")).toBeNull();
  });
});

describe("建設計算のエラー案内", () => {
  it("内部キーを日本語ラベルへ置き換え、エラー入力を読み上げ可能にしてfocusする", async () => {
    const definition = constructionCalculatorRegistry.find((item) => item.slug === "concrete-quantity");
    expect(definition).toBeDefined();
    if (!definition) return;
    const { testFixtures: _testFixtures, ...publicDefinition } = definition;
    const defaultInput = { ...definition.testFixtures.find((item) => item.kind === "normal")?.input, length: 0 };
    render(<ConstructionCalculatorClient definition={publicDefinition} defaultInput={defaultInput} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "計算する" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "計算する" }));
    const input = document.getElementById("construction-calculator-length");
    expect(input).not.toBeNull();
    if (!(input instanceof HTMLInputElement)) return;
    await waitFor(() => expect(input.getAttribute("aria-invalid")).toBe("true"));
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-required")).toBe("true");
    for (const id of (input.getAttribute("aria-describedby") ?? "").split(" ")) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
    expect(screen.getByRole("alert").textContent).toContain("長さは0より大きくしてください");
    expect(screen.getByRole("alert").textContent).not.toContain("length");
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("鉄筋重量の真円概算警告を結果付近と印刷内容へ表示する", async () => {
    const definition = constructionCalculatorRegistry.find((item) => item.slug === "rebar-weight");
    expect(definition).toBeDefined();
    if (!definition) return;
    const fixture = definition.testFixtures.find((item) => item.kind === "normal");
    const { testFixtures: _testFixtures, ...publicDefinition } = definition;
    render(<ConstructionCalculatorClient definition={publicDefinition} defaultInput={fixture?.input ?? {}} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "計算する" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "計算する" }));
    await waitFor(() => expect(document.getElementById("calculation-result-title")).not.toBeNull());
    expect(screen.getAllByText(/異形鉄筋の公称単位質量ではありません/u).length).toBeGreaterThanOrEqual(2);
  });
});

describe("現場入力と例の区別",()=>{
 it("初期入力を空にし、例は明示ボタンだけで入れ、自動概算を履歴へ保存しない",async()=>{const definition=constructionCalculatorRegistry[0];const fixture=definition.testFixtures[0];const {testFixtures:_fixtures,...publicDefinition}=definition;render(<ConstructionCalculatorClient definition={publicDefinition} defaultInput={fixture.input} startEmpty/>);await waitFor(()=>expect(document.getElementById("construction-calculator-length")).not.toBeNull());expect((document.getElementById("construction-calculator-length") as HTMLInputElement).value).toBe("");fireEvent.click(screen.getByRole("button",{name:"例の数字で試す"}));await waitFor(()=>expect(document.getElementById("calculation-result-title")).not.toBeNull());expect(screen.getByText("例の数字です。現場の実測値ではありません。")).toBeTruthy();expect(JSON.parse(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY)??"[]")).toHaveLength(0);fireEvent.change(document.getElementById("construction-calculator-lossPercent") as HTMLInputElement,{target:{value:""}});fireEvent.click(screen.getByRole("button",{name:"計算する"}));await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("ロス率"));expect(document.getElementById("calculation-result-title")).toBeNull();});
 it("鉛直掘削で表示しない法勾配の空欄が計算を妨げない",async()=>{const definition=constructionCalculatorRegistry.find(d=>d.slug==="excavation-backfill")!;const fixture=definition.testFixtures.find(f=>f.kind==="normal")!;const {testFixtures:_fixtures,...publicDefinition}=definition;render(<ConstructionCalculatorClient definition={publicDefinition} defaultInput={{...fixture.input,shape:"vertical",sideSlopeHorizontalPerVertical:""}}/>);await waitFor(()=>expect(screen.getByRole("button",{name:"計算する"})).toBeTruthy());fireEvent.click(screen.getByRole("button",{name:"計算する"}));await waitFor(()=>expect(document.getElementById("calculation-result-title")).not.toBeNull());});
});

describe("initial server-rendered calculator layout", () => {
  it.each(constructionCalculatorRegistry)("$slug reserves its real blank form before hydration", (definition) => {
    const fixture = definition.testFixtures.find(item => item.kind === "normal" && item.expectedOk);
    const { testFixtures: _fixtures, ...publicDefinition } = definition;
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<ConstructionCalculatorClient definition={publicDefinition} defaultInput={fixture?.input ?? {}} startEmpty />);
    const form = host.querySelector("form");
    expect(form).not.toBeNull();
    expect(host.querySelector("[data-calculator-loading]")).toBeNull();
    const inputs = [...host.querySelectorAll<HTMLInputElement>('form input[type="number"]')];
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every(input => input.value === "")).toBe(true);
    expect(inputs.every(input => input.matches(":disabled"))).toBe(true);
    expect(form?.querySelector("fieldset")?.disabled).toBe(true);
    expect(host.querySelector("#calculation-result-title")).toBeNull();
    const historySection = host.querySelector("#calculator-history-title")?.closest("section");
    expect(historySection).not.toBeNull();
    expect(historySection?.querySelector("ul")).toBeNull();
    for (const input of inputs) {
      const field = definition.inputDefinitions.find(item => "construction-calculator-" + item.key === input.id);
      if (field?.required) expect(input.required).toBe(true);
    }
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    getItem.mockRestore(); setItem.mockRestore();
  });
});
