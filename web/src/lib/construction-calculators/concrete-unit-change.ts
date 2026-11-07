import type { LengthUnit } from "./types";
import { toMetres } from "./units";

const DIMENSIONS = ["length", "width", "height", "diameter"] as const;

/** 寸法単位だけを後から変えても、入力済みの実寸を同じ長さに保つ。 */
export function changeConcreteDimensionUnit(
  input: Record<string, unknown>,
  nextUnit: LengthUnit,
): Record<string, unknown> {
  const previousUnit = input.dimensionUnit;
  if (previousUnit !== "mm" && previousUnit !== "cm" && previousUnit !== "m") {
    return { ...input, dimensionUnit: nextUnit };
  }
  if (previousUnit === nextUnit) return input;
  const next: Record<string, unknown> = { ...input, dimensionUnit: nextUnit };
  for (const key of DIMENSIONS) {
    const value = input[key];
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (!Number.isFinite(number)) continue;
    next[key] = String(Number((toMetres(number, previousUnit) / toMetres(1, nextUnit)).toPrecision(12)));
  }
  return next;
}
