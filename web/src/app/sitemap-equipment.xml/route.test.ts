import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { getAllEquipment, getEquipmentById } from "@/lib/equipment-recommendation";

// 柱C-3-2: sitemap-equipment.xml の幽霊URL(soft404)是正の回帰テスト。
// 旧実装は safetyGoodsItems(/goods 用・ee-/fg-/hc- 等の別系統ID)を /equipment/<id> として
// 出力していたが、/equipment/[id] は getAllEquipment() の eq-NNNN しか解決しないため全URLが404だった。
// 正本=getAllEquipment() へ差し替え=サイトマップの全URLが実在の保護具詳細ページに解決することを固定する。

async function getXml(): Promise<string> {
  const res = await GET();
  return res.text();
}

function extractEquipmentIds(xml: string): string[] {
  return [...xml.matchAll(/\/equipment\/([^<]+)</g)].map((m) => m[1]);
}

describe("GET /sitemap-equipment.xml", () => {
  it("は application/xml の urlset を返す", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("は getAllEquipment() の全件を /equipment/<eq-id> として出力する(件数一致)", async () => {
    const xml = await getXml();
    const ids = extractEquipmentIds(xml);
    const expected = getAllEquipment().map((it) => it.id);
    expect(ids.length).toBe(expected.length);
    expect(new Set(ids)).toEqual(new Set(expected));
  });

  it("の全URLは getEquipmentById() で実在の保護具詳細に解決する(幽霊URLゼロ)", async () => {
    const xml = await getXml();
    const ids = extractEquipmentIds(xml);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(getEquipmentById(id), `${id} は /equipment/[id] で解決すべき`).toBeDefined();
    }
  });

  it("には旧 safetyGoodsItems 系の別系統ID(ee-/fg-/hc-/カテゴリID)が一切含まれない", async () => {
    const xml = await getXml();
    // 旧データ源に実在した代表的な幽霊ID群
    const staleIds = [
      "/equipment/fall-protection<",
      "/equipment/respiratory<",
      "/equipment/head-protection<",
      "/equipment/misc-001<",
    ];
    for (const stale of staleIds) {
      expect(xml).not.toContain(stale);
    }
    // 全loc が eq- プレフィックスであること
    const ids = extractEquipmentIds(xml);
    for (const id of ids) {
      expect(id.startsWith("eq-"), `${id} は eq- 始まりであるべき`).toBe(true);
    }
  });
});
