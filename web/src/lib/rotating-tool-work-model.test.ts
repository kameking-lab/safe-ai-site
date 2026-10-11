import { describe, expect, it } from "vitest";
import { hasElectricalDomainSignal } from "./electrical-work-model";
import { resolveLegalConversationQuery } from "./legal-conversation-context";
import { rehydratePublicLegalConversationContext } from "./legal-conversation-public-context";
import { buildServiceFirstLegalAnswer, expandVerifiedLegalEvidenceArticles } from "./legal-extractive-answer";

describe("回転刃物の手袋質問と電気盤の分類境界", () => {
  it.each([
    "ボール盤で穴あけするとき、軍手を使ってよいですか？",
    "面取り盤で手袋を着けてよい？",
    "回転するドリルで穴を開ける時に軍手を着けてよいですか？",
    "電気の資格ではなく、回転するドリル刃への軍手の巻き込まれについて聞いています",
    "電気の配線ではなく、ボール盤の回転刃への軍手の巻き込まれについて聞いています",
    "ボール盤の感電ではなく、回転刃に軍手が巻き込まれる危険を聞いています",
  ])("新規質問を安衛則111条へ限定する: %s", (query) => {
    expect(hasElectricalDomainSignal(query)).toBe(false);
    const articles = expandVerifiedLegalEvidenceArticles(query, []);
    expect(articles.map((article) => article.articleNum)).toEqual(["第111条"]);
    const answer = buildServiceFirstLegalAnswer({ query, articles, now: new Date("2026-10-11T00:00:00+09:00") });
    expect(answer).toContain("手袋を使ってはいけません");
    expect(answer).toContain("巻き込まれるおそれ");
    expect(answer).not.toMatch(/低圧|電気工事士|盤外/);
  });

  it.each([
    "電気の資格ではなく、回転するドリル刃への軍手の巻き込まれについて聞いています",
    "電気の配線ではなく、ボール盤の回転刃への軍手の巻き込まれについて聞いています",
    "ボール盤の感電ではなく、回転刃に軍手が巻き込まれる危険を聞いています",
  ])("誤った電気文脈を訂正すると電圧・電気選択肢を捨てる: %s", (message) => {
    const context = rehydratePublicLegalConversationContext({ topicDomain: "electrical", equipment: "電気盤", voltageClass: "低圧", confirmedChoices: ["盤外から見る"] });
    const result = resolveLegalConversationQuery({ message, context });
    expect(result.usedHistory).toBe(false);
    expect(result.context.topicDomain).toBe("general");
    expect(result.context.voltageClass).toBeUndefined();
    expect(result.context.confirmedChoices).toBeUndefined();
  });

  it.each(["分電盤でテスターを使う資格は？", "盤を開けて測定", "ボール盤の配線工事で絶縁手袋は必要？"])("本当の電気作業を保持する: %s", (query) => {
    expect(hasElectricalDomainSignal(query)).toBe(true);
  });
  it.each([
    "ボール盤の感電ではなく配線を修理する時の手袋を聞いています",
    "ボール盤の配線ではなく結線をする時の手袋は？",
    "ボール盤の配線で感電しないよう絶縁手袋を使うべき？",
  ])("訂正の中に残る電気作業・感電防止を保持する: %s", (query) => {
    expect(hasElectricalDomainSignal(query)).toBe(true);
  });
  it.each(["ボール盤で穴あけ", "旋盤の外側を見る", "文字盤を見る"])("盤の部分一致だけでは電気としない: %s", (query) => {
    expect(hasElectricalDomainSignal(query)).toBe(false);
  });
});
