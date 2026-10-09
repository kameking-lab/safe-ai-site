import { applyRounding, ceilCount, invalid, normalizeRounding, validResult } from "./core";
import type { CalculationOutcome, FormulaRegistryEntry, FormulaSource, InputDefinition, RoundingConfig, ValidationIssue } from "./types";
type FieldSpec = {
    key: string;
    label: string;
    unit: string;
    example: number;
    zero?: boolean;
    integer?: boolean;
    max?: number;
};
type ResultSpec = {
    key: string;
    label: string;
    unit: string;
    integer?: boolean;
};
type ExtraSpec = {
    slug: string;
    title: string;
    category: string;
    purpose: string;
    fields: FieldSpec[];
    outputs: ResultSpec[];
    formula: string[];
    assumptions: string[];
    expected: Record<string, number>;
    calculate: (v: Record<string, number>) => Record<string, number>;
    check?: (v: Record<string, number>) => ValidationIssue | null;
};
const f = (key: string, label: string, unit: string, example: number, zero = false, integer = false, max?: number): FieldSpec => ({ key, label, unit, example, zero, integer, max });
const o = (key: string, label: string, unit: string, integer = false): ResultSpec => ({ key, label, unit, integer });
const loss = (v: Record<string, number>) => 1 + v.lossPercent / 100;
const lossField = f("lossPercent", "見込むロス", "%", 5, true, false, 100);
const inconsistent = (field: string, message: string): ValidationIssue => ({ field, code: "inconsistent", message });
export function layoutStrips(distance: number, size: number, overlap: number): number {
    return distance <= size ? 1 : 1 + ceilCount((distance - size) / (size - overlap));
}
export const additionalQuantitySpecs: ExtraSpec[] = [
    { slug: "curing-sheet-quantity", title: "養生・防草シート割付", category: "材料", purpose: "覆う範囲と1枚の大きさから、縦横の割付と必要枚数を比べる。", fields: [f("coverLength", "覆う範囲の長さ", "m", 4), f("coverWidth", "覆う範囲の幅", "m", 3), f("pieceWidth", "1枚の幅", "m", 2), f("pieceLength", "1枚の長さ", "m", 2), f("overlap", "縦横の重ね幅", "m", 0.2, true), lossField], outputs: [o("orientationA", "そのまま向きの枚数", "枚", true), o("orientationB", "90度回転した枚数", "枚", true), o("layoutCount", "少ない向きの枚数", "枚", true), o("purchaseCount", "予備込み枚数", "枚", true)], formula: ["1方向の枚数：範囲≦1枚寸法なら1、それ以外は1＋切上げ((範囲−1枚寸法)÷(1枚寸法−重ね幅))", "縦方向の枚数 × 横方向の枚数。90度回転した向きも比較する。", "予備込み枚数 = 切上げ(少ない向きの枚数 × (1 + ロス% ÷ 100))"], assumptions: ["長方形へ同じ向きの未切断材を並べる割付。端材の組合せ・障害物・開口を最適化しない。開口面積で購入枚数を比例減しない。", "重ね幅は設計・メーカー仕様から入力。枚数比較は施工方法や必要な重ね幅の適否を判定しない。"], expected: { orientationA: 6, orientationB: 6, layoutCount: 6, purchaseCount: 7 }, check: v => v.overlap >= Math.min(v.pieceWidth, v.pieceLength) ? inconsistent("overlap", "重ね幅は1枚の幅・長さより小さくしてください。") : null, calculate: v => { const scale = 1, w = v.pieceWidth * scale, l = v.pieceLength * scale, o = v.overlap * scale; const orientationA = layoutStrips(v.coverLength, w, o) * layoutStrips(v.coverWidth, l, o), orientationB = layoutStrips(v.coverLength, l, o) * layoutStrips(v.coverWidth, w, o), layoutCount = Math.min(orientationA, orientationB); return { orientationA, orientationB, layoutCount, purchaseCount: ceilCount(layoutCount * loss(v)) }; } },
    { slug: "paint-quantity", title: "塗装・塗布材の数量", category: "材料", purpose: "施工面積・塗る回数・メーカーの標準使用量から材料量を出す。", fields: [f("area", "塗る面積", "m²", 100), f("coats", "塗る回数", "回", 2, false, true, 100), f("consumption", "1回の標準使用量", "kg/m²", 0.13), f("packMass", "1缶・1袋の内容量", "kg", 20), lossField], outputs: [o("massKg", "ロス込み材料量", "kg"), o("packCount", "必要な缶・袋数", "個", true)], formula: ["材料量 = 面積 × 塗る回数 × 1回の使用量 × (1 + ロス% ÷ 100)", "缶・袋数 = 切上げ(材料量 ÷ 内容量)"], assumptions: ["使用量はメーカー資料の1回当たりの値。希釈液・下塗り・吸込みの増加分は別途確認する。"], expected: { massKg: 27.3, packCount: 2 }, calculate: v => { const massKg = v.area * v.coats * v.consumption * loss(v); return { massKg, packCount: ceilCount(massKg / v.packMass) }; } },
    { slug: "board-panel-quantity", title: "合板・ボード割付", category: "材料", purpose: "覆う範囲と1枚の大きさから、縦横の割付と必要枚数を比べる。", fields: [f("coverLength", "覆う範囲の長さ", "m", 4), f("coverWidth", "覆う範囲の幅", "m", 3), f("pieceWidth", "1枚の幅", "mm", 910), f("pieceLength", "1枚の長さ", "mm", 1820), f("overlap", "縦横の重ね幅", "mm", 0, true), lossField], outputs: [o("orientationA", "そのまま向きの枚数", "枚", true), o("orientationB", "90度回転した枚数", "枚", true), o("layoutCount", "少ない向きの枚数", "枚", true), o("purchaseCount", "予備込み枚数", "枚", true)], formula: ["1方向の枚数：範囲≦1枚寸法なら1、それ以外は1＋切上げ((範囲−1枚寸法)÷(1枚寸法−重ね幅))", "縦方向の枚数 × 横方向の枚数。90度回転した向きも比較する。", "予備込み枚数 = 切上げ(少ない向きの枚数 × (1 + ロス% ÷ 100))"], assumptions: ["長方形へ同じ向きの未切断材を並べる割付。端材の組合せ・障害物・開口を最適化しない。開口面積で購入枚数を比例減しない。", "重ね幅は設計・メーカー仕様から入力。枚数比較は施工方法や必要な重ね幅の適否を判定しない。"], expected: { orientationA: 10, orientationB: 12, layoutCount: 10, purchaseCount: 11 }, check: v => v.overlap >= Math.min(v.pieceWidth, v.pieceLength) ? inconsistent("overlap", "重ね幅は1枚の幅・長さより小さくしてください。") : null, calculate: v => { const scale = .001, w = v.pieceWidth * scale, l = v.pieceLength * scale, o = v.overlap * scale; const orientationA = layoutStrips(v.coverLength, w, o) * layoutStrips(v.coverWidth, l, o), orientationB = layoutStrips(v.coverLength, l, o) * layoutStrips(v.coverWidth, w, o), layoutCount = Math.min(orientationA, orientationB); return { orientationA, orientationB, layoutCount, purchaseCount: ceilCount(layoutCount * loss(v)) }; } },
    { slug: "wire-mesh-quantity", title: "ワイヤーメッシュ割付", category: "材料", purpose: "覆う範囲と1枚の大きさから、縦横の割付と必要枚数を比べる。", fields: [f("coverLength", "覆う範囲の長さ", "m", 4), f("coverWidth", "覆う範囲の幅", "m", 3), f("pieceWidth", "1枚の幅", "m", 2), f("pieceLength", "1枚の長さ", "m", 2), f("overlap", "縦横の重ね幅", "m", 0.2, true), lossField], outputs: [o("orientationA", "そのまま向きの枚数", "枚", true), o("orientationB", "90度回転した枚数", "枚", true), o("layoutCount", "少ない向きの枚数", "枚", true), o("purchaseCount", "予備込み枚数", "枚", true)], formula: ["1方向の枚数：範囲≦1枚寸法なら1、それ以外は1＋切上げ((範囲−1枚寸法)÷(1枚寸法−重ね幅))", "縦方向の枚数 × 横方向の枚数。90度回転した向きも比較する。", "予備込み枚数 = 切上げ(少ない向きの枚数 × (1 + ロス% ÷ 100))"], assumptions: ["長方形へ同じ向きの未切断材を並べる割付。端材の組合せ・障害物・開口を最適化しない。開口面積で購入枚数を比例減しない。", "重ね幅は設計・メーカー仕様から入力。枚数比較は施工方法や必要な重ね幅の適否を判定しない。"], expected: { orientationA: 6, orientationB: 6, layoutCount: 6, purchaseCount: 7 }, check: v => v.overlap >= Math.min(v.pieceWidth, v.pieceLength) ? inconsistent("overlap", "重ね幅は1枚の幅・長さより小さくしてください。") : null, calculate: v => { const scale = 1, w = v.pieceWidth * scale, l = v.pieceLength * scale, o = v.overlap * scale; const orientationA = layoutStrips(v.coverLength, w, o) * layoutStrips(v.coverWidth, l, o), orientationB = layoutStrips(v.coverLength, l, o) * layoutStrips(v.coverWidth, w, o), layoutCount = Math.min(orientationA, orientationB); return { orientationA, orientationB, layoutCount, purchaseCount: ceilCount(layoutCount * loss(v)) }; } },
    { slug: "polygon-area", title: "不整形・多角形の面積", category: "体積・面積", purpose: "角の座標を外周順に入れて、不整形な施工範囲の面積を出す。", fields: [], outputs: [o("areaM2", "面積", "m²"), o("perimeterM", "外周の長さ", "m")], formula: ["最初の点を原点に移し、靴紐公式：面積 = |Σ(XᵢYᵢ₊₁ − Xᵢ₊₁Yᵢ)| ÷ 2", "外周長 = 各隣接点間の平面距離の合計"], assumptions: ["同じ局所平面座標系のm単位。Xは北、Yは東。緯度・経度の度数は入力しない。", "点は外周順に入力。最初の点を最後に繰り返さない。自己交差・重複点・接触する辺・面積0は拒否する。"], expected: { areaM2: 12, perimeterM: 14 }, calculate: () => ({}) },
];
export function calculateAdditionalQuantity(slug: string, input: Record<string, unknown>): CalculationOutcome {
    const spec = additionalQuantitySpecs.find(s => s.slug === slug);
    if (!spec)
        return invalid([inconsistent("calculator", "計算ツールが見つかりません。")]);
    if (slug === "polygon-area")
        return calculatePolygon(input, spec);
    const values: Record<string, number> = {};
    const errors: ValidationIssue[] = [];
    for (const field of spec.fields) {
        const value = input[field.key];
        if (typeof value !== "number" || !Number.isFinite(value)) {
            errors.push({ field: field.key, code: "not-finite", message: "数値を入力してください。" });
            continue;
        }
        if (value < 0 || (!field.zero && value === 0))
            errors.push({ field: field.key, code: value < 0 ? "negative" : "zero", message: field.zero ? "0以上で入力してください。" : "0より大きい値を入力してください。" });
        if (value > (field.max ?? 1000000000) || (field.integer && !Number.isInteger(value)))
            errors.push({ field: field.key, code: "out-of-range", message: field.integer ? "範囲内の整数を入力してください。" : "計算範囲を超えています。単位を確認してください。" });
        values[field.key] = value;
    }
    if (errors.length)
        return invalid(errors);
    const issue = spec.check?.(values);
    if (issue)
        return invalid([issue]);
    const rawOutputs = spec.calculate(values);
    if (Object.entries(rawOutputs).some(([key, value]) => !Number.isFinite(value) || value < 0 || value > 1e15 || (spec.outputs.find(o => o.key === key)?.integer && !Number.isSafeInteger(value))))
        return invalid([inconsistent("calculator", "結果が計算範囲を超えています。入力値と単位を確認してください。")]);
    const rounding = normalizeRounding(input.rounding as RoundingConfig | undefined);
    const outputs = Object.fromEntries(spec.outputs.map(o => [o.key, o.integer ? rawOutputs[o.key] : applyRounding(rawOutputs[o.key], rounding)]));
    return validResult({ calculatorId: slug, formulaVersion: "1.0.0", rawOutputs, outputs, displayValues: spec.outputs.map(o => ({ ...o, value: outputs[o.key] })), usedInputs: { ...values, rounding: { ...rounding } }, formula: spec.formula, rounding, assumptions: spec.assumptions, warnings: [] });
}
export function additionalQuantityRegistry(source: FormulaSource): FormulaRegistryEntry[] {
    return additionalQuantitySpecs.map(spec => ({ calculatorId: spec.slug, slug: spec.slug, title: spec.title, category: spec.category, purpose: spec.purpose, formula: spec.formula, formulaVersion: "1.0.0", inputDefinitions: spec.slug === "polygon-area" ? [{ key: "points", label: "外周の座標", type: "points", required: true, units: ["m"], help: "X=北・Y=東。m単位の同じ局所平面座標を、外周順に入力。" }] : spec.fields.map((f): InputDefinition => ({ key: f.key, label: f.label, type: f.integer ? "integer" : "number", required: true, units: [f.unit], min: f.zero ? 0 : undefined, max: f.max ?? 1e9, help: "例：" + f.example + " " + f.unit })), outputDefinitions: spec.outputs, supportedUnits: [...new Set([...spec.fields.map(f => f.unit), ...spec.outputs.map(o => o.unit)])], roundingRule: "未丸めの数値で計算し、最後に表示値だけ丸める。必要枚数は式として整数切上げ。", assumptions: spec.assumptions, sources: [{ ...source, checkedAt: "2026-10-09", locator: "靴紐公式による符号付き三角形面積の合計、長方形の縦横割付と余り切上げ、面積×単位使用量の独立導出。" }, ...(spec.slug === "paint-quantity" ? [{ sourceId: "SRC-NIPPON-PAINT-CONSUMPTION", title: "Hiビニレックスエコ70：使用量・荷姿", publisher: "日本ペイント", url: "https://www.nipponpaint.co.jp/products/building/68/", applicableYear: null, locator: "使用量kg/m²/回、1缶当たりの塗り面積、荷姿20kg。例の使用量は製品仕様から確認。", checkedAt: "2026-10-09", sourceKind: "official" as const }] : spec.slug === "board-panel-quantity" ? [{ sourceId: "SRC-YOSHINO-BOARD-DIMENSIONS", title: "せっこうボードの種類と標準規格", publisher: "吉野石膏", url: "https://yoshino-gypsum.com/tpc/list_spec", applicableYear: null, locator: "GB-R：厚さ9.5・12.5mm、3×6版（910×1820mm）の標準規格。", checkedAt: "2026-10-09", sourceKind: "official" as const }] : [])], checkedAt: "2026-10-09", riskLevel: "low", clientOnly: true, testFixtures: [{ fixtureId: spec.slug + "-normal", kind: "normal", input: spec.slug === "polygon-area" ? { points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }] } : Object.fromEntries(spec.fields.map(f => [f.key, f.example])), expectedOk: true, expectedOutputs: Object.fromEntries(Object.entries(spec.expected).map(([k, v]) => [k, spec.outputs.find(o => o.key === k)?.integer ? v : applyRounding(v, { decimalPlaces: 2, mode: "round" })])), derivation: spec.formula.join("；") }] }));
}
export function calculatePolygon(input: Record<string, unknown>, spec = additionalQuantitySpecs.find(s => s.slug === "polygon-area")): CalculationOutcome {
    if (!spec)
        return invalid([inconsistent("calculator", "計算ツールが見つかりません。")]);
    const raw = input.points;
    if (!Array.isArray(raw) || raw.length < 3 || raw.length > 100)
        return invalid([inconsistent("points", "点は3〜100個にしてください。")]);
    const points: {
        x: number;
        y: number;
    }[] = [];
    for (const point of raw) {
        if (!point || typeof point !== "object" || typeof point.x !== "number" || typeof point.y !== "number" || !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1e9 || Math.abs(point.y) > 1e9)
            return invalid([inconsistent("points", "すべての座標へ範囲内の数値を入力してください。")]);
        points.push({ x: point.x, y: point.y });
    }
    const origin = points[0];
    const p = points.map(v => ({ x: v.x - origin.x, y: v.y - origin.y }));
    for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++)
            if (p[i].x === p[j].x && p[i].y === p[j].y)
                return invalid([inconsistent("points", "同じ座標の点があります。始点を最後に繰り返さないでください。")]);
    const cross = (a: {
        x: number;
        y: number;
    }, b: {
        x: number;
        y: number;
    }, c: {
        x: number;
        y: number;
    }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const on = (a: {
        x: number;
        y: number;
    }, b: {
        x: number;
        y: number;
    }, c: {
        x: number;
        y: number;
    }) => cross(a, b, c) === 0 && c.x >= Math.min(a.x, b.x) && c.x <= Math.max(a.x, b.x) && c.y >= Math.min(a.y, b.y) && c.y <= Math.max(a.y, b.y);
    for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++) {
            if (j === i + 1 || (i === 0 && j === p.length - 1))
                continue;
            const a = p[i], b = p[(i + 1) % p.length], c = p[j], d = p[(j + 1) % p.length];
            const c1 = cross(a, b, c), c2 = cross(a, b, d), c3 = cross(c, d, a), c4 = cross(c, d, b);
            if ((Math.sign(c1) !== Math.sign(c2) && Math.sign(c3) !== Math.sign(c4)) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b))
                return invalid([inconsistent("points", "辺が交差・接触しています。外周順と座標を確認してください。")]);
        }
    let twiceArea = 0, perimeterM = 0;
    for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        twiceArea += a.x * b.y - b.x * a.y;
        perimeterM += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const areaM2 = Math.abs(twiceArea) / 2;
    if (areaM2 === 0 || areaM2 > 1e15 || perimeterM > 1e15)
        return invalid([inconsistent("points", "面積が0、または計算範囲を超えています。")]);
    const rounding = normalizeRounding(input.rounding as RoundingConfig | undefined), outputs = { areaM2: applyRounding(areaM2, rounding), perimeterM: applyRounding(perimeterM, rounding) };
    return validResult({ calculatorId: spec.slug, formulaVersion: "1.0.0", rawOutputs: { areaM2, perimeterM }, outputs, displayValues: spec.outputs.map(o => ({ ...o, value: outputs[o.key as keyof typeof outputs] })), usedInputs: { points: points.map(p => ({ ...p })), rounding: { ...rounding } }, formula: spec.formula, rounding, assumptions: spec.assumptions });
}
