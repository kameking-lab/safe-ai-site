import type { ChemicalRaTriState } from "./ra-cloud";

export type VentilationSelection = "none" | "general" | "local" | "both" | "";

/** 設備ごとの確認結果を唯一の入力元にする。未確認を「なし」へ推定しない。 */
export function ventilationFromControls(
  generalVentilation: ChemicalRaTriState,
  localExhaust: ChemicalRaTriState,
): VentilationSelection {
  if (generalVentilation === "unknown" || localExhaust === "unknown") return "";
  if (generalVentilation === "yes" && localExhaust === "yes") return "both";
  if (generalVentilation === "yes") return "general";
  if (localExhaust === "yes") return "local";
  return "none";
}

export function controlsFromVentilation(selection: VentilationSelection): {
  generalVentilation: ChemicalRaTriState;
  localExhaust: ChemicalRaTriState;
} {
  if (!selection) return { generalVentilation: "unknown", localExhaust: "unknown" };
  return {
    generalVentilation: selection === "general" || selection === "both" ? "yes" : "no",
    localExhaust: selection === "local" || selection === "both" ? "yes" : "no",
  };
}

export function ventilationLabel(selection: VentilationSelection): string {
  switch (selection) {
    case "both": return "全体換気と局所排気を併用";
    case "general": return "全体換気のみ";
    case "local": return "局所排気のみ";
    case "none": return "全体換気・局所排気ともになし";
    default: return "未確認";
  }
}
