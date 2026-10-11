import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
import { NEXT_MODE_EXAMPLES } from "@/data/construction-calculators/next-mode-examples";
import { calculateAggregateBase } from "@/lib/construction-calculators/material-quantity";
import { CONSTRUCTION_CALCULATOR_HISTORY_KEY } from "@/lib/construction-calculator-history";
import { ConstructionCalculatorClient } from "./construction-calculator-client";

beforeEach(()=>localStorage.clear());
const modes=[{slug:"excavation-backfill",key:"shape",mode:"pipe-trench",hidden:"structureVolume",field:"outerDiameter"},{slug:"slope-angle-length",key:"mode",mode:"face-area",hidden:"horizontalDistance",field:"height"},{slug:"aggregate-base-quantity",key:"mode",mode:"two-layers",hidden:"density",field:"stoneThickness"}];
describe("new modes retain honest inputs and SSR",()=>{
 it.each(modes)("$mode switches without sample autofill, then calculates and clears",async spec=>{
  const entry=constructionCalculatorRegistry.find(f=>f.slug===spec.slug)!;
  const {testFixtures,...definition}=entry;
  const {container}=render(<ConstructionCalculatorClient definition={definition} defaultInput={testFixtures[0].input} startEmpty/>);
  fireEvent.change(document.getElementById("construction-calculator-"+spec.key)!,{target:{value:spec.mode}});
  expect(document.getElementById("construction-calculator-"+spec.hidden)).toBeNull();
  const input=document.getElementById("construction-calculator-"+spec.field) as HTMLInputElement;
  expect(input.value).toBe("");expect(document.getElementById("calculation-result-title")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"例の数字で試す"}));
  await waitFor(()=>expect(document.getElementById("calculation-result-title")).not.toBeNull());
  expect(JSON.parse(localStorage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY)??"[]")).toHaveLength(0);
  const guideButton=container.querySelector<HTMLElement>('svg [role="button"]');
  expect(guideButton).not.toBeNull();
  fireEvent.keyDown(guideButton!,{key:" "});
  expect((document.activeElement as HTMLElement).id).toMatch(/^construction-calculator-/);
  fireEvent.change(document.getElementById("construction-calculator-"+spec.field)!,{target:{value:""}});
  await waitFor(()=>expect(document.getElementById("calculation-result-title")).toBeNull());
  fireEvent.click(screen.getByRole("button",{name:/入力をリセット/}));
  expect([...container.querySelectorAll<HTMLInputElement>('form input[type="number"]')].every(f=>f.value==="")).toBe(true);
 });
 it.each(modes)("$mode server renders required blank inputs, disabled before hydration",spec=>{
  const entry=constructionCalculatorRegistry.find(f=>f.slug===spec.slug)!;
  const {testFixtures:_,...definition}=entry;
  const host=document.createElement("div");host.innerHTML=renderToStaticMarkup(<ConstructionCalculatorClient definition={definition} defaultInput={NEXT_MODE_EXAMPLES[spec.mode]} startEmpty/>);
  const inputs=[...host.querySelectorAll<HTMLInputElement>('form input[type="number"]')];
  expect(inputs.length).toBeGreaterThan(0);expect(inputs.every(f=>f.value===""&&f.required&&f.matches(":disabled"))).toBe(true);
  expect(host.querySelector("#calculation-result-title")).toBeNull();
 });
 it("restores old single-layer history without mode or example replacement",async()=>{
  const entry=constructionCalculatorRegistry.find(f=>f.slug==="aggregate-base-quantity")!;
  const oldInput=entry.testFixtures[0].input;
  expect("mode" in oldInput).toBe(false);
  const oldResult=calculateAggregateBase(oldInput as never);expect(oldResult.ok).toBe(true);if(!oldResult.ok)return;
  localStorage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY,JSON.stringify([{id:"legacy-entry",slug:entry.slug,title:entry.title,createdAt:new Date().toISOString(),input:oldInput,result:{...oldResult.result,formulaVersion:"1.0.0"}}]));
  const {testFixtures:_,...definition}=entry;
  render(<ConstructionCalculatorClient definition={definition} defaultInput={oldInput} startEmpty/>);
  fireEvent.click(await screen.findByRole("button",{name:"入力を復元"}));
  expect((document.getElementById("construction-calculator-mode") as HTMLSelectElement).value).toBe("single-layer");
  expect((document.getElementById("construction-calculator-area") as HTMLInputElement).value).toBe(String(oldInput.area));
  await waitFor(()=>expect(document.getElementById("calculation-result-title")).not.toBeNull());
 });
});
