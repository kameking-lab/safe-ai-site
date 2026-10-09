import { describe, expect, it } from "vitest";
import { additionalQuantitySpecs, calculateAdditionalQuantity } from "./additional-quantity";
import { calculateRebarWeight, DEFORMED_REBAR_TABLE } from "./rebar-weight";
import { calculateRebarSpacing } from "./rebar-spacing";
const calc = (slug: string, input: Record<string, unknown>) => { const out = calculateAdditionalQuantity(slug, input); expect(out.ok).toBe(true); if (!out.ok)
    throw new Error(JSON.stringify(out.errors)); return out.result; };
const layout = { coverLength: 4, coverWidth: 3, pieceWidth: 2, pieceLength: 2, overlap: .2, lossPercent: 0 };
describe.each(["curing-sheet-quantity", "wire-mesh-quantity"])("%s directional coverage", slug => {
    it("includes overlap only at joints: 4x3 / 2x2 / 0.2 gives six; zero overlap gives four", () => { expect(calc(slug, layout).outputs.layoutCount).toBe(6); expect(calc(slug, { ...layout, overlap: 0 }).outputs.layoutCount).toBe(4); });
    it("one sheet covers a smaller range even when overlap exceeds that range", () => expect(calc(slug, { ...layout, coverLength: .1, coverWidth: .1 }).outputs.layoutCount).toBe(1));
    it("rejects zero dimensions, negative overlap, overlap equal to material size, and nonfinite", () => { for (const change of [{ coverLength: 0 }, { pieceWidth: 0 }, { overlap: -1 }, { overlap: 2 }, { pieceLength: NaN }, { coverWidth: Infinity }])
        expect(calculateAdditionalQuantity(slug, { ...layout, ...change }).ok).toBe(false); });
    it("adds reserve after layout, preserving integer counts under display floor rounding", () => expect(calc(slug, { ...layout, lossPercent: 5, rounding: { decimalPlaces: 0, mode: "floor" } }).outputs.purchaseCount).toBe(7));
});
describe("board cut-free rectangular layout", () => {
    it("compares 910x1820 mm orientations for 3.64x2.73m: eight and six", () => { const r = calc("board-panel-quantity", { ...layout, coverLength: 3.64, coverWidth: 2.73, pieceWidth: 910, pieceLength: 1820, overlap: 0 }); expect(r.outputs).toMatchObject({ orientationA: 8, orientationB: 6, layoutCount: 6, purchaseCount: 6 }); });
    it("does not let unrelated opening area proportionally reduce purchase count", () => expect(calc("board-panel-quantity", { ...layout, coverLength: 3.64, coverWidth: 2.73, pieceWidth: 910, pieceLength: 1820, overlap: 0, openingArea: 8 }).outputs.purchaseCount).toBe(6));
});
describe("paint consumption per coat", () => {
    it("100m2 x .13kg/m2/coat x 2 coats =26kg and two 20kg cans", () => expect(calc("paint-quantity", { area: 100, coats: 2, consumption: .13, packMass: 20, lossPercent: 0 }).outputs).toEqual({ massKg: 26, packCount: 2 }));
    it("reserve applies to material mass once, before can count", () => expect(calc("paint-quantity", { area: 100, coats: 2, consumption: .2, packMass: 16, lossPercent: 5 }).outputs).toEqual({ massKg: 42, packCount: 3 }));
    it("rejects fractional coat count and zero package mass", () => { expect(calculateAdditionalQuantity("paint-quantity", { area: 100, coats: 1.5, consumption: .13, packMass: 20, lossPercent: 0 }).ok).toBe(false); expect(calculateAdditionalQuantity("paint-quantity", { area: 100, coats: 2, consumption: .13, packMass: 0, lossPercent: 0 }).ok).toBe(false); });
});
describe("polygon local planar area", () => {
    const rectangle = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
    it("12m2 remains unchanged for reversed points and a large coordinate translation", () => { for (const points of [rectangle, [...rectangle].reverse(), rectangle.map(p => ({ x: p.x + 100000000, y: p.y + 100000000 }))])
        expect(calc("polygon-area", { points }).outputs).toEqual({ areaM2: 12, perimeterM: 14 }); });
    it("calculates a concave L shape without triangulating across the missing corner", () => expect(calc("polygon-area", { points: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 }] }).outputs.areaM2).toBe(5));
    it.each([
        [{ x: 0, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }, { x: 4, y: 0 }],
        [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
        [...rectangle, { x: 0, y: 0 }],
        [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 2, y: 0 }, { x: 0, y: 4 }],
        [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: NaN, y: 3 }],
    ].map(points=>({points})))("rejects crossing, collinear, duplicate, touching or invalid points", ({points}) => expect(calculateAdditionalQuantity("polygon-area", { points }).ok).toBe(false));
});
describe("independent JFE rebar table checks", () => {
    const table: [
        [
            string,
            number,
            number
        ],
        ...Array<[
            string,
            number,
            number
        ]>
    ] = [["D10", 9.53, .560], ["D13", 12.7, .995], ["D16", 15.9, 1.56], ["D19", 19.1, 2.25], ["D22", 22.2, 3.04], ["D25", 25.4, 3.98], ["D29", 28.6, 5.04], ["D32", 31.8, 6.23], ["D35", 34.9, 7.51], ["D38", 38.1, 8.95], ["D41", 41.3, 10.5], ["D51", 50.8, 15.9]];
    it.each(table)("%s uses %.2f mm and %f kg/m", (barDesignation, diameterMm, kgPerMetre) => { expect(DEFORMED_REBAR_TABLE[barDesignation]).toEqual({ diameterMm, kgPerMetre }); const out = calculateRebarWeight({ barType: "deformed", barDesignation, diameterMm: NaN, length: 4, lengthUnit: "m", quantity: 10 }); expect(out.ok).toBe(true); if (out.ok) {
        expect(out.result.rawOutputs.totalMassKg).toBeCloseTo(kgPerMetre * 40, 10);
        expect(out.result.usedInputs.diameterMm).toBe(diameterMm);
    } });
    it("uses D13 nominal diameter in cover-to-centre geometry and table mass in spacing", () => { const out = calculateRebarSpacing({ barType: "deformed", barDesignation: "D13", diameterMm: NaN, constructionWidth: 1000, leftCover: 40, rightCover: 40, requestedPitch: 200, barLength: 4000, dimensionUnit: "mm", layers: 2 }); expect(out.ok).toBe(true); if (out.ok) {
        expect(out.result.rawOutputs.effectiveWidthM).toBeCloseTo(.9073, 10);
        expect(out.result.outputs.totalBars).toBe(12);
        expect(out.result.outputs.totalMassKg).toBe(47.76);
    } });
    it("rejects unknown designation and keeps round steel as a separate method", () => { expect(calculateRebarWeight({ barType: "deformed", barDesignation: "D99", diameterMm: 13, length: 4, lengthUnit: "m", quantity: 10 }).ok).toBe(false); const out = calculateRebarWeight({ barType: "round", diameterMm: 13, length: 4, lengthUnit: "m", quantity: 10 }); expect(out.ok).toBe(true); if (out.ok)
        expect(out.result.rawOutputs.massPerMetreKg).toBeCloseTo(1.0419484734707449, 10); });
});
it("rejects blanks at pure function boundary and excessive result values", () => { for (const spec of additionalQuantitySpecs.filter(s => s.fields.length)) {
    const input = Object.fromEntries(spec.fields.map(f => [f.key, f.example]));
    expect(calculateAdditionalQuantity(spec.slug, { ...input, [spec.fields[0].key]: "" }).ok).toBe(false);
    expect(calculateAdditionalQuantity(spec.slug, { ...input, [spec.fields[0].key]: 1e20 }).ok).toBe(false);
} });
