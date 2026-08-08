import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { buildServiceFirstLegalAnswer } from "@/lib/legal-extractive-answer";
import { lawArticleToSource } from "@/lib/chatbot-route-shared";

const scaffoldArticle: LawArticle = {
  law: "労働安全衛生規則",
  lawShort: "安衛則",
  articleNum: "第563条",
  articleTitle: "作業床",
  text: "高さ二メートル以上の作業場所では、足場に手すり等を設けること。".repeat(
    10,
  ),
  keywords: ["足場", "手すり"],
  sourceUrl: "https://laws.e-gov.go.jp/law/347M50002000032",
};

describe("chatbot source metadata", () => {
  it("本文版と一致したe-Gov改正の公布日と履歴だけをAPI出典へ渡す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "安衛法" && candidate.articleNum === "第1条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "安衛法第1条は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.amendmentPromulgatedOn).toBe("2025-05-14");
    expect(source.amendmentHistory?.[0]).toMatchObject({
      revisionId: "20260401_507AC0000000033",
      amendmentLawNumber: "令和七年法律第三十三号",
      promulgatedOn: "2025-05-14",
      effectiveOn: "2026-04-01",
    });
  });

  it("未確認の公布日や改正履歴を法令番号から推測しない", () => {
    const source = lawArticleToSource(
      scaffoldArticle,
      "足場の手すりは？",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.lawNumber).toBeDefined();
    expect(source.amendmentPromulgatedOn).toBeUndefined();
    expect(source.amendmentHistory).toBeUndefined();
  });

  it("確認できる施行日だけから現在施行中を表示する", () => {
    const source = lawArticleToSource(
      scaffoldArticle,
      "足場の手すりは？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.applicationStatus).toBe("current");
    expect(source.effectiveOn).toContain("平成21年6月1日");
    expect(source.asOf).toBe("2026-08-02");
    expect(source.url).toMatch(/^https:\/\/laws\.e-gov\.go\.jp\//);
  });

  it("対象時点より後の施行本文を過去時点の現行規定と誤表示しない", () => {
    const source = lawArticleToSource(
      scaffoldArticle,
      "2008年4月1日時点の足場手すり基準は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.applicationStatus).toBe("future");
    expect(source.asOf).toBe("2008-04-01");
  });

  it("現在本文を将来時点にも有効と推測せず確認不能にする", () => {
    const source = lawArticleToSource(
      scaffoldArticle,
      "2027年4月1日時点の足場手すり基準は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.applicationStatus).toBe("unknown");
    expect(source.asOf).toBe("2027-04-01");
  });

  it("施行日を確認できない条文を現在施行中と推定しない", () => {
    const source = lawArticleToSource(
      { ...scaffoldArticle, articleNum: "第999条" },
      "安衛則第999条は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.applicationStatus).toBe("unknown");
  });

  it("直近に取得・検証したe-Gov現行本文は施行日推測なしで現在資料と示す", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        articleNum: "第999条",
        sourceKind: "egov-fulltext-snapshot",
        sourceFetchedAt: "2026-08-02T02:06:51.969Z",
        verificationStatus: "snapshot-hash-verified",
      },
      "安衛則第999条は現在有効？",
      new Date("2026-08-02T12:00:00+09:00"),
    );
    expect(source.applicationStatus).toBe("current");
    expect(source.effectiveOn).toBeUndefined();
  });

  it("クライアントへ条文全文を送らず短い抜粋だけを返す", () => {
    const source = lawArticleToSource(
      scaffoldArticle,
      "足場の手すりは？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.fullText).toBeUndefined();
    expect(source.text.length).toBeLessThanOrEqual(201);
    expect(source.snippet?.length).toBeLessThanOrEqual(142);
  });

  it("号別一覧から質問に一致する号と該当箇所を返す", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        articleNum: "第36条",
        itemNumberMap: {
          "十の五": "高所作業車の運転（作業床の高さ10メートル未満）",
          四十一: "フルハーネス型墜落制止用器具を用いて行う作業",
        },
      },
      "高所作業車に特別教育は必要？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.item).toBe("第十の五号");
    expect(source.snippet).toContain("高所作業車");
  });

  it("e-Govフラット本文の号の枝番を第10号へ潰さない", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        articleNum: "第36条",
        itemNumberMap: undefined,
        text: "十　車両系建設機械の運転十の二　建設機械の操作十の五　作業床の高さが十メートル未満の高所作業車の運転十一　巻上げ機の運転",
      },
      "高所作業車に特別教育は必要？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.item).toBe("第10号の5");
    expect(source.snippet).toContain("高所作業車");
    expect(source.snippet).not.toContain("巻上げ機");
  });

  it("有機溶剤の種別を条文の号と取り違えない", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        law: "有機溶剤中毒予防規則",
        lawShort: "有機則",
        articleNum: "第8条",
        articleTitle: "適用除外",
        itemNumberMap: undefined,
        text: "第二種有機溶剤等に係る有機溶剤業務。二　設備を設けることが困難なとき。",
      },
      "屋内で第2種有機溶剤を使う時は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.item).toBeUndefined();
  });

  it("石綿事前調査者は第3条第4項とし第4号にしない", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        law: "石綿障害予防規則",
        lawShort: "石綿則",
        articleNum: "第3条",
        text: "事業者は事前調査を行わなければならない。４　事業者は、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
      },
      "石綿の事前調査の調査者は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(source.article).toContain("第3条第4項");
    expect(source.paragraph).toBe("第4項");
    expect(source.item).toBeUndefined();
    expect(source.snippet).toContain("第4項");
    expect(source.snippet).toContain("必要な知識を有する者");
    expect(source.text).toContain("必要な知識を有する者");
    expect(source.snippet).not.toContain("事前調査を行わなければならない。４");
  });

  it("明示した第4項だけを第4号へ推測せず項本文を返す", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        law: "石綿障害予防規則",
        lawShort: "石綿則",
        articleNum: "第3条",
        text: "事業者は事前調査を行わなければならない。２　調査結果を記録する。３　分析調査を行う。４　事業者は、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。一　建築物の事前調査二　工作物の事前調査",
        itemNumberMap: {
          四: "石綿を含む建材に関する第4号の規定",
        },
      },
      "2022年の石綿則第3条第4項は施行済みですか？",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第4項");
    expect(source.item).toBeUndefined();
    expect(source.snippet).toContain("第4項");
    expect(source.snippet).toContain("必要な知識を有する者");
    expect(source.snippet).not.toContain("第4号");
  });

  it("項と号をともに明示した場合はその号だけを返す", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        law: "石綿障害予防規則",
        lawShort: "石綿則",
        articleNum: "第3条",
        text: "事業者は事前調査を行わなければならない。２　調査結果を記録する。３　分析調査を行う。４　必要な知識を有する者に調査を行わせる。一　建築物の事前調査二　工作物の事前調査",
        itemNumberMap: undefined,
      },
      "石綿則第3条第4項第2号を確認したい",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第4項");
    expect(source.item).toBe("第2号");
    expect(source.snippet).toContain("第2号");
    expect(source.snippet).toContain("工作物の事前調査");
    expect(source.snippet).not.toContain("建築物の事前調査");
  });

  it("号の範囲を先頭1号へ潰さず、各号の公式本文を返す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "酸欠則" && candidate.articleNum === "第3条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "酸欠則第3条第2項第1号から第7号の測定記録は？",
      new Date("2026-08-03T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第2項");
    expect(source.item).toBe("第1号〜第7号");
    expect(source.snippet).toMatch(
      /第1号.*測定日時.*第6号.*測定を実施した者の氏名.*第7号.*防止措置を講じたとき/,
    );
  });

  it("非連続の複数号を先頭1号へ潰さず、指定した号だけを返す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "酸欠則" && candidate.articleNum === "第12条",
    );
    expect(article).toBeDefined();
    const query = "酸欠則第12条第1項第1号、第2号及び第5号は？";

    const source = lawArticleToSource(
      article as LawArticle,
      query,
      new Date("2026-08-03T00:00:00+09:00"),
    );
    const answer = buildServiceFirstLegalAnswer({
      query,
      articles: [article as LawArticle],
      now: new Date("2026-08-03T00:00:00+09:00"),
    });

    expect(source.item).toBe("第1号・第2号・第5号");
    expect(source.snippet).toMatch(
      /第1号.*発生の原因.*第2号.*症状.*第5号.*防止に関し必要な事項/,
    );
    expect(source.snippet).not.toMatch(/第3号|第4号/);
    expect(answer).toMatch(
      /第1号「酸素欠乏の発生の原因」.*第2号「酸素欠乏症の症状」.*第5号「前各号に掲げるもののほか、酸素欠乏症の防止に関し必要な事項」/,
    );
  });

  it("旧仮名を含む条文本文からフォークリフトの号と該当箇所を抽出する", () => {
    const source = lawArticleToSource(
      {
        ...scaffoldArticle,
        law: "労働安全衛生法施行令",
        lawShort: "安衛令",
        articleNum: "第20条",
        articleTitle: "就業制限に係る業務",
        itemNumberMap: undefined,
        text: "法第六十一条第一項の政令で定める業務は、次のとおりとする。一　発破の業務。十一　最大荷重が一トン以上のフオークリフトの運転（道路上を走行させる運転を除く。）の業務。十二　車両系建設機械の運転の業務",
      },
      "最大荷重1トン以上のフォークリフト資格は？",
      new Date("2026-08-02T00:00:00+09:00"),
    );

    expect(source.item).toBe("第11号");
    expect(source.snippet).toContain("フオークリフト");
    expect(source.snippet).toContain("一トン以上");
  });

  it("回答の引用番号と、結論を直接支える該当箇所を同じ順序で返す", () => {
    const query = "高所作業車に必要な教育は？";
    const articles: LawArticle[] = [
      {
        ...scaffoldArticle,
        articleNum: "第36条",
        articleTitle: "特別教育を必要とする業務",
        text: "十の五　作業床の高さが十メートル未満の高所作業車（道路上を走行させる運転を除く。）の運転の業務",
        itemNumberMap: undefined,
      },
      {
        ...scaffoldArticle,
        law: "労働安全衛生法",
        lawShort: "安衛法",
        articleNum: "第59条",
        articleTitle: "安全衛生教育",
        text: "危険又は有害な業務で厚生労働省令で定めるものに労働者をつかせるときは、当該業務に関する特別の教育を行わなければならない。",
      },
      {
        ...scaffoldArticle,
        law: "労働安全衛生法施行令",
        lawShort: "安衛令",
        articleNum: "第20条",
        articleTitle: "就業制限に係る業務",
        text: "十五　作業床の高さが十メートル以上の高所作業車（道路上を走行させる運転を除く。）の運転の業務",
        itemNumberMap: undefined,
      },
      {
        ...scaffoldArticle,
        law: "労働安全衛生法",
        lawShort: "安衛法",
        articleNum: "第61条",
        articleTitle: "就業制限",
        text: "政令で定める業務は、技能講習を修了した者その他資格を有する者でなければ就かせてはならない。",
      },
    ];
    const answer = buildServiceFirstLegalAnswer({ query, articles });
    const sources = articles.map((item) => lawArticleToSource(item, query));

    expect(answer.split("\n")[1]).toContain("［1］［2］［3］［4］");
    expect(sources).toHaveLength(4);
    expect(sources[0]?.snippet).toMatch(/十メートル未満.*高所作業車/);
    expect(sources[2]?.snippet).toMatch(/十メートル以上.*高所作業車/);
    expect(sources[2]?.item).toBe("第15号");
  });
});
