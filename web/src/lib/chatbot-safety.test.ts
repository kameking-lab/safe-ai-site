import { describe, expect, it } from "vitest";
import {
  CHATBOT_EMERGENCY_RESPONSE,
  CHATBOT_SEVERE_BLEEDING_RESPONSE,
  detectChatbotSensitiveData,
  evaluateChatbotSafety,
  inspectChatbotHistory,
} from "./chatbot-safety";

describe("evaluateChatbotSafety", () => {
  it.each([
    "フルハーネスはいつ特別教育が必要？",
    "玉掛けは何トンから技能講習？",
    "2トンの玉掛け資格は？",
    "高所作業車に特別教育は必要？",
  ])("条件分岐を尋ねる現場語を過剰遮断しない: %s", (message) => {
    expect(evaluateChatbotSafety(message)?.kind).not.toBe("ambiguous");
  });

  it.each(["フォークリフトに資格いる？", "フォークリフトに資格はいる？"])(
    "最大荷重がないフォークリフト資格質問は確認へ進める: %s",
    (message) => {
      expect(evaluateChatbotSafety(message)?.kind).toBe("ambiguous");
    },
  );

  it("作業主任者資格という制度名を氏名と誤検出しない", () => {
    expect(detectChatbotSensitiveData("潜水業務の作業主任者資格は？")).toEqual(
      [],
    );
    expect(evaluateChatbotSafety("潜水業務の作業主任者資格は？")?.kind).toBe(
      "source-gap",
    );
  });

  it.each([
    "作業員が倒れて反応がない",
    "意識がない",
    "意識なし",
    "意識ありません",
    "意識がありません、どうすればいい",
    "反応なし",
    "反応がありません",
    "呼吸がない",
    "呼吸なし",
    "呼吸がありません",
    "呼吸していない",
    "無呼吸です",
    "大量出血で血が止まらない",
    "大出血です",
    "出血がひどい",
    "けいれんしています",
    "作業員が感電して動けません。どうすれば？",
    "同僚が高所から墜落し、足が折れました",
    "薬品が目に入り激痛があります",
    "火災が発生して逃げ遅れています",
    "槽内で酸欠になり作業員が倒れています",
    "作業員が設備内に閉じ込められています",
    "同僚が水槽で溺れています",
    "熱中症でけいれんし、動けません",
    "作業員が感電して倒れました",
    "作業員が電線に触れて離れられません",
    "足場から落ちて頭を打ちました",
    "工場で火事です",
    "硫化水素が発生しています。作業員がいます",
    "作業員が熱中症で倒れました",
    "フォークリフトにひかれました",
    "機械に腕を巻き込まれました",
    "重機に挟まれて動けません",
    "クレーンの荷が落ちて作業員の頭に当たりました",
    "指が切断されました",
    "腕を切断して出血しています",
    "目に異物が刺さりました",
    "作業員が有毒ガスを吸って苦しんでいます",
    "フォークリフトにひかれた。助けて",
    "重機に轢かれた。どうすれば？",
    "機械に手を挟まれた。助けて",
    "回転体に腕を巻き込まれた。どうすれば？",
    "指を切断した。助けて",
    "目に釘が刺さった。どうすれば？",
    "今、現場で事故が起きました。どうすればよいですか",
    "作業員が倒れて返答ありません。どうする？",
    "胸を締め付けられるように痛がっています。",
  ])("intercepts emergency wording before any AI call: %s", (message) => {
    const result = evaluateChatbotSafety(message);
    expect(result?.kind).toBe("emergency");
    expect(result?.safeUserText).not.toContain(message);
    expect(result?.response).toBe(
      result?.emergencyCategory === "severe-bleeding"
        ? CHATBOT_SEVERE_BLEEDING_RESPONSE
        : CHATBOT_EMERGENCY_RESPONSE,
    );
    expect(result?.response).toMatch(/119.*(?:AED|直接圧迫)/);
    expect(result?.response).toContain("このチャットの回答を待たない");
  });

  it.each([
    "意識がない",
    "意識なし",
    "呼びかけても反応しない",
    "返事がない",
    "反応が鈍い",
    "意識がもうろう",
    "呼吸していない",
    "息をしていない",
    "呼吸が分からない",
    "大量に血が出ている",
    "血が止まらない",
    "出血がひどい",
    "倒れた",
    "けいれん",
    "胸が痛い",
    "動けない",
    "　呼びかけても、反応　しない。　",
    "呼吸が　分からない！",
    "胸が痛い・・・動けない",
    "大量に　血が出ています",
    "作業員が倒れています",
    "同僚が倒れてる。どうすれば？",
    "人が倒れてます。助けて",
    "作業員が気を失いました。どうすれば？",
    "同僚が気絶しています。助けて",
    "作業員が息ができない。どうすれば？",
    "同僚が息苦しい。助けて",
    "作業員が呼吸困難です。どうしたらいい？",
    "同僚が窒息しています。助けて",
    "作業員がぐったりして呼びかけに応じません",
    "同僚が胸が苦しい。どうすれば？",
    "血が噴き出して止まりません。助けて",
    "人が倒れて起きません。どうすれば？",
    "作業員が倒れ込んで動きません",
    "作業員が心停止です。助けて",
    "同僚の脈がありません。どうすれば？",
    "救急車を呼んでください。作業員が苦しんでいます",
    "同僚の唇が紫で呼吸が浅いです",
    "作業員が呼吸をしていません",
    "作業員が呼吸していません",
  ])("PF-001: natural emergency gold set is intercepted: %s", (message) => {
    const result = evaluateChatbotSafety(message);
    expect(result).toMatchObject({
      kind: "emergency",
      safeUserText: "[緊急事象の相談を検知]",
    });
    expect(result?.response).toContain("119番");
    expect(result?.response).not.toMatch(/法令検索|KYを作成|無料相談/);
  });

  it.each([
    "意識がないわけではありません",
    "呼吸していないわけではない",
    "血が止まらないということはない",
    "胸が痛いわけではない",
    "作業員が倒れたという事実はありません",
    "倒れた人はいません",
    "胸が痛い人はいません",
    "動けない人はいません",
    "呼吸困難ではありません",
    "気絶したわけではありません",
    "胸が苦しいわけではない",
    "心停止ではありません",
    "脈がないわけではありません",
    "フォークリフトにひかれたわけではありません",
    "機械に手を挟まれた事実はありません",
    "「意識がない」場合の訓練資料を作りたい",
    "意識がない場合の対応を教えて",
  ])("PF-001: explicitly negated emergency statement is not treated as active: %s", (message) => {
    expect(evaluateChatbotSafety(message)?.kind).not.toBe("emergency");
  });

  it.each([
    "大量に血が出ている",
    "血が止まらない",
    "出血がひどい",
  ])("PF-002: severe bleeding returns direct-pressure guidance: %s", (message) => {
    const result = evaluateChatbotSafety(message);
    expect(result).toMatchObject({
      kind: "emergency",
      emergencyCategory: "severe-bleeding",
      response: CHATBOT_SEVERE_BLEEDING_RESPONSE,
    });
    expect(result?.response).toContain("直接圧迫");
    expect(result?.response).toMatch(/手袋|ビニール袋/);
    expect(result?.response).toContain("感染");
    expect(result?.response).toContain("救急隊・通信指令員の指示を最優先");
  });

  it.each([
    "社員番号はA123です",
    "連絡先は090-1234-5678です",
    "メールはworker@example.comです",
    "診断名は高血圧です",
    "健診結果を相談したい",
    "worker ＠ example ． com",
    "０９０　１２３４　５６７８",
    "東京都新宿区西新宿２丁目８番１号",
    "社員ID AB １２３４５",
    "山田　太郎",
    "HbA1c 8.2です",
    "担当者は小野太郎です",
    "作業員は高田一郎です",
    "被災者は小野太郎、骨折しました",
    "責任者:山川健二",
    "山川健二さんが作業します",
    "山田太郎です。足場の手すり高さは？",
    "小野太郎です。足場の手すり高さは？",
    "小野太郎です 足場の手すり高さは？",
    "小野太郎です、足場の手すり高さは？",
    "作業員の小野太郎がフォークリフトを運転します。資格は？",
    "職長の山川健二が足場を点検します",
    "担当は小野太郎です。足場の手すりは？",
    "運転者：小野太郎。資格は？",
    "小野太郎（作業員）がフォークリフトを運転します",
    "私は妊娠しています。高所作業の制限は？",
    "妊娠中です。高所作業はできますか？",
    "持病があります。高所作業は？",
    "小野太郎が作業します。フルハーネスは必要？",
    "山川健二は運転を担当します。資格は？",
    "作業員Aは妊娠中です。高所作業はできますか？",
    "同僚は妊娠中です。配置制限は？",
    "小野太郎がフォークリフトを運転します。資格は？",
    "山川健二の資格は何ですか？",
    "小野太郎、足場作業を担当します",
    "妊娠しています。高所作業はできますか？",
    "腰痛があります。重量物を扱えますか？",
    "睡眠薬を飲んでいます。運転できますか？",
    "同僚はアレルギーがあります。薬品作業は？",
    "小野太郎にフルハーネスを支給します。",
    "小野太郎をフォークリフト担当にします。資格は？",
    "山川健二へ技能講習の案内を出します",
    "小野太郎と山川健二が作業します",
    "妊娠してます。高所作業はできますか？",
    "薬を飲んでます。運転できますか？",
    "アレルギー持ちです。薬品作業は？",
    "腰痛持ちです。重量物を扱えますか？",
    "薬を服用しています。運転していい？",
    "班長は小野太郎です",
    "現場代理人は小野太郎です",
    "連絡担当は小野太郎です",
    "主任:小野太郎",
    "サトウタロウがフォークリフトを運転します。資格は？",
    "私、腰が痛くて薬を飲みました。高所作業はできますか？",
    "新宿区西新宿2-8-1の現場です",
  ])("blocks either identifiers or health data on its own: %s", (message) => {
    const result = evaluateChatbotSafety(message);
    expect(result?.kind).toBe("privacy");
    expect(result?.safeUserText).not.toContain(message);
  });

  it("氏名らしくない業務名を自己紹介と誤検出しない", () => {
    expect(detectChatbotSensitiveData("林業です。安全管理者は必要？")).toEqual([]);
    expect(
      detectChatbotSensitiveData("妊娠中の作業者の規定は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("被災者が負傷した場合の報告は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("負傷者が作業に戻る条件は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("事業主が作業員に特別教育を行う義務は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("発注者が作業を指示する場合の責任は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("派遣元が担当する教育は？"),
    ).toEqual([]);
  });

  it("asks for missing work conditions instead of answering qualification necessity", () => {
    const result = evaluateChatbotSafety("フォークリフトの資格は必要？");
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain("条件が不明なまま『資格不要』とは判断できません");
  });

  it("安全管理者と衛生管理者を取り違えず、業種不足なら選任要否を保留する", () => {
    const result = evaluateChatbotSafety(
      "常時50人以上の労働者を使用する事業場における安全管理者の選任義務は？",
    );
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain("法定の業種");
    expect(result?.response).toContain("労働安全衛生規則第4条");
    expect(result?.response).toContain("安衛則第7条とは区別");
    expect(result?.response).toContain("選任要否を確定しません");
  });

  it.each([
    {
      question: "フォークリフトの車検の期限は？",
      markers: ["道路運送車両法側", "年次・月次", "期限を断定せず"],
      clarification: "公道走行の車検・年次自主検査・月次自主検査",
    },
    {
      question: "年次点検の義務はありますか？",
      markers: ["設備・機械の種類", "義務の有無や条文を一つに特定できず"],
      clarification: "対象設備・機械の名称",
    },
  ])(
    "対象を特定できない検査語を無関係条文へ着地させず実質説明後に1件だけ確認する: $question",
    ({ question, markers, clarification }) => {
      const result = evaluateChatbotSafety(question);
      expect(result?.kind).toBe("scope-hold");
      expect(result?.response).toContain("結論");
      for (const marker of markers) {
        expect(result?.response).toContain(marker);
      }
      expect(result?.response).toContain(clarification);
      expect(result?.response.match(/？|\?/g)).toHaveLength(1);
      expect(result?.response).not.toMatch(/第36条(?:第5号|5号)?|第663条の2/);
    },
  );

  it.each([
    {
      question: "休業補償給付（4日目以降の80％）の根拠条文は？",
      required: ["60%", "休業特別支給金", "20%"],
    },
    {
      question:
        "墜落制止用器具（要求性能墜落制止用器具）の点検・取替え基準の条文は？",
      required: ["第521条", "取替え時期", "推測しません"],
    },
    {
      question: "機械等の製造時の届出を必要とするものの根拠条文は？",
      required: ["第37条", "第88条", "許可と届出"],
    },
    {
      question: "等価騒音レベル85dB以上の作業場における措置義務の条文は？",
      required: ["第588条", "85dB", "確定しません"],
    },
    {
      question: "特定化学物質第1類物質を取り扱う作業の許可制の条文は？",
      required: ["第48条", "製造許可", "一律に許可制"],
    },
    {
      question: "石綿の事前調査と都道府県労働局長への報告義務の条文は？",
      required: ["第3条", "第4条の2", "所轄労働基準監督署長"],
    },
    {
      question: "つり上げ荷重5トン以上のクレーンの製造許可の条文は？",
      required: ["3トン以上", "第12条", "第3条"],
    },
  ])(
    "誤前提を条文候補の検索成功にせず回答保留する: $question",
    ({ question, required }) => {
      const result = evaluateChatbotSafety(question);
      expect(result?.kind).toBe("wrong-premise");
      for (const text of required) {
        expect(result?.response).toContain(text);
      }
    },
  );

  it.each([
    {
      question: "安全衛生委員会の設置義務は？",
      marker: "第19条",
    },
    {
      question:
        "安全委員会と衛生委員会が必要な事業場では、安全衛生委員会も必ず設置する義務がありますか？",
      marker: "それぞれに代えて",
    },
    {
      question:
        "足場の手すりの設置義務（安衛則563条）の2015年改正で追加された中さん等の規定内容は？",
      marker: "平成21年6月1日",
    },
    {
      question:
        "平成27年の改正で足場の中桟が初めて義務化された根拠を教えて。",
      marker: "誤った改正年",
    },
  ])(
    "制度の混同または誤った改正時点を一般化して保留する: $question",
    ({ question, marker }) => {
      const result = evaluateChatbotSafety(question);
      expect(result?.kind).toBe("wrong-premise");
      expect(result?.response).toContain(marker);
    },
  );

  it.each([
    {
      question:
        "高さ2m以上で作業床のない箇所でフルハーネスを使う作業に必要な特別教育の根拠は？",
      marker: "作業床を設けることが困難",
    },
    {
      question: "安全衛生教育を実施した記録の保存はどこに定められていますか？",
      marker: "特別教育",
    },
    {
      question: "玉掛け作業に必要な技能講習はクレーン則の何条？",
      marker: "つり上げ荷重1トン以上",
    },
    {
      question: "有機溶剤業務における局所排気装置の設置義務はどの規則？",
      marker: "唯一の措置とは限りません",
    },
    {
      question: "鉛業務に従事する労働者へのばく露防止措置の条文は？",
      marker: "工程ごと",
    },
    {
      question: "重大事故発生時の所轄労基署への報告義務の条文を教えて。",
      marker: "第96条",
    },
    {
      question: "粉じん作業に従事する労働者のじん肺健康診断の対象は？",
      marker: "実施時点",
    },
    {
      question: "高さが2m以上で墜落のおそれがある場合の措置義務はどこに？",
      marker: "場所と設備条件",
    },
    {
      question: "ボイラーの設置届出の対象とその根拠条文は？",
      marker: "ボイラー区分",
    },
  ])("適用条件が不足する法令質問を確定せず聞き返す: $question", ({
    question,
    marker,
  }) => {
    const result = evaluateChatbotSafety(question);
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain(marker);
  });

  it.each([
    {
      question: "危険有害業務に従事する労働者への教育義務は？",
      marker: "教育義務の種類",
    },
    {
      question:
        "危険または有害な業務を担当させる場合、労働者への講習は一律に必要ですか？",
      marker: "具体的な作業",
    },
    {
      question: "墜落制止用器具の使用義務は何条ですか？",
      marker: "作業高さ",
    },
    {
      question: "安全帯を使う必要があるのはどのような作業ですか？",
      marker: "作業床",
    },
    {
      question: "墜落制止用器具を用いなければいけない条件は？",
      marker: "囲い・手すり",
    },
    {
      question: "クレーン運転の資格は？",
      marker: "つり上げ荷重",
    },
    {
      question: "天井クレーンを操作するには、どの免許が必要ですか？",
      marker: "玉掛け資格とは分けて",
    },
    {
      question: "局所排気装置の性能要件は？",
      marker: "対象物質",
    },
    {
      question: "局排に必要な制御風速の基準を教えて。",
      marker: "適用規則",
    },
    {
      question: "電離放射線の被ばく線量限度は？",
      marker: "一つの数値ではありません",
    },
    {
      question: "放射線被ばくは何mSvまで許されますか？",
      marker: "対象者",
    },
    {
      question: "圧力容器の定期検査は？",
      marker: "第一種圧力容器",
    },
    {
      question: "圧力容器の検査は何年ごとに行いますか？",
      marker: "検査の種類",
    },
    {
      question: "重大災害発生時の報告先は？",
      marker: "事故種別",
    },
    {
      question: "重大事故はどこへ報告する義務がありますか？",
      marker: "第97条",
    },
    {
      question: "重大災害はどこに届ければよいですか？",
      marker: "被災者の有無",
    },
    {
      question: "労働安全衛生法違反の罰則は？",
      marker: "一律ではありません",
    },
    {
      question: "安衛法に違反すると懲役や罰金はいくらですか？",
      marker: "違反条文",
    },
    {
      question: "移動式クレーンの運転資格の根拠は何ですか？",
      marker: "機械の種類",
    },
    {
      question: "移動式クレーンを操作するにはどの免許が要りますか？",
      marker: "資格区分",
    },
  ])("不足条件を補わず法的結論を保留する: $question", ({
    question,
    marker,
  }) => {
    const result = evaluateChatbotSafety(question);
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain(marker);
  });

  it.each([
    "労働者のメンタルヘルスケアの基本方針はどの指針？",
    "WBGT（暑さ指数）に基づく熱中症予防対策はどの通達？",
    "屋外作業における熱中症予防の主な指針はどこにありますか？",
    "騒音作業従事者の聴力検査の根拠は？",
    "振動工具取扱い作業者の健康管理に関する指針は？",
    "粉じん作業を行う作業場の局所排気装置の性能要件はどこに？",
    "業務上の負傷による療養補償給付の請求はどの条文？",
  ])("未収録の通達・指針を無関係な法令で代用しない: %s", (question) => {
    const result = evaluateChatbotSafety(question);
    expect(result?.kind).toBe("source-gap");
    expect(result?.response).toContain("回答を保留");
    expect(result?.response).toContain("公式資料");
  });

  it("対象未特定の通達質問は資料不足で遮断せず一問確認へ渡す", () => {
    expect(evaluateChatbotSafety("この通達が根拠になりますか？")?.kind).not.toBe(
      "source-gap",
    );
  });

  it.each([
    "どの通達？",
    "指針は？",
    "ガイドラインは？",
  ])("文脈へ結合できる資料種別だけの追質問をsource-gapで先取りしない: %s", (question) => {
    expect(evaluateChatbotSafety(question)?.kind).not.toBe("source-gap");
  });

  it.each([
    "電気作業の資格はどの通達？",
    "電気作業の資格は？ 指針は？",
    "フォークリフトの資格はどの通達？",
    "フォークリフトの資格は？ 指針は？",
    "足場の手すり高さはどの通達？",
    "足場の手すり高さは？ 指針は？",
    "酸欠作業の監視人は必要？ どの通達？",
    "酸欠作業の監視人は必要？ 指針は？",
    "有機溶剤を屋内で使う。どの通達？",
    "有機溶剤を屋内で使う。指針は？",
    "玉掛けは何トンから？ どの通達？",
    "玉掛けは何トンから？ 指針は？",
  ])("対象6分野の複合資料質問を回答生成へ渡す: %s", (question) => {
    expect(evaluateChatbotSafety(question)?.kind).not.toBe("source-gap");
  });

  it.each([
    "最新の通達は？",
    "昨日出た未確認の通達は？",
    "酸欠作業の最新の通達は？",
    "電気作業について昨日出た未確認の指針は？",
    "酸欠作業の「監視人に関する指針」は？",
    "屋外作業における熱中症予防の主な指針はどこにありますか？",
    "振動工具取扱い作業者の健康管理に関するガイドラインは？",
  ])("具体的・最新・未確認資料の要求は引き続きsource-gapで保留する: %s", (question) => {
    expect(evaluateChatbotSafety(question)?.kind).toBe("source-gap");
  });

  it("未確認の新着通達を確定根拠にする要求は保留する", () => {
    expect(
      evaluateChatbotSafety("昨日出た未確認の厚労省通達を確定根拠にして")
        ?.kind,
    ).toBe("source-gap");
  });

  it.each([
    "重量物取扱いの腰痛予防は？",
    "重い荷物を手で運ぶ際の腰痛対策を教えて。",
    "高気圧作業の作業主任者は？",
    "圧気工法で選任する作業主任者の資格根拠は？",
    "高圧室内作業の作業主任者を選ぶ根拠規則は？",
    "最低賃金の決定方式は？",
    "最低賃金はどう決まりますか？",
    "地域別最低賃金はどのように定めますか？",
    "労働契約成立の原則は？",
    "雇用契約が合意で成立する根拠を教えて。",
    "解雇権濫用法理は？",
    "合理性のない解雇は無効になりますか？",
    "有期労働契約の無期転換は？",
    "契約社員はいつ無期契約へ転換できますか？",
    "民法の契約解除について教えて",
    "刑法の正当防衛について教えて",
    "会社法の取締役会について教えて",
  ])("承認済みコーパス外の一次資料を他法令で代用しない: %s", (question) => {
    const result = evaluateChatbotSafety(question);
    expect(result?.kind).toBe("source-gap");
    expect(result?.response).toContain("別の法令で代用せず回答を保留");
    expect(result?.response).toContain("e-Gov法令検索");
    expect(result?.response).not.toMatch(/RAG|hash|corpus|コーパス/i);
  });

  it.each([
    {
      question:
        "作業員が倒れて反応がない。労働安全衛生法違反の罰則も教えて。",
      kind: "emergency",
    },
    {
      question:
        "担当者は小野太郎です。安全衛生委員会の設置義務を教えて。",
      kind: "privacy",
    },
  ] as const)(
    "新しい意味的ガードより緊急・PII遮断を優先する: $question",
    ({ question, kind }) => {
      expect(evaluateChatbotSafety(question)?.kind).toBe(kind);
    },
  );

  it.each([
    "安全委員会の設置義務は何条ですか？",
    "衛生委員会の設置要件を教えて。",
    "安全衛生委員会は安衛法第19条の代替制度ですか？",
    "平成21年施行の足場の中さん等に関する改正内容は？",
    "つり上げ荷重5トン以上のクレーン運転資格の根拠は？",
    "有機溶剤業務の局所排気装置に必要な制御風速は？",
    "放射線業務従事者の5年間の実効線量限度は？",
    "第一種圧力容器の性能検査の有効期間は？",
    "安衛法第119条に定める罰則は？",
    "有期労働契約の作業員に対する雇入れ時教育は？",
  ])("必要条件がある質問や別概念を過剰保留しない: %s", (question) => {
    const result = evaluateChatbotSafety(question);
    expect(result?.kind).not.toBe("wrong-premise");
    expect(result?.kind).not.toBe("ambiguous");
    expect(result?.kind).not.toBe("source-gap");
  });

  it("安全管理者の個別適用は業種不足のため保留を維持する", () => {
    const result = evaluateChatbotSafety(
      "安全管理者は何人以上の事業場で選任が必要ですか？",
    );
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain("業種");
    expect(result?.response).toContain("選任要否を確定しません");
  });

  it.each([
    "職長教育は何条で誰が対象ですか？",
    "フルハーネス特別教育の根拠条文は？",
    "特別教育を要する業務は何条に列挙されていますか？",
    "玉掛け技能講習の根拠条文は？",
    "玉掛け作業の特別教育・技能講習は？",
    "玉掛けの資格（技能講習）は何条に規定されていますか？",
    "可燃性ガスと酸素を使って金属を溶接・溶断するガス溶接の資格（技能講習）の根拠条文は？",
    "特別教育とは？",
    "ガス溶接技能講習はどの条文に規定されていますか？",
    "玉掛けの特別教育と技能講習の区分を一覧で教えて。",
  ])("根拠・定義・一般的な制度比較は過剰保留しない: %s", (question) => {
    expect(evaluateChatbotSafety(question)).toBeNull();
  });

  it.each([
    "荷重が分からない玉掛け作業ですが、技能講習は必要ですか？",
    "玉掛けは特別教育と技能講習のどちらを受けるべきですか？",
    "この作業の玉掛け担当者は技能講習を受けるべきですか？",
    "玉掛けの資格は必要ですか？",
    "作業内容は玉掛けで、担当は合図者です。資格は必要？",
    "ガス溶接の技能講習を受ける必要がありますか？",
    "特別教育を要する作業か判定してください。",
  ])("個別の資格・教育要否は条件不足なら保留する: %s", (question) => {
    expect(evaluateChatbotSafety(question)?.kind).toBe("ambiguous");
  });

  it("役職を含む制度名を氏名扱いせず、実名は引き続き遮断する", () => {
    expect(detectChatbotSensitiveData("職長教育の対象者は？")).toEqual([]);
    expect(detectChatbotSensitiveData("作業主任者の職務は？")).toEqual([]);
    expect(detectChatbotSensitiveData("安全衛生責任者教育とは？")).toEqual([]);
    expect(evaluateChatbotSafety("職長は小野太郎です")?.kind).toBe(
      "privacy",
    );
  });

  it("速度設定と作業指揮者を含む複合法令質問を氏名扱いしない", () => {
    const legalQuestion =
      "フォークリフトの資格、速度設定、作業指揮者を教えて";
    expect(detectChatbotSensitiveData(legalQuestion)).toEqual([]);
    expect(evaluateChatbotSafety(legalQuestion)?.kind).not.toBe("privacy");
    expect(
      detectChatbotSensitiveData(
        "速度設定の担当者は山田太郎です。フォークリフトを運転します",
      ),
    ).toContain("name");
    expect(
      detectChatbotSensitiveData(
        "作業指揮者は小野太郎です。フォークリフトの速度も教えて",
      ),
    ).toContain("name");
    expect(
      detectChatbotSensitiveData(
        "作業指揮者：小野太郎です。フォークリフトの速度も教えて",
      ),
    ).toContain("name");
  });

  it.each([
    "感電防止措置は？",
    "高所からの墜落防止について教えて",
    "薬品が目に入った場合の教育内容は？",
    "火災発生時の避難計画を作りたい",
    "酸欠危険作業の特別教育は必要？",
    "熱中症対策の朝礼資料を作りたい",
    "足場の点検方法を確認したい",
  ])("does not block a non-incident general safety question: %s", (message) => {
    expect(evaluateChatbotSafety(message)?.kind).not.toBe("emergency");
  });

  it("does not claim generic health or anonymized terms are actual personal values", () => {
    expect(evaluateChatbotSafety("定期健康診断の実施頻度は？")).toBeNull();
    expect(evaluateChatbotSafety("作業者Aは持病ありとして計画します")).toBeNull();
    expect(detectChatbotSensitiveData("担当者は未定です")).toEqual([]);
    expect(detectChatbotSensitiveData("責任者は匿名です")).toEqual([]);
    expect(detectChatbotSensitiveData("作業員Aが作業します")).toEqual([]);
  });

  it("履歴中の明示実名も外部AI送信前に遮断する", () => {
    const result = inspectChatbotHistory([
      { role: "user", content: "足場の点検方法は？" },
      { role: "assistant", content: "条件を教えてください" },
      { role: "user", content: "担当者は小野太郎です" },
    ]);
    expect(result.safe).toBe(false);
    expect(result.kinds).toContain("privacy");
    expect(result.blockedIndexes).toEqual([2]);
  });

  it("誤前提や資料不足の過去ターンだけでは、修正後の会話を遮断しない", () => {
    const result = inspectChatbotHistory([
      {
        role: "user",
        content: "休業補償給付（4日目以降の80％）の根拠条文は？",
      },
      {
        role: "assistant",
        content: "60%の給付本体と20%の特別支給金を分けて確認してください。",
      },
    ]);
    expect(result.safe).toBe(true);
    expect(result.blockedIndexes).toEqual([]);
  });
});
