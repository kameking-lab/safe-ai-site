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

  it("教材prefix 6 × 区切り6 × 実申告6の216組をすべてprivacy遮断する", () => {
    const examplePrefixes = [
      "研修用の例文です。「HIV陽性です」",
      "例文は「HIV陽性です」です",
      "サンプル文は「HIV陽性です」",
      "訓練文は「HIV陽性です」です",
      "教材文は「HIV陽性です」",
      "ケース例：「HIV陽性です」",
    ];
    const separators = ["。", "、", "；", "\n", "：", "  "];
    const actualDisclosures = [
      "実際には本人がHIV陽性です。",
      "実際の本人はB型肝炎に感染しています。",
      "現実には本人のHIV検査結果が陽性でした。",
      "実際に同僚からHIV陽性と報告がありました。",
      "ところが本人の検査結果はHIV陽性でした。",
      "現場では同僚が「私はHIV陽性です」と話しました。",
    ];

    for (const prefix of examplePrefixes) {
      expect(detectChatbotSensitiveData(`${prefix}。`)).not.toContain("health");
      for (const separator of separators) {
        for (const disclosure of actualDisclosures) {
          const message = `${prefix}${separator}${disclosure}`;
          expect(detectChatbotSensitiveData(message), message).toContain(
            "health",
          );
          expect(evaluateChatbotSafety(message), message).toMatchObject({
            kind: "privacy",
          });
        }
      }
    }
  });

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
    "作業員がクレーンに挟まれています。助けてください。",
    "頭を強く打って何度も吐いています。",
    "頭から大量に出血しています。",
    "頭を強く打って何度も吐いています。この場合の対応を教えてください。",
    "「作業員がクレーンに挟まれています。助けてください。」という訓練用の例文です。今、実際に同じ事故が起きました。",
    "頭を強く打って何度も吐いています、という訓練用の想定です。でも今、現場で本当に起きています。",
    "作業員がクレーンに挟まれています。訓練ではありません。",
    "頭を強く打って何度も吐いています。訓練ではありません。",
    "頭から大量に出血しています。訓練ではありません。",
    "頭を強く打って何度も吐いています、という訓練用の想定です。しかし同じ事故が起きました。",
    "「作業員がクレーンに挟まれています」という訓練例文です。ところが同じことが発生しました。",
    "「作業員がクレーンに挟まれています」という訓練例文です。これは現実の事故です。",
    "頭を強打して何度も嘔吐しています。",
    "頭を打った後、繰り返し吐いています。",
    "頭を強く打ち、何度も嘔吐しています。",
    "頭を強くぶつけて何度も吐いています。",
    "頭を強く打って、二度吐きました。",
    "頭を強く打ち、嘔吐があります",
    "頭部を強く打って嘔吐を繰り返しています",
    "クレーンで作業員が挟まれています。",
    "作業員がクレーンと壁の間に挟まれています。",
    "クレーンと壁の間に作業員が挟まっています",
    "作業員が吊り荷と壁の間に挟まれています。",
    "頭を強打して何度も嘔吐しています、という訓練用の想定です。実際に同じ事故が発生しました。",
    "頭を打った後に二度吐きました、という訓練用の想定です。その後、同じ事故が起きました。",
    "「クレーンで作業員が挟まれています」という訓練例文です。実際に同じことが発生しました。",
    "「頭を強く打って二度吐きました」という例文でしたが、本当に発生しました。",
    "「作業員が吊り荷と壁の間に挟まれています」という訓練例文です。同じ状況になりました。",
    "「作業員がクレーンと壁の間に挟まれています」という訓練例文です。さっき同じ状況になりました。",
    "クレーンで作業員が挟まれた想定の訓練です。その後、同じ事故が起きました。",
    "作業員がクレーンと壁の間に挟まれた想定です。さっき同じ状況になりました。",
    "頭を強打して二度吐いた。この場合の対応を教えてください。",
    "作業員がクレーンと壁の間に挟まれた。この場合の救助手順を教えてください。",
    "今、作業員が倒れて反応がありません。別件で「頭を打ったら119」という訓練用の例文です。",
    "作業員がクレーンに挟まれています。別件の訓練例文は「けが人を動かさない」です。",
    "頭を強く打って何度も吐いています。なお研修資料の例文も作りたいです。",
    "今、作業員がクレーンに挟まれています、別件の訓練例文は「けが人を動かさない」です。",
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
    "今、作業員が倒れて反応がありません、別件で「頭を打ったら119」という訓練用の例文です。",
    "「意識がありません」という訓練用の例文です。今、作業員が倒れて反応がありません。",
  ])(
    "PF-001: a real emergency remains active before or after a training example: %s",
    (message) => {
      expect(evaluateChatbotSafety(message)).toMatchObject({
        kind: "emergency",
        safeUserText: "[緊急事象の相談を検知]",
      });
    },
  );

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
    "作業員がクレーンに挟まれているわけではありません",
    "頭を強く打って何度も吐いているわけではありません",
    "頭から大量に出血しているわけではありません",
    "「作業員がクレーンに挟まれています。助けてください。」という訓練用の例文です",
    "「頭を強く打って何度も吐いています」という訓練例文を作りたい",
    "「頭から大量に出血しています」という救護訓練の例文です",
    "「頭を強く打って何度も吐いています」という、実際の事故ではなく架空の訓練例文です",
    "「頭を強打して何度も嘔吐しています」という訓練例文です",
    "頭を打った後に二度吐いた場合の対応を教えて",
    "頭を強くぶつけて嘔吐したわけではありません",
    "頭を強く打ちましたが嘔吐はありません",
    "頭部を強く打って嘔吐を繰り返しているわけではありません",
    "クレーンで作業員が挟まれているわけではありません",
    "クレーンと壁の間に作業員が挟まっているわけではありません",
    "作業員がクレーンと壁の間に挟まれた場合の救助手順を教えて",
    "吊り荷と壁の間に挟まれた人はいません",
    "クレーンで作業員が挟まれた場合の訓練です。",
    "頭を強打して何度も嘔吐した場合の救護訓練です。",
    "クレーンで作業員が挟まれた想定の訓練です。",
    "作業員がクレーンと壁の間に挟まれた想定です。",
    "頭を強打して二度吐いた仮定です。",
    "吊り荷と壁の間に挟まれた想定をした訓練です。",
    "「作業員がクレーンと壁の間に挟まれています」という訓練例文です。今後同じ状況が起きた場合の対応を検討します。",
  ])(
    "PF-001: explicitly negated emergency statement is not treated as active: %s",
    (message) => {
      expect(evaluateChatbotSafety(message)?.kind).not.toBe("emergency");
    },
  );

  it.each([
    "作業員が倒れて反応がない事故は発生していません。",
    "作業員が倒れて反応がありません、という救護訓練のシナリオです。",
  ])(
    "PF-001: an explicit no-incident or rescue-training scenario is not active: %s",
    (message) => {
      expect(evaluateChatbotSafety(message)?.kind).not.toBe("emergency");
    },
  );

  it.each([
    "大量に血が出ている",
    "血が止まらない",
    "出血がひどい",
    "頭から大量に出血しています。",
  ])(
    "PF-002: severe bleeding returns direct-pressure guidance: %s",
    (message) => {
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
    },
  );

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
    "HIV陽性です",
    "HIV陽性",
    "私はC型肝炎です",
    "私はB型肝炎",
    "本人はB型肝炎と診断されました",
    "健康診断でHBV陽性でした",
    "私はHCV抗体陽性です",
    "HCV陽性",
    "私はHIV陽性だ",
    "HIV陽性だった",
    "HIV陽性になりました",
    "私はエイズです",
    "C型肝炎になりました",
    "B型肝炎に感染した",
    "HBV陽性だった",
    "私はHIVにかかっています",
    "私はHIVに罹患しています",
    "HIV感染者です",
    "B型肝炎にかかりました",
    "C型肝炎の患者です",
    "私はB型肝炎のキャリアです",
    "HIV陽性でしたが就業できますか",
    "HIVにかかっていると診断されました",
    "B型肝炎のキャリアだと診断されました",
    "私は「HIV感染者です」と診断されました",
    "HCV陽性でしたけど作業できますか",
    "本人はC型肝炎の患者だと診断されています",
    "私はHIV陽性です。HIVという訓練用の例文です。",
    "HIVという訓練用の例文です。私はHIV陽性です。",
    "私はHIV陽性です、HIVという訓練用の例文です。",
    "私はHIV陽性です;HIVという訓練用の例文です。",
    "私はHIV陽性ですけど、HIVという訓練用の例文です。",
  ])("blocks either identifiers or health data on its own: %s", (message) => {
    const result = evaluateChatbotSafety(message);
    expect(result?.kind).toBe("privacy");
    expect(result?.safeUserText).not.toContain(message);
  });

  it.each([
    "健康診断でHIV陽性と分かりました",
    "検査でHIV陽性とわかりました",
    "HIV陽性と判明しました",
    "HIV陽性が分かりました",
    "私はHIV陽性だったと分かりました",
    "本人がHCV陽性と判明しました",
    "HIV陽性だとわかりました",
    "HIV陽性であることが判明しました",
    "HIVの検査結果が陽性でした",
    "検査結果はHIV陽性でした",
    "医師からHIV陽性と言われました",
    "医師にHIV陽性と告げられました",
    "B型肝炎だと分かりました",
    "B型肝炎に感染していることが分かりました",
    "HCV陽性との結果でした",
    "HCV陽性という結果でした",
    "本人は「HIV陽性です」と話しました。",
    "同僚が「私はHIV陽性です」と話しました。",
    "私は「HIV陽性です」と話しました。",
    "「私はHIV陽性です」と申告しました。",
    "同僚が「HIV陽性です」と言いました。",
    "本人から「HIV陽性です」と申告がありました。",
    "私はHIV陽性です\n別件はHIVという訓練用の例文です。",
    "研修用の例文です。「HIV陽性です」\n実際には田中さんがHIV陽性です。",
    "研修用の例文です。「HIV陽性です」、実際には田中さんがHIV陽性です。",
    "例文：「HIV陽性です」。なお本人の診断はHIV陽性です。",
    "例文は「HIV陽性です」；実際の検査結果はHIV陽性でした。",
    "サンプル文は「HIV陽性です」。本人からHIV陽性との申告がありました。",
    "訓練文は「HIV陽性です」です。しかし実際には本人がHIV陽性です。",
    "マニュアル例は「HIV陽性です」。実際の本人はB型肝炎に感染しています。",
    "教材文は「HIV陽性です」；現実には本人のHIV検査結果が陽性でした。",
    "ケース例：「HIV陽性です」。実際に同僚からHIV陽性と報告がありました。",
    "本人からHIV陽性と報告がありました。",
    "同僚からHBV陽性と報告がありました。",
    "同僚からHCV陽性と報告がありました。",
    "例文は「HIV陽性です」です。同僚からHCV陽性と報告がありました。",
    "ところが本人の検査結果はHIV陽性でした。",
    "現場では同僚が「私はHIV陽性です」と話しました。",
    "教材文は「HIV陽性です」。ところが本人の検査結果はHIV陽性でした。",
    "研修用の例文です。「HIV陽性です」：実際には本人がHIV陽性です。",
  ])(
    "blocks an actual infection result, discovery, report, or mixed-line disclosure: %s",
    (message) => {
      expect(detectChatbotSensitiveData(message)).toContain("health");
      expect(evaluateChatbotSafety(message)).toMatchObject({ kind: "privacy" });
    },
  );

  it.each([
    "「HIV陽性だと分かりました」という訓練用の例文です",
    "HIV陽性だと分かった場合の対応を教えて",
    "HIV陽性者は就業できますか",
    "私はHIV陽性です、という研修用の例文です。",
    "私はHIV陽性です、というマニュアル用の例文です。",
    "私はHIV陽性です、という演習用の例文です。",
    "私はHIV陽性です、というサンプル文です。",
    "私はHIV陽性です、というケーススタディです。",
    "例文は「HIV陽性です」。",
    "サンプル文は「HIV陽性です」。",
    "訓練文は「HIV陽性です」。",
    "マニュアル例は「HIV陽性です」。",
    "教材文は「HIV陽性です」。",
    "ケース例：「HIV陽性です」。",
  ])(
    "does not treat a hypothetical or clearly labelled infection example as personal health data: %s",
    (message) => {
      expect(detectChatbotSensitiveData(message)).not.toContain("health");
      expect(evaluateChatbotSafety(message)?.kind).not.toBe("privacy");
    },
  );

  it.each([
    "今、作業員が倒れて反応がありません\n別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\u2028別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\u2029別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\t別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません：別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません／別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません・別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません｜別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません  別件で「頭を打ったら119」という訓練用の例文です。",
    "「意識がありません」という訓練用の例文です、今、作業員が倒れて反応がありません。",
    "「意識がありません」という訓練用の例文です；今、作業員が倒れて反応がありません。",
    "「意識がありません」という訓練用の例文です\n今、作業員が倒れて反応がありません。",
  ])("訓練例文と軟区切りで併記された実事故を緊急判定する: %s", (message) => {
    expect(evaluateChatbotSafety(message)).toMatchObject({ kind: "emergency" });
  });

  it("実事故から別件の訓練例文へ移る14種の区切りをすべて緊急遮断する", () => {
    for (const separator of [
      "。",
      "、",
      ",",
      "；",
      ";",
      "\n",
      "\u2028",
      "\u2029",
      "\t",
      "：",
      "／",
      "・",
      "｜",
      "  ",
    ]) {
      const message = `今、作業員が倒れて反応がありません${separator}別件で「頭を打ったら119」という訓練用の例文です。`;
      expect(evaluateChatbotSafety(message), message).toMatchObject({
        kind: "emergency",
      });
    }
  });

  it.each([
    "作業員が倒れて反応がない事故は起きていません。",
    "作業員が倒れて反応がない事故はありません。",
    "作業員が倒れて反応がない事故は起こりませんでした。",
    "作業員が倒れて反応がない事故は確認されていません。",
    "作業員が倒れて反応がありません、という模擬訓練です。",
    "作業員が倒れて反応がありません、という演習用シナリオです。",
    "作業員が倒れて反応がありません、というケーススタディです。",
    "作業員が倒れて反応がありません、という机上演習です。",
    "作業員が倒れて反応がありません、という練習問題です。",
    "作業員が倒れて反応がありません、というデモンストレーションです。",
    "作業員が倒れて反応がありません、というドリルです。",
    "作業員がクレーンに挟まれた想定の机上演習です。",
    "作業員が倒れた場合の練習問題です。",
    "作業員が倒れた想定のドリルです。",
    "作業員がクレーンに挟まれた想定で訓練します。",
    "もし作業員がクレーンに挟まれた場合はどうする？",
    "作業員が意識不明になった事故は発生していません。",
    "作業員が倒れた場合の救護手順を教えて。",
  ])("明示された非発生・模擬訓練を緊急と誤判定しない: %s", (message) => {
    expect(evaluateChatbotSafety(message)?.kind).not.toBe("emergency");
  });

  it("氏名らしくない業務名を自己紹介と誤検出しない", () => {
    expect(detectChatbotSensitiveData("林業です。安全管理者は必要？")).toEqual(
      [],
    );
    expect(detectChatbotSensitiveData("妊娠中の作業者の規定は？")).toEqual([]);
    expect(
      detectChatbotSensitiveData("被災者が負傷した場合の報告は？"),
    ).toEqual([]);
    expect(detectChatbotSensitiveData("負傷者が作業に戻る条件は？")).toEqual(
      [],
    );
    expect(
      detectChatbotSensitiveData("事業主が作業員に特別教育を行う義務は？"),
    ).toEqual([]);
    expect(
      detectChatbotSensitiveData("発注者が作業を指示する場合の責任は？"),
    ).toEqual([]);
    expect(detectChatbotSensitiveData("派遣元が担当する教育は？")).toEqual([]);
  });

  it("asks for missing work conditions instead of answering qualification necessity", () => {
    const result = evaluateChatbotSafety("フォークリフトの資格は必要？");
    expect(result?.kind).toBe("ambiguous");
    expect(result?.response).toContain(
      "条件が不明なまま『資格不要』とは判断できません",
    );
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
      question: "平成27年の改正で足場の中桟が初めて義務化された根拠を教えて。",
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
  ])(
    "適用条件が不足する法令質問を確定せず聞き返す: $question",
    ({ question, marker }) => {
      const result = evaluateChatbotSafety(question);
      expect(result?.kind).toBe("ambiguous");
      expect(result?.response).toContain(marker);
    },
  );

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
  ])(
    "不足条件を補わず法的結論を保留する: $question",
    ({ question, marker }) => {
      const result = evaluateChatbotSafety(question);
      expect(result?.kind).toBe("ambiguous");
      expect(result?.response).toContain(marker);
    },
  );

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
    expect(
      evaluateChatbotSafety("この通達が根拠になりますか？")?.kind,
    ).not.toBe("source-gap");
  });

  it.each(["どの通達？", "指針は？", "ガイドラインは？"])(
    "文脈へ結合できる資料種別だけの追質問をsource-gapで先取りしない: %s",
    (question) => {
      expect(evaluateChatbotSafety(question)?.kind).not.toBe("source-gap");
    },
  );

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
  ])(
    "具体的・最新・未確認資料の要求は引き続きsource-gapで保留する: %s",
    (question) => {
      expect(evaluateChatbotSafety(question)?.kind).toBe("source-gap");
    },
  );

  it("未確認の新着通達を確定根拠にする要求は保留する", () => {
    expect(
      evaluateChatbotSafety("昨日出た未確認の厚労省通達を確定根拠にして")?.kind,
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
      question: "作業員が倒れて反応がない。労働安全衛生法違反の罰則も教えて。",
      kind: "emergency",
    },
    {
      question: "担当者は小野太郎です。安全衛生委員会の設置義務を教えて。",
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
    expect(evaluateChatbotSafety("職長は小野太郎です")?.kind).toBe("privacy");
  });

  it("速度設定と作業指揮者を含む複合法令質問を氏名扱いしない", () => {
    const legalQuestion = "フォークリフトの資格、速度設定、作業指揮者を教えて";
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
    expect(
      evaluateChatbotSafety("作業者Aは持病ありとして計画します"),
    ).toBeNull();
    expect(detectChatbotSensitiveData("担当者は未定です")).toEqual([]);
    expect(detectChatbotSensitiveData("責任者は匿名です")).toEqual([]);
    expect(detectChatbotSensitiveData("作業員Aが作業します")).toEqual([]);
  });

  it.each([
    "HIV陽性者の就業上の配慮に関する法令は？",
    "HIV陽性とは何ですか？",
    "HIV陽性だった場合の就業上の配慮は？",
    "HIV検査を事業者が求めることはできますか？",
    "B型肝炎・C型肝炎の一般的な感染対策は？",
    "C型肝炎になった場合の届出義務は？",
    "エイズに関する一般的な法令は？",
    "HBV/HCVの感染対策に関する法令は？",
    "C型肝炎と労災認定の一般的な関係は？",
    "私はHIV陽性ではありません",
    "本人はC型肝炎ではありません",
    "「私はHBV陽性です」という訓練用の例文です",
    "HIVにかかった場合の就業上の法令は？",
    "HIV罹患者への就業上の配慮は？",
    "HIV感染者に対する法的な配慮は？",
    "B型肝炎にかかった労働者の配置基準は？",
    "C型肝炎の患者に関する一般的な法令は？",
    "B型肝炎キャリアの就業制限は法令で定められていますか？",
    "私はHIVにかかっていません",
    "私はHIVに罹患していません",
    "HIV感染者ではありません",
    "B型肝炎にかかっていません",
    "C型肝炎の患者ではありません",
    "私はB型肝炎のキャリアではありません",
    "HIV陽性でしたが、という架空の設定です",
    "「HIVにかかっていると診断されました」という訓練用の例文です",
    "「B型肝炎のキャリアだと診断されました」という教材用の文です",
    "「私はHIVにかかっています」という訓練用の例文です",
    "「HIV感染者です」という教材用の例文です",
    "「C型肝炎の患者です」という架空の設定です",
    "「私はB型肝炎のキャリアです」という想定文です",
    "私はHIVにかかっています、という訓練用の例文です",
    "HIV感染者です、という教材用の文です",
    "C型肝炎の患者です、という架空の設定です",
    "私はB型肝炎のキャリアです、という想定です",
    "私はエイズです、という架空の設定です",
  ])(
    "does not treat a general infection-law question as personal health data: %s",
    (message) => {
      expect(detectChatbotSensitiveData(message)).toEqual([]);
      expect(evaluateChatbotSafety(message)?.kind).not.toBe("privacy");
    },
  );

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
