import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalculatorInputGuide, inputUnit } from "./calculator-input-guide";
import { constructionCalculatorRegistry } from "@/data/construction-calculators/formula-registry";
describe("semantic units", () => {
    it.each([["structureVolume", "L"], ["baseMaterialVolume", "L"], ["drawingLength", "cm"], ["actualLength", "m"], ["x1", "cm"], ["y2", "cm"]])("%s uses actual calculator unit %s", (key, expected) => {
        const field = constructionCalculatorRegistry.flatMap(s => [...s.inputDefinitions]).find(f => f.key === key);
        expect(field).toBeDefined();
        if (field)
            expect(inputUnit(field, { dimensionUnit: "mm", deductionVolumeUnit: "L", drawingUnit: "cm", actualUnit: "m", coordinateUnit: "cm" })).toBe(expected);
    });
    it("integer counts never acquire a length unit", () => {
        const f = constructionCalculatorRegistry[0].inputDefinitions.find(f => f.key === "quantity");
        expect(f).toBeDefined();
        if (f)
            expect(inputUnit(f, { dimensionUnit: "mm" })).toBe("個");
    });
});
it("cylinder diameter and height are mapped by meaning and diagram controls focus the right input", () => { const def = constructionCalculatorRegistry[0]; const fields = def.inputDefinitions.filter(f => !["length", "width"].includes(f.key)); render(<><input id="construction-calculator-diameter" aria-label="test diameter"/><CalculatorInputGuide slug="concrete-quantity" fields={[...fields]} raw={{ shape: "cylinder" }}/></>); fireEvent.click(screen.getByRole("button", { name: /直径の入力へ/ })); expect(document.activeElement?.id).toBe("construction-calculator-diameter"); });
it("polygon incomplete points preserve original numbers and Space focuses original coordinate", () => { render(<><input id="construction-calculator-point-0-x"/><input id="construction-calculator-point-1-x"/><CalculatorInputGuide slug="polygon-area" fields={[]} raw={{ points: [{ x: "", y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }] }}/></>); const point = screen.getByRole("button", { name: "点2のX座標へ" }); fireEvent.keyDown(point, { key: " " }); expect(document.activeElement?.id).toBe("construction-calculator-point-1-x"); expect(screen.queryByRole("button", { name: "点1のX座標へ" })).toBeNull(); });
