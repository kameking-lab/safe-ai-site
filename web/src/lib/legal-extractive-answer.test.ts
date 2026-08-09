import { describe, expect, it } from "vitest";
import type { LawArticle } from "@/data/laws";
import {
  buildServiceFirstLegalAnswer,
  buildServiceFirstNoHitAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
  legalProvisionUnitForQuery,
} from "./legal-extractive-answer";

function article(overrides: Partial<LawArticle> = {}): LawArticle {
  return {
    law: "労働安全衛生規則",
    lawShort: "安衛則",
    articleNum: "第563条",
    articleTitle: "作業床",
    text: "事業者は、足場（一側足場を除く。）における高さ二メートル以上の作業場所には、作業床を設けなければならない。墜落のおそれがある箇所には、足場の種類に応じた設備を設けること。わく組足場以外の足場では、手すり等及び中桟等を設けること。",
    keywords: ["足場", "手すり"],
    ...overrides,
  };
}

function scaffoldDefinition(): LawArticle {
  return article({
    articleNum: "第552条",
    articleTitle: "架設通路",
    text: "墜落の危険のある箇所には、高さ八十五センチメートル以上の手すり等及び高さ三十五センチメートル以上五十センチメートル以下の中桟等を設けること。",
  });
}

function safetyEducationDuty(): LawArticle {
  return article({
    law: "労働安全衛生法",
    lawShort: "安衛法",
    articleNum: "第59条",
    articleTitle: "安全衛生教育",
    text: "危険又は有害な業務で厚生労働省令で定めるものに労働者をつかせるときは、当該業務に関する特別の教育を行わなければならない。",
  });
}

function restrictedWorkDuty(): LawArticle {
  return article({
    law: "労働安全衛生法",
    lawShort: "安衛法",
    articleNum: "第61条",
    articleTitle: "就業制限",
    text: "政令で定める業務は、技能講習を修了した者その他資格を有する者でなければ就かせてはならない。",
  });
}

function forkliftQualificationArticles(): LawArticle[] {
  return [
    safetyEducationDuty(),
    article({
      articleNum: "第36条",
      articleTitle: "特別教育を必要とする業務",
      text: "最大荷重一トン未満のフォークリフト（道路上を走行させる運転を除く。）の運転の業務。",
    }),
    restrictedWorkDuty(),
    article({
      law: "労働安全衛生法施行令",
      lawShort: "安衛令",
      articleNum: "第20条",
      articleTitle: "就業制限に係る業務",
      text: "最大荷重一トン以上のフォークリフト（道路上を走行させる運転を除く。）の運転の業務。",
    }),
  ];
}

function forkliftOperationArticle(articleNum: string): LawArticle {
  const provisions: Record<string, { title: string; text: string }> = {
    第151条の4: {
      title: "作業指揮者",
      text: "事業者は、車両系荷役運搬機械等を用いて作業を行うときは、作業の指揮者を定め、作業計画に基づき作業の指揮を行わせなければならない。",
    },
    第151条の5: {
      title: "制限速度",
      text: "事業者は、車両系荷役運搬機械等（最高速度が毎時十キロメートル以下のものを除く。）について、地形、地盤の状態等に応じた適正な制限速度を定めなければならない。運転者は制限速度を超えて運転してはならない。",
    },
    第151条の14: {
      title: "主たる用途以外の使用の制限",
      text: "事業者は、車両系荷役運搬機械等を荷のつり上げ、労働者の昇降等主たる用途以外の用途に使用してはならない。ただし、労働者に危険を及ぼすおそれのないときは、この限りでない。",
    },
    第151条の21: {
      title: "定期自主検査",
      text: "事業者は、フォークリフトについては、一年を超えない期間ごとに一回、定期に自主検査を行わなければならない。一年を超える期間使用しないときは除くが、使用を再び開始する際に自主検査を行わなければならない。",
    },
    第151条の22: {
      title: "定期自主検査（月次）",
      text: "事業者は、フォークリフトについては、一月を超えない期間ごとに一回、定期に自主検査を行わなければならない。一月を超える期間使用しないときは除くが、使用を再び開始する際に自主検査を行わなければならない。",
    },
  };
  const provision = provisions[articleNum];
  if (!provision) throw new Error(`unknown forklift provision: ${articleNum}`);
  return article({
    articleNum,
    articleTitle: provision.title,
    text: provision.text,
  });
}

function expectSourceLedAnswerIntegrity(answer: string, sourceCount: number) {
  const citationNumbers = [...answer.matchAll(/［(\d+)］/g)].map((match) =>
    Number(match[1]),
  );
  expect(citationNumbers.length).toBeGreaterThan(0);
  for (const citationNumber of citationNumbers) {
    expect(citationNumber).toBeGreaterThanOrEqual(1);
    expect(citationNumber).toBeLessThanOrEqual(sourceCount);
  }

  let section = "";
  for (const line of answer.split("\n")) {
    if (["結論", "条件", "根拠", "適用時点", "次の質問"].includes(line)) {
      section = line;
      continue;
    }
    if (line.trim() && ["結論", "条件", "適用時点"].includes(section)) {
      if (
        line.trim() ===
        "・この条文が対象とする作業・設備・数値条件を照合してください。"
      ) {
        continue;
      }
      expect(line, `引用のない法的主張: ${line}`).toMatch(/［\d+］/);
    }
  }
}

describe("生成AI OFF時の短文回答", () => {
  it("結論から始め、番号付き根拠と次の質問を600字以内で返す", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "足場の手すりは何センチ？",
      articles: [article(), scaffoldDefinition()],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(answer.startsWith("結論\n")).toBe(true);
    expect(answer).toContain("85cm以上");
    expect(answer).toContain("［1］");
    expect(answer).toContain("条件\n");
    expect(answer).toContain("根拠\n");
    expect(answer).toContain("適用時点\n・現在施行中");
    expect(answer).toContain("次の質問\n");
    expect(answer.length).toBeLessThanOrEqual(600);
    expect(answer).not.toContain("生成AI");
    expect(answer).not.toContain("法的助言");
  });

  it("根拠なしを安全や該当なしと断定せず保留する", () => {
    const answer = buildServiceFirstNoHitAnswer(
      "脚立で作業していい高さは？",
      new Date("2026-08-02T00:00:00+09:00"),
    );
    expect(answer).toContain("回答を保留");
    expect(answer).toContain("確認できる条文はありません");
    expect(answer).not.toContain("安全です");
    expect(answer).not.toContain("該当なし");
  });

  it("複数の明示条文を比較すると両条の見出しと引用を返す", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "酸素欠乏症等防止規則第11条と第12条の違いを確認したい",
      articles: [
        article({
          law: "酸素欠乏症等防止規則",
          lawShort: "酸欠則",
          articleNum: "第11条",
          articleTitle: "作業主任者",
        }),
        article({
          law: "酸素欠乏症等防止規則",
          lawShort: "酸欠則",
          articleNum: "第12条",
          articleTitle: "特別の教育",
        }),
      ],
    });

    expect(answer).toContain("第11条は「作業主任者」");
    expect(answer).toContain("第12条は「特別の教育」");
    expect(answer).toContain("［1］［2］");
    expectSourceLedAnswerIntegrity(answer, 2);
  });

  it("枝番号を指定した質問で親条を別の明示条文として扱わない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "安衛法第57条の3は何を定めていますか？",
      articles: [
        article({
          law: "労働安全衛生法",
          lawShort: "安衛法",
          articleNum: "第57条の3",
          articleTitle: "危険性又は有害性等の調査等",
          text: "事業者は、通知対象物による危険性又は有害性等を調査しなければならない。",
        }),
        article({
          law: "労働安全衛生法",
          lawShort: "安衛法",
          articleNum: "第57条",
          articleTitle: "表示等",
          text: "譲渡し、又は提供する者は、名称等を表示しなければならない。",
        }),
      ],
    });

    expect(answer).not.toContain("第57条は「表示等」");
    expect(answer).toContain("通知対象物による危険性又は有害性等を調査");
    expectSourceLedAnswerIntegrity(answer, 2);
  });

  it.each([
    {
      query: "最大荷重1.5トンのフォークリフト資格は？",
      expected: "技能講習",
      articles: [
        restrictedWorkDuty(),
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第20条",
          text: "最大荷重一トン以上のフォークリフト（道路上を走行させる運転を除く。）の運転の業務",
        }),
      ],
    },
    {
      query: "フォークリフト1.5トンを運転したい",
      expected: "技能講習",
      articles: [
        restrictedWorkDuty(),
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第20条",
          text: "最大荷重一トン以上のフォークリフト（道路上を走行させる運転を除く。）の運転の業務",
        }),
      ],
    },
    {
      query: "最大荷重0.8トンのフォークリフト資格は？",
      expected: "特別教育",
      articles: [
        safetyEducationDuty(),
        article({
          articleNum: "第36条",
          text: "最大荷重一トン未満のフォークリフト（道路上を走行させる運転を除く。）の運転の業務",
        }),
      ],
    },
  ])(
    "フォークリフトの荷重回答後は不要な追加質問をしない: $query",
    ({ query, expected, articles }) => {
      const answer = buildServiceFirstLegalAnswer({ query, articles });

      expect(answer).toContain(expected);
      expect(answer).not.toContain("次の質問");
      expect(answer).not.toContain("設備の種類・高さ・荷重");
    },
  );

  it.each([
    {
      query: "フォークリフトの資格と制限速度の設定義務は？",
      operations: ["第151条の5"],
      expected: ["1トン未満", "制限速度", "毎時10km以下"],
    },
    {
      query: "フォークリフトの資格と年1回の定期自主検査の条文は？",
      operations: ["第151条の21"],
      expected: ["一年を超えない期間ごとに一回", "定期自主検査", "再び使用"],
    },
    {
      query: "フォークリフトの資格と用途外使用禁止条文は？",
      operations: ["第151条の14"],
      expected: ["主たる用途以外", "禁止", "危険を及ぼすおそれがない"],
    },
    {
      query: "フォークリフトの資格、制限速度、主用途外使用、年次検査は？",
      operations: ["第151条の5", "第151条の14", "第151条の21"],
      expected: [
        "技能講習修了者等",
        "制限速度",
        "主たる用途以外",
        "定期自主検査",
      ],
    },
  ])(
    "フォークリフト複合質問の各意図へ本文根拠付きで答える: $query",
    ({ query, operations, expected }) => {
      const articles = [
        ...operations.map(forkliftOperationArticle),
        ...forkliftQualificationArticles(),
      ];
      const answer = buildServiceFirstLegalAnswer({ query, articles });

      for (const text of expected) expect(answer).toContain(text);
      expect(answer).not.toMatch(/取得した主な根拠条文は/);
      expectSourceLedAnswerIntegrity(answer, articles.length);
      const cited = citedLegalAnswerArticles(answer, articles);
      for (const operation of operations) {
        expect(cited.some((source) => source.articleNum === operation)).toBe(
          true,
        );
      }
    },
  );

  it.each([
    ["フォークリフトの毎月の自主検査必要？", "第151条の22", "一月を超えない"],
    ["フォークリフトの月例検査は？", "第151条の22", "一月を超えない"],
    [
      "フォークリフトの月1回の定期自主検査は？",
      "第151条の22",
      "一月を超えない",
    ],
    [
      "フォークリフトの年1回の定期自主検査は？",
      "第151条の21",
      "一年を超えない",
    ],
  ])("月次と年次の自主検査を混同しない: %s", (query, articleNum, expected) => {
    const articles = [forkliftOperationArticle(articleNum)];
    const answer = buildServiceFirstLegalAnswer({ query, articles });
    expect(answer).toContain(expected);
    expectSourceLedAnswerIntegrity(answer, articles.length);
  });

  it("頻度なしの定期点検は月次・年次の両方を先に説明する", () => {
    const articles = [
      forkliftOperationArticle("第151条の21"),
      forkliftOperationArticle("第151条の22"),
    ];
    const answer = buildServiceFirstLegalAnswer({
      query: "フォークリフトの定期点検は？",
      articles,
    });
    expect(answer).toContain("月次検査");
    expect(answer).toContain("年次検査");
    expectSourceLedAnswerIntegrity(answer, articles.length);
  });

  it("指揮する人という口語へ作業指揮者の義務を答える", () => {
    const articles = [forkliftOperationArticle("第151条の4")];
    const answer = buildServiceFirstLegalAnswer({
      query: "フォークリフトの指揮する人は必要ですか？",
      articles,
    });
    expect(answer).toContain("作業指揮者を定め");
    expectSourceLedAnswerIntegrity(answer, articles.length);
  });

  it("つり足場の日常点検を568条へ着地させ567条1項と混同しない", () => {
    const articles = [
      article({
        articleNum: "第568条",
        articleTitle: "つり足場の点検",
        text: "事業者は、つり足場における作業を行うときは、点検者を指名して、その日の作業を開始する前に、前条第二項第一号から第五号まで、第七号及び第九号に掲げる事項について点検させ、異常を認めたときは、直ちに補修しなければならない。",
      }),
      article({
        articleNum: "第567条",
        articleTitle: "点検",
        text: "事業者は、足場（つり足場を除く。）における作業を行うときは、その日の作業を開始する前に点検させなければならない。第二項第一号から第五号まで、第七号及び第九号に点検事項を定める。",
      }),
    ];
    const answer = buildServiceFirstLegalAnswer({
      query: "つり足場の使用前点検は何条？",
      articles,
    });
    expect(answer).toContain("直接根拠は安衛則568条");
    expect(answer).toContain("つり足場を明示的に除外");
    expectSourceLedAnswerIntegrity(answer, articles.length);
  });

  it("全引用番号を出典index内に限定し、結論・条件・適用時点の引用なし断定を許さない", () => {
    const cases: Array<{ query: string; articles: LawArticle[] }> = [
      {
        query: "足場の手すりは何センチ？",
        articles: [article(), scaffoldDefinition()],
      },
      {
        query: "最大荷重1.5トンのフォークリフト資格は？",
        articles: [
          restrictedWorkDuty(),
          article({
            law: "労働安全衛生法施行令",
            lawShort: "安衛令",
            articleNum: "第20条",
            text: "最大荷重一トン以上のフォークリフト（道路上を走行させる運転を除く。）の運転の業務",
          }),
        ],
      },
      {
        query: "最大荷重0.8トンのフォークリフト資格は？",
        articles: [
          article({
            articleNum: "第36条",
            text: "最大荷重一トン未満のフォークリフト（道路上を走行させる運転を除く。）の運転の業務",
          }),
          safetyEducationDuty(),
        ],
      },
      {
        query: "つり上げ荷重2トンの玉掛け資格は？",
        articles: [
          article({
            law: "労働安全衛生法施行令",
            lawShort: "安衛令",
            articleNum: "第20条",
            text: "制限荷重又はつり上げ荷重が一トン以上のクレーン等の玉掛けの業務",
          }),
          article({
            law: "クレーン等安全規則",
            lawShort: "クレーン則",
            articleNum: "第221条",
            text: "玉掛け技能講習を修了した者その他法定の資格を有する者でなければ、玉掛けの業務に就かせてはならない。",
          }),
        ],
      },
      {
        query: "フルハーネスはいつ特別教育が必要？",
        articles: [
          article({
            articleNum: "第36条",
            text: "高さが二メートル以上の箇所で作業床を設けることが困難なところにおいて、フルハーネス型を用いて行う作業（ロープ高所作業を除く。）。",
          }),
          safetyEducationDuty(),
        ],
      },
      {
        query: "高所作業車に必要な教育は？",
        articles: [
          article({
            articleNum: "第36条",
            text: "作業床の高さが十メートル未満の高所作業車（道路上を走行させる運転を除く。）の運転の業務",
          }),
          safetyEducationDuty(),
          restrictedWorkDuty(),
          article({
            law: "労働安全衛生法施行令",
            lawShort: "安衛令",
            articleNum: "第20条",
            text: "作業床の高さが十メートル以上の高所作業車（道路上を走行させる運転を除く。）の運転の業務",
          }),
        ],
      },
      {
        query: "熱中症の報告体制は義務？",
        articles: [
          article({
            articleNum: "第612条の2",
            text: "熱中症を生ずるおそれのある作業を行わせるときは、報告するための体制を整備し、関係作業者に周知させなければならない。",
          }),
        ],
      },
    ];

    for (const testCase of cases) {
      const answer = buildServiceFirstLegalAnswer({
        ...testCase,
        now: new Date("2026-08-02T00:00:00+09:00"),
      });
      expectSourceLedAnswerIntegrity(answer, testCase.articles.length);
      if (testCase.query.includes("熱中症")) {
        expect(answer).not.toContain("次の質問");
      }
    }
  });

  it("基準日前日の対象日版を確認できなければ将来扱いせず保留する", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2026年8月1日施行予定の足場規定を確認したい",
      articles: [article()],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(answer).toContain("現行本文だけでは当時の内容を確定できない");
    expect(answer).toContain("確認不能（2026-08-01・対象日版未収録）");
    expect(answer).not.toContain("将来施行");
    expect(answer).not.toContain("作業床を設けなければならない");
  });

  it("対象日版を直接確認できない過去日には現行条文を法的結論として返さない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2023年10月1日時点の安衛則第563条を示して",
      articles: [
        article({
          sourceKind: "egov-fulltext-snapshot",
          sourceVersionKind: "current",
          sourceFetchedAt: "2026-08-02T02:06:51.969Z",
          verificationStatus: "snapshot-hash-verified",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("回答を保留します");
    expect(answer).toContain("対象日版未収録");
    expect(answer).not.toContain("確認できた規定では");
    expect(answer).not.toContain("作業床を設けなければならない");
  });

  it("対象日を覆う検証済み履歴版を直接確認できる場合だけ過去本文を回答する", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2023年10月1日時点の安衛則第563条を示して",
      articles: [
        article({
          sourceKind: "egov-fulltext-snapshot",
          sourceVersionKind: "historical",
          sourceValidFrom: "2023-04-01",
          sourceValidTo: "2024-03-31",
          verificationStatus: "snapshot-hash-verified",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("確認できた規定では");
    expect(answer).toContain("作業床を設けなければならない");
    expect(answer).toContain("過去時点（2023-10-01）");
    expect(answer).not.toContain("回答を保留します");
  });

  it("対象日が収録本文の施行前なら現行本文で当時を断定しない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2008年4月1日時点の足場手すり基準は？",
      articles: [article()],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(answer).toContain("当時の義務は確定できません");
    expect(answer).toContain("当時未施行");
    expect(answer).not.toContain("85cm以上");
  });

  it("フルハーネス特別教育の追加前は、法59条が先頭でも現行要件を当時義務にしない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2010-08-02 フルハーネス特別教育 墜落制止用器具 作業床なし",
      articles: [
        safetyEducationDuty(),
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "高さが二メートル以上の箇所で作業床を設けることが困難なところにおいて、フルハーネス型を用いて行う作業。",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("当時の義務は確定できません");
    expect(answer).toContain("2010-08-02・当時未施行");
    expect(answer).not.toContain("特別教育が必要です");
  });

  it("石綿則3条4項の調査者要件前は、現行資格者義務を当時義務にしない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "石綿作業 2018-01-01 事前調査 資格 調査者 改修",
      articles: [
        article({
          law: "石綿障害予防規則",
          lawShort: "石綿則",
          articleNum: "第3条",
          articleTitle: "事前調査及び分析調査",
          text: "事業者は、事前調査について、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("当時の義務は確定できません");
    expect(answer).toContain("2018-01-01・当時未施行");
    expect(answer).not.toContain("行わせなければなりません");
  });

  it("2019年の質問は2月1日の前後へ分け、年全体を施行前とも施行済みとも断定しない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2019年 フルハーネス特別教育 墜落制止用器具 作業床なし",
      articles: [
        safetyEducationDuty(),
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "高さが二メートル以上の箇所で作業床を設けることが困難なところにおいて、フルハーネス型を用いて行う作業。",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("2019-02-01から施行");
    expect(answer).toContain("指定期間のそれ以前");
    expect(answer).toContain("対象の日付を教えてください");
    expect(answer).not.toContain("特別教育が必要です");
    expect(answer).not.toContain("2019・当時未施行");
  });

  it("2023年の石綿調査者質問は10月1日の前後へ分ける", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "2023年 石綿 事前調査 資格 調査者 改修",
      articles: [
        article({
          law: "石綿障害予防規則",
          lawShort: "石綿則",
          articleNum: "第3条",
          articleTitle: "事前調査及び分析調査",
          text: "事業者は、事前調査について、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).toContain("2023-10-01から施行");
    expect(answer).toContain("対象の日付を教えてください");
    expect(answer).not.toContain("行わせなければなりません");
  });

  it("明示された石綿則3条4項を条全体の施行日へ落とさない", () => {
    const provision = article({
      law: "石綿障害予防規則",
      lawShort: "石綿則",
      articleNum: "第3条",
      articleTitle: "事前調査及び分析調査",
      text: "事業者は、事前調査について、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
    });
    const query = "2022年の石綿則第3条第四項の調査者資格は施行済みでしたか?";

    expect(legalProvisionUnitForQuery(provision, query)).toEqual({
      paragraph: "第4項",
      item: undefined,
    });
    const answer = buildServiceFirstLegalAnswer({
      query,
      articles: [provision],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(answer).toContain("当時の義務は確定できません");
    expect(answer).toContain("2022・当時未施行");
    expect(answer).not.toContain("指定時点で施行済み");
  });

  it.each([
    ["第8条", "第2種有機溶剤の臨時作業を屋内のタンク等の内部で行う", "第2項"],
    ["第8条", "第2種有機溶剤の臨時作業をそれ以外の屋内で行う", "第1項"],
    ["第9条", "第2種有機溶剤の短時間作業を屋内のタンク内で行う", "第2項"],
    ["第9条", "第2種有機溶剤の短時間作業を屋内のタンク外で行う", "第1項"],
    ["第6条", "第3種有機溶剤を屋内のタンク内で吹付け作業に使う", "第2項"],
    ["第6条", "第3種有機溶剤を屋内のタンク内で吹付け以外に使う", "第1項"],
    ["第29条", "有機溶剤の健康診断はいつ？", "第2項"],
  ] as const)(
    "有機則%sは作業条件に対応する%sをsource unitへ選ぶ",
    (articleNum, query, paragraph) => {
      const provision = article({
        law: "有機溶剤中毒予防規則",
        lawShort: "有機則",
        articleNum,
      });
      expect(legalProvisionUnitForQuery(provision, query)).toEqual({
        paragraph,
      });
    },
  );

  it("複数法令の明示号を各条の直後から個別に解決する", () => {
    const query = "安衛令第20条第11号と安衛則第36条第5号を比較して";
    expect(
      legalProvisionUnitForQuery(
        article({ lawShort: "安衛令", articleNum: "第20条" }),
        query,
      ),
    ).toEqual({ item: "第11号" });
    expect(
      legalProvisionUnitForQuery(
        article({ lawShort: "安衛則", articleNum: "第36条" }),
        query,
      ),
    ).toEqual({ item: "第5号" });
  });

  it("有機則29条の対象業務と実施義務を第1項・第2項へ分ける", () => {
    const provision = article({ lawShort: "有機則", articleNum: "第29条" });
    expect(
      legalProvisionUnitForQuery(
        provision,
        "有機溶剤の健康診断について、有機則第29条第1項の対象業務は？",
      ),
    ).toEqual({ paragraph: "第1項" });
    expect(
      legalProvisionUnitForQuery(
        provision,
        "有機溶剤について、有機則第29条第1項の健康診断義務は？",
      ),
    ).toEqual({ paragraph: "第2項" });
  });

  it.each([
    [
      "電気工事士法",
      "第2条",
      "電気工事士法第2条第1項とは？",
      { paragraph: "第1項" },
    ],
    [
      "安衛則",
      "第36条",
      "安衛則第36条第5号の電気工事とは？",
      { item: "第5号" },
    ],
    ["有機則", "第8条", "有機則第8条第2項とは？", { paragraph: "第2項" }],
    ["有機則", "第9条", "有機則第9条第1項とは？", { paragraph: "第1項" }],
  ] as const)(
    "純粋な明示条項照会では意味補正を上書きしない: %s %s",
    (lawShort, articleNum, query, expected) => {
      const provision = article({ lawShort, articleNum });
      expect(legalProvisionUnitForQuery(provision, query)).toEqual(expected);
    },
  );

  it.each([
    {
      law: "労働安全衛生法",
      lawShort: "安衛法",
      articleNum: "第59条",
      query: "安衛法第59条第3項とは？",
      text: "事業者は、労働者を雇い入れたときは、安全又は衛生のための教育を行なわなければならない。２　作業内容を変更したときも同様とする。３　事業者は、危険又は有害な業務に労働者をつかせるときは、特別の教育を行なわなければならない。",
      expected: "特別の教育",
      excluded: "雇い入れたとき",
    },
    {
      law: "労働安全衛生規則",
      lawShort: "安衛則",
      articleNum: "第518条",
      query: "安衛則第518条第2項とは？",
      text: "事業者は、高さが二メートル以上の箇所で作業を行なう場合には、作業床を設けなければならない。２　作業床を設けることが困難なときは、防網を張り、要求性能墜落制止用器具を使用させる等の措置を講じなければならない。",
      expected: "防網を張り",
      excluded: "作業床を設けなければならない",
    },
    {
      law: "電気工事士法",
      lawShort: "電気工事士法",
      articleNum: "第2条",
      query: "電気工事士法第2条第3項とは？",
      text: "この法律において一般用電気工作物等とは所定の工作物をいう。２　この法律において自家用電気工作物とは所定の工作物をいう。３　この法律において電気工事とは、一般用電気工作物等又は自家用電気工作物を設置し、又は変更する工事をいう。",
      expected: "電気工事とは",
      excluded: "一般用電気工作物等とは所定",
    },
    {
      law: "有機溶剤中毒予防規則",
      lawShort: "有機則",
      articleNum: "第9条",
      query: "有機則第9条第2項とは？",
      text: "事業者は、タンク等の内部以外で短時間作業を行う場合、全体換気装置を設けることができる。２　事業者は、タンク等の内部で短時間作業を行う場合、送気マスクを備えたときは設備を設けないことができる。",
      expected: "送気マスク",
      excluded: "内部以外",
    },
  ])(
    "明示された項だけから回答本文を作る: $query",
    ({ law, lawShort, articleNum, query, text, expected, excluded }) => {
      const answer = buildServiceFirstLegalAnswer({
        query,
        articles: [article({ law, lawShort, articleNum, text })],
        now: new Date("2026-08-03T00:00:00+09:00"),
      });
      expect(answer).toContain(expected);
      expect(answer).not.toContain(excluded);
    },
  );

  it("項内で号番号が再利用されても、明示された項の号だけを回答する", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "有機則第29条第5項第2号とは？",
      articles: [
        article({
          law: "有機溶剤中毒予防規則",
          lawShort: "有機則",
          articleNum: "第29条",
          text: "対象業務を定める。２　健康診断を行う。一　業務の経歴の調査　二　作業条件の簡易な調査　３　追加検査を行う。４　項目を省略できる。５　医師が必要と認めるものについて追加検査を行う。一　作業条件の調査　二　貧血検査　三　肝機能検査。",
        }),
      ],
      now: new Date("2026-08-03T00:00:00+09:00"),
    });
    expect(answer).toContain("有機則第29条第5項第2号");
    expect(answer).toContain("貧血検査");
    expect(answer).not.toContain("作業条件の簡易な調査");
  });

  it("施行状況だけを尋ねた回答後は不要な別日確認をしない", () => {
    const provision = article({
      law: "石綿障害予防規則",
      lawShort: "石綿則",
      articleNum: "第3条",
      articleTitle: "事前調査及び分析調査",
      text: "事業者は、事前調査について、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
    });
    const answer = buildServiceFirstLegalAnswer({
      query: "2022年の石綿則第3条第4項は施行済みですか？",
      articles: [provision],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });

    expect(answer).not.toContain("次の質問");
    expect(answer).not.toContain("設備の種類・高さ・荷重");
  });

  it("石綿事前調査者は不足区分だけを確認し、判明後は質問しない", () => {
    const provision = article({
      law: "石綿障害予防規則",
      lawShort: "石綿則",
      articleNum: "第3条",
      articleTitle: "事前調査及び分析調査",
      text: "事業者は、事前調査について、必要な知識を有する者として厚生労働大臣が定めるものに行わせなければならない。",
    });
    const answer = buildServiceFirstLegalAnswer({
      query: "石綿作業 事前調査 資格 調査者 改修",
      articles: [provision],
    });
    expect(answer).toContain(
      "次の質問\n対象は建築物・工作物・船舶のどれですか？",
    );
    expect(answer).not.toContain("設備の種類・高さ・荷重");

    const buildingAnswer = buildServiceFirstLegalAnswer({
      query: "石綿作業 建築物 事前調査 資格 調査者 改修",
      articles: [provision],
    });
    expect(buildingAnswer).not.toContain("次の質問");
  });

  it("一般的なフルハーネス質問を特別教育へ取り違えない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "墜落制止用器具使用 墜落制止用器具 作業床なし",
      articles: [
        article({
          articleNum: "第518条",
          articleTitle: "作業床の設置等",
          text: "高さが二メートル以上の箇所で作業床を設けることが困難なときは、労働者に要求性能墜落制止用器具を使用させる等の措置を講じなければならない。",
        }),
        article({
          articleNum: "第519条",
          articleTitle: "作業床の設置等",
          text: "囲い等を設けることが著しく困難なとき又は一時的に取り外すときは、労働者に要求性能墜落制止用器具を使用させる等の措置を講じなければならない。",
        }),
        article({
          articleNum: "第520条",
          articleTitle: "労働者の使用義務",
          text: "労働者は、要求性能墜落制止用器具等の使用を命じられたときは、これを使用しなければならない。",
        }),
      ],
    });

    expect(answer).toContain("一律にフルハーネス型と決まるわけではありません");
    expect(answer).toContain("要求性能墜落制止用器具");
    expect(answer).not.toContain("特別教育が必要です");
  });

  it("フルハーネス特別教育の条件を結論から答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "フルハーネスはいつ特別教育が必要？",
      articles: [
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "高さが2メートル以上の箇所であって作業床を設けることが困難なところにおいて、フルハーネス型のものを用いて行う作業。",
        }),
        safetyEducationDuty(),
      ],
    });
    expect(answer).toContain("高さ2m以上");
    expect(answer).toContain("作業床を設けることが困難");
    expect(answer).toContain("特別教育が必要");
    expect(answer).toContain("［1］");
  });

  it("作業床なしを回答済みなら、次は高さだけを一問で確認する", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "フルハーネス特別教育 墜落制止用器具 作業床なし",
      articles: [
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "高さが二メートル以上の箇所で作業床を設けることが困難なところにおいて、フルハーネス型を用いて行う作業。",
        }),
        safetyEducationDuty(),
      ],
    });

    expect(answer).toContain("次の質問\n作業する高さを教えてください。");
    expect(answer).not.toContain("作業する高さと、作業床");
  });

  it("高所作業車の教育区分を10m境界で答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "高所作業車に特別教育は必要？",
      articles: [
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "作業床の高さが10メートル未満の高所作業車（道路上を走行させる運転を除く。）の運転の業務。",
        }),
        safetyEducationDuty(),
        restrictedWorkDuty(),
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第20条",
          articleTitle: "就業制限に係る業務",
          text: "作業床の高さが10メートル以上の高所作業車（道路上を走行させる運転を除く。）の運転の業務。",
        }),
      ],
    });
    expect(answer).toContain("10m未満は特別教育");
    expect(answer).toContain("10m以上は高所作業車運転技能講習");
    expect(answer).toContain("［1］［2］［3］［4］");
  });

  it("高所作業車の作業床上の安全帯質問は資格分類へ飛ばず194条の22を答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "高所作業車の作業床における安全帯使用等の条文は？",
      articles: [
        article({
          articleNum: "第194条の22",
          articleTitle: "要求性能墜落制止用器具等の使用",
          text: "事業者は、高所作業車（作業床が接地面に対し垂直にのみ上昇し、又は下降する構造のものを除く。）を用いて作業を行うときは、当該高所作業車の作業床上の労働者に要求性能墜落制止用器具等を使用させなければならない。２　前項の労働者は、要求性能墜落制止用器具等を使用しなければならない。",
        }),
      ],
    });

    expect(answer).toContain("安衛則194条の22");
    expect(answer).toContain("要求性能墜落制止用器具等");
    expect(answer).not.toContain("作業床最高高さは10m以上ですか");
    expect(answer).not.toContain("安衛法59条");
  });

  it.each([
    "安衛則第612条の2の施行日はいつですか？",
    "令和8年8月2日に安衛則第612条の2は施行済み？",
    "2026年8月現在、労働安全衛生規則第612条の2は有効？",
  ])("確認済み施行日から施行状態を結論で答える: %s", (query) => {
    const answer = buildServiceFirstLegalAnswer({
      query,
      articles: [
        article({
          articleNum: "第612条の2",
          articleTitle: "熱中症を生ずるおそれのある作業",
          text: "熱中症のおそれがある作業では、報告体制を整備し、関係作業者に周知させなければならない。",
        }),
      ],
      now: new Date("2026-08-02T00:00:00+09:00"),
    });
    expect(answer.split("\n")[1]).toContain("令和7年6月1日施行");
    expect(answer.split("\n")[1]).toMatch(/施行済み|現在施行中/);
    expect(answer).toContain("適用時点\n・現在施行中");
  });
});

function oxygenArticle(
  articleNum: string,
  text: string,
  articleTitle = "",
): LawArticle {
  return article({
    law: "酸素欠乏症等防止規則",
    lawShort: "酸欠則",
    articleNum,
    articleTitle,
    text,
  });
}

function presentationSources(topic: string): LawArticle[] {
  switch (topic) {
    case "forklift":
      return [
        safetyEducationDuty(),
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "最大荷重一トン未満のフォークリフト（道路上を走行させる運転を除く。）の運転の業務。",
        }),
        restrictedWorkDuty(),
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第20条",
          articleTitle: "就業制限に係る業務",
          text: "最大荷重一トン以上のフォークリフト（道路上を走行させる運転を除く。）の運転の業務。",
        }),
      ];
    case "scaffold":
      return [article(), scaffoldDefinition()];
    case "oxygen":
      return [
        oxygenArticle(
          "第13条",
          "事業者は、酸素欠乏危険作業に労働者を従事させるときは、常時作業の状況を監視し、異常があつたときに直ちにその旨を通報する者を置く等必要な措置を講じなければならない。",
          "監視人等",
        ),
      ];
    case "organic":
      return [
        article({
          law: "有機溶剤中毒予防規則",
          lawShort: "有機則",
          articleNum: "第1条",
          articleTitle: "定義等",
          text: "有機溶剤業務及び屋内作業場等を定義する。",
        }),
        article({
          law: "有機溶剤中毒予防規則",
          lawShort: "有機則",
          articleNum: "第5条",
          articleTitle: "第一種有機溶剤等又は第二種有機溶剤等に係る設備",
          text: "屋内作業場等において有機溶剤業務に労働者を従事させるときは、発散源を密閉する設備、局所排気装置又はプッシュプル型換気装置を設けなければならない。",
        }),
        article({
          law: "有機溶剤中毒予防規則",
          lawShort: "有機則",
          articleNum: "第8条",
          articleTitle: "臨時に有機溶剤業務を行う場合の設備の特例",
          text: "臨時に有機溶剤業務を行う場合には、タンク等の内部以外の場所では第五条の規定は適用しない。２　タンク等の内部では全体換気装置を設けたときは第五条の設備を設けないことができる。",
        }),
        article({
          law: "有機溶剤中毒予防規則",
          lawShort: "有機則",
          articleNum: "第9条",
          articleTitle: "短時間有機溶剤業務を行う場合の設備の特例",
          text: "短時間、有機溶剤業務を行う場合で全体換気装置を設けたときは第五条の設備を設けないことができる。",
        }),
      ];
    case "sling":
      return [
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第10条",
          articleTitle: "法別表第一に掲げる機械等",
          text: "つり上げ荷重とは、構造及び材料に応じて負荷させることができる最大の荷重をいう。",
        }),
        article({
          law: "労働安全衛生法施行令",
          lawShort: "安衛令",
          articleNum: "第20条",
          articleTitle: "就業制限に係る業務",
          text: "制限荷重又はつり上げ荷重が一トン以上の揚貨装置又はクレーン等の玉掛けの業務。",
        }),
        article({
          law: "クレーン等安全規則",
          lawShort: "クレーン則",
          articleNum: "第221条",
          articleTitle: "就業制限",
          text: "つり上げ荷重が一トン以上のクレーン等の玉掛けは、玉掛け技能講習を修了した者に行わせなければならない。",
        }),
        article({
          law: "クレーン等安全規則",
          lawShort: "クレーン則",
          articleNum: "第222条",
          articleTitle: "特別の教育",
          text: "つり上げ荷重が一トン未満のクレーン等の玉掛けには、特別の教育を行わなければならない。",
        }),
      ];
    case "electric":
      return [
        article({
          law: "電気工事士法",
          lawShort: "電気工事士法",
          articleNum: "第2条",
          articleTitle: "用語の定義",
          text: "３　この法律において電気工事とは、一般用電気工作物等又は自家用電気工作物を設置し、又は変更する工事をいう。",
        }),
        article({
          law: "電気工事士法",
          lawShort: "電気工事士法",
          articleNum: "第3条",
          articleTitle: "電気工事士等",
          text: "第一種電気工事士免状の交付を受けている者でなければ、自家用電気工作物に係る電気工事の作業に従事してはならない。",
        }),
        safetyEducationDuty(),
        article({
          articleNum: "第36条",
          articleTitle: "特別教育を必要とする業務",
          text: "低圧の充電電路の敷設、修理又は操作の業務。ただし、対地電圧が五十ボルト以下のもの及び電信用等で感電による危害のおそれのないものを除く。",
        }),
      ];
    default:
      throw new Error(`unknown topic: ${topic}`);
  }
}

describe("presentation follow-upは取得済み根拠で現在の質問へ答える", () => {
  const topics = [
    {
      topic: "forklift",
      context: "フォークリフトの資格は？",
      stale: "フォークリフトは、最大荷重1トン以上",
    },
    {
      topic: "scaffold",
      context: "足場の手すり高さは？",
      stale: "代表的な条件として",
    },
    {
      topic: "oxygen",
      context: "酸欠作業の監視人は必要？",
      stale: "常時作業の状況を監視し",
    },
    {
      topic: "organic",
      context: "有機溶剤を屋内で使う",
      stale: "まずSDSで成分",
    },
    {
      topic: "sling",
      context: "玉掛けは何トンから？",
      stale: "つり上げ荷重1トン以上のクレーン等の玉掛け",
    },
    {
      topic: "electric",
      context: "電気作業の資格は？",
      stale: "電気作業で必要な資格・教育は一つではありません",
    },
  ] as const;
  const intents = [
    ["何条？", /主な根拠条文/],
    ["何項？", /該当項|項を一つに特定/],
    ["何号？", /該当号|号を一つに特定/],
    ["公式原文は？", /公式原文/],
    ["いつから？", /適用基準日|日付は断定しません/],
    ["例外は？", /例外|除外|対象から除|特例|無教育/],
    ["告示は？", /関連告示.*含めていません|検証済みの告示/],
    ["どの通達？", /関連通達.*含めていません|検証済みの通達/],
    ["指針は？", /関連指針・ガイドライン.*含めていません|検証済みの指針/],
    [
      "ガイドラインは？",
      /関連指針・ガイドライン.*含めていません|検証済みの指針/,
    ],
    ["判例は？", /関連判例.*含めていません|検証済みの判例/],
    ["根拠は？", /主な根拠条文/],
    ["法律は？", /主な根拠条文/],
    ["法令は？", /主な根拠条文/],
    ["条件は？", /主な条件|条件は|条件を変える/],
  ] as const;

  for (const { topic, context, stale } of topics) {
    for (const [followUp, expected] of intents) {
      it(`${topic}: ${followUp}`, () => {
        const answer = buildServiceFirstLegalAnswer({
          query: `${context} ${followUp}`,
          articles: presentationSources(topic),
          now: new Date("2026-08-03T00:00:00+09:00"),
        });
        expect(answer).toMatch(expected);
        expect(answer).not.toContain(stale);
        expect(answer).toMatch(/［\d+］/);
        expect(answer.match(/\n次の質問\n/g)?.length ?? 0).toBeLessThanOrEqual(
          1,
        );
      });
    }
  }

  it("例外条文ではなく原則を尋ねた有機溶剤質問を例外intentへ奪わない", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "屋内の第2種有機溶剤は例外条文でなく有機則5条の原則を答えて",
      articles: presentationSources("organic"),
    });
    expect(answer).toMatch(/原則として発散源(?:を密閉する設備|の密閉設備)/);
    expect(answer).not.toContain("臨時作業または短時間作業について");
  });

  it("フォークリフト道路上除外を資格不要と読めない形で返す", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "フォークリフトの資格は？ 例外は？",
      articles: presentationSources("forklift"),
    });
    expect(answer).toContain("1トン未満でも特別教育");
    expect(answer).toContain("1トン以上では技能講習修了等");
    expect(answer).toContain("無教育で運転できる区分はありません");
    expect(answer).toContain("除外だけで資格・免許が不要とは判断できません");
    expect(answer).toContain("道路交通法上の免許等を別に確認");
  });

  it("フォークリフトの条・号を閾値規定まで保持する", () => {
    const whatArticle = buildServiceFirstLegalAnswer({
      query: "フォークリフトの資格は？ 何条？",
      articles: presentationSources("forklift"),
    });
    for (const locator of [
      "安衛法59条3項",
      "安衛則36条5号",
      "安衛法61条",
      "安衛令20条11号",
    ]) {
      expect(whatArticle).toContain(locator);
    }

    const whatItem = buildServiceFirstLegalAnswer({
      query: "フォークリフトの資格は？ 何号？",
      articles: presentationSources("forklift"),
    });
    expect(whatItem).toContain("安衛則36条5号");
    expect(whatItem).toContain("安衛令20条11号");
  });

  it("検証済み告示が取得済みなら名称を答える", () => {
    const verifiedNotice = article({
      law: "低圧電気取扱業務に関する厚生労働省告示",
      lawShort: "厚労省告示123号",
      articleNum: "第1項",
      articleTitle: "教育内容",
      text: "低圧電気取扱業務の教育内容を定める。",
      keywords: ["電気作業", "厚生労働省告示"],
      sourceKind: "mhlw-official-primary",
      sourceUrl: "https://www.mhlw.go.jp/example",
      sourceHash: "a".repeat(64),
      verificationStatus: "primary-source-verified",
      humanReviewStatus: "reviewed",
    });
    const answer = buildServiceFirstLegalAnswer({
      query: "電気作業の資格は？ 告示は？",
      articles: [...presentationSources("electric"), verifiedNotice],
    });
    expect(answer).toContain("取得・検証済みの告示");
    expect(answer).toContain("厚労省告示123号1項");
  });

  it("法令本文の見出しや語句を指針そのものと誤分類しない", () => {
    const statutesMentioningGuidelines = [
      article({
        law: "労働安全衛生法",
        lawShort: "安衛法",
        articleNum: "第70条の3",
        articleTitle: "健康保持増進のための指針の公表等",
        text: "厚生労働大臣は、労働者の健康の保持増進のための指針を公表するものとする。",
        keywords: ["指針"],
        sourceKind: "egov-fulltext-snapshot",
        sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
        sourceHash: "b".repeat(64),
        verificationStatus: "snapshot-hash-verified",
      }),
      article({
        law: "労働安全衛生法",
        lawShort: "安衛法",
        articleNum: "第28条",
        articleTitle: "技術上の指針等の公表等",
        text: "厚生労働大臣は、技術上の指針を公表するものとする。",
        keywords: ["指針"],
        sourceKind: "egov-fulltext-snapshot",
        sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
        sourceHash: "c".repeat(64),
        verificationStatus: "snapshot-hash-verified",
      }),
      article({
        law: "労働安全衛生法",
        lawShort: "安衛法",
        articleNum: "第70条の2",
        articleTitle: "健康保持増進措置",
        text: "事業者は、健康保持増進措置を継続的かつ計画的に講ずるよう努めるものとする。",
        keywords: ["健康保持増進指針"],
        sourceKind: "egov-fulltext-snapshot",
        sourceUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
        sourceHash: "d".repeat(64),
        verificationStatus: "snapshot-hash-verified",
      }),
    ];
    const answer = buildServiceFirstLegalAnswer({
      query: "電気作業の資格は？ 指針は？",
      articles: [
        ...presentationSources("electric"),
        ...statutesMentioningGuidelines,
      ],
    });

    expect(answer).toContain(
      "関連指針・ガイドラインは今回取得した検証済み回答根拠に含めていません",
    );
    expect(answer).not.toContain("取得・検証済みの指針・ガイドラインは");
    expect(answer).not.toMatch(/70条の3|70条の2|安衛法28条/);
  });

  it("電気資格の根拠質問を中核4法源へ限定する", () => {
    const rule344 = article({
      articleNum: "第344条",
      articleTitle: "停電作業を行う場合の措置",
      text: "停電作業を行う場合には、作業指揮者を定めて作業を行わせなければならない。",
      keywords: ["電気作業", "停電作業"],
    });
    const original = [...presentationSources("electric"), rule344];
    const first = buildServiceFirstLegalAnswer({
      query: "電気作業の資格は？ それの根拠は？",
      articles: original,
    });
    const cited = citedLegalAnswerArticles(first, original);

    expect(first).toContain("電気工事士法2条");
    expect(first).toContain("電気工事士法3条");
    expect(first).toContain("安衛法59条");
    expect(first).toContain("安衛則36条");
    expect(first).not.toContain("安衛則344条");
    expect(cited).toHaveLength(4);
    expect(cited).not.toContain(rule344);
  });

  it("酸欠監視の資料質問は直接関係する5条文だけを提示し再採番する", () => {
    const original = [
      oxygenArticle(
        "第3条",
        "作業開始前に酸素濃度を測定し、結果を記録する。",
        "測定",
      ),
      oxygenArticle(
        "第5条",
        "酸素濃度を十八パーセント以上に保つよう換気する。",
        "換気",
      ),
      oxygenArticle(
        "第11条",
        "技能講習修了者から作業主任者を選任する。",
        "作業主任者",
      ),
      oxygenArticle(
        "第12条",
        "酸素欠乏危険作業に係る業務について特別教育を行う。",
        "特別教育",
      ),
      oxygenArticle(
        "第13条",
        "常時作業の状況を監視し、異常時に直ちに通報する者を置く等必要な措置を講ずる。",
        "監視人等",
      ),
      oxygenArticle(
        "第26条",
        "事故について必要な措置を講じる。",
        "事故の場合の措置",
      ),
    ];
    const query = "酸欠作業の監視人は必要？ 指針は？";
    const first = buildServiceFirstLegalAnswer({ query, articles: original });
    const cited = citedLegalAnswerArticles(first, original);
    const rebuilt = buildServiceFirstLegalAnswer({ query, articles: cited });
    const markers = [...rebuilt.matchAll(/［(\d+)］/g)].map((match) =>
      Number(match[1]),
    );

    for (const provision of [
      "酸欠則3条",
      "酸欠則5条",
      "酸欠則11条",
      "酸欠則12条",
      "酸欠則13条",
    ]) {
      expect(rebuilt).toContain(provision);
    }
    expect(rebuilt).not.toContain("酸欠則26条");
    expect(cited).toHaveLength(5);
    expect(new Set(markers)).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("足場手すりの条文一覧から開口部519条を除く", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "足場の手すり高さは？ 何条？",
      articles: [
        article(),
        scaffoldDefinition(),
        article({
          articleNum: "第519条",
          text: "高さ二メートル以上の作業床の端、開口部等には、囲い、手すり、覆い等を設けること。",
        }),
      ],
    });
    expect(answer).toContain("安衛則563条");
    expect(answer).toContain("安衛則552条");
    expect(answer).not.toContain("安衛則519条");
  });

  it("玉掛けの例外質問にも無教育区分がないことを先に答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "玉掛けは何トンから？ 例外は？",
      articles: presentationSources("sling"),
    });
    expect(answer).toContain("1トン未満でも特別教育");
    expect(answer).toContain("1トン以上では玉掛け技能講習修了等");
    expect(answer).toContain("無教育で行える区分はありません");
  });

  it.each([
    ["フォークリフトの資格は？ 何号？", "forklift"],
    ["玉掛けは何トンから？ 例外は？", "sling"],
  ] as const)(
    "source pruning後に全markerを最終source順へ再構築する: %s",
    (query, topic) => {
      const original = presentationSources(topic);
      const first = buildServiceFirstLegalAnswer({ query, articles: original });
      const displayed = citedLegalAnswerArticles(first, original);
      const rebuilt = buildServiceFirstLegalAnswer({
        query,
        articles: displayed,
      });
      const markers = [...rebuilt.matchAll(/［(\d+)］/g)].map((match) =>
        Number(match[1]),
      );
      expect(markers.length).toBeGreaterThan(0);
      expect(
        markers.every((value) => value >= 1 && value <= displayed.length),
      ).toBe(true);
      expect(new Set(markers)).toEqual(
        new Set(displayed.map((_, index) => index + 1)),
      );
    },
  );

  it.each([
    [
      "酸素欠乏危険作業 酸欠危険場所 特別教育 いつまでに受ける",
      /従事させる時点までに実施/,
    ],
    [
      "酸素欠乏危険作業 酸欠危険場所 特別教育 誰が受ける",
      /対象は.*酸素欠乏危険作業に係る業務へ就く労働者/,
    ],
  ])(
    "酸欠則12条の特別教育follow-upへ時期・対象者を直接答える: %s",
    (query, expected) => {
      const sources = expandVerifiedLegalEvidenceArticles(query, []);
      const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

      expect(answer).toMatch(expected);
      expect(answer).toMatch(/酸欠則12条|［\d+］/);
      expect(answer).not.toMatch(/作業主任者技能講習.*選任/);
      expect(citedLegalAnswerArticles(answer, sources).length).toBeGreaterThan(
        0,
      );
    },
  );
});

describe("酸欠則の明示項を省略せず説明する", () => {
  const education = oxygenArticle(
    "第12条",
    "事業者は、第一種酸素欠乏危険作業に係る業務に労働者を就かせるときは、次の科目について特別の教育を行わなければならない。一　酸素欠乏の発生の原因二　酸素欠乏症の症状三　空気呼吸器等の使用の方法四　事故の場合の退避及び救急そ生の方法五　前各号に掲げるもののほか、酸素欠乏症の防止に関し必要な事項２　前項の規定は、第二種酸素欠乏危険作業に係る業務について準用する。この場合において、同項第一号中「酸素欠乏」とあるのは「酸素欠乏等」と、同項第二号及び第五号中「酸素欠乏症」とあるのは「酸素欠乏症等」と読み替えるものとする。",
    "特別の教育",
  );
  const measurement = oxygenArticle(
    "第3条",
    "事業者は、その日の作業を開始する前に酸素等の濃度を測定しなければならない。２　事業者は、測定を行つたときは、そのつど、次の事項を記録して、これを三年間保存しなければならない。一　測定日時二　測定方法三　測定箇所四　測定条件五　測定結果六　測定を実施した者の氏名七　測定結果に基づいて酸素欠乏症等の防止措置を講じたときは、当該措置の概要",
    "作業環境測定等",
  );

  it.each([
    "酸欠則第12条第2項は何を定めていますか？",
    "酸欠則第12条第2項の条文を教えて",
  ])("12条2項の準用と全読替え対応を返す: %s", (query) => {
    const answer = buildServiceFirstLegalAnswer({
      query,
      articles: [education],
    });
    expect(answer).toContain("1項は第一種の特別教育5科目を定め");
    expect(answer).toContain("2項がその規定を第二種にも準用");
    expect(answer).toContain("第1号の「酸素欠乏」を「酸素欠乏等」");
    expect(answer).toContain("第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」");
    expect(answer).toContain("第3号の空気呼吸器等の使用方法");
    expect(answer).toContain("第4号の事故時の退避・救急そ生方法");
  });

  it("第二種特別教育の硫化水素質問へ明確に肯定し、定義と読替えを結び付ける", () => {
    const definition = oxygenArticle(
      "第2条",
      "酸素欠乏とは空気中の酸素の濃度が十八パーセント未満である状態をいう。酸素欠乏等とは、酸素欠乏又は空気中の硫化水素の濃度が百万分の十を超える状態をいう。酸素欠乏症等とは、酸素欠乏症又は硫化水素中毒をいう。",
      "定義",
    );
    const answer = buildServiceFirstLegalAnswer({
      query: "第二種酸素欠乏危険作業の特別教育では硫化水素の科目も必要？",
      articles: [definition, education],
    });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(/^結論\nはい。/);
    expect(conclusion).toMatch(/第1号・第2号・第5号.*硫化水素/);
    expect(answer).toContain("10ppmを超える状態");
    expect(citedLegalAnswerArticles(answer, [definition, education])).toEqual([
      definition,
      education,
    ]);
  });

  it("12条1項3号・4号が第二種にも共通かを明確に肯定する", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種でも同じ？",
      articles: [education],
    });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(/^結論\n酸欠則12条/);
    expect(conclusion).toMatch(
      /第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
    );
    expect(answer).toMatch(/12条2項.*第1項を第二種にも準用/);
    expect(answer).toMatch(/第1号・第2号・第5号.*第3号・第4号は変更しません/);
    expect(citedLegalAnswerArticles(answer, [education])).toEqual([education]);
  });

  it("漢数字の12条1項3号・4号質問も同じ共通科目として答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query:
        "酸素欠乏症等防止規則第十二条第一項第三号と第四号は第二種でも同じ？",
      articles: [education],
    });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(/^結論\n酸欠則12条/);
    expect(conclusion).toMatch(
      /第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
    );
    expect(answer).toMatch(/12条2項.*第1項を第二種にも準用/);
    expect(citedLegalAnswerArticles(answer, [education])).toEqual([education]);
  });

  it.each([
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも適用されますか？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも準用されますか？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種の対象ですか？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種の対象外ですか？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種には適用されないのですか？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種には含まれない？",
    "酸素欠乏症等防止規則第12条第1項第3号と第4号は第二種にも準用されませんか？",
    "酸欠則第12条第1項第3号と第4号は第二種でも必要ですか？",
    "酸欠則12条1項3号と4号は二種でも要る？",
    "酸欠則12条1項3号と4号は2種でも要る？",
    "酸欠則第12条第1項第3号と第4号は第二種でも受講するの？",
    "酸欠則第12条第1項第3号と第4号は第二種の硫化水素教育でも同じですか？",
  ])(
    "適用・準用・対象の表現でも第二種への共通適用を先に答える: %s",
    (query) => {
      const answer = buildServiceFirstLegalAnswer({
        query,
        articles: [education],
      });
      const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

      expect(conclusion).toMatch(/^結論\n酸欠則12条/);
      expect(conclusion).toMatch(
        /第3号.*第4号.*第二種の対象外ではなく.*第一種・第二種に共通/,
      );
      expect(answer).toMatch(/12条2項.*第1項を第二種にも準用/);
      expect(citedLegalAnswerArticles(answer, [education])).toEqual([
        education,
      ]);
    },
  );

  it("12条1項1号から5号の全科目を結論で返す", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "酸欠則第12条第1項第1号から第5号の科目は？",
      articles: [education],
    });
    for (const subject of [
      "酸素欠乏の発生の原因",
      "酸素欠乏症の症状",
      "空気呼吸器等の使用方法",
      "事故時の退避・救急そ生方法",
      "その他の酸素欠乏症防止に必要な事項",
    ]) {
      expect(answer).toContain(subject);
    }
    expect(answer).toContain("第二種にもこの5科目を準用");
  });

  it.each([
    ["酸欠則第12条第2項の公式原文は？", /公式原文/],
    ["酸欠則第12条第2項の何号？", /第1号.*第2号・第5号/],
  ] as const)("明示12条2項だけへ根拠を絞る: %s", (query, expected) => {
    const neighbours = [
      oxygenArticle(
        "第11条",
        "作業主任者を選任しなければならない。",
        "作業主任者",
      ),
      education,
      oxygenArticle(
        "第27条",
        "救出時には空気呼吸器等を使用させなければならない。",
      ),
      oxygenArticle("第26条", "事故について必要な措置を講じなければならない。"),
      oxygenArticle(
        "第2条",
        "酸素欠乏及び第二種酸素欠乏危険作業を定義する。",
        "定義",
      ),
    ];
    const answer = buildServiceFirstLegalAnswer({
      query,
      articles: neighbours,
    });
    expect(answer).toMatch(expected);
    expect(answer).toContain("酸欠則12条");
    for (const unrelated of [
      "酸欠則第11条",
      "酸欠則第27条",
      "酸欠則第26条",
      "酸欠則第2条",
    ]) {
      expect(answer).not.toContain(unrelated);
    }
    expect(citedLegalAnswerArticles(answer, neighbours)).toEqual([education]);
  });

  it("3条2項の無条件6事項・条件付き防止措置・3年保存を返す", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "酸欠則第3条第2項の記録事項は？",
      articles: [measurement],
    });
    for (const field of [
      "測定日時",
      "測定方法",
      "測定箇所",
      "測定条件",
      "測定結果",
      "測定を実施した者の氏名",
    ]) {
      expect(answer).toContain(field);
    }
    expect(answer).toContain("3年間保存");
    expect(answer).toContain("防止措置を講じたときだけ");
    expect(answer).toContain("措置の概要");
  });

  it("3条2項7号の明示質問は条件付き記録事項を結論で直接答える", () => {
    const answer = buildServiceFirstLegalAnswer({
      query: "酸欠則第3条第2項第7号とは？",
      articles: [measurement],
    });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(
      /酸欠則3条2項7号.*防止措置を講じたとき.*措置の概要/,
    );
    expect(conclusion).not.toMatch(/①測定日時|3年間保存/);
    expect(conclusion).toContain("［1］");
  });

  it("第二種の作業主任者資格を12条2項へ誤routingしない", () => {
    const supervisor = oxygenArticle(
      "第11条",
      "事業者は、第一種酸素欠乏危険作業にあつては酸素欠乏危険作業主任者技能講習又は酸素欠乏・硫化水素危険作業主任者技能講習を修了した者のうちから、第二種酸素欠乏危険作業にあつては酸素欠乏・硫化水素危険作業主任者技能講習を修了した者のうちから、作業主任者を選任しなければならない。",
      "作業主任者",
    );
    const answer = buildServiceFirstLegalAnswer({
      query: "第二種酸欠作業主任者に必要な技能講習は？",
      articles: [supervisor, education],
    });
    expect(answer).toContain("酸素欠乏・硫化水素危険作業主任者技能講習");
    expect(answer).not.toContain("5科目を第二種にも準用");
  });

  it("酸欠換気例外の二段階source pruning後も引用を1..Nへ再採番する", () => {
    const definition = oxygenArticle(
      "第2条",
      "酸素濃度十八パーセント未満を酸素欠乏という。",
      "定義",
    );
    const ventilation = oxygenArticle(
      "第5条",
      "事業者は酸素濃度を十八パーセント以上に保つよう換気しなければならない。ただし、爆発、酸化等を防止するため換気することができない場合又は作業の性質上換気することが著しく困難な場合は、この限りでない。",
      "換気",
    );
    const protection = oxygenArticle(
      "第5条の2",
      "事業者は、前条第一項ただし書の場合には、同時に就業する労働者の人数と同数以上の空気呼吸器等を備え、労働者にこれを使用させなければならない。",
      "保護具の使用等",
    );
    const query = "酸欠で換気できない例外時の保護具は？";
    const first = buildServiceFirstLegalAnswer({
      query,
      articles: [definition, ventilation, protection],
    });
    const displayed = citedLegalAnswerArticles(first, [
      definition,
      ventilation,
      protection,
    ]);
    expect(displayed).toEqual([ventilation, protection]);

    const rebuilt = buildServiceFirstLegalAnswer({
      query,
      articles: displayed,
    });
    const markers = [...rebuilt.matchAll(/［(\d+)］/g)].map((match) =>
      Number(match[1]),
    );
    expect(markers.length).toBeGreaterThan(0);
    expect(
      markers.every((value) => value >= 1 && value <= displayed.length),
    ).toBe(true);
    expect(new Set(markers)).toEqual(new Set([1, 2]));
    expect(rebuilt).toContain("同時就業者数以上の空気呼吸器等");
  });
});

describe("特化則38条の14の監視人を号単位で説明する", () => {
  it("第1項第5号・第12号ただし書の異なる立入り条件を一次資料から返す", () => {
    const query = "特化則38条の14の監視人はどの号？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);

    expect(
      sources.map(({ lawShort, articleNum }) => `${lawShort}${articleNum}`),
    ).toEqual(["特化則第38条の14"]);
    expect(sources[0]?.text).toMatch(/五[\s\S]*監視人を置/);
    expect(sources[0]?.text).toMatch(/十二[\s\S]*監視人を置/);

    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toContain("第1項第5号ただし書");
    expect(conclusion).toContain("第1項第12号ただし書");
    expect(conclusion).toContain("燻蒸の効果確認");
    expect(conclusion).toContain("測定濃度が表の値を超える場所");
    expect(answer).toMatch(/第5号ただし書.*呼吸用保護具.*監視人/);
    expect(answer).toMatch(/第12号ただし書.*排気.*呼吸用保護具.*監視人/);
    expect(citedLegalAnswerArticles(answer, sources)).toEqual(sources);
  });
});

describe("安衛則97条の労働者死傷病報告期限を回答する", () => {
  it("休業4日ちょうどを1項の遅滞なくへroutingする", () => {
    const query = "休業4日の労災事故はいつまでに報告しますか？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);

    expect(
      sources.map(({ lawShort, articleNum }) => `${lawShort}${articleNum}`),
    ).toEqual(["安衛則第97条"]);
    expect(sources[0]?.text).toMatch(/遅滞なく/);
    expect(sources[0]?.text).toMatch(/休業の日数が四日に満たない/);

    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(/休業4日以上.*4日ちょうど.*遅滞なく/);
    expect(conclusion).toContain("所轄労働基準監督署長");
    expect(conclusion).not.toContain("労災保険法");
    expect(answer).toMatch(/4日に満たない.*四半期.*翌月末日/);
    expect(citedLegalAnswerArticles(answer, sources)).toEqual(sources);
  });

  it("休業3日は2項の四半期報告期限を先に返す", () => {
    const query = "休業3日の労働災害はいつまでに報告する？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });
    const conclusion = answer.split("\n\n条件\n", 1)[0] ?? "";

    expect(conclusion).toMatch(/4日に満たない.*1〜3日.*四半期/);
    expect(conclusion).toContain("最後の月の翌月末日まで");
    expect(answer).toMatch(/休業4日以上.*遅滞なく/);
    expect(citedLegalAnswerArticles(answer, sources)).toEqual(sources);
  });

  it("現行の電子申請文言を昭和47年施行と誤表示しない", () => {
    const query = "休業災害の報告書を出す決まりは？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

    expect(answer).toContain("公式本文を2026-08-02確認");
    expect(answer).not.toContain("昭和47年9月30日施行");
  });
});

describe("有機溶剤の広い換気質問を一般換気へ逸らさない", () => {
  it("屋内条件が省略されても有機則1条・5条・6条を先に取得する", () => {
    const query = "有機溶剤の換気は必要？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);
    const keys = sources.map(
      ({ lawShort, articleNum }) => `${lawShort}${articleNum}`,
    );

    expect(keys).toContain("有機則第1条");
    expect(keys).toContain("有機則第5条");
    expect(keys).toContain("有機則第6条");
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });
    expect(answer).toMatch(/有機溶剤.*局所排気|プッシュプル型換気/);
  });
});

describe("短縮follow-upを資格・報告の直接回答へ戻す", () => {
  it("酸欠特別教育の講師質問へ実施義務者と条文上の限界を答える", () => {
    const query = "酸素欠乏危険作業 酸欠危険場所 特別教育 誰が教えるの？";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

    expect(answer).toMatch(/法的義務を負うのは事業者/);
    expect(answer).toMatch(/講師個人の資格名までは同条で定めていません/);
    expect(answer).toContain("酸欠則12条");
    expect(citedLegalAnswerArticles(answer, sources).length).toBeGreaterThan(0);
  });

  it("足場点検の記録対象と保存期間を567条3項から直接答える", () => {
    const query = "足場作業 足場 点検 その点検は記録するの";
    const sources = [
      article({
        articleNum: "第567条",
        articleTitle: "点検",
        text: "事業者は、足場における作業を行うときは、点検者を指名して作業開始前に点検させる。2　悪天候、地震又は足場の組立て、一部解体若しくは変更の後は、作業開始前に点検させる。3　事業者は、前項の点検を行ったときは、点検結果及び点検者の氏名、補修等の措置内容を記録し、足場を使用する作業を行う仕事が終了するまで保存しなければならない。",
      }),
    ];
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

    expect(answer).toMatch(/567条3項.*記録・保存/);
    expect(answer).toMatch(/点検結果と点検者の氏名/);
    expect(answer).toMatch(/仕事が終了するまで保存/);
    expect(answer).not.toMatch(/特化則34条の2/);
    expect(citedLegalAnswerArticles(answer, sources).length).toBeGreaterThan(0);
    expect(legalProvisionUnitForQuery(sources[0]!, query)).toEqual({
      paragraph: "第3項",
      item: "第1号・第2号",
    });
  });

  it("休業4日の報告先を所轄労基署長から先に答える", () => {
    const query = "労働者死傷病報告 労災 報告 休業4日 誰に";
    const sources = expandVerifiedLegalEvidenceArticles(query, []);
    const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

    expect(answer).toMatch(
      /結論\n労働者死傷病報告の報告先は、所轄労働基準監督署長/,
    );
    expect(answer).toMatch(/休業4日以上.*遅滞なく/);
  });

  it.each([
    [
      "フォークリフト運転 フォークリフト 技能講習 いつまで有効",
      /有効期限や定期更新は定めていません/,
    ],
    [
      "フォークリフト運転 フォークリフト 技能講習 誰が受ける",
      /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
    ],
    [
      "フォークリフト運転 フォークリフト 資格 いつまで有効",
      /最大荷重1トン以上.*技能講習.*有効期限や定期更新は定めていません/,
    ],
    [
      "フォークリフト運転 フォークリフト 資格 誰が受ける",
      /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
    ],
    [
      "フォークリフト運転 フォークリフト 資格 誰が？",
      /最大荷重1トン以上.*運転業務に就く人.*技能講習/,
    ],
  ])(
    "フォークリフト技能講習の省略follow-upへ直接答える: %s",
    (query, expected) => {
      const sources = expandVerifiedLegalEvidenceArticles(query, []);
      const answer = buildServiceFirstLegalAnswer({ query, articles: sources });

      expect(answer).toMatch(expected);
      expect(citedLegalAnswerArticles(answer, sources).length).toBeGreaterThan(
        0,
      );
    },
  );
});
