import { describe, expect, it } from "vitest";
import { LICENSES } from "./licenses";
import { rodoAnzenEiseiHoSikokiregu } from "@/data/laws/rodo-anzen-eisei-ho-sikokiregu";

describe("license primary-source guardrails", () => {
  it("潜水士免許を水深10m以上だけの義務と誤表示しない", () => {
    const diver = LICENSES.find((item) => item.id === "lic-diver");
    expect(diver).toBeDefined();
    expect(diver?.duration).toContain("受験資格の制限なし");
    expect(diver?.notes).toContain("水深を問わず");
    expect(`${diver?.duration} ${diver?.notes}`).not.toContain("水深10m以上");
    expect(`${diver?.duration} ${diver?.notes}`).not.toContain("実務経験または訓練修了が必要");
  });
});

const art6 = rodoAnzenEiseiHoSikokiregu.find(
  (article) => article.lawShort === "安衛令" && article.articleNum === "第6条",
);
const art20 = rodoAnzenEiseiHoSikokiregu.find(
  (article) => article.lawShort === "安衛令" && article.articleNum === "第20条",
);

const KANJI = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "二十一",
  "二十二",
  "二十三",
];

function toKanjiKey(go: string): string {
  const match = go.match(/^(\d+)(?:の(\d+))?$/);
  if (!match) return go;
  const main = KANJI[Number(match[1])] ?? go;
  return match[2] ? `${main}の${KANJI[Number(match[2])]}` : main;
}

function parseSeirei(
  relatedLaw: string,
): { article: "第6条" | "第20条"; go: string } | null {
  const match = relatedLaw.match(/安衛令(第6条|第20条)第(\d+)号(?:の(\d+))?/);
  if (!match) return null;
  return {
    article: match[1] as "第6条" | "第20条",
    go: match[3] ? `${match[2]}の${match[3]}` : match[2],
  };
}

const EXPECTED: Record<
  string,
  { article: "第6条" | "第20条"; go: string; label: string }
> = {
  "lic-crane-derrick": { article: "第20条", go: "6", label: "クレーン" },
  "lic-mobile-crane": { article: "第20条", go: "7", label: "移動式クレーン" },
  "lic-yangu": { article: "第20条", go: "2", label: "揚貨装置" },
  "lic-boiler-2": { article: "第20条", go: "3", label: "ボイラー" },
  "lic-boiler-1": { article: "第20条", go: "3", label: "ボイラー" },
  "lic-diver": { article: "第20条", go: "9", label: "潜水" },
  "lic-hakka": { article: "第20条", go: "1", label: "発破" },
  "lic-gas-welding-chief": { article: "第6条", go: "2", label: "ガス溶接" },
  "lic-xray-chief": { article: "第6条", go: "5", label: "放射線" },
  "lic-gamma-chief": { article: "第6条", go: "5の2", label: "ガンマ線" },
  "lic-koatsu-shitsunai-chief": { article: "第6条", go: "1", label: "高圧室内" },
};

describe("licenses: 令第6条／第20条の号がコーパスと機械突合", () => {
  it("令第6条・第20条がコーパスに存在し itemNumberMap を持つ", () => {
    expect(art6?.itemNumberMap, "令第6条 itemNumberMap").toBeDefined();
    expect(art20?.itemNumberMap, "令第20条 itemNumberMap").toBeDefined();
  });

  it("全エントリが certType='license'（技能講習・特別教育との取り違え防止）", () => {
    for (const license of LICENSES) {
      expect(license.certType, `${license.id} の certType`).toBe("license");
    }
  });

  it("令を引用する全エントリの号が期待表と一致し、その号が実在する", () => {
    const seireiIds = LICENSES.filter(
      (license) => parseSeirei(license.relatedLaw) !== null,
    ).map((license) => license.id);
    expect(seireiIds.sort()).toEqual(Object.keys(EXPECTED).sort());

    for (const license of LICENSES) {
      const parsed = parseSeirei(license.relatedLaw);
      if (!parsed) continue;
      const expected = EXPECTED[license.id];
      expect(expected, `${license.id} が EXPECTED に無い`).toBeDefined();
      expect(parsed.article, `${license.id} の引用条`).toBe(expected.article);
      expect(parsed.go, `${license.id} の引用号`).toBe(expected.go);
      const map = (parsed.article === "第6条" ? art6 : art20)?.itemNumberMap;
      expect(map, `${parsed.article} の itemNumberMap`).toBeDefined();
      const key = toKanjiKey(parsed.go);
      expect(
        map?.[key],
        `${license.id} が令${parsed.article}に存在しない第${parsed.go}号を引用`,
      ).toBeDefined();
      expect(map?.[key], `${license.id} の号(${parsed.go})が別作業を指す`).toContain(
        expected.label,
      );
    }
  });

  it("是正済みの既知号誤りが再発していない", () => {
    const byId = new Map(LICENSES.map((license) => [license.id, license]));
    expect(byId.get("lic-crane-derrick")?.relatedLaw).toContain("安衛令第20条第6号");
    expect(byId.get("lic-crane-derrick")?.relatedLaw).not.toContain("第20条第7号");
    expect(byId.get("lic-yangu")?.relatedLaw).toContain("安衛令第20条第2号");
    expect(byId.get("lic-yangu")?.relatedLaw).not.toContain("第20条第8号");
    expect(byId.get("lic-gas-welding-chief")?.relatedLaw).toContain("安衛令第6条第2号");
    expect(byId.get("lic-gas-welding-chief")?.relatedLaw).not.toContain("第6条第3号");
    expect(byId.get("lic-xray-chief")?.relatedLaw).toContain("安衛令第6条第5号");
    expect(byId.get("lic-xray-chief")?.relatedLaw).not.toContain("第27号");
    expect(byId.get("lic-gamma-chief")?.relatedLaw).toContain("安衛令第6条第5号の2");
    expect(byId.get("lic-gamma-chief")?.relatedLaw).not.toContain("第27号の2");
    expect(byId.get("lic-hakka")?.relatedLaw).toContain("安衛令第20条第1号");
    expect(byId.get("lic-hakka")?.relatedLaw).not.toContain("第20条第5号");
    expect(byId.get("lic-yangu")?.targetWork).toContain("制限荷重5トン以上");
    expect(byId.get("lic-yangu")?.targetWork).not.toContain("0.5トン");
  });
});

describe("licenses: 規則側根拠条（e-Gov生JSON突合）", () => {
  const REG_ARTICLE: Record<string, string> = {
    "lic-crane-derrick": "クレーン則第223条",
    "lic-mobile-crane": "クレーン則第229条",
    "lic-yangu": "安衛則第62条・別表第四",
    "lic-boiler-2": "ボイラー則第97条",
    "lic-boiler-1": "ボイラー則第97条",
    "lic-diver": "高圧則第52条",
    "lic-gas-welding-chief": "安衛則第314条",
    "lic-xray-chief": "電離則第46条",
    "lic-gamma-chief": "電離則第52条の2",
    "lic-koatsu-shitsunai-chief": "高気圧作業安全衛生規則第10条",
    "lic-hakka": "安衛則第62条・別表第四",
  };

  it("全エントリの規則側根拠条が正条にピン留めされている", () => {
    const byId = new Map(LICENSES.map((license) => [license.id, license]));
    expect(new Set(Object.keys(REG_ARTICLE))).toEqual(
      new Set(LICENSES.map((license) => license.id)),
    );
    for (const [id, article] of Object.entries(REG_ARTICLE)) {
      expect(byId.get(id)?.relatedLaw, `${id} の規則側根拠条`).toContain(article);
    }
  });

  it("是正済みの誤条（欠格/欠番/作業主任者選任/避難）が再発していない", () => {
    const byId = new Map(LICENSES.map((license) => [license.id, license]));
    expect(byId.get("lic-crane-derrick")?.relatedLaw).not.toContain(
      "クレーン則第224条",
    );
    expect(byId.get("lic-yangu")?.relatedLaw).not.toContain("クレーン則第235条");
    expect(byId.get("lic-boiler-2")?.relatedLaw).not.toContain("ボイラー則第24条");
    expect(byId.get("lic-boiler-1")?.relatedLaw).not.toContain("ボイラー則第24条");
    expect(byId.get("lic-hakka")?.relatedLaw).not.toContain("安衛則第321条");
  });
});
