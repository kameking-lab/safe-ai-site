import { describe, it, expect } from "vitest";
import { allLawArticles } from "./index";

/**
 * 号マップ（itemNumberMap）の e-Gov 現行突合（LN-D3・2026-07-11）。
 *
 * AI解説・チャットボットが「第◯号」を捏造しないための正本データを機械固定する。
 * 安衛則第36条（特別教育を必要とする業務）は 2026-07-11 に e-Gov 生JSON
 * （347M50002000032）の Item 列と突合済み＝全60号（枝番19・削除1を含む）。
 * 旧抄録はチェーンソーを「十一」・電気取扱を「十五」としており（現行は八・四）、
 * この号ずれの再発を防止する。
 */

const art36 = allLawArticles.find(
  (a) => a.lawShort === "安衛則" && a.articleNum === "第36条"
);

// e-Gov 現行（2026-07-11 取得）の号の全列。順序も Item 出現順のまま。
const EGOV_ART36_ITEMS = [
  "一", "二", "三", "四", "四の二",
  "五", "五の二", "五の三", "五の四",
  "六", "六の二", "六の三", "七", "七の二", "八",
  "九", "九の二", "九の三", "十", "十の二", "十の三", "十の四", "十の五",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九",
  "二十", "二十の二", "二十一", "二十二", "二十三", "二十四", "二十四の二",
  "二十五", "二十六", "二十七",
  "二十八", "二十八の二", "二十八の三", "二十八の四", "二十八の五",
  "二十九", "三十", "三十一", "三十二", "三十三", "三十四", "三十五", "三十六",
  "三十七", "三十八", "三十九", "四十", "四十一",
] as const;

describe("安衛則第36条 itemNumberMap — e-Gov 現行との号突合（LN-D3）", () => {
  it("コーパスに存在し itemNumberMap を持つ", () => {
    expect(art36).toBeDefined();
    expect(art36!.itemNumberMap).toBeDefined();
  });

  it("号の集合が e-Gov 現行の全60号（枝番・削除含む）と完全一致する", () => {
    const keys = Object.keys(art36!.itemNumberMap!);
    expect(keys.length).toBe(EGOV_ART36_ITEMS.length); // 60
    expect(new Set(keys)).toEqual(new Set(EGOV_ART36_ITEMS));
  });

  it("既知の号ずれ（旧抄録）が再発しない: チェーンソー=八・電気取扱=四・フルハーネス=四十一", () => {
    const map = art36!.itemNumberMap!;
    expect(map["八"]).toContain("チェーンソー");
    expect(map["四"]).toContain("充電電路");
    expect(map["四十一"]).toContain("フルハーネス");
    // 旧抄録の誤り側（十一=チェーンソー・十五=電気）が正しい主題を持つ
    expect(map["十一"]).toContain("巻上げ機");
    expect(map["十五"]).toContain("クレーン");
    // 削除号は「削除」と明示（幽霊の意味を与えない）
    expect(map["十二"]).toBe("削除");
  });

  it("現場需要の高い号の主題が e-Gov 本文と一致する（スポット固定）", () => {
    const map = art36!.itemNumberMap!;
    expect(map["五"]).toContain("フォークリフト");
    expect(map["五"]).toContain("1トン未満");
    expect(map["五の四"]).toContain("テールゲートリフター");
    expect(map["九"]).toContain("3トン未満");
    expect(map["十の五"]).toContain("高所作業車");
    expect(map["十の五"]).toContain("10メートル未満");
    expect(map["十六"]).toContain("移動式クレーン");
    expect(map["十九"]).toContain("玉掛け");
    expect(map["二十六"]).toContain("酸素欠乏");
    expect(map["三十七"]).toContain("石綿");
    expect(map["三十九"]).toContain("足場");
    expect(map["四十"]).toContain("ロープ高所作業");
  });

  it("本文の号ずれが是正済み（チェーンソーを十一・電気を十五と書かない）", () => {
    expect(art36!.text).not.toMatch(/十一[　\s]*チェーンソー/);
    expect(art36!.text).toMatch(/八[　\s]*チェーンソー/);
  });
});
