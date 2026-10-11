import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifiedLawArticles } from "./verified-corpus";
import { buildServiceFirstLegalAnswer } from "@/lib/legal-extractive-answer";
import { validateServiceFirstLegalClaimSupport } from "@/lib/legal-claim-support";
import {
  buildFrameScaffoldPrimaryArticle,
  FRAME_SCAFFOLD_OFFICIAL_SUBITEMS,
  FRAME_SCAFFOLD_OFFICIAL_TEXT_SHA256,
  FRAME_SCAFFOLD_SOURCE_REVISION_ID,
  verifiedFrameScaffoldArticle,
} from "./verified-primary-scaffold";

type SnapshotArticle = { articleNum: string; text: string };

const snapshot = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/data/laws-fulltext/347M50002000032.json"),
    "utf8",
  ),
) as { revisionId: string; articles: SnapshotArticle[] };
const snapshot563 = snapshot.articles.find(
  (article) => article.articleNum === "第563条",
)!;
const corpus563 = verifiedLawArticles.find(
  (article) => article.lawShort === "安衛則" && article.articleNum === "第563条",
)!;

describe("安衛則563条 わく組足場細目の公式補完", () => {
  it("differs from the hash-verified snapshot only by the official Subitem2 text", () => {
    expect(snapshot.revisionId).toBe(FRAME_SCAFFOLD_SOURCE_REVISION_ID);
    expect(snapshot563.text).not.toContain("手すりわく");
    expect(verifiedFrameScaffoldArticle).toBeDefined();
    const article = verifiedFrameScaffoldArticle!;
    expect(article.text.replace(FRAME_SCAFFOLD_OFFICIAL_SUBITEMS, "")).toBe(
      snapshot563.text,
    );
    expect(article.text).toContain(
      "イ　わく組足場（妻面に係る部分を除く。ロにおいて同じ。）　次のいずれかの設備　（１）　交さ筋かい及び高さ十五センチメートル以上四十センチメートル以下の桟若しくは高さ十五センチメートル以上の幅木又はこれらと同等以上の機能を有する設備　（２）　手すりわく　ロ　わく組足場以外の足場　手すり等及び中桟等",
    );
    expect(createHash("sha256").update(article.text, "utf8").digest("hex")).toBe(
      FRAME_SCAFFOLD_OFFICIAL_TEXT_SHA256,
    );
  });

  it("keeps official provenance and does not claim human legal review", () => {
    const article = verifiedFrameScaffoldArticle!;
    expect(article.sourceKind).toBe("government-official-primary");
    expect(article.verificationStatus).toBe("primary-source-verified");
    expect(article.humanReviewStatus).toBe("not-reviewed");
    expect(new URL(article.sourceUrl!).hostname).toBe("laws.e-gov.go.jp");
    expect(article.sourceRevisionId).toBe(FRAME_SCAFFOLD_SOURCE_REVISION_ID);
    // 生成コーパス本体は書き換えない（hash固定の snapshot と一致し続ける）。
    expect(corpus563.text).toBe(snapshot563.text);
  });

  it("fails closed when the snapshot revision or anchor text changes", () => {
    expect(
      buildFrameScaffoldPrimaryArticle({
        ...corpus563,
        sourceRevisionId: "20270401_000M60000100001",
      }),
    ).toBeUndefined();
    expect(
      buildFrameScaffoldPrimaryArticle({
        ...corpus563,
        text: corpus563.text.replace("次のいずれかの設備", "次の設備"),
      }),
    ).toBeUndefined();
    expect(buildFrameScaffoldPrimaryArticle(undefined)).toBeUndefined();
  });

  describe("claim support for the frame handrail answer", () => {
    const query = "足場の手すり 足場 確認済み選択肢:わく組足場 わく組足場です";
    const now = new Date("2026-10-11T09:00:00+09:00");
    const articles = [verifiedFrameScaffoldArticle!];
    const answer = buildServiceFirstLegalAnswer({ query, articles, now });

    it("states the 563(1) applicability and passes only with the restored official text", () => {
      expect(answer).toContain("一側足場を除く足場の、高さ2m以上の作業場所で、");
      expect(answer).toContain("手すりわく");
      expect(answer).not.toMatch(/取り外す|取外し/);
      expect(validateServiceFirstLegalClaimSupport({ query, answer, articles, now })).toMatchObject({
        supported: true,
        failures: [],
      });
    });

    it("fails closed when the cited text lacks the Subitem2 provisions", () => {
      const result = validateServiceFirstLegalClaimSupport({
        query,
        answer,
        articles: [corpus563],
        now,
      });
      expect(result.supported).toBe(false);
    });

    it("rejects the frame claim if the applicability conditions are dropped", () => {
      const tampered = answer.replace("一側足場を除く足場の、高さ2m以上の作業場所で、", "");
      expect(tampered).not.toBe(answer);
      const result = validateServiceFirstLegalClaimSupport({ query, answer: tampered, articles, now });
      expect(result.supported).toBe(false);
    });
  });
});
