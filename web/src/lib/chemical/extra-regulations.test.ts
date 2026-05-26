import { describe, expect, it } from "vitest";
import {
  SOIL_CONTAMINATION_SUBSTANCES,
  SOIL_GROUP_DESIGNATED_COUNT,
  soilContaminationForCas,
  PHYSICAL_PROPERTY_LAWS,
  AIR_POLLUTION_SUBSTANCES,
  WATER_POLLUTION_SUBSTANCES,
  airPollutionForCas,
  waterPollutionForCas,
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

describe("大気汚染防止法オーバーレイ", () => {
  it("優先取組13 + 特定物質5 = 18物質（単一CAS確認分）", () => {
    expect(AIR_POLLUTION_SUBSTANCES).toHaveLength(18);
  });
  it("CASで引ける（トリクロロエチレン=優先取組、塩素=特定物質）", () => {
    expect(airPollutionForCas("79-01-6")?.category).toBe("優先取組物質");
    expect(airPollutionForCas("7782-50-5")?.category).toBe("特定物質(事故時)");
  });
  it("非該当はnull", () => {
    expect(airPollutionForCas("137-26-8")).toBeNull(); // チウラムは大気非該当
  });
  it("全エントリにCAS・名称・区分", () => {
    for (const s of AIR_POLLUTION_SUBSTANCES) {
      expect(s.cas).toMatch(/^\d/);
      expect(s.name).toBeTruthy();
      expect(["優先取組物質", "特定物質(事故時)"]).toContain(s.category);
    }
  });
});

describe("水質汚濁防止法オーバーレイ", () => {
  it("単一CAS確認分 14物質", () => {
    expect(WATER_POLLUTION_SUBSTANCES).toHaveLength(14);
  });
  it("CASで引ける（1,4-ジオキサン・トリクロロエチレン）", () => {
    expect(waterPollutionForCas("123-91-1")?.name).toContain("ジオキサン");
    expect(waterPollutionForCas("79-01-6")?.name).toContain("トリクロロエチレン");
  });
  it("非該当はnull", () => {
    expect(waterPollutionForCas("75-21-8")).toBeNull(); // 酸化エチレンは水質非該当
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
