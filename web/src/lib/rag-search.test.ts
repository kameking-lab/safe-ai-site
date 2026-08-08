import { describe, it, expect } from "vitest";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";

describe("fall-arrest RAG", () => {
  it("ranks the work-floor rule first for a general scaffold fall question", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "足場から墜落しないための措置は何条ですか",
      5,
    );
    expect(articles[0]?.lawShort).toBe("安衛則");
    expect(articles[0]?.articleNum).toBe("第518条");
  });

  it("returns 518 series for 墜落制止用器具 usage obligations", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("墜落制止用器具の使用義務は何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has518Series = nums.some((n) => ["第518条", "第520条", "第521条"].includes(n));
    expect(has518Series).toBe(true);
  });

  it("returns 539の2-9 for rope high-altitude work questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("ロープ高所作業のライフラインは何条？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(normalizedScore).toBeGreaterThanOrEqual(0.7);
    const has539Series = nums.some((n) => n.startsWith("第539条"));
    expect(has539Series).toBe(true);
  });

  it("returns 第36条 for フルハーネス特別教育 questions", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore("フルハーネス特別教育の根拠条文は？", 5);
    const nums = articles.map((a) => a.articleNum);
    console.log("Score:", normalizedScore, "articles:", nums);
    expect(nums).toContain("第36条");
  });

  it("高所作業車の作業床上の安全帯質問は194条の22を最優先する", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "高所作業車の作業床における安全帯使用等の条文は？",
      5,
    );

    expect(articles[0]).toMatchObject({
      lawShort: "安衛則",
      articleNum: "第194条の22",
    });
  });
});

describe("Chrome R8 emergency RAG pins", () => {
  it("pins 安衛法第60条 + 安衛令第19条 for 職長教育 questions", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育は何条で誰が対象？", 5);
    const has60 = articles.some(
      (a) => a.law === "労働安全衛生法" && a.articleNum === "第60条"
    );
    const has19 = articles.some(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(has60).toBe(true);
    expect(has19).toBe(true);
  });

  it("安衛令第19条はe-Gov現行本文どおり製造業と現在の除外業種を返す", () => {
    const { articles } = searchRelevantArticlesWithScore("職長教育 対象業種", 5);
    const ordinance19 = articles.find(
      (a) => a.law === "労働安全衛生法施行令" && a.articleNum === "第19条"
    );
    expect(ordinance19).toBeTruthy();
    const text = ordinance19?.text ?? "";
    for (const industry of [
      "建設業",
      "製造業",
      "電気業",
      "ガス業",
      "自動車整備業",
      "機械修理業",
    ]) {
      expect(text).toContain(industry);
    }
    // 令和5年改正で対象へ加わった業種は、広い「製造業」からの除外を外す
    // 形式で反映されているため、現行条文に個別名称が列挙されるわけではない。
    for (const currentExclusion of [
      "たばこ製造業",
      "繊維工業",
      "衣服その他の繊維製品製造業",
      "紙加工品製造業",
    ]) {
      expect(text).toContain(currentExclusion);
    }
    expect(text).not.toContain("食料品製造業");
    expect(text).not.toContain("新聞業");
  });

  it("pins 安衛則第612条の2 for 熱中症 / WBGT questions", () => {
    const { articles } = searchRelevantArticlesWithScore("熱中症のWBGT義務は何条？", 5);
    const hit = articles.some(
      (a) => a.law === "労働安全衛生規則" && a.articleNum === "第612条の2"
    );
    expect(hit).toBe(true);
  });

  it("pins 安衛則第567条 for 足場「組立て・変更後」の点検・記録 questions (fresh eval Q39)", () => {
    const { articles } = searchRelevantArticlesWithScore(
      "足場の組立て・変更後に必要な点検と記録の根拠条文は？",
      5
    );
    const hit = articles.some(
      (a) => a.law === "労働安全衛生規則" && a.articleNum === "第567条"
    );
    expect(hit).toBe(true);
  });
});

describe("O5: synonyms.ts:166 是正＋口語「頻度」「資格」拡充（診断書04 T4）", () => {
  it("「健康診断の頻度」で安衛則第44条・第45条が top5 に入る", () => {
    const { articles } = searchRelevantArticlesWithScore("健康診断の頻度", 5);
    const nums = articles
      .filter((a) => a.lawShort === "安衛則")
      .map((a) => a.articleNum);
    expect(nums).toContain("第44条");
    expect(nums).toContain("第45条");
  });

  it("「酸欠 資格」で酸欠則第11条・第12条が top5 に入る", () => {
    const { articles } = searchRelevantArticlesWithScore("酸欠 資格", 5);
    const acidArticles = articles
      .filter((article) => article.lawShort === "酸欠則")
      .map((article) => article.articleNum);
    expect(acidArticles).toContain("第11条");
    expect(acidArticles).toContain("第12条");
  });

  it("気積の同義語展開先が事務所則第2条（第14条=排水は誤り）", () => {
    const { articles } = searchRelevantArticlesWithScore("気積の基準", 5);
    const jimusho = articles.find((a) => a.lawShort === "事務所則");
    expect(jimusho?.articleNum).toBe("第2条");
  });
});

describe("差し戻し・F5是正: 酸欠×資格の共起判定＋解雇予告PIN（GQ02/GQ23）", () => {
  it("自然文「酸欠作業に必要な資格は何ですか？」で酸欠則第11条・第12条がtop5に入る", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore(
      "酸欠作業に必要な資格は何ですか？",
      5
    );
    expect(normalizedScore).toBeGreaterThanOrEqual(0.5);
    expect(articles[0]?.lawShort).toBe("酸欠則");
    expect(articles[0]?.articleNum).toBe("第11条");
    expect(
      articles.some(
        (article) =>
          article.lawShort === "酸欠則" && article.articleNum === "第12条",
      ),
    ).toBe(true);
  });

  it("「解雇予告のルールを教えてください」で労基法第20条がPINにより到達可能になる（GQ23）", () => {
    const { articles, normalizedScore } = searchRelevantArticlesWithScore(
      "解雇予告のルールを教えてください。",
      5
    );
    expect(normalizedScore).toBeGreaterThanOrEqual(0.5);
    const hit = articles.some((a) => a.lawShort === "労基法" && a.articleNum === "第20条");
    expect(hit).toBe(true);
  });
});

describe("2026-07-24 監査: 複合共起によるTop-5根拠回収", () => {
  const cases: Array<{
    query: string;
    expected: string[];
  }> = [
    {
      query: "クレーンの巻過防止装置は、どの点検で機能を確認しますか？",
      expected: ["クレーン則第35条", "クレーン則第36条"],
    },
    {
      query: "アスベスト解体工事の作業計画を定める根拠は？",
      expected: ["石綿則第4条"],
    },
    {
      query: "第一種酸素欠乏危険作業と第二種の区分はどこにありますか？",
      expected: ["酸欠則第2条"],
    },
    {
      query: "屋内作業場の気積、換気、採光、温度に関する条文は？",
      expected: [
        "安衛則第600条",
        "安衛則第601条",
        "安衛則第605条",
        "安衛則第606条",
      ],
    },
    {
      query: "作業環境測定後の第一・第二・第三管理区分の根拠は？",
      expected: [
        "特化則第36条の2",
        "有機則第28条の2",
        "石綿則第37条",
        "粉じん則第26条の2",
        "鉛則第52条の2",
      ],
    },
    {
      query: "粉じん作業場の粉じん濃度測定は何か月ごとですか？",
      expected: ["粉じん則第26条"],
    },
    {
      query: "有機溶剤を扱う屋内作業場の濃度測定の根拠条文は？",
      expected: ["有機則第28条"],
    },
    {
      query: "特定化学物質の気中濃度測定を定める条文は？",
      expected: ["特化則第36条"],
    },
    {
      query: "計画届の対象となる工事範囲を定める条文は？",
      expected: ["安衛法第88条", "安衛則第89条", "安衛則第90条"],
    },
    {
      query: "届出計画の審査はどの条文に基づきますか？",
      expected: ["安衛法第89条", "安衛法第89条の2"],
    },
    {
      query: "法定休日の最低日数はどの条文で決まりますか？",
      expected: ["労基法第35条"],
    },
    {
      query: "18歳未満を午後10時以降の深夜労働に就かせる制限は？",
      expected: ["労基法第61条"],
    },
    {
      query: "業務上の負傷について使用者が行う療養補償の根拠は？",
      expected: ["労基法第75条"],
    },
    {
      query: "業務災害に関する保険給付の種類はどの条文にありますか？",
      expected: ["労災保険法第12条の8"],
    },
    {
      query: "可燃性ガスでガス溶断を行う資格の根拠条文は？",
      expected: ["安衛法第61条", "安衛令第20条", "安衛則第41条"],
    },
    {
      query: "玉掛け資格は安衛令の何号に定められていますか？",
      expected: ["安衛令第20条"],
    },
    {
      query: "貨物自動車で荷を卸す際の保護帽着用義務は？",
      expected: ["安衛則第151条の74"],
    },
    {
      query: "岩石の落下があり得る場所でドラグショベルに必要なヘッドガードは？",
      expected: ["安衛則第153条"],
    },
  ];

  it.each(cases)(
    "根拠が直接対応する複合概念をTop-5へ収める: $query",
    ({ query, expected }) => {
      const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
        (article) => `${article.lawShort}${article.articleNum}`,
      );
      for (const expectedKey of expected) {
        expect(keys, `${query}: ${expectedKey}`).toContain(expectedKey);
      }
    },
  );

  it.each([
    {
      query: "クレーン運転技能講習の講習科目は？",
      forbidden: ["クレーン則第35条", "クレーン則第36条"],
    },
    {
      query: "石綿の事前調査方法は？",
      forbidden: ["石綿則第4条"],
    },
    {
      query: "成人の深夜業に対する割増賃金は？",
      forbidden: ["労基法第61条"],
    },
    {
      query: "労災保険の療養補償給付の範囲は？",
      forbidden: ["労基法第75条"],
    },
    {
      query: "工事計画届の提出期限は？",
      forbidden: [
        "安衛法第89条",
        "安衛法第89条の2",
        "安衛則第89条",
        "安衛則第90条",
      ],
    },
    {
      query: "一般作業でヘルメットを着用する義務は？",
      forbidden: ["安衛則第151条の74"],
    },
    {
      query: "パワーショベルの用途外使用は？",
      forbidden: ["安衛則第153条"],
    },
    {
      query: "屋外作業の気温を測る方法は？",
      forbidden: ["安衛則第606条"],
    },
    {
      query: "一般健康診断の管理区分は？",
      forbidden: [
        "特化則第36条の2",
        "有機則第28条の2",
        "石綿則第37条",
        "粉じん則第26条の2",
        "鉛則第52条の2",
      ],
    },
  ])(
    "必要な共起を欠く別文脈へ新規根拠を広げない: $query",
    ({ query, forbidden }) => {
      const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
        (article) => `${article.lawShort}${article.articleNum}`,
      );
      for (const forbiddenKey of forbidden) {
        expect(keys, `${query}: ${forbiddenKey}`).not.toContain(forbiddenKey);
      }
    },
  );
});

describe("2026-08-03 answer-first retrieval intent isolation", () => {
  it.each([
    ["つり足場の構造基準は？", "安衛則第574条"],
    ["フォークリフトの制限速度の設定義務は何条ですか？", "安衛則第151条の5"],
    [
      "フォークリフトを主たる用途以外（人の運搬等）に使用することを禁止している条文は？",
      "安衛則第151条の14",
    ],
    [
      "フォークリフトの年1回の定期自主検査はどこに書いてありますか？",
      "安衛則第151条の21",
    ],
    [
      "フォークリフトで人をパレットに乗せて持ち上げるのは違反ですか？",
      "安衛則第151条の14",
    ],
    [
      "フォークリフト作業の作業指揮者を定める義務は何条ですか？",
      "安衛則第151条の4",
    ],
  ])("展開語の資格語が現在の運用意図を上書きしない: %s", (query, expected) => {
    const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
      (article) => `${article.lawShort}${article.articleNum}`,
    );
    expect(keys[0]).toBe(expected);
    expect(keys).toContain(expected);
  });

  it("略称フォークの資格質問は展開後の設備名と元質問の資格意図を組み合わせる", () => {
    const keys = searchRelevantArticlesWithScore(
      "フォーク乗るのに資格いる？",
      5,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys).toEqual(
      expect.arrayContaining([
        "安衛法第59条",
        "安衛則第36条",
        "安衛法第61条",
        "安衛令第20条",
        "安衛則第41条",
      ]),
    );
  });

  it("元質問が就業制限を明示した場合は制度本体を取得する", () => {
    const keys = searchRelevantArticlesWithScore(
      "フォークリフトの就業制限は？",
      5,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys).toEqual(
      expect.arrayContaining(["安衛法第61条", "安衛令第20条"]),
    );
  });

  it.each([
    [
      "フォークリフトの資格と制限速度の設定義務は？",
      "安衛則第151条の5",
    ],
    [
      "フォークリフトの資格と年1回の定期自主検査の条文は？",
      "安衛則第151条の21",
    ],
    [
      "フォークリフトの資格と用途外使用禁止条文は？",
      "安衛則第151条の14",
    ],
  ])("複合質問は運用の直接根拠を資格束より先に保持する: %s", (query, expected) => {
    const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
      (article) => `${article.lawShort}${article.articleNum}`,
    );
    expect(keys[0]).toBe(expected);
    expect(keys).toEqual(
      expect.arrayContaining([
        expected,
        "安衛法第59条",
        "安衛則第36条",
        "安衛法第61条",
        "安衛令第20条",
      ]),
    );
  });

  it.each([
    ["フォークリフトの年次点検は？", "安衛則第151条の21"],
    ["フォークリフトの速度は誰が決める？", "安衛則第151条の5"],
    ["フォークリフトのスピードは誰が決める？", "安衛則第151条の5"],
    ["フォークのスピード決めなきゃダメ？", "安衛則第151条の5"],
    ["フォークリフ卜の年次点険は？", "安衛則第151条の21"],
    [
      "フォークリフトの速度設定、年1回の点検、用途外使用禁止は？",
      "安衛則第151条の5|安衛則第151条の21|安衛則第151条の14",
    ],
    [
      "フォークリフトの資格、制限速度、主用途外使用、年次検査は？",
      "安衛則第151条の5|安衛則第151条の14|安衛則第151条の21",
    ],
  ])("運用意図の表現揺れを各1slotとして先に確保する: %s", (query, expected) => {
    const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
      (article) => `${article.lawShort}${article.articleNum}`,
    );
    for (const expectedKey of expected.split("|")) {
      expect(keys).toContain(expectedKey);
    }
  });

  it("運転したいという資格意図で1トン以上の就業制限根拠を保持する", () => {
    const keys = searchRelevantArticlesWithScore(
      "フォークリフト1.5トンを運転したい",
      5,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys).toEqual(
      expect.arrayContaining(["安衛法第61条", "安衛令第20条"]),
    );
  });
});

describe("answer-first surrounding operation retrieval", () => {
  it("つり足場の使用前点検は568条を567条・574条より先に返す", () => {
    const keys = searchRelevantArticlesWithScore(
      "つり足場の使用前点検は何条？",
      10,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys[0]).toBe("安衛則第568条");
    expect(keys).toContain("安衛則第567条");
  });

  it.each([
    "フォークリフトの毎月の自主検査必要？",
    "フォークリフトの月例検査は？",
    "フォークリフトの月1回の定期自主検査は？",
  ])("月次検査の口語は151条の22をtop1にする: %s", (query) => {
    const keys = searchRelevantArticlesWithScore(query, 5).articles.map(
      (article) => `${article.lawShort}${article.articleNum}`,
    );
    expect(keys[0]).toBe("安衛則第151条の22");
  });

  it("頻度なしの定期点検は月次・年次の両方を取得する", () => {
    const keys = searchRelevantArticlesWithScore(
      "フォークリフトの定期点検は？",
      5,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys.slice(0, 2)).toEqual([
      "安衛則第151条の21",
      "安衛則第151条の22",
    ]);
  });

  it("指揮する人という口語を作業指揮者151条の4へ結び付ける", () => {
    const keys = searchRelevantArticlesWithScore(
      "フォークリフトの指揮する人は必要ですか？",
      5,
    ).articles.map((article) => `${article.lawShort}${article.articleNum}`);
    expect(keys[0]).toBe("安衛則第151条の4");
  });
});
