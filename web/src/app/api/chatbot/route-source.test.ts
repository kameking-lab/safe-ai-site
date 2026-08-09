import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { verifiedPrimaryElectricalArticles } from "@/data/laws/verified-primary-electrical";
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
  it.each([
    "測定器をクリップ留めするだけなら電工いる？",
    "屋内配線に測定器を取り付ける場合は電気工事士必要？",
    "経産省電工Q&A Q10",
    "盤を開けてテスターを当てる",
  ])("経産省Q10を測定器取付けの完結した公式抜粋として返す: %s", (query) => {
    const article = verifiedPrimaryElectricalArticles.find(
      (candidate) => candidate.lawShort === "経産省電工Q&A",
    );
    expect(article).toBeDefined();
    const source = lawArticleToSource(
      article as LawArticle,
      query,
      new Date("2026-08-09T00:00:00+09:00"),
    );

    expect(source.item).toBe("Q10");
    expect(source.snippet).toMatch(
      /Q10[\s\S]*屋内配線を傷付けることが想定されない場合[\s\S]*電気工事士が工事する必要はありません[\s\S]*電気主任技術者の指示確認/,
    );
    expect(source.url).toBe(
      "https://www.meti.go.jp/policy/safety_security/industrial_safety/sangyo/electric/files/kouzi-si-QA201803.pdf",
    );
  });

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
          十の五: "高所作業車の運転（作業床の高さ10メートル未満）",
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

  it("特化則38条の14の監視人を第1項第5号・第12号の該当箇所で示す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "特化則" &&
        candidate.articleNum === "第38条の14",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "特化則38条の14の監視人はどの号？",
      new Date("2026-08-08T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第1項");
    expect(source.item).toBe("第5号・第12号");
    expect(source.snippet).toMatch(/第5号.*監視人.*第12号.*監視人/);
    expect(source.snippet).toMatch(/燻蒸の効果を確認|濃度/);
  });

  it("広い監視人質問でも特化則38条の14を監視人の項号・該当箇所で示す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "特化則" &&
        candidate.articleNum === "第38条の14",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "監視人は必要？",
      new Date("2026-08-08T00:00:00+09:00"),
    );

    expect(source).toMatchObject({
      paragraph: "第1項",
      item: "第5号・第12号",
    });
    expect(source.snippet).toMatch(/第5号.*監視人.*第12号.*監視人/);
  });

  it("電気主任技術者の回答は電事法43条の選任・職務・指示遵守の項だけを返す", () => {
    const article = verifiedPrimaryElectricalArticles.find(
      (candidate) =>
        candidate.lawShort === "電事法" && candidate.articleNum === "第43条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "電気主任技術者がいれば作業できる？",
      new Date("2026-08-09T00:00:00+09:00"),
    );

    expect(source).toMatchObject({
      paragraph: "第1項・第4項・第5項",
      item: undefined,
    });
    expect(source.article).toContain("第43条第1項・第4項・第5項");
    expect(source.snippet).toMatch(
      /第1項.*保安の監督.*第4項.*職務を誠実.*第5項.*指示に従わなければならない/,
    );
  });

  it.each([
    ["安衛則", "第341条", /高圧の充電電路の点検.*感電の危険/],
    ["安衛則", "第342条", /充電電路に接触.*接近.*感電の危険/],
    ["安衛則", "第346条", /低圧の充電電路の点検.*絶縁用保護具/],
    ["安衛則", "第347条", /低圧の充電電路に近接.*絶縁用防具/],
  ])(
    "%s%sはテスター測定回答が引用する第1項とその公式本文を返す",
    (lawShort, articleNum, supportedText) => {
      const article = verifiedLawArticles.find(
        (candidate) =>
          candidate.lawShort === lawShort &&
          candidate.articleNum === articleNum,
      );
      expect(article).toBeDefined();

      const source = lawArticleToSource(
        article as LawArticle,
        "盤を開けてテスターを当てる",
        new Date("2026-08-09T00:00:00+09:00"),
      );

      expect(source.paragraph).toBe("第1項");
      expect(source.article).toContain(`${articleNum}第1項`);
      expect(source.snippet).toMatch(supportedText);
    },
  );

  it.each([
    ["電源を入れるだけ", /低圧.*開閉器の操作/],
    ["ブレーカーを操作する", /低圧.*開閉器の操作/],
    ["開閉器を操作する", /低圧.*開閉器の操作/],
    ["高圧受電設備を点検する", /高圧.*特別高圧.*点検.*操作/],
  ])(
    "%sは安衛則36条第4号の対象行為を該当抜粋で返す",
    (query, supportedText) => {
      const article = verifiedLawArticles.find(
        (candidate) =>
          candidate.lawShort === "安衛則" && candidate.articleNum === "第36条",
      );
      expect(article).toBeDefined();

      const source = lawArticleToSource(
        article as LawArticle,
        query,
        new Date("2026-08-09T00:00:00+09:00"),
      );

      expect(source.item).toBe("第4号");
      expect(source.snippet).toMatch(supportedText);
      expect(source.snippet).not.toMatch(/研削といしの取替え/);
    },
  );

  it.each([
    "電気の点検に資格いる？",
    "盤を見るだけ",
    "ブレーカーを操作する",
    "配線をつなぐ",
  ])("%sは電気工事士法2条3項の定義を返す", (query) => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "電気工事士法" &&
        candidate.articleNum === "第2条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      query,
      new Date("2026-08-09T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第3項");
    expect(source.article).toContain("第2条第3項");
    expect(source.snippet).toMatch(
      /第3項.*電気工事.*設置し、又は変更する工事.*軽微な工事を除く/,
    );
    expect(source.snippet).not.toMatch(/^第1項/);
  });

  it("配線作業は電気工事士法3条1項から4項までの設備区分を返す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "電気工事士法" &&
        candidate.articleNum === "第3条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "配線をつなぐ",
      new Date("2026-08-09T00:00:00+09:00"),
    );

    expect(source.paragraph).toBe("第1項・第2項・第3項・第4項");
    expect(source.article).toContain("第3条第1項・第2項・第3項・第4項");
    expect(source.snippet).toMatch(
      /第1項[\s\S]*第一種電気工事士免状[\s\S]*第2項[\s\S]*第二種電気工事士免状[\s\S]*第3項[\s\S]*特種電気工事資格者認定証[\s\S]*第4項[\s\S]*認定電気工事従事者認定証/,
    );
  });

  it.each([
    ["第5条", /11時間以上.*実技15時間以上.*操作の業務のみは1時間以上/],
    ["第6条", /7時間以上.*実技7時間以上.*開閉器操作のみは1時間以上/],
  ])(
    "特別教育規程%sは学科・実技・操作限定の検証済み時間を返す",
    (articleNum, supportedText) => {
      const article = verifiedPrimaryElectricalArticles.find(
        (candidate) =>
          candidate.lawShort === "特別教育規程" &&
          candidate.articleNum === articleNum,
      );
      expect(article).toBeDefined();

      const source = lawArticleToSource(
        article as LawArticle,
        "電気作業の特別教育の時間は？",
        new Date("2026-08-09T00:00:00+09:00"),
      );

      expect(source.paragraph).toBe("第1項・第2項・第3項");
      expect(source.article).toContain(`${articleNum}第1項・第2項・第3項`);
      expect(source.text).toMatch(supportedText);
      expect(source.snippet).toMatch(supportedText);
    },
  );

  it("停電配線作業は安衛則339条1項1号から3号の措置を返す", () => {
    const article = verifiedLawArticles.find(
      (candidate) =>
        candidate.lawShort === "安衛則" && candidate.articleNum === "第339条",
    );
    expect(article).toBeDefined();

    const source = lawArticleToSource(
      article as LawArticle,
      "停電して配線を外す",
      new Date("2026-08-09T00:00:00+09:00"),
    );

    expect(source).toMatchObject({
      paragraph: "第1項",
      item: "第1号・第2号・第3号",
    });
    expect(source.article).toContain("第339条第1項");
    expect(source.snippet).toMatch(
      /第1号[\s\S]*施錠[\s\S]*通電禁止[\s\S]*監視人[\s\S]*第2号[\s\S]*残留電荷[\s\S]*放電[\s\S]*第3号[\s\S]*高圧又は特別高圧[\s\S]*検電器具[\s\S]*短絡接地/,
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
