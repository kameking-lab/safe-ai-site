import { describe, expect, it } from "vitest";
import {
  SOIL_CONTAMINATION_SUBSTANCES,
  SOIL_GROUP_DESIGNATED_COUNT,
  soilContaminationForCas,
  PHYSICAL_PROPERTY_LAWS,
} from "@/lib/chemical/extra-regulations";

describe("土壌汚染対策法オーバーレイ", () => {
  it("単一CAS対応は14物質（第一種11+第三種3）", () => {
    expect(SOIL_CONTAMINATION_SUBSTANCES).toHaveLength(14);
    const voc = SOIL_CONTAMINATION_SUBSTANCES.filter((s) => s.kind === "第一種(揮発性有機化合物)");
    const noyaku = SOIL_CONTAMINATION_SUBSTANCES.filter((s) => s.kind === "第三種(農薬等)");
    expect(voc).toHaveLength(11);
    expect(noyaku).toHaveLength(3);
  });

  it("単一CAS14 + 群指定12 = 26物質（検算）", () => {
    expect(SOIL_CONTAMINATION_SUBSTANCES.length + SOIL_GROUP_DESIGNATED_COUNT).toBe(26);
  });

  it("CASで土壌特定有害物質を引ける（ベンゼン・トリクロロエチレン）", () => {
    expect(soilContaminationForCas("71-43-2")?.name).toContain("ベンゼン");
    expect(soilContaminationForCas("79-01-6")?.name).toContain("トリクロロエチレン");
  });

  it("正規化前のCAS表記でも引ける", () => {
    expect(soilContaminationForCas(" 71-43-2 ")).not.toBeNull();
  });

  it("非該当CASはnull", () => {
    expect(soilContaminationForCas("50-00-0")).toBeNull(); // ホルムアルデヒドは土壌特定有害物質ではない
    expect(soilContaminationForCas("")).toBeNull();
  });

  it("全エントリにCAS・名称・区分がある", () => {
    for (const s of SOIL_CONTAMINATION_SUBSTANCES) {
      expect(s.cas).toMatch(/^\d/);
      expect(s.name).toBeTruthy();
      expect(s.kind).toBeTruthy();
    }
  });
});

describe("物性型法律（二層UI）", () => {
  it("消防法・廃掃法・高圧ガスの3法を持つ", () => {
    const keys = PHYSICAL_PROPERTY_LAWS.map((l) => l.key);
    expect(keys).toEqual(["fire", "waste", "highpressure"]);
  });

  it("各法に判定根拠・着眼点・公式URLがある", () => {
    for (const l of PHYSICAL_PROPERTY_LAWS) {
      expect(l.name).toBeTruthy();
      expect(l.criterion.length).toBeGreaterThan(10);
      expect(l.checkpoints.length).toBeGreaterThanOrEqual(2);
      expect(l.officialUrl).toMatch(/^https:\/\/laws\.e-gov\.go\.jp/);
    }
  });
});
