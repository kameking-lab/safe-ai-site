import { describe, expect, it } from "vitest";
import {
  buildLegalClarification,
  extractLegalConversationContext,
  nextLegalClarification,
  resolveLegalConversationQuery,
  type LegalConversationContext,
} from "./legal-conversation-context";
import { LEGAL_RAG_EVALUATION_2026_08_02 } from "@/data/legal-rag-evaluation-2026-08-02";

describe("法令対話のmemory-only文脈", () => {
  it.each([
    "安全帯は？",
    "フルハーネスは？",
    "作業床で安全帯は？",
    "バスケット内は？",
    "バスケットで墜落制止用器具は必要？",
  ])("高所作業車の短い墜落防止follow-upを直前文脈へ結合する: %s", (message) => {
    const result = resolveLegalConversationQuery({
      message,
      history: [{ role: "user", content: "高所作業車について" }],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.context.equipment).toBe("高所作業車");
    expect(result.query).toContain("高所作業車");
    expect(result.query).toContain(message.replace("？", ""));
  });

  it.each([
    "フルハーネス型墜落制止用器具の特別教育はいつ必要？",
    "墜落制止用器具の特別教育が必要な条件は？",
  ])("器具と特別教育を明示した質問を一般的な墜落場所へ誤分岐しない: %s", (query) => {
    expect(buildLegalClarification(query)?.question).not.toBe(
      "墜落のおそれがある場所はどこですか？",
    );
  });

  it("固定済み曖昧質問の全quick replyで同じ確認を繰り返さない", () => {
    const cases = LEGAL_RAG_EVALUATION_2026_08_02.filter(
      (testCase) => testCase.category === "ambiguous" && testCase.query,
    );
    expect(cases).toHaveLength(30);

    for (const testCase of cases) {
      const initial = buildLegalClarification(testCase.query!);
      expect(initial, testCase.id).not.toBeNull();
      for (const option of initial?.options ?? []) {
        const resolved = resolveLegalConversationQuery({
          message: option,
          history: [
            { role: "user", content: testCase.query! },
            { role: "assistant", content: initial!.question },
          ],
        });
        const next = nextLegalClarification(
          resolved.query,
          resolved.answeredClarification,
        );
        expect(next, `${testCase.id}:${option}`).not.toEqual(initial);
      }
    }
  });

  it.each([
    ["委員会を置く必要は？", "委員会"],
    ["放射線の線量限度は？", "放射線"],
    ["特殊健診は必要？", "特殊健診"],
    ["墜落防止は必要？", "墜落防止"],
    ["この薬品の規制は？", "薬品"],
    ["この通達が根拠になりますか？", "通達"],
    ["今の法律ですか？", "法律"],
    ["85デシベルなら何が必要？", "デシベル"],
    ["粉じん対策は必要？", "粉じん"],
    ["鉛の規則はかかりますか？", "鉛"],
  ])(
    "文脈スロットを持たない確認回答でも安全な元質問の主題を失わない: %s",
    (query, subject) => {
      const initial = buildLegalClarification(query);
      expect(initial).not.toBeNull();

      for (const option of initial?.options ?? []) {
        const resolved = resolveLegalConversationQuery({
          message: option,
          history: [
            { role: "user", content: query },
            { role: "assistant", content: initial!.question },
          ],
        });

        expect(resolved.usedHistory, `${query}:${option}`).toBe(true);
        expect(resolved.query, `${query}:${option}`).toContain(subject);
        expect(
          nextLegalClarification(
            resolved.query,
            resolved.answeredClarification,
          ),
          `${query}:${option}`,
        ).not.toEqual(initial);
      }
    },
  );

  it("説明を添えた足場選択でも直前の手すり意図を保持する", () => {
    const result = resolveLegalConversationQuery({
      message: "足場の作業床です",
      history: [{ role: "user", content: "手すりの高さは？" }],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("足場作業");
    expect(result.query).toContain("手すり");
    expect(result.query).toContain("高さ");
    expect(result.context).toMatchObject({
      workType: "足場作業",
      equipment: "足場",
    });
  });

  it.each([
    [
      "熱中症対策の新しい義務は？",
      "体調悪化時の報告体制についてです",
      "暑熱作業",
      "報告体制",
    ],
    ["足場の点検は？", "強風の後に再開します", "足場作業", "強風"],
  ])(
    "直前トピック固有の省略条件だけを安全に継続する: %s → %s",
    (initial, message, workType, aspect) => {
      const result = resolveLegalConversationQuery({
        message,
        history: [{ role: "user", content: initial }],
      });

      expect(result.usedHistory).toBe(true);
      expect(result.context.workType).toBe(workType);
      expect(result.query).toContain(workType);
      expect(result.query).toContain(aspect);
    },
  );

  it.each([
    ["電気作業の資格は？", "強風の後に再開します"],
    ["フォークリフトの資格は？", "体調悪化時の報告体制についてです"],
  ])(
    "別トピックの固有表現は誤って継続しない: %s → %s",
    (initial, message) => {
      const result = resolveLegalConversationQuery({
        message,
        history: [{ role: "user", content: initial }],
      });

      expect(result.usedHistory).toBe(false);
      expect(result.query).toBe(message.replace("？", "?"));
    },
  );

  it("前のフォークリフト質問へ荷重だけの追質問を安全に補う", () => {
    const result = resolveLegalConversationQuery({
      message: "1.5トンです",
      history: [
        { role: "user", content: "フォークリフトに資格いる？" },
        { role: "assistant", content: "最大荷重で条件が変わります。" },
      ],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("フォークリフト運転");
    expect(result.query).toContain("最大荷重1.5トン");
    expect(result.context).toMatchObject({
      equipment: "フォークリフト",
      load: "最大荷重1.5トン",
      qualification: "資格",
    });
  });

  it("氏名・会社名・現場名・健康情報を文脈へ取り込まない", () => {
    const context = extractLegalConversationContext(
      "山田太郎が安全工業の新宿現場で持病あり。フォークリフト1.5トン",
    );
    expect(JSON.stringify(context)).not.toMatch(/山田|安全工業|新宿|持病/);
    expect(context).toMatchObject({
      equipment: "フォークリフト",
      load: "最大荷重1.5トン",
    });
  });

  it.each([
    ["低圧の電気作業の資格は？", "低圧"],
    ["高圧の充電部に近づく作業です", "高圧"],
    ["特高の活線作業です", "特別高圧"],
  ])("電気作業と電圧区分だけを安全な文脈へ保持する: %s", (input, voltageClass) => {
    expect(extractLegalConversationContext(input)).toMatchObject({
      workType: "電気作業",
      equipment: "電気設備",
      voltageClass,
    });
  });

  it("圧気作業の高圧室内作業を電気の高圧へ誤分類しない", () => {
    const context = extractLegalConversationContext(
      "高圧室内作業の作業主任者は必要ですか？",
    );
    expect(context.workType).not.toBe("電気作業");
    expect(context.voltageClass).toBeUndefined();
  });

  it("短い作業主任者follow-upを直前の電気作業へ結合する", () => {
    const result = resolveLegalConversationQuery({
      message: "作業主任者",
      history: [
        { role: "user", content: "電気作業の資格は？" },
        {
          role: "assistant",
          content:
            "必要な資格・教育や作業主任者の要否を絞るため、実際の作業はどれに近いですか？",
        },
      ],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("電気作業");
    expect(result.query).toContain("作業主任者");
    expect(result.context).toMatchObject({
      workType: "電気作業",
      equipment: "電気設備",
      qualification: "作業主任者",
      role: "作業主任者",
    });
    const clarification = nextLegalClarification(result.query);
    expect(clarification?.options).toEqual([
      "配線工事",
      "充電部・近接作業",
      "操作・点検",
    ]);
    expect(clarification?.options.join(" ")).not.toMatch(/酸欠|有機溶剤|石綿/);
  });

  it.each([
    "どの通達？",
    "どの指針？",
    "条文は？",
    "何条？",
    "何項？",
    "何号？",
    "公式原文は？",
    "告示は？",
    "例外は？",
    "いつから？",
  ])("短い根拠・施行日follow-upを電気資格の文脈へ結合する: %s", (message) => {
    const result = resolveLegalConversationQuery({
      message,
      history: [{ role: "user", content: "電気作業の資格は？" }],
      context: {
        workType: "電気作業",
        equipment: "電気設備",
        qualification: "資格",
      },
    });
    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("電気作業");
    expect(result.context.workType).toBe("電気作業");
  });

  it.each([
    ["有機溶剤を屋内で使う", "換気は？", "有機溶剤"],
    ["酸欠作業の監視人は必要？", "測定は？", "酸素欠乏"],
    ["足場の手すり高さは？", "点検は？", "足場"],
    ["開口部の手すりは？", "養生は？", "墜落防止"],
    ["フォークリフトの資格は？", "運転は？", "フォークリフト"],
    ["電気作業の資格は？", "作業指揮者は？", "電気作業"],
  ])(
    "短い現場aspectを直前の同一トピックへ結合する: %s → %s",
    (initial, message, subject) => {
      const initialContext = extractLegalConversationContext(initial);
      const result = resolveLegalConversationQuery({
        message,
        history: [{ role: "user", content: initial }],
        context: initialContext,
      });
      expect(result.usedHistory).toBe(true);
      expect(result.query).toContain(subject);
    },
  );

  it("独立した手すり質問を前の電気文脈へ誤結合しない", () => {
    const result = resolveLegalConversationQuery({
      message: "手すりは？",
      history: [{ role: "user", content: "電気作業の資格は？" }],
      context: { workType: "電気作業", equipment: "電気設備" },
    });
    expect(result.usedHistory).toBe(false);
    expect(result.query).toBe("手すりは?");
    expect(result.context.workType).not.toBe("電気作業");
  });

  it("raw履歴なしでもallowlist文脈から作業主任者follow-upを結合する", () => {
    const result = resolveLegalConversationQuery({
      message: "作業主任者",
      context: extractLegalConversationContext("高圧の電気作業の資格は？"),
    });

    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("電気作業");
    expect(result.query).toContain("高圧");
    expect(result.query).toContain("作業主任者");
  });

  it("外部から渡された文脈を再抽出し、PIIや未承認選択肢を引き継がない", () => {
    const result = resolveLegalConversationQuery({
      message: "作業主任者",
      context: {
        workType: "山田太郎が安全工業の新宿現場で行う電気作業",
        equipment: "電気設備",
        voltageClass: "高圧",
        qualification: "資格",
        confirmedChoices: ["山田太郎"],
      } as unknown as LegalConversationContext,
    });

    expect(result.query).toContain("電気作業");
    expect(result.query).toContain("高圧");
    expect(result.query).not.toMatch(/山田|安全工業|新宿/);
    expect(result.context.confirmedChoices).toBeUndefined();
  });

  it("電気作業の確認済み選択肢だけを最大3件の安全なスロットへ保持する", () => {
    const initial = buildLegalClarification("電気作業の資格は？");
    const result = resolveLegalConversationQuery({
      message: "充電部・近接作業",
      history: [
        { role: "user", content: "電気作業の資格は？" },
        { role: "assistant", content: initial!.question },
      ],
    });

    expect(result.answeredClarification).toEqual(initial);
    expect(result.context.confirmedChoices).toEqual(["充電部・近接作業"]);
    expect(result.query).toContain("確認済み選択肢:充電部・近接作業");
    expect(nextLegalClarification(result.query, initial!)).not.toEqual(initial);
  });

  it("新しい独立質問へ過去の設備を混ぜない", () => {
    const result = resolveLegalConversationQuery({
      message: "足場の手すり高さは？",
      history: [{ role: "user", content: "フォークリフトに資格いる？" }],
    });
    expect(result.usedHistory).toBe(false);
    expect(result.query).toBe("足場の手すり高さは?");
  });

  it.each([
    ["高さ7mでフルハーネスは必要？", "墜落制止用器具使用", "足場作業"],
    ["フルハーネスで高さ7mです", "墜落制止用器具使用", "足場作業"],
    ["開口部は？", "墜落防止", "足場作業"],
  ])(
    "同じ墜落系でも明示した新しい作業を旧足場文脈より優先する: %s",
    (message, expectedWork, staleWork) => {
      const result = resolveLegalConversationQuery({
        message,
        history: [{ role: "user", content: "足場の手すり高さは？" }],
        context: extractLegalConversationContext("足場の手すり高さは？"),
      });

      expect(result.usedHistory).toBe(false);
      expect(result.context.workType).toBe(expectedWork);
      expect(result.query).toContain(message.replace("？", "?"));
      expect(result.query).not.toContain(staleWork);
    },
  );

  it.each(["根拠は？", "それの根拠は？", "条件は？", "詳しく", "対象は？", "なぜ？", "いつ？", "例外は？"])(
    "典型的な省略follow-upを直前の安全な電気作業文脈へ結合する: %s",
    (message) => {
      const result = resolveLegalConversationQuery({
        message,
        context: extractLegalConversationContext("電気作業の資格は？"),
      });

      expect(result.usedHistory).toBe(true);
      expect(result.query).toContain("電気作業");
      expect(result.context.workType).toBe("電気作業");
    },
  );

  it.each(["民法は？", "天気は？", "猫は？", "手すりは？", "フォークは？"])(
    "短い新規質問を直前の電気文脈へ自動結合しない: %s",
    (message) => {
      const result = resolveLegalConversationQuery({
        message,
        context: extractLegalConversationContext("電気作業の資格は？"),
      });
      expect(result.usedHistory).toBe(false);
      expect(result.query).not.toContain("電気作業");
      expect(result.context.workType).not.toBe("電気作業");
    },
  );

  it("履歴窓から初回質問が落ちてもallowlist文脈で電気follow-upを維持する", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: index % 2 === 0 ? `確認済み条件${index}` : `回答${index}`,
    }));
    const result = resolveLegalConversationQuery({
      message: "作業主任者",
      history,
      context: extractLegalConversationContext("電気作業の資格は？"),
    });
    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("電気作業");
    expect(result.query).toContain("作業主任者");
    expect(result.query).not.toMatch(/酸欠|有機溶剤|石綿/);
  });

  it.each([
    ["2010年8月2日に確認", "2010-08-02", "day"],
    ["2019年2月時点", "2019-02-01", "month"],
    ["2018年の規定", "2018-01-01", "year"],
    ["平成30年の規定", "2018-01-01", "year"],
    ["昭和47年9月の規定", "1972-09-01", "month"],
    ["令和元年5月1日の規定", "2019-05-01", "day"],
  ])("西暦・和暦の日・月・年を安全な文脈へ粒度付きで保持する: %s", (input, expected, precision) => {
    expect(extractLegalConversationContext(input)).toMatchObject({
      targetDate: expected,
      targetDatePrecision: precision,
    });
  });

  it("確認回答でも初回質問の年だけの対象時点を失わない", () => {
    const result = resolveLegalConversationQuery({
      message: "建築物",
      history: [
        { role: "user", content: "2018年に石綿の事前調査ができる人は?" },
        { role: "assistant", content: "石綿を確認する対象はどれですか?" },
      ],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.context.targetDate).toBe("2018-01-01");
    expect(result.context.targetDateEnd).toBe("2018-12-31");
    expect(result.context.targetDatePrecision).toBe("year");
    expect(result.query).toContain("2018年");
    expect(result.query).toContain("石綿作業");
  });

  it("平成の対象年を西暦化し、確認回答でも年粒度のまま保持する", () => {
    const result = resolveLegalConversationQuery({
      message: "作業床なし",
      history: [
        {
          role: "user",
          content: "平成30年にフルハーネス型を使う作業には特別教育が必要でしたか?",
        },
        { role: "assistant", content: "作業床を設けられますか?" },
      ],
    });

    expect(result.context).toMatchObject({
      targetDate: "2018-01-01",
      targetDatePrecision: "year",
    });
    expect(result.query).toContain("2018年");
    expect(result.query).toContain("墜落制止用器具使用");
    expect(result.query).toContain("特別教育");
  });

  it.each([
    ["フルハーネスの教育は？", "作業床を設けにくい高さ7メートルの作業です", "墜落制止用器具"],
    ["シンナー作業の健診は？", "屋内で第2種有機溶剤を使います", "有機溶剤健康診断"],
    ["薬品の危険性評価は必要？", "SDS対象物を新しく使います", "化学物質リスクアセスメント"],
    ["クレーンの点検を知りたい", "月例の自主検査です", "クレーン作業"],
    ["安全管理者は必要？", "建設業で常時50人です", "労働安全衛生法 安全管理者の選任義務"],
  ])("初回の安全な作業意図を条件追加入力へ継承する", (first, message, marker) => {
    const result = resolveLegalConversationQuery({
      message,
      history: [{ role: "user", content: first }],
    });
    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain(marker);
    expect(result.query).toContain(message);
  });

  it("フルハーネスの教育意図を条件追答後も特別教育として保持する", () => {
    const result = resolveLegalConversationQuery({
      message: "作業床を設けにくい高さ7メートルの作業です",
      history: [{ role: "user", content: "フルハーネスの教育は？" }],
    });

    expect(result.query).toContain("墜落制止用器具");
    expect(result.query).toContain("特別教育");
  });

  it("有機溶剤の区分と場所を複数ターンの許可済み条件として保持する", () => {
    const result = resolveLegalConversationQuery({
      message: "それ以外の屋内",
      history: [
        { role: "user", content: "有機溶剤を屋内で使う時は？" },
        { role: "assistant", content: "第1種・第2種・第3種で分かれます。" },
        { role: "user", content: "第3種" },
        { role: "assistant", content: "タンク等の内部か確認します。" },
      ],
    });

    expect(result.usedHistory).toBe(true);
    expect(result.query).toContain("第3種");
    expect(result.query).toContain("それ以外の屋内");
    expect(result.context.confirmedChoices).toEqual([
      "第3種",
      "それ以外の屋内",
    ]);
  });

  it.each(["臨時作業", "短時間作業"])(
    "有機溶剤の%sを場所回答後も保持する",
    (workPattern) => {
      const result = resolveLegalConversationQuery({
        message: "タンク等の内部",
        history: [
          { role: "user", content: "有機溶剤を屋内で使う時は？" },
          { role: "assistant", content: "SDS上の区分を確認します。" },
          { role: "user", content: `第2種を${workPattern}で使う` },
          { role: "assistant", content: "作業場所を確認します。" },
        ],
      });

      expect(result.query).toContain("第2種");
      expect(result.query).toContain(workPattern);
      expect(result.query).toContain("タンク等の内部");
    },
  );

  it("同じ条件slotを選び直した場合は最新の選択だけを残す", () => {
    const result = resolveLegalConversationQuery({
      message: "第3種",
      history: [
        { role: "user", content: "有機溶剤を屋内で使う時は？" },
        { role: "assistant", content: "SDS上の区分を確認します。" },
        { role: "user", content: "第2種" },
      ],
    });

    expect(result.context.confirmedChoices).toEqual(["第3種"]);
    expect(result.query).not.toContain("確認済み選択肢:第2種");
  });

  it("第三種・臨時・タンク内部の後は吹付け方法だけを確認し、4条件を保持する", () => {
    const clarification = buildLegalClarification(
      "有機溶剤 第3種 臨時作業 タンク等の内部",
    );
    expect(clarification).toEqual({
      question: "必要な換気設備を絞るため、実際に行うのは吹付け作業ですか？",
      options: ["吹付け作業", "吹付け以外", "不明"],
    });

    const result = resolveLegalConversationQuery({
      message: "吹付け以外",
      context: {
        workType: "屋内有機溶剤業務",
        equipment: "有機溶剤",
        confirmedChoices: ["第3種", "臨時作業", "タンク等の内部"],
      },
    });
    expect(result.context.confirmedChoices).toEqual([
      "第3種",
      "臨時作業",
      "タンク等の内部",
      "吹付け以外",
    ]);
    expect(result.query).toContain("吹付け以外");
  });
});

describe("曖昧質問の確認", () => {
  it("電気作業は目的を示す一問とcompactな3選択肢にする", () => {
    expect(buildLegalClarification("電気作業の資格は？")).toEqual({
      question:
        "必要な資格・教育や作業主任者の要否を絞るため、実際の作業はどれに近いですか？",
      options: ["配線工事", "充電部・近接作業", "操作・点検"],
    });
  });

  it.each(["フォークリフトに資格いる？", "フォークリフトに資格はいる？"])(
    "フォークリフト資格は一問だけ返し、選択肢を3件に絞る: %s",
    (query) => {
      expect(buildLegalClarification(query)).toEqual({
        question:
          "必要な資格区分を確定するため、銘板・仕様書にあるフォークリフトの最大荷重はどれですか？",
        options: ["1トン未満", "1トン以上", "分からない"],
      });
    },
  );

  it("手すりの対象設備を自動確定しない", () => {
    const result = buildLegalClarification("手すりは何センチ？");
    expect(result?.question).toBe(
      "適用する手すり基準を絞るため、高さを確認したい設備はどれですか？",
    );
    expect(result?.options).toHaveLength(3);
  });

  it("玉掛けは資格区分を判定する目的を示してつり上げ荷重を確認する", () => {
    expect(buildLegalClarification("玉掛けの資格は？")).toEqual({
      question:
        "必要な資格区分を確定するため、使用するクレーン等のつり上げ荷重はどれですか？",
      options: ["1トン未満", "1トン以上", "分からない"],
    });
  });

  it("高所作業車は法定定義と資格区分の境界を分けて確認する", () => {
    expect(buildLegalClarification("高所作業車の教育は？")).toEqual({
      question:
        "運転に必要な資格区分を確定するため、銘板・仕様書にある高所作業車の作業床の最高高さはどれですか？",
      options: ["2m未満", "2m以上10m未満", "10m以上"],
    });
  });

  it("脚立を明示した高さ質問は、設備を聞き直さず足元の高さを一つだけ確認する", () => {
    expect(buildLegalClarification("脚立で作業していい高さは？")).toEqual({
      question: "作業時の足元の高さはどれですか？",
      options: ["2m未満", "2m以上", "分からない"],
    });
    expect(buildLegalClarification("脚立で作業していい高さは？")?.question).not.toMatch(
      /(?:使う|どの)設備/,
    );
    expect(
      buildLegalClarification("脚立作業 脚立 高さ 脚立"),
    ).toEqual({
      question: "作業時の足元の高さはどれですか？",
      options: ["2m未満", "2m以上", "分からない"],
    });
  });

  it("はしご・作業台は各設備に必要な条件を一つだけ確認し、石綿調査者は対象を聞く", () => {
    expect(buildLegalClarification("はしご作業 はしご 高さ はしご")).toEqual({
      question: "はしごを何に使いますか？",
      options: ["昇降用", "作業場所", "条件不明"],
    });
    expect(buildLegalClarification("作業台作業 作業台 高さ 作業台")).toEqual({
      question: "作業台の種類はどれですか？",
      options: ["可搬式作業台", "ローリングタワー", "種類不明"],
    });
    expect(buildLegalClarification("石綿の事前調査は誰ができる？")).toEqual({
      question: "石綿を確認する対象はどれですか？",
      options: ["建築物", "工作物", "船舶"],
    });
    expect(buildLegalClarification("石綿の届出は必要？")).toEqual({
      question: "石綿に関するどの作業を確認しますか？",
      options: ["解体", "改修", "封じ込め"],
    });
  });

  it("フォクリフトとひらがなの資格を現場語として正規化する", () => {
    expect(buildLegalClarification("フォクリフトのしかくはいる？")).toEqual({
      question:
        "必要な資格区分を確定するため、銘板・仕様書にあるフォークリフトの最大荷重はどれですか？",
      options: ["1トン未満", "1トン以上", "分からない"],
    });
  });

  it("資格文脈の略称フォークをフォークリフトとして扱う", () => {
    expect(buildLegalClarification("フォークの資格はいる？")).toEqual({
      question:
        "必要な資格区分を確定するため、銘板・仕様書にあるフォークリフトの最大荷重はどれですか？",
      options: ["1トン未満", "1トン以上", "分からない"],
    });
  });

  it.each([
    "フルハーネスはいつ特別教育が必要？",
    "玉掛けは何トンから技能講習？",
    "2トンの玉掛け資格は？",
    "高所作業車に特別教育は必要？",
    "フルハーネスの教育いる？",
    "健康診断って毎年必要？",
  ])("条件分岐そのものを尋ねる現場語は検索へ進める: %s", (query) => {
    expect(buildLegalClarification(query)).toBeNull();
  });

  it.each([
    "有機溶剤中毒予防規則第29条を示してください。",
    "特定化学物質障害予防規則第39条を示してください。",
    "粉じん障害防止規則第26条を示してください。",
    "鉛中毒予防規則第52条の2を示してください。",
    "電離放射線障害防止規則第56条を示してください。",
    "ボイラー及び圧力容器安全規則第24条を示してください。",
  ])("明示法令と条番号があれば条件を再確認しない: %s", (query) => {
    expect(buildLegalClarification(query)).toBeNull();
  });

  it.each([
    "玉かけ1t以上はどの講習？",
    "クレーン作業 クレーン 月例の自主検査です",
    "定期健康診断の頻度を知りたい",
    "雇入れ時健康診断についてです",
    "化学物質管理者の選任です",
    "特定化学物質の健康診断です",
    "粉じん作業場の作業環境測定です",
    "石綿作業前の事前調査です",
  ])("必要な対象・数値・文脈が揃っていれば同じスロットを再確認しない: %s", (query) => {
    expect(buildLegalClarification(query)).toBeNull();
  });

  it.each([
    ["クレーンを運転できますか？", ["クレーン", "移動式クレーン", "デリック"]],
    ["高所作業車の教育は？", ["2m未満", "2m以上10m未満", "10m以上"]],
    ["有機溶剤を屋内で使えますか？", ["第1種", "第2種", "第3種"]],
    ["酸欠作業の人員は？", ["作業主任者", "監視人", "作業者"]],
    ["足場を点検するのはいつ？", ["組立後", "悪天候後", "使用前"]],
    ["今の法律ですか？", ["今日", "過去の日付", "将来の日付"]],
    ["1トンなら講習ですか？", ["フォークリフト", "玉掛け", "クレーン"]],
  ])("%s を一問だけで確認する", (query, expectedOptions) => {
    const result = buildLegalClarification(query);
    expect(result).not.toBeNull();
    expect(result?.question.match(/？/g)).toHaveLength(1);
    expect(result?.options).toEqual(expectedOptions);
    expect(result?.options.length).toBeLessThanOrEqual(3);
  });
});
