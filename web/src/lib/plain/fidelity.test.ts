/**
 * fidelity ゲートの単体テスト＋「裏切り」検出の実証。
 *
 * 本丸は後半の改ざんデモ: 実データ（酸欠則の現場ことば版）に対して
 *  - 義務主体を1箇所すり替える（事業者→労働者）
 *  - 数値を変える（18%→20%）
 *  - 限度方向を変える（以上→以下）
 *  - 義務を努力義務に弱める
 *  - 原文に無い数値を足す（捏造）
 *  - 参照条を黙って落とす
 * と、checkFidelity が必ず Violation を返す＝CI が落ちることを機械で固定する。
 */

import { describe, expect, it } from "vitest";
import { sankketsuKisoku } from "@/data/laws/sankketsu-kisoku";
import { plainSankketsuKisoku } from "@/data/plain/sankketsu-kisoku";
import type { PlainArticle } from "@/data/plain/types";
import {
  checkFidelity,
  extractLawDuties,
  extractNumericFacts,
  type Violation,
} from "./fidelity";
import { plainSourceHash } from "./text-hash";

function article(articleNum: string) {
  const a = sankketsuKisoku.find((x) => x.articleNum === articleNum);
  if (!a) throw new Error(`corpus に ${articleNum} が無い`);
  return a;
}

function plain(articleNum: string): PlainArticle {
  const p = plainSankketsuKisoku.find((x) => x.articleNum === articleNum);
  if (!p) throw new Error(`plain に ${articleNum} が無い`);
  return p;
}

function kinds(violations: Violation[]): string[] {
  return violations.map((v) => v.kind);
}

describe("数値事実の抽出", () => {
  it("酸欠則2条: 18パーセント未満・100万分の10超・第1種/第2種を拾い、条参照や法令番号の数字は拾わない", () => {
    const facts = extractNumericFacts(article("第2条").text);
    const canon = facts.map((f) => `${f.canonical}${f.bound ? ":" + f.bound : ""}`);
    expect(canon).toContain("pct:18:lt");
    expect(canon).toContain("ppm:10:gt");
    expect(canon).toContain("shu:1");
    expect(canon).toContain("shu:2");
    // 「昭和47年政令第318号」「令別表第6第3号の3」の数字は数値事実にしない
    expect(canon.some((c) => c.includes(":47") || c.includes(":318") || c.includes(":6"))).toBe(false);
  });

  it("酸欠則3条: 保存期間3年間を拾う", () => {
    const canon = extractNumericFacts(article("第3条").text).map((f) => f.canonical);
    expect(canon).toContain("year:3");
  });

  it("ppm と 100万分のN は同値キーに正規化される", () => {
    expect(extractNumericFacts("硫化水素の濃度が100万分の10を超える")[0]).toMatchObject({
      canonical: "ppm:10",
      bound: "gt",
    });
    expect(extractNumericFacts("硫化水素10ppmを超える状態")[0]).toMatchObject({
      canonical: "ppm:10",
      bound: "gt",
    });
  });
});

describe("義務主体×義務種別の抽出", () => {
  it("酸欠則5条: (事業者, 義務) を抽出する", () => {
    expect(extractLawDuties(article("第5条").text)).toEqual([
      { subject: "事業者", modality: "obligation" },
    ]);
  });

  it("酸欠則6条: 事業者の義務と労働者の使用義務を区別して抽出する", () => {
    const duties = extractLawDuties(article("第6条").text);
    expect(duties).toContainEqual({ subject: "事業者", modality: "obligation" });
    expect(duties).toContainEqual({ subject: "労働者", modality: "obligation" });
  });

  it("酸欠則13条: 請負人への配慮義務（配慮しなければならない）を care として抽出する", () => {
    const duties = extractLawDuties(article("第13条").text);
    expect(duties).toContainEqual({ subject: "事業者", modality: "care" });
  });
});

describe("正しい言い換えは全緑", () => {
  it("酸欠則 現場ことば版 16条すべて violations 0", () => {
    for (const p of plainSankketsuKisoku) {
      const a = article(p.articleNum);
      expect(plainSourceHash(a.text), `${p.articleNum} の sourceTextHash`).toBe(p.sourceTextHash);
      const v = checkFidelity(a, p);
      expect(v, `${p.articleNum}: ${v.map((x) => x.message).join(" / ")}`).toEqual([]);
    }
  });
});

describe("裏切り検出の実証（これが落ちなくなったらゲートの故障）", () => {
  it("義務主体のすり替え（事業者→労働者）を検出する: 酸欠則5条", () => {
    const p = plain("第5条");
    const tampered: PlainArticle = {
      ...p,
      plainText: p.plainText.replace("事業者は", "労働者は"),
    };
    const v = checkFidelity(article("第5条"), tampered);
    expect(kinds(v)).toContain("duty-fabricated"); // 労働者×義務は原文に無い
    expect(kinds(v)).toContain("duty-missing"); // 事業者×義務が消えた
  });

  it("数値の改変（18%→20%）を検出する: 酸欠則5条", () => {
    const p = plain("第5条");
    const tampered = { ...p, plainText: p.plainText.replace(/18%/g, "20%") };
    const v = checkFidelity(article("第5条"), tampered);
    expect(kinds(v)).toContain("number-missing"); // 原文の18パーセントが消えた
    expect(kinds(v)).toContain("number-fabricated"); // 20%は原文に無い
  });

  it("限度方向の改変（10ppm以下→10ppm以上）を検出する: 酸欠則5条", () => {
    const p = plain("第5条");
    const tampered = { ...p, plainText: p.plainText.replace("10ppm以下", "10ppm以上") };
    expect(kinds(checkFidelity(article("第5条"), tampered))).toContain("bound-changed");
  });

  it("義務の弱体化（しなければなりません→努めましょう）を検出する: 酸欠則5条", () => {
    const p = plain("第5条");
    const tampered = {
      ...p,
      plainText: p.plainText.replace("保たなければなりません", "保つよう努めましょう"),
    };
    const v = checkFidelity(article("第5条"), tampered);
    expect(kinds(v)).toContain("duty-fabricated"); // 事業者×努力義務は原文に無い
    expect(kinds(v)).toContain("duty-missing"); // 事業者×義務が消えた
  });

  it("数値の捏造（原文に無い30分ルールの追加）を検出する: 酸欠則14条", () => {
    const p = plain("第14条");
    const tampered = {
      ...p,
      plainText: p.plainText.replace("退避させなければなりません。", "退避させなければなりません。30分は再入場できません。"),
    };
    expect(kinds(checkFidelity(article("第14条"), tampered))).toContain("number-fabricated");
  });

  it("参照条の黙った省略を検出する: 酸欠則29条（第24条第1項を落とす）", () => {
    const p = plain("第29条");
    const tampered = { ...p, plainText: p.plainText.replace("（第24条第1項）", "") };
    expect(kinds(checkFidelity(article("第29条"), tampered))).toContain("ref-missing");
  });

  it("文体規約違反（である調）を検出する", () => {
    const p = plain("第10条");
    const tampered = { ...p, plainText: "事業者は近接作業場との連絡を保たねばならない。" };
    expect(kinds(checkFidelity(article("第10条"), tampered))).toContain("style");
  });

  it("端的さ上限（1文120字超・全体400字超。2026-07-12以降の生成分に強制）を検出する", () => {
    const p = { ...plain("第10条"), generatedAt: "2026-07-12" };
    const longSentence =
      "事業者は、" + "近くの作業場のことをよく考えて、".repeat(9) + "連絡を保たなければなりません。";
    const v1 = checkFidelity(article("第10条"), { ...p, plainText: longSentence });
    expect(v1.some((x) => x.kind === "style" && x.message.includes("1文が長すぎます"))).toBe(true);

    const longTotal = p.plainText + "この連絡は大切です。".repeat(30);
    const v2 = checkFidelity(article("第10条"), { ...p, plainText: longTotal });
    expect(v2.some((x) => x.kind === "style" && x.message.includes("全体が長すぎます"))).toBe(true);
  });

  it("端的さ上限は括弧書き（条参照）を除いて測り、ラチェット開始日前の生成分には適用しない", () => {
    const base = plain("第10条");
    // 括弧内が長くても実読長が上限内ならOK（参照保存と長さ上限を衝突させない）
    const parenHeavy = {
      ...base,
      generatedAt: "2026-07-12",
      plainText:
        "近くの作業場で行われる作業のせいで酸素欠乏などが起きるおそれがあるとき（この判定はとても長い括弧書きの注記で補足されますが読み飛ばせるので実読長には数えません。".slice(0, 80) +
        "）、事業者は、その作業場との間の連絡を保たなければなりません。",
    };
    expect(
      checkFidelity(article("第10条"), parenHeavy).filter((x) => x.message.includes("長すぎます"))
    ).toEqual([]);
    // 開始日前（grandfathered）は長文でも length violation を出さない
    const legacyLong = {
      ...base,
      generatedAt: "2026-07-11",
      plainText:
        "事業者は、" + "近くの作業場のことをよく考えて、".repeat(9) + "連絡を保たなければなりません。",
    };
    expect(
      checkFidelity(article("第10条"), legacyLong).filter((x) => x.message.includes("長すぎます"))
    ).toEqual([]);
  });
});

/**
 * fidelity v2 の盲点吸収を実証する: 漢数字・拡張単位・全角スラッシュ分数・
 * ただし書・「原文をご覧ください」・語彙外主体の6軸で、盲点を1件仕込むと
 * 必ずゲートが赤くなることを機械で固定する。
 * (酷評 CR2-D1〜D5 の再発防止)
 */
describe("v2 盲点吸収の実証 (仕込みを1件でも入れると必ず落ちる)", () => {
  const v2Plain = (text: string, opts: Partial<PlainArticle> = {}): PlainArticle => ({
    egovLawId: "TEST",
    articleNum: "第0条",
    plainText: text,
    sourceTextHash: "0000000000000000",
    sourceRevisionId: "test",
    generatedAt: "2026-07-13",
    model: "test",
    checkStatus: "verified",
    ...opts,
  });
  const lawOf = (text: string) => ({
    law: "テスト",
    lawShort: "テスト",
    articleNum: "第0条",
    articleTitle: "テスト",
    text,
    keywords: [],
  });

  it("[G1] 漢数字の数値欠落を検出する (百五十立方メートル → 150立方メートル)", () => {
    const law = lawOf(
      "事業者は、気積が百五十立方メートルを超えるときは、百五十立方メートルとして計算しなければならない。"
    );
    const badPlain = v2Plain("事業者は、気積を計算しなければなりません。");
    const kinds1 = kinds(checkFidelity(law, badPlain));
    expect(kinds1).toContain("number-missing");
  });

  it("[G2] 拡張単位 (キロパスカル/立方メートル/ミリシーベルト/円) の欠落を検出する", () => {
    for (const [orig, unit] of [
      ["18キロパスカル以上", "18キロパスカル"],
      ["0.05ミリシーベルト", "0.05ミリシーベルト"],
      ["50万円以下の罰金", "50万円"],
      ["150立方メートル", "150立方メートル"],
    ] as const) {
      const law = lawOf(`事業者は、${orig}保たなければならない。`);
      const badPlain = v2Plain("事業者は、適切に保たなければなりません。");
      expect(kinds(checkFidelity(law, badPlain))).toContain("number-missing");
      const goodPlain = v2Plain(`事業者は、${unit}保たなければなりません。`);
      // 数値保存を担保していれば number-missing は出ない
      const goodKinds = kinds(checkFidelity(law, goodPlain));
      expect(goodKinds.filter((k) => k === "number-missing")).toEqual([]);
    }
  });

  it("[G2] 全角スラッシュ分数 (1/15・2/5・3/2) の欠落を検出する", () => {
    const law = lawOf(
      "事業者は、Ｗ＝（１／１５）×Ａ、Ｗ＝（２／５）×Ａ、Ｗ＝（３／２）×Ａで計算しなければならない。"
    );
    const badPlain = v2Plain("事業者は、計算式に従って計算しなければなりません。");
    expect(kinds(checkFidelity(law, badPlain))).toContain("number-missing");
  });

  it("[G4] plainText に「原文をご覧ください」があると reader-abandoned で必ず落ちる", () => {
    const law = lawOf("事業者は、必要な措置を講じなければならない。");
    const badPlain = v2Plain(
      "事業者は、必要な措置を講じなければなりません。詳しくは原文をご覧ください。"
    );
    expect(kinds(checkFidelity(law, badPlain))).toContain("reader-abandoned");
  });

  it("[G5] 原文にただし書があるのに plain も omissions も例外を書いていないと exception-missing", () => {
    const law = lawOf(
      "事業者は、覆いを設けなければならない。ただし、直径が五十ミリメートル未満の研削といしについては、この限りでない。"
    );
    const missingException = v2Plain(
      "事業者は、覆いを設けなければなりません。"
    );
    expect(kinds(checkFidelity(law, missingException))).toContain("exception-missing");
    // 「ただし」を含めていれば OK
    const withException = v2Plain(
      "事業者は、覆いを設けなければなりません。ただし、直径50ミリメートル未満のといしは除きます。"
    );
    expect(kinds(checkFidelity(law, withException))).not.toContain("exception-missing");
  });

  it("[G6] 主体語彙外 (「文書は」「装置は」等) の義務欠落を duty-out-of-vocab で検出する", () => {
    const law = lawOf(
      "法第57条第2項の規定による文書は、譲渡し、又は提供する際に交付しなければならない。"
    );
    const badPlain = v2Plain(
      "文書は、譲渡・提供する際に交付するものです。"
    );
    const v = kinds(checkFidelity(law, badPlain));
    expect(v).toContain("duty-out-of-vocab");
  });

  it("[G4] omissions で「原文をご覧ください」を declared しても plainText 中の同表現は reader-abandoned で落ちる", () => {
    const law = lawOf("事業者は、必要な措置を講じなければならない。");
    const badPlain = v2Plain(
      "事業者は、必要な措置を講じなければなりません。詳しくは原文をご覧ください。",
      { omissions: ["原文をご覧ください旨は omissions で宣言"] }
    );
    expect(kinds(checkFidelity(law, badPlain))).toContain("reader-abandoned");
  });

  it("v2 検査は generatedAt < 2026-07-13 のエントリには exception/reader-abandoned/duty-out-of-vocab を強制しない", () => {
    const law = lawOf(
      "事業者は、覆いを設けなければならない。ただし、直径が五十ミリメートル未満の研削といしについては、この限りでない。"
    );
    const legacyPlain = v2Plain("事業者は、覆いを設けなければなりません。", {
      generatedAt: "2026-07-11",
    });
    const v = kinds(checkFidelity(law, legacyPlain));
    expect(v).not.toContain("exception-missing");
    expect(v).not.toContain("reader-abandoned");
    expect(v).not.toContain("duty-out-of-vocab");
  });

  it("非数量の「不十分」「十分な連絡」が偽の 10分 に化けない (正規化偽陽性の抑止)", () => {
    const law = lawOf("事業者は、自然換気が不十分な場所については十分な連絡を保たなければならない。");
    const goodPlain = v2Plain(
      "事業者は、自然換気が不十分な場所については十分な連絡を保たなければなりません。"
    );
    const v = kinds(checkFidelity(law, goodPlain));
    // 10分等の偽数値で number-missing/number-fabricated が出ないこと
    expect(v).not.toContain("number-missing");
    expect(v).not.toContain("number-fabricated");
  });
});
