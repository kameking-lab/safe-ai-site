import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { findByCas } from "@/lib/mhlw-chemicals";
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

    const sdsLabel = screen.getByText("ラベル・SDS対象物質");
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

  it("トルエンは政府版GHSと同じ生殖毒性1A・反復ばく露1を出典付きで表示する", () => {
    const toluene = findByCas("108-88-3");
    expect(toluene).toBeDefined();
    render(<MhlwChemicalInfoCard chemical={toluene!} />);

    const reproductiveToxicity = screen.getByText("生殖毒性").parentElement;
    expect(reproductiveToxicity?.textContent).toContain("区分1A");
    expect(reproductiveToxicity?.textContent).not.toContain("区分2");
    const repeatedExposure = screen.getByText("特定標的臓器毒性（反復ばく露）").parentElement;
    expect(repeatedExposure?.textContent).toContain("区分1（中枢神経系、腎臓）");
    expect(repeatedExposure?.textContent).not.toContain("区分2");
    expect(screen.getByRole("link", { name: "NITE 政府版GHS分類の出典" }).getAttribute("href")).toBe(
      toluene!.details?.limits?.niteChripUrl,
    );
  });

  it.each(["108-88-3", "71-43-2", "1330-20-7"])(
    "公的分類がないCAS %s を旧50物質のGHS・健康影響・濃度で補完しない",
    (cas) => {
      render(<MhlwChemicalInfoCard chemical={{
        ...xyleneWithUnconfirmedLegacyFlag,
        cas,
        flags: { carcinogenic: false, concentration: false, skin: false, label_sds: false },
        details: undefined,
      }} />);

      expect(screen.getByText(/政府版GHSの主要有害性区分は未収録です/)).toBeTruthy();
      expect(screen.queryByText("生殖毒性")).toBeNull();
      expect(screen.queryByText("主な健康影響")).toBeNull();
      expect(screen.queryByText(/管理濃度（八時間）/)).toBeNull();
      expect(screen.queryByText(/測定値との自動比較は行いません/)).toBeNull();
      expect(screen.getByText("がん原性物質リスト").parentElement?.textContent).toContain("未確認");
    },
  );

  it("個別の厚労省資料へ追跡できない濃度値を公的基準として表示しない", () => {
    render(<MhlwChemicalInfoCard chemical={{
      ...xyleneWithUnconfirmedLegacyFlag,
      details: { limit8h: "999 ppm", link: "https://example.com/unverified.pdf" },
    }} />);

    expect(screen.queryByText("999 ppm")).toBeNull();
    expect(screen.queryByRole("link", { name: /濃度基準値等の公表資料/ })).toBeNull();
  });

  it("トルエンの物質指定から無条件のPRTR届出や有機則義務を断定しない", () => {
    render(<MhlwChemicalInfoCard chemical={findByCas("108-88-3")!} />);

    expect(screen.getByText(/対象業種、事業者全体の常用雇用者数/)).toBeTruthy();
    expect(screen.getByText(/適用は業務、作業場所、含有率、使用量等/)).toBeTruthy();
    expect(screen.queryByText(/年間取扱量 1 トン以上の場合/)).toBeNull();
    expect(screen.queryByText(/特殊健診も同頻度/)).toBeNull();
  });
});
