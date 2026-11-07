import { calculationDisplayValues } from "@/lib/construction-calculators/core";
import type { CalculationResult, InputDefinition, PortableValue } from "@/lib/construction-calculators/types";

const SHAPE_LABELS: Record<string, string> = { rectangular: "直方体", slab: "床版・土間", cylinder: "円柱", "circular-foundation": "円形基礎" };

export function calculationInputRows(result: CalculationResult, inputDefinitions: readonly InputDefinition[]) {
  return Object.entries(result.usedInputs)
    .filter(([key, value]) => key !== "rounding" && value !== null && value !== undefined && !(typeof value === "number" && !Number.isFinite(value)))
    .map(([key, value]) => {
      const field = inputDefinitions.find((input) => input.key === key);
      const label = field?.label ?? (key === "inputOrigin" ? "入力方法" : key);
      const display = key === "shape" ? (SHAPE_LABELS[String(value)] ?? formatPortable(value)) : formatPortable(value);
      const selectedUnit = [result.usedInputs.dimensionUnit, result.usedInputs.lengthUnit].find((unit) => typeof unit === "string" && field?.units?.includes(unit));
      const unit = typeof value === "number" ? (selectedUnit ?? (field?.units?.length === 1 ? field.units[0] : "")) : "";
      return { key, label, value: display, unit: String(unit ?? "") };
    });
}

function formatPortable(value: PortableValue): string {
  if (value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function roundingLabel(mode: CalculationResult["rounding"]["mode"]): string {
  return {
    round: "四捨五入",
    ceil: "切上げ（+∞方向）",
    floor: "切捨て（−∞方向）",
  }[mode];
}

export function buildCalculationCopyText(title: string, result: CalculationResult, inputDefinitions: readonly InputDefinition[]): string {
  return [
    title,
    ...calculationDisplayValues(result).map((item) => `${item.label}: ${item.value}${item.unit}`),
    "",
    "使用した入力値",
    ...calculationInputRows(result, inputDefinitions).map((row) => `${row.label}: ${row.value}${row.unit}`),
    "",
    "計算式",
    ...result.formula,
    `丸め: ${roundingLabel(result.rounding.mode)} / 小数${result.rounding.decimalPlaces}桁`,
    "",
    "使用した仮定",
    ...result.assumptions,
    ...(result.warnings.length ? ["", "注意", ...result.warnings] : []),
    "概算結果です。設計図書、仕様書、実測値を確認してください。",
  ].join("\n");
}

export function buildCalculationCsv(title: string, result: CalculationResult, inputDefinitions: readonly InputDefinition[]): string {
  const rows: string[][] = [
    ["calculator", title],
    ["calculatorId", result.calculatorId],
    ["formulaVersion", result.formulaVersion],
    ["estimate", "true"],
    ["section", "result"],
    ...calculationDisplayValues(result).map((item) => [item.label, String(item.value), item.unit]),
    ["section", "inputs"],
    ...calculationInputRows(result, inputDefinitions).map((row) => [row.label, row.value, row.unit]),
    ["section", "formula"],
    ...result.formula.map((line, index) => [`formula-${index + 1}`, line]),
    ["roundingMode", result.rounding.mode],
    ["roundingLabel", roundingLabel(result.rounding.mode)],
    ["decimalPlaces", String(result.rounding.decimalPlaces)],
    ["section", "assumptions"],
    ...result.assumptions.map((line, index) => [`assumption-${index + 1}`, line]),
    ["section", "warnings"],
    ...result.warnings.map((line, index) => [`warning-${index + 1}`, line]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
