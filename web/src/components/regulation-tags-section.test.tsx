import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RegulationTagsSection } from "./regulation-tags-section";

afterEach(cleanup);

const poisonUrl =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/dokugeki_database_00001.html";
const wasteUrl = "https://www.env.go.jp/recycle/waste/sp_contr/index.html";

describe("毒劇法と廃掃法の公式参照の範囲", () => {
  it("毒劇法だけの物質は廃掃法を見出しに含めず、生存する毒劇物案内へ進める", () => {
    render(<RegulationTagsSection entry={{ regulationTags: ["poison-control"] }} />);

    expect(screen.getByRole("heading", { name: "毒劇法", level: 3 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "毒劇法・廃掃法" })).toBeNull();
    const link = screen.getByRole("link", { name: "公式参照" });
    expect(link.getAttribute("href")).toBe(poisonUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
    expect(screen.getByText(/濃度・製剤の除外規定/)).toBeTruthy();
  });

  it("廃掃法だけの物質は環境省の廃棄物資料を保持する", () => {
    render(<RegulationTagsSection entry={{ regulationTags: ["waste"] }} />);

    expect(screen.getByRole("heading", { name: "廃掃法", level: 3 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "毒劇法・廃掃法" })).toBeNull();
    expect(screen.getByRole("link", { name: "公式参照" }).getAttribute("href")).toBe(wasteUrl);
  });

  it("両方を収録する物質でも、法令ごとのカードと参照先を分ける", () => {
    render(<RegulationTagsSection entry={{ regulationTags: ["poison-control", "waste"] }} />);

    expect(screen.getByRole("heading", { name: "毒劇法・廃掃法", level: 3 })).toBeTruthy();
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const poisonCard = cards.find((card) => within(card).queryByText("毒物及び劇物取締法"));
    const wasteCard = cards.find((card) => within(card).queryByText("廃棄物処理法 特定有害産業廃棄物"));
    if (!poisonCard || !wasteCard) throw new Error("法令別のカードがありません");
    expect(within(poisonCard).getByRole("link", { name: "公式参照" }).getAttribute("href")).toBe(poisonUrl);
    expect(within(wasteCard).getByRole("link", { name: "公式参照" }).getAttribute("href")).toBe(wasteUrl);
  });
});
