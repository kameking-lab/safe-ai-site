import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as getEquipmentApi } from "@/app/api/equipment-finder/route";
import {
  getAllEquipment,
  getEquipmentById,
  getQuarantinedEquipmentCount,
  recommendEquipment,
} from "@/lib/equipment-recommendation";

describe("未検証の商品カタログ公開境界", () => {
  it("隔離データは保持しても公開取得関数と推薦からは0件にする", () => {
    expect(getQuarantinedEquipmentCount()).toBeGreaterThan(0);
    expect(getAllEquipment()).toEqual([]);
    expect(getEquipmentById("eq-0001")).toBeUndefined();
    expect(recommendEquipment({ industry: "construction" })).toEqual({
      top: [],
      others: [],
      totalCandidates: 0,
    });
  });

  it("APIは410・no-storeで商品を返さない", async () => {
    const response = await getEquipmentApi();
    const body = (await response.json()) as {
      status: string;
      totalCandidates: number;
      top: unknown[];
      others: unknown[];
    };

    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Data-Status")).toBe("quarantined");
    expect(body).toMatchObject({
      status: "quarantined",
      totalCandidates: 0,
      top: [],
      others: [],
    });
  });

  it("一覧はnoindex境界で、商品JSON-LDや生成商品UIを読み込まない", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(main)/equipment-finder/page.tsx"),
      "utf8",
    );

    expect(source).toContain("index: false");
    expect(source).toContain("follow: false");
    expect(source).not.toContain("productCollectionSchema");
    expect(source).not.toContain("getAllEquipment");
    expect(source).not.toContain("<EquipmentFinderClient");
  });

  it("個別ページは静的URLを生成せず、常にnotFoundで偽の確認日を作らない", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(main)/equipment/[id]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("return []");
    expect(source).toContain("dynamicParams = false");
    expect(source).toContain("notFound()");
    expect(source).not.toContain("new Date");
    expect(source).not.toContain("getEquipmentById");
  });
});
