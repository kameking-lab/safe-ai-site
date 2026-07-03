/**
 * チャットボット生成品質evalのゴールデンセット（診断04の実機23問を固定化）。
 *
 * 既存のRAG eval（rag-100q系）は「検索がgold条文を引けたか」しか測れず、
 * 実機で起きた失敗（引けても結論が誤る・答えるべき質問に答えない・正答なのに
 * 偽の範囲外警告で信頼を毀損する）を検出できない（診断04 §5.3 T7）。
 * 本fixtureは「質問→最終回答」の品質を機械採点するための正解定義を持つ。
 *
 * 出典の錨（anti-circularity / F2と同じ思想）:
 * 各ケースの正解（結論キーフレーズ・gold条文）は e-Gov 法令検索の正本を根拠とし、
 * corpusEvidence.anchor に法令番号＋条＋正本上の事実を明記する。コーパス
 * （web/src/data/laws/）はこの正解定義と突合される側であり、正解の出所ではない。
 * コーパス側の要約がこの事実を失う編集（例: 派遣法45条から「派遣元」が消える）は
 * chatbot-genquality.test.ts のコーパス突合ゲートでCIが落ちる。
 *
 * 質問文は診断04 §2.1 の23問（本番実機プローブ）を自然文へ復元したもの。
 * 採点基準（○/△/×）との対応は chatbot-genquality-scorer.ts を参照。
 */

export type GenQualityCategory = "in-scope" | "out-of-scope" | "boundary";

export type GoldCitation = {
  lawShort: string;
  articleNum: string;
};

export type CorpusEvidence = {
  /** コーパス照合対象（lawShort は rag/synonyms の等価判定を許容） */
  lawShort: string;
  articleNum: string;
  /** 条文テキストに全て含まれるべき事実断片（1つでも消えたらCIが落ちる） */
  mustContain: string[];
  /** e-Gov正本上の根拠（法令番号・条・事実）。goldの出所はコーパスではなくここ */
  anchor: string;
};

export type GenQualityCase = {
  /** GQ01〜GQ23（診断04 §2.1 の Q1〜Q23 に対応） */
  id: string;
  category: GenQualityCategory;
  /** 診断04時点の実機判定（○/△/×）。ベースライン比較用の記録 */
  diagVerdict: "○" | "△" | "×" | "○-";
  question: string;
  /**
   * 結論キーフレーズ。外側=AND（全グループ充足で完全正答）、内側=OR（表記ゆれ）。
   * 全滅=結論不正（×）、一部充足=部分正答（△）に対応する。
   */
  mustInclude: string[][];
  /** 誤結論パターン（RegExpソース）。1つでもマッチしたら誤答（×） */
  mustExclude?: string[];
  /** 回答が引用すべきgold条文（いずれか1つの引用で citation pass） */
  goldCitations: GoldCitation[];
  /** コーパス正本突合ゲート（CIで常時検証） */
  corpusEvidence?: CorpusEvidence[];
  /** 範囲外質問: 条文引用なし・断定なし・公式誘導のno-hit対応を正とする */
  expectOutOfScope?: boolean;
  /** RAG検索(top10)のホワイトリストにgoldが入ることをCIで要求 */
  expectRetrievable: boolean;
  /** fallback tier が direct であることをCIで要求（診断04で誤adjacentだった問の回帰） */
  expectDirectTier?: boolean;
  notes?: string;
};

type RawGenQualityCase = Omit<GenQualityCase, "expectRetrievable"> & {
  expectRetrievable?: boolean;
};

const RAW_CASES: RawGenQualityCase[] = [
  {
    id: "GQ01",
    category: "in-scope",
    diagVerdict: "○",
    question: "足場の点検は誰が行う必要がありますか？",
    mustInclude: [["指名"], ["点検"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第567条" },
      { lawShort: "安衛則", articleNum: "第568条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第567条",
        mustContain: ["点検", "指名"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第567条: 足場における作業開始前等の点検。令和5年改正（令和5年厚生労働省令第22号・R5.10.1施行）で点検者の指名が義務化",
      },
    ],
  },
  {
    id: "GQ02",
    category: "in-scope",
    diagVerdict: "△",
    question: "酸欠作業に必要な資格は何ですか？",
    mustInclude: [["技能講習"], ["特別教育", "特別の教育"]],
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第11条" },
      { lawShort: "酸欠則", articleNum: "第12条" },
    ],
    corpusEvidence: [
      {
        lawShort: "酸欠則",
        articleNum: "第11条",
        mustContain: ["作業主任者", "技能講習"],
        anchor:
          "酸欠則（昭和47年労働省令第42号）第11条: 酸素欠乏危険作業主任者は酸素欠乏危険作業主任者技能講習等の修了者から選任",
      },
      {
        lawShort: "酸欠則",
        articleNum: "第12条",
        mustContain: ["特別の教育"],
        anchor:
          "酸欠則（昭和47年労働省令第42号）第12条: 酸素欠乏危険作業に就かせる労働者への特別の教育",
      },
    ],
    notes: "診断04では作業主任者=技能講習（11条）が欠落し△だった",
  },
  {
    id: "GQ03",
    category: "in-scope",
    diagVerdict: "○",
    question: "労働者1人に必要な気積の基準を教えてください。",
    mustInclude: [["10立方メートル", "10m³", "10m3", "10 m3", "１０立方メートル"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第600条" },
      { lawShort: "事務所則", articleNum: "第2条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第600条",
        mustContain: ["10立方メートル"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第600条: 屋内作業場の気積は設備・床面から4mを超える高さの空間を除き労働者1人について10立方メートル以上",
      },
      {
        lawShort: "事務所則",
        articleNum: "第2条",
        mustContain: ["10立方メートル"],
        anchor: "事務所衛生基準規則（昭和47年労働省令第43号）第2条: 気積・労働者1人について10立方メートル以上",
      },
    ],
  },
  {
    id: "GQ04",
    category: "in-scope",
    diagVerdict: "○",
    question: "フォークリフトの運転に必要な資格は何トンから変わりますか？",
    mustInclude: [["1トン", "1t", "１トン"], ["技能講習"], ["特別教育", "特別の教育"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
      { lawShort: "安衛則", articleNum: "第36条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛令",
        articleNum: "第20条",
        mustContain: ["フォークリフト", "1トン"],
        anchor:
          "安衛令（昭和47年政令第318号）第20条第11号: 最大荷重1トン以上のフォークリフトの運転業務は就業制限業務（技能講習）。1トン未満は安衛則第36条第5号の特別教育",
      },
    ],
    expectDirectTier: true,
  },
  {
    id: "GQ05",
    category: "in-scope",
    diagVerdict: "○",
    question: "熱中症対策が義務になるWBGT基準値はいくつですか？",
    mustInclude: [["28度", "28℃"], ["31度", "31℃"]],
    goldCitations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第612条の2",
        mustContain: ["28度", "31度"],
        anchor:
          "安衛則第612条の2（令和7年厚生労働省令改正・R7.6.1施行）: WBGT28度以上または気温31度以上の作業場所で連続1時間以上・1日4時間超の作業が対象",
      },
    ],
  },
  {
    id: "GQ06",
    category: "in-scope",
    diagVerdict: "×",
    question: "定期健康診断はどのくらいの頻度で実施する必要がありますか？",
    mustInclude: [["1年以内ごと", "一年以内ごと", "1年に1回", "年1回"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第44条" },
      { lawShort: "安衛則", articleNum: "第45条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第44条",
        mustContain: ["1年以内ごとに1回"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第44条第1項: 常時使用する労働者に対し1年以内ごとに1回、定期に健康診断を実施",
      },
    ],
    notes: "診断04では検索が44条を引けず「提供データ範囲外」と誤案内（×）",
  },
  {
    id: "GQ07",
    category: "in-scope",
    diagVerdict: "○",
    question: "職長教育が必要な業種はどれですか？",
    mustInclude: [["建設"], ["製造"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第60条" },
      { lawShort: "安衛令", articleNum: "第19条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛令",
        articleNum: "第19条",
        mustContain: ["建設業", "製造業"],
        anchor:
          "安衛令第19条: 職長教育（安衛法第60条）の対象業種＝建設業・製造業（一部除外）・電気業・ガス業・自動車整備業・機械修理業。令和5年改正で食料品製造業等の除外解除",
      },
    ],
    expectDirectTier: true,
    notes: "診断04では正答なのにadjacent誤ヘッダ（score0.73）が付いた。T8是正の回帰",
  },
  {
    id: "GQ08",
    category: "in-scope",
    diagVerdict: "○",
    question: "化学物質管理者の選任要件を教えてください。",
    mustInclude: [["選任"], ["講習"]],
    goldCitations: [{ lawShort: "安衛則", articleNum: "第12条の5" }],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第12条の5",
        mustContain: ["講習", "14日"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第12条の5（令和4年省令改正で新設）: リスクアセスメント対象物を製造・取扱う事業場ごとに化学物質管理者を選任（事由発生から14日以内）。製造事業場は厚生労働大臣告示の講習修了者等から選任",
      },
    ],
    notes: "診断04では正答なのに「安衛法・安衛則は提供データ範囲外」の偽警告でmedium降格。T1是正の回帰",
  },
  {
    id: "GQ09",
    category: "in-scope",
    diagVerdict: "○",
    question: "特別教育が必要な作業にはどんなものがありますか？",
    mustInclude: [
      ["特別教育", "特別の教育"],
      ["アーク溶接", "研削", "フルハーネス", "チェーンソー", "フォークリフト"],
    ],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第36条" },
      { lawShort: "安衛法", articleNum: "第59条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第36条",
        mustContain: ["アーク溶接", "フルハーネス"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第36条: 特別教育を必要とする業務の列挙（研削といし・アーク溶接・最大荷重1トン未満フォークリフト・チェーンソー・フルハーネス型墜落制止用器具等）",
      },
    ],
  },
  {
    id: "GQ10",
    category: "in-scope",
    diagVerdict: "△",
    question: "クレーン運転の資格区分（免許・技能講習・特別教育）を教えてください。",
    mustInclude: [["免許"], ["技能講習"], ["特別教育", "特別の教育"], ["5トン", "5t", "５トン"]],
    goldCitations: [
      { lawShort: "クレーン則", articleNum: "第21条" },
      { lawShort: "クレーン則", articleNum: "第22条" },
      { lawShort: "クレーン則", articleNum: "第68条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    corpusEvidence: [
      {
        lawShort: "クレーン則",
        articleNum: "第21条",
        mustContain: ["5トン未満", "特別の教育"],
        anchor:
          "クレーン則（昭和47年労働省令第34号）第21条: つり上げ荷重5トン未満のクレーン運転業務は特別の教育",
      },
      {
        lawShort: "クレーン則",
        articleNum: "第22条",
        mustContain: ["免許", "床上操作式"],
        anchor:
          "クレーン則（昭和47年労働省令第34号）第22条: つり上げ荷重5トン以上はクレーン・デリック運転士免許。床上操作式クレーンは技能講習修了者で可",
      },
    ],
    notes: "診断04では特別教育（21条・当時コーパス未収録）欠落＋プレースホルダ漏出で△。#605でコーパス追加済",
  },
  {
    id: "GQ11",
    category: "in-scope",
    diagVerdict: "○",
    question: "玉掛け作業は何トンから技能講習が必要ですか？",
    mustInclude: [["1トン", "1t", "１トン"], ["技能講習"]],
    goldCitations: [
      { lawShort: "安衛令", articleNum: "第20条" },
      { lawShort: "クレーン則", articleNum: "第221条" },
      { lawShort: "クレーン則", articleNum: "第222条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛令",
        articleNum: "第20条",
        mustContain: ["玉掛け", "1トン"],
        anchor:
          "安衛令第20条第16号: つり上げ荷重1トン以上のクレーン等の玉掛け業務は就業制限業務（技能講習）。1トン未満はクレーン則第222条の特別教育",
      },
    ],
  },
  {
    id: "GQ12",
    category: "in-scope",
    diagVerdict: "×",
    question: "ストレスチェックは何人以上の事業場で義務ですか？",
    mustInclude: [["50人"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第66条の10" },
      { lawShort: "安衛則", articleNum: "第52条の9" },
      { lawShort: "安衛則", articleNum: "第52条の21" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第52条の21",
        mustContain: ["50人", "努力義務"],
        anchor:
          "安衛法第66条の10＋附則（平成26年法律第82号）第4条: 検査実施義務・常時50人未満の事業場は当分の間努力義務。安衛則（昭和47年労働省令第32号）第52条の21: 結果報告義務＝常時50人以上",
      },
    ],
    notes: "診断04では根拠未収録で「特定できず」（×）。#639でコーパス補強済",
  },
  {
    id: "GQ13",
    category: "in-scope",
    diagVerdict: "△",
    question: "安全衛生委員会はどんな事業場で設置が必要ですか？",
    mustInclude: [["50人"], ["委員会"]],
    goldCitations: [
      { lawShort: "安衛令", articleNum: "第8条" },
      { lawShort: "安衛令", articleNum: "第9条" },
      { lawShort: "安衛法", articleNum: "第17条" },
      { lawShort: "安衛法", articleNum: "第18条" },
      { lawShort: "安衛法", articleNum: "第19条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛令",
        articleNum: "第8条",
        mustContain: ["安全委員会", "50人"],
        anchor:
          "安衛令第8条: 安全委員会を設けるべき事業場＝業種区分に応じ常時50人以上または100人以上",
      },
      {
        lawShort: "安衛令",
        articleNum: "第9条",
        mustContain: ["衛生委員会", "50人"],
        anchor: "安衛令第9条: 衛生委員会を設けるべき事業場＝全業種で常時50人以上",
      },
    ],
    notes: "診断04では安衛令8・9条未収録で規模基準に答えられず△。#601でコーパス追加済",
  },
  {
    id: "GQ14",
    category: "in-scope",
    diagVerdict: "△",
    question: "有機溶剤作業主任者はどんな作業で選任が必要ですか？",
    mustInclude: [["作業主任者"], ["技能講習"]],
    goldCitations: [
      { lawShort: "有機則", articleNum: "第19条" },
      { lawShort: "安衛令", articleNum: "第6条" },
    ],
    corpusEvidence: [
      {
        lawShort: "有機則",
        articleNum: "第19条",
        mustContain: ["作業主任者", "技能講習"],
        anchor:
          "有機則（昭和47年労働省令第36号）第19条: 令第6条第22号の作業（屋内作業場等の有機溶剤業務）ごとに有機溶剤作業主任者技能講習修了者から選任",
      },
    ],
  },
  {
    id: "GQ15",
    category: "in-scope",
    diagVerdict: "△",
    question: "高さ何メートル以上の作業で墜落制止用器具（フルハーネス）の使用が必要ですか？",
    mustInclude: [
      ["2メートル", "2m", "２メートル", "2ｍ"],
      ["墜落制止用器具", "フルハーネス", "安全帯"],
    ],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第518条" },
      { lawShort: "安衛則", articleNum: "第519条" },
      { lawShort: "安衛則", articleNum: "第520条" },
      { lawShort: "安衛則", articleNum: "第521条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第518条",
        mustContain: ["2メートル", "墜落"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第518条: 高さ2メートル以上で作業床を設けることが困難なときは墜落制止用器具の使用等の墜落防止措置",
      },
    ],
  },
  {
    id: "GQ16",
    category: "in-scope",
    diagVerdict: "○",
    question: "騒音が著しい屋内作業場（85dB超）ではどんな義務がありますか？",
    mustInclude: [["6月以内", "6か月", "6ヶ月", "六月以内"], ["測定"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第588条" },
      { lawShort: "安衛則", articleNum: "第590条" },
      { lawShort: "安衛則", articleNum: "第595条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第590条",
        mustContain: ["等価騒音レベル", "6月以内"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第590条: 著しい騒音を発する屋内作業場（第588条）は6月以内ごとに1回等価騒音レベルを測定し記録を3年間保存",
      },
    ],
  },
  {
    id: "GQ17",
    category: "in-scope",
    diagVerdict: "○",
    question: "雇入れ時の安全衛生教育ではどんな内容を教える必要がありますか？",
    mustInclude: [["作業手順"], ["点検"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第59条" },
      { lawShort: "安衛則", articleNum: "第35条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第35条",
        mustContain: ["作業手順"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第35条: 雇入れ時等の教育8項目（機械等の危険性・安全装置等の取扱い・作業手順・作業開始時の点検・疾病の原因・整理整頓・応急措置等）",
      },
    ],
  },
  {
    id: "GQ18",
    category: "in-scope",
    diagVerdict: "○",
    question: "化学物質の濃度基準値を超えるおそれがある場合、事業者は何をする必要がありますか？",
    mustInclude: [["ばく露"], ["医師", "健康診断"]],
    goldCitations: [{ lawShort: "安衛則", articleNum: "第577条の2" }],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第577条の2",
        mustContain: ["ばく露"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第577条の2: リスクアセスメント対象物のばく露低減措置・濃度基準値以下の管理・超過ばく露時の医師等による健康診断と記録保存",
      },
    ],
  },
  {
    id: "GQ19",
    category: "in-scope",
    diagVerdict: "○",
    question: "石綿含有が不明な建材の解体前の事前調査はどう行いますか？",
    mustInclude: [["設計図書", "目視"], ["3年", "三年"]],
    goldCitations: [{ lawShort: "石綿則", articleNum: "第3条" }],
    corpusEvidence: [
      {
        lawShort: "石綿則",
        articleNum: "第3条",
        mustContain: ["設計図書", "目視"],
        anchor:
          "石綿則（平成17年厚生労働省令第21号）第3条: 解体等の前に設計図書等の文書と目視により石綿使用の有無を調査し、結果の記録を3年間保存",
      },
    ],
  },
  {
    id: "GQ20",
    category: "in-scope",
    diagVerdict: "×",
    question: "派遣労働者の雇入れ時の安全衛生教育は派遣元と派遣先どちらの義務ですか？",
    mustInclude: [["派遣元"]],
    // 「雇入れ時（の安全衛生）教育…派遣先…義務/が実施」型の誤断定を捕まえる。
    // 途中に「派遣元/除/以外/ではなく」が挟まる正答の複文（例:「派遣先ではなく派遣元が…」）は
    // 誤検知しない（2026-07-03 本番実回答で検証済み）
    mustExclude: [
      "(雇入れ時|雇い入れ時)の?(安全衛生)?教育(?:(?!派遣元|除|以外|ではなく)[^。]){0,30}派遣先[^。]{0,12}(義務|が(?:行|実施|負担))",
    ],
    goldCitations: [
      { lawShort: "派遣法", articleNum: "第45条" },
      { lawShort: "安衛法", articleNum: "第59条" },
    ],
    corpusEvidence: [
      {
        lawShort: "派遣法",
        articleNum: "第45条",
        mustContain: ["派遣元"],
        anchor:
          "労働者派遣法（昭和60年法律第88号）第45条: 安衛法の適用の特例。雇入れ時教育（安衛法第59条第1項）・一般健診は派遣元、作業内容変更時教育・特別教育・特殊健診は派遣先の義務（厚労省派遣元・派遣先指針と整合）",
      },
    ],
    notes: "診断04で唯一の明確な誤答（confidence=high/1.0のまま「派遣先の義務」と誤断定）。#588でコーパス要約是正済",
  },
  {
    id: "GQ21",
    category: "out-of-scope",
    diagVerdict: "○-",
    question: "明日の東京の天気は？",
    mustInclude: [],
    goldCitations: [],
    expectOutOfScope: true,
    expectRetrievable: false,
    notes: "診断04では港湾労働法第2条をrelated提示するノイズあり。T9（noise floor）是正の回帰",
  },
  {
    id: "GQ22",
    category: "out-of-scope",
    diagVerdict: "○",
    question: "おすすめの投資信託を教えてください。",
    mustInclude: [],
    goldCitations: [],
    expectOutOfScope: true,
    expectRetrievable: false,
  },
  {
    id: "GQ23",
    category: "boundary",
    diagVerdict: "○-",
    question: "解雇予告のルールを教えてください。",
    mustInclude: [["30日", "三十日"], ["予告"]],
    // 2026-07-03是正: 「解雇予告」PIN（rag-search.ts）を新設し労基法第20条を
    // 強制ヒット化。従来はRAGスコア0.12でno-hit経路に落ちていた。
    expectRetrievable: true,
    goldCitations: [{ lawShort: "労基法", articleNum: "第20条" }],
    corpusEvidence: [
      {
        lawShort: "労基法",
        articleNum: "第20条",
        mustContain: ["三十日"],
        anchor:
          "労働基準法（昭和22年法律第49号）第20条: 解雇は少なくとも30日前に予告、予告しない場合は30日分以上の平均賃金（解雇予告手当）を支払う",
      },
    ],
    notes: "診断04時点は労基法20条未収録の境界問（no-hitが誠実対応）。#615で収録済のため現在は回答可能が正",
  },
];

export const GEN_QUALITY_CASES: GenQualityCase[] = RAW_CASES.map((c) => ({
  ...c,
  expectRetrievable: c.expectRetrievable ?? true,
}));

/** in-scope扱い（正答率の分母）のケース。boundaryは収録済になった現在はin-scope扱い */
export function scorableCases(): GenQualityCase[] {
  return GEN_QUALITY_CASES.filter((c) => !c.expectOutOfScope);
}
