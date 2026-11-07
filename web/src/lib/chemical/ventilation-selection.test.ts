import { describe, expect, it } from "vitest";
import { controlsFromVentilation, ventilationFromControls, ventilationLabel, type VentilationSelection } from "./ventilation-selection";
import { createChemicalRaRecordPayload, inspectChemicalRaRecordPayload, type ChemicalRaTriState } from "./ra-cloud";

describe("換気条件の整合性", () => {
  it.each<[ChemicalRaTriState, ChemicalRaTriState, VentilationSelection]>([
    ["no", "no", "none"], ["yes", "no", "general"], ["no", "yes", "local"], ["yes", "yes", "both"],
    ["unknown", "no", ""], ["no", "unknown", ""], ["unknown", "yes", ""], ["yes", "unknown", ""], ["unknown", "unknown", ""],
  ])("全体=%s / 局所=%s → %s", (general, local, expected) => {
    expect(ventilationFromControls(general, local)).toBe(expected);
  });

  it.each<VentilationSelection>(["none", "general", "local", "both", ""])("一括選択%sと詳細条件が一致する", selection => {
    const controls = controlsFromVentilation(selection);
    expect(ventilationFromControls(controls.generalVentilation, controls.localExhaust)).toBe(selection);
  });

  it("保存時も設備入力から併用を記録し、古い単一選択を優先しない", () => {
    const payload = createChemicalRaRecordPayload({}, { ventilation: "none", generalVentilation: "yes", localExhaust: "yes" });
    expect(inspectChemicalRaRecordPayload(payload).assessmentSnapshot?.ventilation).toBe("both");
    expect(ventilationLabel("both")).toContain("併用");
  });

  it("一方が未確認なら保存時も未確認を保持する", () => {
    const payload = createChemicalRaRecordPayload({}, { ventilation: "local", generalVentilation: "unknown", localExhaust: "yes" });
    const snapshot = inspectChemicalRaRecordPayload(payload).assessmentSnapshot;
    expect(snapshot?.ventilation).toBeNull();
    expect(snapshot?.engineeringControls.localExhaust).toBe("yes");
    expect(snapshot?.missingFields).toContain("general-ventilation");
  });
});
