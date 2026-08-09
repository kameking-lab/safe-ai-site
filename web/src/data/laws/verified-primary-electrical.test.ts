import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifiedPrimaryElectricalArticles } from "./verified-primary-electrical";
import { verifiedPrimaryNoticeArticles } from "./verified-primary-notices";
import type { LawArticle } from "./law-types";

const EXPECTED_KEYS = [
  "電事法|第42条",
  "電事法|第43条",
  "特別教育規程|第5条",
  "特別教育規程|第6条",
  "電工士法令|第1条",
  "電工士法則|第2条",
  "経産省電工Q&A|Q9・Q10",
] as const;

const OFFICIAL_HOSTS = new Set([
  "laws.e-gov.go.jp",
  "www.mhlw.go.jp",
  "www.meti.go.jp",
]);

function article(key: (typeof EXPECTED_KEYS)[number]): LawArticle {
  const found = verifiedPrimaryElectricalArticles.find(
    (candidate) => `${candidate.lawShort}|${candidate.articleNum}` === key,
  );
  expect(found, key).toBeDefined();
  return found as LawArticle;
}

describe("verified electrical government primary sources", () => {
  it("pins the complete minimal source set and integrates it into the server-side primary array", () => {
    const actualKeys = verifiedPrimaryElectricalArticles.map(
      (source) => `${source.lawShort}|${source.articleNum}`,
    );
    expect(actualKeys).toEqual(EXPECTED_KEYS);
    expect(new Set(actualKeys).size).toBe(actualKeys.length);

    for (const source of verifiedPrimaryElectricalArticles) {
      expect(verifiedPrimaryNoticeArticles).toContain(source);
    }
  });

  it("allows only reviewed, current, hash-valid official sources fetched on the reference date", () => {
    for (const source of verifiedPrimaryElectricalArticles) {
      expect(source.sourceKind).toBe("government-official-primary");
      expect(source.verificationStatus).toBe("primary-source-verified");
      expect(source.humanReviewStatus).toBe("reviewed");
      expect(source.sourceVersionKind).toBe("current");
      expect(source.sourceFetchedAt).toBe("2026-08-09");
      expect(source.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(
        createHash("sha256").update(source.text, "utf8").digest("hex"),
      ).toBe(source.sourceHash);

      const sourceUrl = new URL(source.sourceUrl);
      expect(sourceUrl.protocol).toBe("https:");
      expect(OFFICIAL_HOSTS.has(sourceUrl.hostname), source.sourceUrl).toBe(
        true,
      );
    }
  });

  it("pins the e-Gov revisions effective on 2026-08-09", () => {
    expect(article("電事法|第42条")).toMatchObject({
      sourceLawId: "339AC0000000170",
      sourceRevisionId: "339AC0000000170_20260803_508AC0000000068",
      amendmentPromulgatedOn: "2026-07-24",
    });
    expect(article("電事法|第43条").sourceRevisionId).toBe(
      "339AC0000000170_20260803_508AC0000000068",
    );
    expect(article("電事法|第42条").amendmentHistory?.[0]).toMatchObject({
      amendmentLawNumber: "令和八年法律第六十八号",
      effectiveOn: "2026-08-03",
      status: "enforced",
    });
    expect(article("電工士法令|第1条").sourceRevisionId).toBe(
      "335CO0000000260_20251114_507CO0000000374",
    );
    expect(article("電工士法令|第1条").amendmentHistory?.[0]).toMatchObject({
      amendmentLawNumber: "令和七年政令第三百七十四号",
      effectiveOn: "2025-11-14",
      status: "enforced",
    });
    expect(article("電工士法則|第2条").sourceRevisionId).toBe(
      "335M50000400097_20231228_505M60000400063",
    );
    expect(article("電工士法則|第2条").amendmentHistory?.[0]).toMatchObject({
      amendmentLawNumber: "令和五年経済産業省令第六十三号",
      effectiveOn: "2023-12-28",
      status: "enforced",
    });
  });

  it("retains the current Electricity Business Act distinction for facility management", () => {
    expect(article("電事法|第42条").text).toContain(
      "事業用電気工作物（小規模事業用電気工作物を除く。以下この款において同じ。）",
    );
    expect(article("電事法|第42条").text).toContain(
      "事業用電気工作物を設置する者及びその従業者は、保安規程を守らなければならない。",
    );
    expect(article("電事法|第43条").text).toContain(
      "工事、維持及び運用に関する保安の監督をさせるため",
    );
    expect(article("電事法|第43条").text).toContain(
      "主任技術者がその保安のためにする指示に従わなければならない。",
    );
  });

  it("retains the high-voltage and low-voltage special-education scopes separately", () => {
    const highVoltage = article("特別教育規程|第5条").text;
    expect(highVoltage).toContain(
      "高圧若しくは特別高圧の充電電路又は当該充電電路の支持物の敷設、点検、修理又は操作の業務",
    );
    expect(highVoltage).toContain(
      "十五時間以上(充電電路の操作の業務のみを行なう者については、一時間以上)",
    );

    const lowVoltage = article("特別教育規程|第6条").text;
    expect(lowVoltage).toContain(
      "低圧の充電電路の敷設若しくは修理の業務",
    );
    expect(lowVoltage).toContain(
      "充電部分が露出している開閉器の操作の業務",
    );
    expect(lowVoltage).toContain(
      "七時間以上(開閉器の操作の業務のみを行なう者については、一時間以上)",
    );
  });

  it("retains the Electrician Act exceptions without treating every connection as exempt", () => {
    const minorWork = article("電工士法令|第1条").text;
    expect(minorWork).toContain(
      "電圧六百ボルト以下で使用する差込み接続器",
    );
    expect(minorWork).toContain("端子に電線");

    const minorTasks = article("電工士法則|第2条").text;
    expect(minorTasks).toContain("電線相互を接続する作業");
    expect(minorTasks).toContain("配電盤を造営材に取り付け");
    expect(minorTasks).toContain(
      "電圧六百ボルトを超えて使用する電気機器に電線を接続する作業",
    );
    expect(minorTasks).toContain(
      "法第三条第二項の一般用電気工作物等の保安上支障がないと認められる作業",
    );
  });

  it("retains METI's official measurement-versus-connection distinction", () => {
    const qa = article("経産省電工Q&A|Q9・Q10").text;
    expect(qa).toContain(
      "当該接続線を切断・接続等の作業を伴う場合には電気工事士が工事する必要があります。",
    );
    expect(qa).toContain(
      "測定器をクリップ留め又は巻き付ける場合など）であれば、電気工事士法施行規則第２条第１項第１号ニに当たらない",
    );
    expect(qa).toContain(
      "配電盤など、短絡、感電などの危険を伴う場所については、あらかじめ電気主任技術者の指示確認を行うことが望ましい",
    );
  });
});
