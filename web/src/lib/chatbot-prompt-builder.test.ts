import { describe, it, expect } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  allowedCitationKeySet,
  buildAllowedCitations,
  buildPromptWithWhitelist,
  formatAllowedCitationsSection,
} from "./chatbot-prompt-builder";

const ARTICLE_61: LawArticle = {
  law: "労働安全衛生法",
  lawShort: "安衛法",
  articleNum: "第61条",
  articleTitle: "就業制限",
  text: "事業者は、クレーンの運転その他の業務で、政令で定めるものについては、都道府県労働局長の当該業務に係る免許を受けた者又は都道府県労働局長の登録を受けた者が行う当該業務に係る技能講習を修了した者その他厚生労働省令で定める資格を有する者でなければ、当該業務に就かせてはならない。",
  keywords: ["就業制限", "技能講習", "フォークリフト"],
};

const ARTICLE_20: LawArticle = {
  law: "労働安全衛生法施行令",
  lawShort: "安衛令",
  articleNum: "第20条",
  articleTitle: "就業制限に係る業務",
  text: "法第61条第1項の政令で定める業務は、次のとおりとする。",
  keywords: ["就業制限", "技能講習"],
  itemNumberMap: {
    一: "発破の作業",
    六: "ボイラー（小型ボイラーを除く。）の取扱いの業務",
    十一: "最大荷重1トン以上のフォークリフトの運転の業務",
    十六: "クレーンの運転の業務",
  },
};

const ARTICLE_563: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第563条",
  articleTitle: "作業床",
  text: "事業者は、足場（一側足場を除く。）における高さ二メートル以上の作業場所には、次に定めるところにより、作業床を設けなければならない。",
  keywords: ["足場", "作業床", "手すり"],
};

describe("buildAllowedCitations", () => {
  it("空配列を受けたら空配列を返す", () => {
    expect(buildAllowedCitations([])).toEqual([]);
  });

  it("単一条文を AllowedCitation に変換する", () => {
    const out = buildAllowedCitations([ARTICLE_563]);
    expect(out).toHaveLength(1);
    expect(out[0].lawShort).toBe("安衛則");
    expect(out[0].articleNum).toBe("第563条");
    expect(out[0].articleTitle).toBe("作業床");
    expect(out[0].key).toMatch(/^安衛則\|563/);
  });

  it("重複（同一 lawShort+articleNum）は先勝ちで除外する", () => {
    const out = buildAllowedCitations([ARTICLE_563, ARTICLE_563]);
    expect(out).toHaveLength(1);
  });

  it("複数法令の混在を順序保持で展開する", () => {
    const out = buildAllowedCitations([ARTICLE_61, ARTICLE_20, ARTICLE_563]);
    expect(out.map((c) => c.lawShort)).toEqual(["安衛法", "安衛令", "安衛則"]);
  });

  it("itemNumberMap を保持する", () => {
    const out = buildAllowedCitations([ARTICLE_20]);
    expect(out[0].itemNumberMap).toBeDefined();
    expect(out[0].itemNumberMap!["十一"]).toContain("フォークリフト");
  });

  it("LAW_METADATA があれば fullName を上書きする", () => {
    const out = buildAllowedCitations([ARTICLE_563]);
    // 安衛則は LAW_METADATA に "労働安全衛生規則" として登録されているはず
    expect(out[0].lawFullName).toMatch(/労働安全衛生規則/);
  });
});

describe("formatAllowedCitationsSection", () => {
  it("条文ゼロの場合は禁止指示を出す", () => {
    const out = formatAllowedCitationsSection([]);
    expect(out).toContain("該当条文なし");
    expect(out).toContain("禁止");
  });

  it("条文を箇条書きで列挙する", () => {
    const cits = buildAllowedCitations([ARTICLE_61, ARTICLE_563]);
    const out = formatAllowedCitationsSection(cits);
    expect(out).toContain("出力可能な条文番号リスト");
    expect(out).toContain("安衛法");
    expect(out).toContain("第61条");
    expect(out).toContain("安衛則");
    expect(out).toContain("第563条");
  });

  it("itemNumberMap がある条文は号番号と対象業務を併記する", () => {
    const cits = buildAllowedCitations([ARTICLE_20]);
    const out = formatAllowedCitationsSection(cits);
    expect(out).toContain("第十一号");
    expect(out).toContain("フォークリフト");
  });
});

describe("buildPromptWithWhitelist", () => {
  it("ホワイトリスト+質問+context を1プロンプトに統合する", () => {
    const cits = buildAllowedCitations([ARTICLE_563]);
    const prompt = buildPromptWithWhitelist({
      question: "足場の手すりの高さは?",
      context: "（足場の条文テキスト）",
      allowed: cits,
    });
    expect(prompt).toContain("出力可能な条文番号リスト");
    expect(prompt).toContain("第563条");
    expect(prompt).toContain("足場の手すりの高さは?");
    expect(prompt).toContain("（足場の条文テキスト）");
    expect(prompt).toContain("リストに無い論点");
  });

  it("MLIT context が空文字なら追加セクションを出さない", () => {
    const prompt = buildPromptWithWhitelist({
      question: "Q",
      context: "C",
      mlitContext: "",
      allowed: [],
    });
    expect(prompt).not.toContain("関連する所管省庁の公式ガイドライン");
  });

  it("MLIT context があれば省庁資料セクションを挿入する", () => {
    const prompt = buildPromptWithWhitelist({
      question: "Q",
      context: "C",
      mlitContext: "- 国土交通省「足場の組立等作業主任者技能講習」",
      allowed: [],
    });
    expect(prompt).toContain("国土交通省");
    expect(prompt).toContain("関連する所管省庁の公式ガイドライン・通達");
  });
});

describe("allowedCitationKeySet", () => {
  it("正規化キーの Set を返す", () => {
    const cits = buildAllowedCitations([ARTICLE_61, ARTICLE_563]);
    const set = allowedCitationKeySet(cits);
    expect(set.size).toBe(2);
    expect([...set].some((k) => k.startsWith("安衛法|"))).toBe(true);
    expect([...set].some((k) => k.startsWith("安衛則|"))).toBe(true);
  });
});
