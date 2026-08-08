import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { MhlwChemicalInfoCard } from "./mhlw-chemical-info-card";

const xyleneWithUnconfirmedLegacyFlag: MergedChemical = {
  cas: "1330-20-7",
  primaryName: "キシレン",
  aliases: [],
  flags: {
    carcinogenic: false,
    concentration: true,
    skin: false,
    label_sds: false,
  },
  appliedDates: {},
  notes: [],
  details: {
    limit8h: "50 ppm",
    link: "https://www.mhlw.go.jp/content/11300000/001164687.pdf",
  },
  entryCount: 1,
};

describe("MHLW化学物質カードの安全境界", () => {
  it("未収録フラグを法的な非該当と断定しない", () => {
    render(<MhlwChemicalInfoCard chemical={xyleneWithUnconfirmedLegacyFlag} />);

    const sdsLabel = screen.getByText("SDS交付義務");
    expect(sdsLabel.parentElement?.textContent).toContain(
      "収録データ上未確認",
    );
    expect(sdsLabel.parentElement?.textContent).not.toContain("非該当");
  });

  it("単位・平均時間が不明な入力から基準値内外を自動判定しない", () => {
    render(<MhlwChemicalInfoCard chemical={xyleneWithUnconfirmedLegacyFlag} />);

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/基準値内|基準値超過/)).toBeNull();
    expect(screen.getByText(/測定値との自動比較は行いません/)).toBeTruthy();
  });

  it("濃度基準値資料を製品SDSと表示しない", () => {
    render(<MhlwChemicalInfoCard chemical={xyleneWithUnconfirmedLegacyFlag} />);

    expect(
      screen.getByRole("link", {
        name: /濃度基準値等の公表資料（製品SDSではありません）/,
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: /公式 SDS PDF/ })).toBeNull();
  });
});
