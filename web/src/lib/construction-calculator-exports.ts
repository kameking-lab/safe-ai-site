import type { CalculationResult, PortableValue } from "@/lib/construction-calculators/types";

function formatPortable(value: PortableValue): string {
  if (value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildCalculationCopyText(title: string, result: CalculationResult): string {
  return [
    title,
    ...result.displayValues.map((item) => `${item.label}: ${item.value}${item.unit}`),
    "",
    "使用した入力値",
    ...Object.entries(result.usedInputs).map(([key, value]) => `${key}: ${formatPortable(value)}`),
    "",
    "計算式",
    ...result.formula,
    `丸め: ${result.rounding.mode} / 小数${result.rounding.decimalPlaces}桁`,
    "概算結果です。設計図書、仕様書、実測値を確認してください。",
  ].join("\n");
}

export function buildCalculationCsv(title: string, result: CalculationResult): string {
  const rows: string[][] = [
    ["calculator", title],
    ["calculatorId", result.calculatorId],
    ["formulaVersion", result.formulaVersion],
    ["estimate", "true"],
    ["section", "result"],
    ...result.displayValues.map((item) => [item.label, String(item.value), item.unit]),
    ["section", "inputs"],
    ...Object.entries(result.usedInputs).map(([key, value]) => [key, formatPortable(value)]),
    ["section", "formula"],
    ...result.formula.map((line, index) => [`formula-${index + 1}`, line]),
    ["roundingMode", result.rounding.mode],
    ["decimalPlaces", String(result.rounding.decimalPlaces)],
    ["section", "assumptions"],
    ...result.assumptions.map((line, index) => [`assumption-${index + 1}`, line]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
