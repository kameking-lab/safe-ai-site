import { fireEvent, render, waitFor } from "@testing-library/react";
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
    fireEvent.click(getByRole("button", { name: "PDF・印刷" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));

    const history = JSON.parse(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY) ?? "[]") as unknown[];
    expect(history).toHaveLength(1);
    fireEvent.click(getByRole("button", { name: /入力をリセット/u }));
    expect(container.querySelector("#calculation-result-title")).toBeNull();
  });
});
