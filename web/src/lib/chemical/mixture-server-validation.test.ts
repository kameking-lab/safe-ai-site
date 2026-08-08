import { describe, expect, it } from "vitest";
import { validateMixtureComponents } from "@/lib/chemical/mixture-ra";

const resolve = (cas: string) =>
  ({
    "108-88-3": { primaryName: "トルエン", aliases: ["Toluene"] },
    "67-64-1": { primaryName: "アセトン", aliases: ["Acetone"] },
  })[cas];

describe("validateMixtureComponents", () => {
  it("正本CAS・名称・wt%合計100だけを受理する", () => {
    expect(
      validateMixtureComponents(
        [
          { name: "トルエン", cas: "108-88-3", concentration: 60, unit: "wt%" },
          { name: "Acetone", cas: "67-64-1", concentration: 40, unit: "wt%" },
        ],
        resolve
      )
    ).toMatchObject({ ok: true, totalConcentration: 100 });
  });

  it.each([
    [[{ name: "トルエン", cas: "108-88-3", concentration: 100, unit: "wt%" }], "invalid_components"],
    [[
      { name: "アセトン", cas: "108-88-3", concentration: 50, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "name_cas_mismatch"],
    [[
      { name: "トルエン", cas: "108-88-4", concentration: 50, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "invalid_cas"],
    [[
      { name: "水", cas: "7732-18-5", concentration: 50, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "unknown_cas"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: Number.NaN, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "invalid_concentration"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: Number.POSITIVE_INFINITY, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "invalid_concentration"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: "50", unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "invalid_concentration"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: -1, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 101, unit: "wt%" },
    ], "invalid_concentration"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: 50, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "vol%" },
    ], "mixed_units"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: 40, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 40, unit: "wt%" },
    ], "invalid_total"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: 50, unit: "wt%" },
      { name: "Toluene", cas: "108-88-3", concentration: 50, unit: "wt%" },
    ], "duplicate_component"],
    [[
      { name: "トルエン", cas: "108-88-3", concentration: 50.001, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 50, unit: "wt%" },
    ], "invalid_total"],
  ])("攻撃的/不完全入力を拒否する", (components, reason) => {
    expect(validateMixtureComponents(components, resolve)).toMatchObject({ ok: false, reason });
  });
});
