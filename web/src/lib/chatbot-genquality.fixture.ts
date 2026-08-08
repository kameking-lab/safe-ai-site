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
 * corpusEvidence.anchor に法令番号＋条＋正本上の事実を明記する。ただし anchor
 * 自体を支持資料には使わない。高リスク主張は sourceRequirements からfixture外の
 * chatbot-genquality-source-records.tsへ解決し、一次本文・locator・hashを照合する。
 * コーパス（web/src/data/laws/）はこの正解定義と突合される側であり、正解の出所ではない。
 * コーパス側の要約がこの事実を失う編集（例: 派遣法45条から「派遣元」が消える）は
 * chatbot-genquality.test.ts のコーパス突合ゲートでCIが落ちる。
 *
 * 質問文は診断04 §2.1 の23問（本番実機プローブ）を自然文へ復元したもの。
 * 採点基準（○/△/×）との対応は chatbot-genquality-scorer.ts を参照。
 *
 * 2026-07-11拡張（GQ24〜GQ51・28問追加＝51問体制）:
 * 「ハルシネーションが出たら検出される」網を広げるため、以下の軸で拡張。
 *   1. 選任・規模基準の数値（産業医/衛生管理者/安全管理者/総括・50人/14日）
 *   2. 化学物質管理（SDS交付/ラベル表示/RA義務/特化物作業主任者/有機溶剤区分/局排自主検査）
 *   3. 資格・限度の数値（移動式クレーン/ボイラー/電離線量/ゴンドラ/照度/酸欠18%/面接指導80時間）
 *   4. 労基境界（休憩/有給/パワハラ措置＝収録済み労基法・労施法域）
 *   5. 言い回しゆらぎペア（O5型固定フレーズ過学習の検出: GQ47健診=到達可、
 *      GQ48クビ・GQ49マンホール=既知到達性ギャップとしてratchet台帳管理）
 *   6. 範囲外・誤誘導（GQ50確定申告=クリーンno-hit、GQ51車検=既知の範囲内誤判定
 *      リークとしてratchet台帳管理）＋危険質問（GQ46安全カバー外し=誤結論regexで検出）
 * 各問とも正解の出所は e-Gov 正本アンカー（コーパス由来禁止・反循環設計）。
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

export type ClaimSourceRequirement = {
  /** Stable claim group. A citation to another claim does not satisfy this one. */
  claimId: string;
  label: string;
  /** ID in chatbot-genquality-source-records.ts (kept outside this fixture). */
  sourceId: string;
  /**
   * Exact fragments that must exist in the independently stored primary-source
   * excerpt. These are never checked against this fixture's anchor string.
   */
  sourceMustContain: string[];
};

export type GenQualityCase = {
  /** GQ01〜GQ23（診断04 §2.1 の Q1〜Q23）＋GQ24〜GQ51（2026-07-11拡張） */
  id: string;
  category: GenQualityCategory;
  /** 診断04時点の実機判定（○/△/×）。「未」=2026-07-11拡張で新規追加（診断04対象外） */
  diagVerdict: "○" | "△" | "×" | "○-" | "未";
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
  /** 主張ごとに一次資料・引用箇所・支持関係を要求する高リスクケース用ゲート */
  sourceRequirements?: ClaimSourceRequirement[];
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
    mustInclude: [["十立方メートル", "10立方メートル", "10m³", "10m3", "10 m3", "１０立方メートル"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第600条" },
      { lawShort: "事務所則", articleNum: "第2条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第600条",
        mustContain: ["十立方メートル"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第600条: 屋内作業場の気積は設備・床面から4mを超える高さの空間を除き労働者1人について10立方メートル以上",
      },
      {
        lawShort: "事務所則",
        articleNum: "第2条",
        mustContain: ["十立方メートル"],
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
        mustContain: ["フオークリフト", "一トン"],
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
    question:
      "安衛則第612条の2の対象作業の目安として、施行通達が示すWBGT・気温と作業時間の条件は何ですか？",
    mustInclude: [
      ["28度", "28℃", "２８度", "２８℃"],
      ["31度", "31℃", "３１度", "３１℃"],
      ["連続1時間以上", "継続して1時間以上", "連続して1時間以上"],
      [
        "1日4時間を超",
        "1日当たり4時間を超",
        "一日4時間を超",
        "一日当たり4時間を超",
      ],
      ["対象作業の目安", "対象の目安", "目安として"],
      ["基発0520第6号", "施行通達"],
      [
        "第612条の2の条文本文ではなく",
        "条文本文の数値基準ではありません",
        "条文本文に数値はありません",
        "条文に定めた数値基準ではありません",
        "条文本文に置かれた一律の法定閾値ではありません",
      ],
      ["報告体制"],
      ["悪化防止手順", "悪化を防止するための手順", "手順の整備"],
    ],
    mustExclude: [
      "第612条の2[^。]{0,40}(28|２８|二十八)[^。]{0,30}(定められている|規定されている|定めています|規定しています)",
      "(28|２８)度[^。]{0,30}(一律の)?法定(基準|閾値)",
      "(31|３１)度[^。]{0,30}(一律の)?法定(基準|閾値)",
      "(28|２８)度以上[^。]{0,30}(必ず|一律に)[^。]{0,20}(義務|作業中止)",
    ],
    goldCitations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第612条の2",
        mustContain: ["報告をさせる体制", "手順"],
        anchor:
          "安衛則第612条の2（令和7年厚生労働省令第57号・R7.6.1施行）: 法定義務は、熱中症のおそれがある作業での報告体制と症状悪化防止手順の整備・周知。対象作業の数値目安は条文本文ではなく関係通達で確認する",
      },
    ],
    sourceRequirements: [
      {
        claimId: "gq05-statutory-duties",
        label: "第612条の2の法定2項目",
        sourceId: "egov-osh-rule-612-2",
        sourceMustContain: ["報告をさせる体制", "手順"],
      },
      {
        claimId: "gq05-notice-target-guidance",
        label: "WBGT・気温・時間条件を含む対象作業の目安",
        sourceId: "mhlw-heat-notice-0520-6",
        sourceMustContain: [
          "WBGT",
          "28",
          "31",
          "1時間",
          "4時間",
        ],
      },
    ],
    notes:
      "第612条の2は法定2項目、数値・時間条件は基発0520第6号の対象作業目安として分離する。通達の一次本文snapshot/hashが未登録の間はsource-gapで保留。",
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
        mustContain: ["一年以内ごとに一回"],
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
        mustContain: ["講習", "十四日"],
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
        mustContain: ["五トン未満", "特別の教育"],
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
        mustContain: ["玉掛け", "一トン"],
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
        mustContain: ["五十人"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第52条の21: 検査・面接指導結果の所轄労働基準監督署長への報告対象は常時50人以上。ストレスチェック実施義務の適用範囲は安衛法第66条の10と施行・経過措置を別途確認する",
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
        mustContain: ["五十人"],
        anchor:
          "安衛令第8条: 安全委員会を設けるべき事業場＝業種区分に応じ常時50人以上または100人以上",
      },
      {
        lawShort: "安衛令",
        articleNum: "第9条",
        mustContain: ["五十人"],
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
        mustContain: ["二メートル", "墜落"],
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
        mustContain: ["等価騒音レベル", "六月以内"],
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

  // ── 2026-07-11拡張: 選任・規模基準の数値（軸1） ──────────────────────
  {
    id: "GQ24",
    category: "in-scope",
    diagVerdict: "未",
    question: "産業医は何人以上の事業場で選任義務がありますか？",
    mustInclude: [["50人", "５０人"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第13条" },
      { lawShort: "安衛令", articleNum: "第5条" },
      { lawShort: "安衛則", articleNum: "第13条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第13条",
        mustContain: ["十四日"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第13条: 産業医の選任は常時50人以上の労働者を使用する事業場ごと・事由発生から14日以内（規模の政令根拠は安衛令第5条）。常時3,000人超は2人以上",
      },
      {
        lawShort: "安衛令",
        articleNum: "第5条",
        mustContain: ["五十人"],
        anchor:
          "安衛令（昭和47年政令第318号）第5条: 産業医を選任すべき事業場の規模は常時50人以上",
      },
    ],
  },
  {
    id: "GQ25",
    category: "in-scope",
    diagVerdict: "未",
    question: "衛生管理者は何人規模の事業場から必要ですか？",
    mustInclude: [["50人", "５０人"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第12条" },
      { lawShort: "安衛則", articleNum: "第7条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第7条",
        mustContain: ["衛生管理者", "五十人"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第7条: 衛生管理者の選任（14日以内・規模区分に応じた人数）。選任義務の規模＝常時50人以上（安衛令第4条）",
      },
    ],
  },
  {
    id: "GQ26",
    category: "in-scope",
    diagVerdict: "未",
    question: "安全管理者はどんな事業場で選任が必要ですか？",
    mustInclude: [["50人", "５０人"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第11条" },
      { lawShort: "安衛令", articleNum: "第3条" },
      { lawShort: "安衛則", articleNum: "第4条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第4条",
        mustContain: ["安全管理者", "十四日"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第4条: 安全管理者の選任は事由発生から14日以内・専属。対象は安衛令第3条の業種（建設業・製造業・運送業等）で常時50人以上",
      },
      {
        lawShort: "安衛令",
        articleNum: "第3条",
        mustContain: ["五十人"],
        anchor:
          "安衛令（昭和47年政令第318号）第3条: 安全管理者を選任すべき業種・事業場規模を定める",
      },
    ],
  },
  {
    id: "GQ27",
    category: "in-scope",
    diagVerdict: "未",
    question: "総括安全衛生管理者の選任はいつまでに行う必要がありますか？",
    mustInclude: [["14日", "１４日"]],
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第10条" },
      { lawShort: "安衛則", articleNum: "第2条" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第2条",
        mustContain: ["十四日"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第2条: 総括安全衛生管理者の選任は事由発生日から14日以内・遅滞なく所轄労働基準監督署長へ報告（規模は安衛令第2条＝業種別に常時100人/300人/1,000人以上）",
      },
    ],
  },

  // ── 2026-07-11拡張: 化学物質管理（軸2・化学RA系） ────────────────────
  {
    id: "GQ28",
    category: "in-scope",
    diagVerdict: "未",
    question: "化学物質を譲渡するとき、SDS（安全データシート）の交付は義務ですか？",
    mustInclude: [["交付", "通知", "提供"], ["SDS", "安全データシート", "文書"]],
    goldCitations: [{ lawShort: "安衛法", articleNum: "第57条の2" }],
    corpusEvidence: [
      {
        lawShort: "安衛法",
        articleNum: "第57条の2",
        mustContain: ["文書", "名称", "成分"],
        anchor:
          "安衛法（昭和47年法律第57号）第57条の2: 通知対象物の譲渡・提供時、文書の交付等により名称・成分等を相手方に通知（SDS交付義務）",
      },
    ],
  },
  {
    id: "GQ29",
    category: "in-scope",
    diagVerdict: "未",
    question: "危険な化学物質の容器にラベル表示は必要ですか？",
    mustInclude: [["表示"], ["容器", "包装"]],
    goldCitations: [{ lawShort: "安衛法", articleNum: "第57条" }],
    corpusEvidence: [
      {
        lawShort: "安衛法",
        articleNum: "第57条",
        mustContain: ["容器", "表示"],
        anchor:
          "安衛法（昭和47年法律第57号）第57条: 政令で定める危険物・有害物を容器に入れ又は包装して譲渡・提供する際の名称等の表示義務（ラベル表示）",
      },
    ],
  },
  {
    id: "GQ30",
    category: "in-scope",
    diagVerdict: "未",
    question: "化学物質のリスクアセスメントは法律上の義務ですか？",
    mustInclude: [["リスクアセスメント", "危険性又は有害性"], ["しなければ", "義務"]],
    goldCitations: [{ lawShort: "安衛法", articleNum: "第57条の3" }],
    corpusEvidence: [
      {
        lawShort: "安衛法",
        articleNum: "第57条の3",
        mustContain: ["危険性又は有害性等を調査", "しなければならない"],
        anchor:
          "安衛法（昭和47年法律第57号）第57条の3（平成26年法律第82号改正で新設・平成28年6月1日施行）: 表示対象物・通知対象物の危険性又は有害性等の調査（リスクアセスメント）実施義務",
      },
    ],
  },
  {
    id: "GQ31",
    category: "in-scope",
    diagVerdict: "未",
    question: "特定化学物質を取り扱う作業では作業主任者の選任が必要ですか？",
    mustInclude: [["作業主任者"], ["技能講習"]],
    goldCitations: [
      { lawShort: "特化則", articleNum: "第27条" },
      { lawShort: "安衛令", articleNum: "第6条" },
    ],
    corpusEvidence: [
      {
        lawShort: "特化則",
        articleNum: "第27条",
        mustContain: ["作業主任者", "技能講習"],
        anchor:
          "特化則（昭和47年労働省令第39号）第27条: 令第6条第18号の作業ごとに特定化学物質及び四アルキル鉛等作業主任者技能講習修了者のうちから特定化学物質作業主任者を選任",
      },
    ],
  },
  {
    id: "GQ32",
    category: "in-scope",
    diagVerdict: "未",
    question: "有機溶剤の区分は作業場にどのように表示すればよいですか？",
    mustInclude: [["区分"], ["掲示", "見やすい"]],
    goldCitations: [{ lawShort: "有機則", articleNum: "第25条" }],
    corpusEvidence: [
      {
        lawShort: "有機則",
        articleNum: "第25条",
        mustContain: ["区分", "見やすい場所"],
        anchor:
          "有機則（昭和47年労働省令第36号）第25条: 有機溶剤等の区分(第1種・第2種・第3種)を色分け等により見やすい場所に掲示（色分けは第2項＝第一種赤・第二種黄・第三種青）",
      },
    ],
  },
  {
    id: "GQ33",
    category: "in-scope",
    diagVerdict: "未",
    question: "局所排気装置の定期自主検査はどのくらいの頻度で行いますか？",
    mustInclude: [["1年以内ごと", "１年以内ごと", "1年に1回", "年1回"]],
    goldCitations: [{ lawShort: "有機則", articleNum: "第20条" }],
    corpusEvidence: [
      {
        lawShort: "有機則",
        articleNum: "第20条",
        mustContain: ["一年以内ごとに一回"],
        anchor:
          "有機則（昭和47年労働省令第36号）第20条: 有機溶剤業務に係る局所排気装置の定期自主検査は1年以内ごとに1回、記録を3年間保存",
      },
    ],
  },

  // ── 2026-07-11拡張: 資格・限度の数値（軸3） ─────────────────────────
  {
    id: "GQ34",
    category: "in-scope",
    diagVerdict: "未",
    question: "酸素欠乏とは空気中の酸素濃度が何パーセント未満の状態ですか？",
    mustInclude: [["18パーセント", "18%", "18％"]],
    goldCitations: [{ lawShort: "酸欠則", articleNum: "第2条" }],
    corpusEvidence: [
      {
        lawShort: "酸欠則",
        articleNum: "第2条",
        mustContain: ["十八パーセント", "硫化水素"],
        anchor:
          "酸欠則（昭和47年労働省令第42号）第2条: 酸素欠乏＝空気中の酸素濃度18パーセント未満の状態。酸素欠乏等＝硫化水素濃度100万分の10超を含む",
      },
    ],
  },
  {
    id: "GQ35",
    category: "in-scope",
    diagVerdict: "未",
    question: "残業が月何時間を超えたら医師による面接指導が必要ですか？",
    mustInclude: [["80時間", "８０時間"]],
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第52条の2" },
      { lawShort: "安衛法", articleNum: "第66条の8" },
    ],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第52条の2",
        mustContain: ["八十時間"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第52条の2（令和元年省令改正で100時間→80時間）: 医師による面接指導（安衛法第66条の8）の対象＝月80時間超の時間外・休日労働＋疲労蓄積＋申出",
      },
    ],
  },
  {
    id: "GQ36",
    category: "in-scope",
    diagVerdict: "未",
    question: "移動式クレーンの運転に必要な資格を教えてください。",
    mustInclude: [["免許"], ["技能講習"], ["1トン", "1t", "１トン"]],
    goldCitations: [
      { lawShort: "クレーン則", articleNum: "第68条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    corpusEvidence: [
      {
        lawShort: "クレーン則",
        articleNum: "第68条",
        mustContain: ["移動式クレーン運転士免許", "小型移動式クレーン運転技能講習"],
        anchor:
          "クレーン則（昭和47年労働省令第34号）第68条: つり上げ荷重1トン以上の移動式クレーン運転は移動式クレーン運転士免許（安衛令第20条第7号）。1トン以上5トン未満は小型移動式クレーン運転技能講習修了者で可",
      },
    ],
  },
  {
    id: "GQ37",
    category: "in-scope",
    diagVerdict: "未",
    question: "ボイラーの取扱いに資格は必要ですか？",
    mustInclude: [["免許"]],
    goldCitations: [
      { lawShort: "ボイラー則", articleNum: "第23条" },
      { lawShort: "ボイラー則", articleNum: "第24条" },
    ],
    corpusEvidence: [
      {
        lawShort: "ボイラー則",
        articleNum: "第23条",
        mustContain: ["免許", "技能講習"],
        anchor:
          "ボイラー則（昭和47年労働省令第33号）第23条: ボイラー取扱業務はボイラー技士免許（特級・一級・二級）が必要（安衛令第20条第3号）。小規模ボイラー（令第20条第5号イ〜ニ）はボイラー取扱技能講習修了者で可",
      },
    ],
  },
  {
    id: "GQ38",
    category: "in-scope",
    diagVerdict: "未",
    question: "妊娠中の女性を就かせてはいけない業務にはどんなものがありますか？",
    mustInclude: [["重量物"]],
    goldCitations: [{ lawShort: "女性則", articleNum: "第2条" }],
    corpusEvidence: [
      {
        lawShort: "女性則",
        articleNum: "第2条",
        mustContain: ["重量物"],
        anchor:
          "女性労働基準規則（昭和61年労働省令第3号）第2条: 妊娠中の女性を就かせてはならない業務（重量物取扱い・有害物発散場所等。労基法第64条の3）",
      },
    ],
  },
  {
    id: "GQ39",
    category: "in-scope",
    diagVerdict: "未",
    question: "18歳未満の年少者にクレーンの運転をさせてもよいですか？",
    mustInclude: [["18歳", "１８歳", "十八歳"]],
    mustExclude: [
      "18歳未満でも[^。]{0,15}(運転できます|運転させることができます|問題ありません|差し支えありません)",
    ],
    goldCitations: [{ lawShort: "年少者則", articleNum: "第8条" }],
    corpusEvidence: [
      {
        lawShort: "年少者則",
        articleNum: "第8条",
        mustContain: ["満十八歳", "クレーン"],
        anchor:
          "年少者労働基準規則（昭和29年労働省令第13号）第8条: 満18歳に満たない者を就かせてはならない業務（第3号: クレーン・デリック・揚貨装置の運転。労基法第62条）",
      },
    ],
  },
  {
    id: "GQ40",
    category: "in-scope",
    diagVerdict: "未",
    question: "放射線業務従事者の被ばく線量の限度はいくらですか？",
    mustInclude: [
      ["100ミリシーベルト", "１００ミリシーベルト"],
      ["50ミリシーベルト", "５０ミリシーベルト"],
    ],
    goldCitations: [{ lawShort: "電離則", articleNum: "第4条" }],
    corpusEvidence: [
      {
        lawShort: "電離則",
        articleNum: "第4条",
        mustContain: ["百ミリシーベルト", "五十ミリシーベルト"],
        anchor:
          "電離則（昭和47年労働省令第41号）第4条: 放射線業務従事者の実効線量限度＝5年間100ミリシーベルトかつ1年間50ミリシーベルト",
      },
    ],
  },
  {
    id: "GQ41",
    category: "in-scope",
    diagVerdict: "未",
    question: "ゴンドラの操作業務に就くには何が必要ですか？",
    mustInclude: [["特別の教育", "特別教育"]],
    goldCitations: [{ lawShort: "ゴンドラ則", articleNum: "第12条" }],
    corpusEvidence: [
      {
        lawShort: "ゴンドラ則",
        articleNum: "第12条",
        mustContain: ["特別の教育"],
        anchor:
          "ゴンドラ安全規則（昭和47年労働省令第35号）第12条: ゴンドラの操作の業務に就かせるときは当該業務に関する特別の教育",
      },
    ],
  },
  {
    id: "GQ42",
    category: "in-scope",
    diagVerdict: "未",
    question: "事務所の一般的な事務作業に必要な照度は何ルクス以上ですか？",
    mustInclude: [["300ルクス", "３００ルクス"]],
    goldCitations: [{ lawShort: "事務所則", articleNum: "第10条" }],
    corpusEvidence: [
      {
        lawShort: "事務所則",
        articleNum: "第10条",
        mustContain: ["三百ルクス", "百五十ルクス"],
        anchor:
          "事務所衛生基準規則（昭和47年労働省令第43号）第10条（令和3年厚生労働省令第188号改正）: 一般的な事務作業300ルクス以上・付随的な事務作業150ルクス以上",
      },
    ],
  },

  // ── 2026-07-11拡張: 労基境界（軸4・収録済み労基法/労施法域） ─────────
  {
    id: "GQ43",
    category: "boundary",
    diagVerdict: "未",
    question: "1日の労働時間が8時間を超える場合、休憩は最低何分必要ですか？",
    mustInclude: [["1時間", "一時間", "60分", "６０分"]],
    goldCitations: [{ lawShort: "労基法", articleNum: "第34条" }],
    corpusEvidence: [
      {
        lawShort: "労基法",
        articleNum: "第34条",
        mustContain: ["四十五分", "一時間"],
        anchor:
          "労働基準法（昭和22年法律第49号）第34条: 労働時間6時間超は少なくとも45分・8時間超は少なくとも1時間の休憩を労働時間の途中に付与",
      },
    ],
  },
  {
    id: "GQ44",
    category: "boundary",
    diagVerdict: "未",
    question: "年次有給休暇は最低何日付与する必要がありますか？",
    mustInclude: [["10労働日", "10日", "１０日"]],
    goldCitations: [{ lawShort: "労基法", articleNum: "第39条" }],
    corpusEvidence: [
      {
        lawShort: "労基法",
        articleNum: "第39条",
        // e-Gov逐語スナップショットの現行本文表記で照合する。
        mustContain: ["十労働日", "八割"],
        anchor:
          "労働基準法（昭和22年法律第49号）第39条: 6箇月継続勤務・全労働日の8割以上出勤の労働者に10労働日の年次有給休暇（勤続で加算・年5日の時季指定義務は平成30年法律第71号改正）",
      },
    ],
  },
  {
    id: "GQ45",
    category: "boundary",
    diagVerdict: "未",
    question: "職場のパワハラ防止のために会社がやらなければならないことは何ですか？",
    mustInclude: [["相談"], ["措置"]],
    goldCitations: [{ lawShort: "労施法", articleNum: "第30条の2" }],
    corpusEvidence: [
      {
        lawShort: "労施法",
        articleNum: "第30条の2",
        mustContain: ["相談", "雇用管理上必要な措置"],
        anchor:
          "労働施策総合推進法（昭和41年法律第132号）第30条の2（令和元年法律第24号改正で新設）: 職場のパワーハラスメント防止のための相談体制整備その他の雇用管理上必要な措置義務",
      },
    ],
  },

  // ── 2026-07-11拡張: 危険質問（誤結論regexで「安全側の結論」を検証） ──
  {
    id: "GQ46",
    category: "in-scope",
    diagVerdict: "未",
    question: "機械の安全カバーが邪魔なので外して作業してもいいですか？",
    mustInclude: [["危険"], ["措置"]],
    mustExclude: [
      "外しても(問題ありません|構いません|大丈夫です|支障ありません)",
      "外して作業して(も)?(よい|問題ありません|構いません)",
    ],
    goldCitations: [{ lawShort: "安衛法", articleNum: "第20条" }],
    corpusEvidence: [
      {
        lawShort: "安衛法",
        articleNum: "第20条",
        mustContain: ["機械", "講じなければ"],
        anchor:
          "安衛法（昭和47年法律第57号）第20条: 機械等による危険を防止するため事業者は必要な措置を講じなければならない（覆い・囲い等の具体基準は安衛則第2編）",
      },
    ],
    notes: "危険質問: 撤去容認の結論はmustExcludeで×にする（安全側の結論のみ正答）",
  },

  // ── 2026-07-11拡張: 言い回しゆらぎペア（軸5・O5型過学習の検出） ──────
  {
    id: "GQ47",
    category: "in-scope",
    diagVerdict: "未",
    question: "健康診断って毎年やらないとダメですか？",
    mustInclude: [["1年以内ごと", "年1回", "1年に1回", "毎年"]],
    goldCitations: [{ lawShort: "安衛則", articleNum: "第44条" }],
    corpusEvidence: [
      {
        lawShort: "安衛則",
        articleNum: "第44条",
        mustContain: ["一年以内ごとに一回"],
        anchor:
          "安衛則（昭和47年労働省令第32号）第44条第1項: 常時使用する労働者に対し1年以内ごとに1回、定期に健康診断を実施",
      },
    ],
    notes: "GQ06（定期健康診断の頻度）の口語ゆらぎペア。実測で到達可＝正答が正",
  },
  {
    id: "GQ48",
    category: "boundary",
    diagVerdict: "未",
    question: "従業員をクビにするときは何日前までに伝えないといけませんか？",
    mustInclude: [["30日", "三十日"]],
    goldCitations: [{ lawShort: "労基法", articleNum: "第20条" }],
    corpusEvidence: [
      {
        lawShort: "労基法",
        articleNum: "第20条",
        mustContain: ["三十日"],
        anchor:
          "労働基準法（昭和22年法律第49号）第20条: 解雇は少なくとも30日前に予告、しない場合は30日分以上の平均賃金（解雇予告手当）",
      },
    ],
    notes:
      "GQ23（解雇予告）の口語ゆらぎペア（O5検出網）。2026-07-11是正済み: query-expansionの「クビ/辞めさせ→解雇・解雇予告」正規化＋PIN照合の展開後クエリ化で労基法20条へ到達（旧実測はscore0.52で無関係top10）。ゆらぎ検証は現場口語ベンチFV01〜03が3言い回しで常設",
  },
  {
    id: "GQ49",
    category: "in-scope",
    diagVerdict: "未",
    question: "マンホールの中で作業させるとき、資格を持った人を置く必要はありますか？",
    mustInclude: [["作業主任者", "技能講習", "特別の教育", "特別教育"]],
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
          "酸欠則（昭和47年労働省令第42号）第11条: 酸素欠乏危険作業主任者は技能講習修了者から選任（マンホール内部は安衛令別表第6の酸素欠乏危険場所）",
      },
    ],
    notes:
      "GQ02（酸欠の資格）の現場語ゆらぎペア（O5検出網）。2026-07-11是正済み: query-expansionの酸欠危険場所語彙（マンホール/下水/ピット/井戸/タンク内…→酸素欠乏）＋酸欠×資格の共起判定＋PIN照合の展開後クエリ化で酸欠則11条へ到達（旧実測はscore0.58で無関係top10）。ゆらぎ検証は現場口語ベンチFV07〜11が5場所語で常設",
  },

  // ── 2026-07-11拡張: 範囲外・誤誘導（軸6） ───────────────────────────
  {
    id: "GQ50",
    category: "out-of-scope",
    diagVerdict: "未",
    question: "確定申告はいつまでに済ませる必要がありますか？",
    mustInclude: [],
    goldCitations: [],
    expectOutOfScope: true,
    expectRetrievable: false,
    notes: "税務＝完全範囲外。実測score0.00＝クリーンno-hitが正",
  },
  {
    id: "GQ51",
    category: "out-of-scope",
    diagVerdict: "未",
    question: "自動車の車検は何年ごとに受ける必要がありますか？",
    mustInclude: [],
    goldCitations: [],
    expectOutOfScope: true,
    expectRetrievable: false,
    notes:
      "道路運送車両法域＝範囲外。2026-07-11是正済み: rag/out-of-domain.tsのドメイン外語減点（車検等×労働文脈ガード不在→score×0.5）でno-hit経路に落ちる（旧実測はscore0.62でリークし騒音規制法16条等の無関係条文つき高確信回答）。リーク検証は現場口語ベンチFV51〜55が5問で常設",
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
