import { describe, expect, it } from "vitest";
import { LAW_METADATA as LAW_NAVI_METADATA } from "../law-metadata";
import { allLawArticles } from "./index";
import { LAW_METADATA } from "./law-metadata";
import { mhlwLawArticles } from "./mhlw-extras";

/**
 * LAW_METADATA とコーパス（allLawArticles の lawShort）の双方向同期を恒久固定する。
 *
 * 背景（2026-06-10 機械突合）: コーパス実使用の lawShort 17種がメタを引けない状態だった
 * （12種が未登録、5種がキー名不一致 = 登録済みなのに e-Gov リンク・監査日が出ない）。
 * このテストはその再発を防ぐ。新しい法令をコーパスに足すときは law-metadata.ts にも
 * 同じ lawShort キーでエントリを追加すること。
 *
 * mhlw-extras（厚労省PDF抽出の補完バンドル）は除外する: lawShort が「化管通達」等の
 * 文書バンドル名で個別法令ではなく、e-Gov URL を割り当てる先が存在しない
 * （LAW_SOURCE_COUNT が同じ理由で除外しているのと整合）。
 */
describe("LAW_METADATA とコーパスの lawShort 同期", () => {
  const mhlwExtraSet = new Set(mhlwLawArticles);
  const curatedArticles = allLawArticles.filter((a) => !mhlwExtraSet.has(a));
  const usedLawShorts = new Set(curatedArticles.map((a) => a.lawShort));
  const metadataKeys = new Set(Object.keys(LAW_METADATA));

  it("curated コーパスで使われる全 lawShort が LAW_METADATA に登録されている", () => {
    const missing = [...usedLawShorts].filter((s) => !metadataKeys.has(s)).sort();
    expect(missing).toEqual([]);
  });

  it("LAW_METADATA にコーパス未使用の死蔵キーがない", () => {
    const unused = [...metadataKeys].filter((k) => !usedLawShorts.has(k)).sort();
    expect(unused).toEqual([]);
  });

  it("全エントリが eGovUrl・auditedAt を持つ", () => {
    for (const [key, meta] of Object.entries(LAW_METADATA)) {
      expect(meta.eGovUrl, `${key} の eGovUrl`).toMatch(/^https:\/\//);
      expect(meta.auditedAt, `${key} の auditedAt`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("answer-first対象法令は2026-08-03時点の施行中改正を保持する", () => {
    expect(LAW_METADATA.電気工事士法).toMatchObject({
      eGovUrl: "https://laws.e-gov.go.jp/law/335AC0000000139",
      auditedAt: "2026-08-03",
    });
    for (const lawShort of [
      "電気工事士法",
      "安衛法",
      "安衛令",
      "安衛則",
      "クレーン則",
      "有機則",
      "酸欠則",
    ] as const) {
      expect(LAW_METADATA[lawShort].latestRevision).toContain("現在施行中");
      expect(LAW_METADATA[lawShort].auditedAt).toBe("2026-08-03");
    }
    expect(LAW_NAVI_METADATA.電気工事士法).toEqual({
      lawShort: "電気工事士法",
      fullName: "電気工事士法",
      issuer: "経済産業省",
      enactedOn: "昭和35年10月1日施行",
      egovLawId: "335AC0000000139",
    });
    expect(LAW_NAVI_METADATA["経産省電工Q&A"]).toEqual({
      lawShort: "経産省電工Q&A",
      fullName: "経済産業省 よくある質問（電気工事士）",
      issuer: "経済産業省",
      enactedOn: "2018年3月公開（2026年8月9日現行公開確認）",
    });
    expect(LAW_NAVI_METADATA.電事法).toEqual({
      lawShort: "電事法",
      fullName: "電気事業法",
      issuer: "経済産業省",
      enactedOn: "昭和39年7月11日公布",
      egovLawId: "339AC0000000170",
    });
    expect(LAW_NAVI_METADATA.電工士法令).toEqual({
      lawShort: "電工士法令",
      fullName: "電気工事士法施行令",
      issuer: "内閣（経済産業省所管）",
      enactedOn: "昭和35年9月30日公布",
      egovLawId: "335CO0000000260",
    });
    expect(LAW_NAVI_METADATA.電工士法則).toEqual({
      lawShort: "電工士法則",
      fullName: "電気工事士法施行規則",
      issuer: "経済産業省",
      enactedOn: "昭和35年9月30日公布",
      egovLawId: "335M50000400097",
    });
  });
});
