import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { verifiedPrimaryElectricalArticles } from "@/data/laws/verified-primary-electrical";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";
import { expandQuery } from "@/lib/query-expansion";
import { expandQueryRich } from "@/lib/rag/synonyms";
import { LAW_ALIAS_GROUPS } from "@/lib/law-name-registry";
import { bm25Score, getOrBuildIndex } from "@/lib/rag/bm25";
import { rerank } from "@/lib/rag/reranker";
import { detectForkliftQueryIntent } from "@/lib/rag/forklift-intent";
import { detectHighLiftQueryIntent } from "@/lib/rag/high-lift-intent";
import {
  hasOutOfDomainSignal,
  OUT_OF_DOMAIN_PENALTY_FACTOR,
} from "@/lib/rag/out-of-domain";
import { kanjiToArabic } from "@/lib/article-number-normalize";
import {
  extractElectricalMeaning,
  normalizeElectricalWorkText,
} from "@/lib/electrical-work-model";
// C-1（モバイル実速度の構造是正）: カテゴリフィルタのUI選択肢は law-category-options.ts
// に分離した。client（chatbot-panel）がこの定数のためだけに本モジュール経由で
// 法令コーパス全体（チャンク生約1.4MB）をバンドルへ巻き込んでいたため。
// サーバー側の既存 import 互換のためここから re-export する。
import type { LawCategoryFilter } from "@/lib/law-category-options";

export { LAW_CATEGORY_OPTIONS } from "@/lib/law-category-options";
export type { LawCategoryFilter } from "@/lib/law-category-options";

/**
 * e-Gov の検証済み条文に、省庁が公式公開する電気分野の一次資料を加えた
 * サーバー専用コーパス。告示の教育課程、電気事業法上の主任技術者、
 * 電気工事士法の軽微作業/Q&Aは既存 e-Gov 抜粋だけでは回答できないため、
 * 通常のスコア検索と明示 pin の双方で同じ集合を使う。
 */
const verifiedRagArticles: LawArticle[] = [
  ...verifiedLawArticles,
  ...verifiedPrimaryElectricalArticles,
];

/**
 * 公開一次資料へのリンクは確認できても、本文を承認済みRAGへ収録していない
 * トピック。別の条文で推測回答せず、公式資料と人手確認へ送る。
 */
export const PRIMARY_SOURCE_APPROVAL_REQUIRED_TERMS = ["親綱"] as const;

/**
 * トピック別の必須条文プライン（キーワードに該当する場合、RAG 検索結果の先頭に
 * 強制的に差し込む）。安衛法第60条のように「政令で定めるもの」で参照切れに
 * なる条文はスコアだけでは十分に引けないため、施行令・規則とセットで返す。
 */
export type PinnedTopic = {
  /** このトピックに該当させるキーワード（いずれか1つが query に含まれれば適用） */
  triggers: string[];
  /**
   * 固定文言への過適合を避ける共起条件。各内側配列から1語以上、
   * すべてのグループで一致した場合もトピックに該当する。
   */
  allTriggerGroups?: string[][];
  /** 同義語展開が別の利用者意図を作る場合、元質問だけで発火を判定する。 */
  explicitOnly?: boolean;
  /** 先頭に差し込む条文の { law, articleNum } ペア */
  pins: { law: string; articleNum: string }[];
  /**
   * いずれか1つでも query に含まれる場合、triggers が一致していてもこのトピックの
   * PIN を適用しない（一般語トリガーが別文脈の質問を乗っ取るのを防ぐ文脈ガード）。
   * 例: 「換気」PINは事務所則向けだが、酸欠/坑内/有機溶剤文脈では別法令が正解のため抑止する。
   */
  excludeTriggers?: string[];
};

export const PINNED_TOPICS: PinnedTopic[] = [
  {
    // 法の目的（1条）と、労働条件としての最低基準（3条）を分離せず返す。
    triggers: ["最低基準"],
    allTriggerGroups: [
      ["労働災害", "安全衛生", "労働条件"],
      ["法律", "安衛法", "定め"],
      ["目的", "最低基準", "基本理念"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第1条" },
      { law: "労働安全衛生法", articleNum: "第3条" },
    ],
  },
  {
    // 衛生管理者の制度本体と、事業場規模を定める施行令を対で返す。
    triggers: ["衛生管理者の事業場規模", "衛生管理者を選任しなければならない事業場規模"],
    allTriggerGroups: [["衛生管理者"], ["規模", "何人", "以上"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第12条" },
      { law: "労働安全衛生法施行令", articleNum: "第4条" },
    ],
    excludeTriggers: ["総括安全衛生管理者", "店社安全衛生管理者"],
  },
  {
    // 作業主任者の制度本体と、対象作業を列挙する施行令を対で返す。
    triggers: ["作業主任者の対象作業", "作業主任者は何条", "作業主任者の根拠"],
    allTriggerGroups: [["作業主任者"], ["対象", "特定作業", "何条", "根拠", "定め"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第14条" },
      { law: "労働安全衛生法施行令", articleNum: "第6条" },
    ],
  },
  {
    // 雇入時健診は本法の一般義務と規則の実施時点・項目を対で返す。
    triggers: ["雇い入れたときに行う健康診断", "雇入れ時健康診断", "雇入時健康診断"],
    allTriggerGroups: [["雇い入れ", "雇入れ"], ["健康診断", "健診"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第66条" },
      { law: "労働安全衛生規則", articleNum: "第43条" },
    ],
  },
  {
    // 一般定期健診は本法と「一年以内ごとに一回」を定める規則を対で返す。
    triggers: [
      "1年以内ごとに1回行う定期健康診断",
      "一年以内ごとに一回行う定期健康診断",
      "定期健康診断",
      "定期健診",
    ],
    allTriggerGroups: [["定期健康診断", "定期健診"], ["1年", "一年", "年1回"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第66条" },
      { law: "労働安全衛生規則", articleNum: "第44条" },
    ],
  },
  {
    // 長時間労働者の面接指導は本法と具体要件を定める規則を対で返す。
    triggers: ["月80時間超の時間外労働者", "80時間超の面接指導"],
    allTriggerGroups: [["80時間", "八十時間"], ["面接指導"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第66条の8" },
      { law: "労働安全衛生規則", articleNum: "第52条の2" },
    ],
  },
  {
    // 墜落制止用器具を使わせる根拠は、作業床等の原則と使用義務を対で返す。
    triggers: ["墜落制止用器具の使用義務", "墜落制止用器具を使用させ"],
    allTriggerGroups: [["墜落制止用器具"], ["使用義務", "使用させ", "使わせ"]],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第518条" },
      { law: "労働安全衛生規則", articleNum: "第520条" },
    ],
    excludeTriggers: ["点検", "取替え", "交換"],
  },
  {
    // 足場作業主任者の対象範囲（令）と選任（規則）を対で返す。
    triggers: ["足場の作業主任者の選任", "足場作業主任者の選任"],
    allTriggerGroups: [["足場"], ["作業主任者"], ["選任", "5m", "つり足場", "張り出し足場"]],
    pins: [
      { law: "労働安全衛生法施行令", articleNum: "第6条" },
      { law: "労働安全衛生規則", articleNum: "第565条" },
    ],
  },
  {
    // 足場の組立て・解体時に講ずる作業方法・墜落防止措置。
    triggers: ["足場の組立て・解体時", "足場の組立・解体時"],
    allTriggerGroups: [["足場"], ["組立て", "組立"], ["解体"], ["墜落防止", "措置"]],
    pins: [{ law: "労働安全衛生規則", articleNum: "第564条" }],
    excludeTriggers: ["点検", "変更後"],
  },
  {
    // クレーン設置届は対象範囲（令）と届出手続（クレーン則）を対で返す。
    triggers: ["クレーンの設置届出の対象範囲", "クレーン設置届の対象"],
    allTriggerGroups: [["クレーン"], ["設置届", "設置届出"], ["対象", "範囲"]],
    pins: [
      { law: "労働安全衛生法施行令", articleNum: "第12条" },
      { law: "クレーン等安全規則", articleNum: "第5条" },
    ],
  },
  {
    // 店社安全衛生管理者は制度本体と人数要件を対で返す。
    triggers: ["店社安全衛生管理者の選任義務", "店社安全衛生管理者の選任"],
    allTriggerGroups: [["店社安全衛生管理者"], ["選任", "義務", "何人"]],
    pins: [
      { law: "労働安全衛生法", articleNum: "第15条の3" },
      { law: "労働安全衛生規則", articleNum: "第18条の6" },
    ],
  },
  {
    // 労働者の責務（安衛法第4条）
    triggers: [
      "労働者の責務",
      "労働者にも義務",
      "労働者も守る",
      "労働者にも安全衛生",
    ],
    pins: [{ law: "労働安全衛生法", articleNum: "第4条" }],
  },
  {
    // 安全・衛生・安全衛生委員会の設置根拠
    triggers: ["安全委員会", "衛生委員会", "安全衛生委員会"],
    pins: [
      { law: "労働安全衛生法", articleNum: "第17条" },
      { law: "労働安全衛生法", articleNum: "第18条" },
      { law: "労働安全衛生法", articleNum: "第19条" },
    ],
  },
  {
    // 労働時間中の休憩（労基法第34条）
    triggers: ["お昼の休憩", "昼休み", "休憩は何分", "休憩時間は何分"],
    allTriggerGroups: [
      ["休憩", "休み"],
      ["何分", "どれくらい", "時間", "最低"],
    ],
    pins: [{ law: "労働基準法", articleNum: "第34条" }],
    excludeTriggers: ["熱中症", "暑熱", "WBGT", "作業間休息"],
  },
  {
    // 衛生管理者の選任義務：本則（安衛法12条）と事業場規模・人数等の
    // 具体条件（安衛則7条）を対で返す。総括安全衛生管理者は安衛法10条の
    // 別制度なので、一般語の部分一致で乗っ取らないよう除外する。
    triggers: [
      "衛生管理者の選任",
      "衛生管理者を選任",
      "衛生管理者選任",
      "衛生管理者の選任義務",
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第12条" },
      { law: "労働安全衛生規則", articleNum: "第7条" },
    ],
    excludeTriggers: ["総括安全衛生管理者"],
  },
  {
    // 職長教育：安衛法第60条＋施行令第19条（対象業種）をセットで返す
    triggers: ["職長教育", "職長", "第60条", "60条", "第六十条"],
    pins: [
      { law: "労働安全衛生法", articleNum: "第60条" },
      { law: "労働安全衛生法施行令", articleNum: "第19条" },
    ],
  },
  {
    // 熱中症：令和7年6月1日施行の安衛則第612条の2
    triggers: ["熱中症", "WBGT", "暑熱", "第612条の2", "612条の2"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第612条の2" }],
  },
  {
    // 健康診断（一般）：安衛法第66条群
    triggers: ["健康診断", "雇入れ時健診", "定期健診", "雇入れ時の健康診断", "定期健康診断"],
    pins: [
      { law: "労働安全衛生法", articleNum: "第66条" },
      { law: "労働安全衛生法", articleNum: "第66条の8" },
      { law: "労働安全衛生法", articleNum: "第66条の10" },
    ],
  },
  {
    triggers: ["有機溶剤健康診断", "有機溶剤健診", "有機溶剤の健康診断"],
    allTriggerGroups: [
      ["有機溶剤", "有機則"],
      ["健康診断", "健診"],
    ],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第29条" },
      { law: "有機溶剤中毒予防規則", articleNum: "第30条" },
    ],
  },
  {
    triggers: [
      "特化健診",
      "特定化学物質健康診断",
      "特定化学物質の健康診断",
      "特化物健診",
    ],
    allTriggerGroups: [
      ["特定化学物質", "特化物", "特化則"],
      ["健康診断", "健診"],
    ],
    pins: [
      { law: "特定化学物質障害予防規則", articleNum: "第39条" },
      { law: "特定化学物質障害予防規則", articleNum: "第40条" },
    ],
  },
  {
    triggers: [
      "石綿健康診断",
      "アスベスト健診",
      "石綿健診",
      "石綿業務従事者",
    ],
    pins: [
      { law: "石綿障害予防規則", articleNum: "第40条" },
      { law: "石綿障害予防規則", articleNum: "第36条" },
    ],
  },
  {
    triggers: ["電離放射線健診", "電離健診", "放射線業務健診", "電離放射線業務", "電離放射線の特殊健診", "電離放射線業務の特殊健診"],
    pins: [{ law: "電離放射線障害防止規則", articleNum: "第56条" }],
  },
  {
    triggers: ["じん肺健診", "じん肺健康診断"],
    pins: [
      { law: "じん肺法", articleNum: "第7条" },
      { law: "じん肺法", articleNum: "第8条" },
      { law: "じん肺法", articleNum: "第3条" },
    ],
  },
  {
    // 「管理区分」は、作業環境測定の実施根拠ではなく、物質別規則の
    // 測定結果評価条文を横断して確認する必要がある。両概念の共起時だけ返す。
    triggers: [],
    allTriggerGroups: [
      ["作業環境測定", "気中濃度測定"],
      ["管理区分", "第一管理区分", "第二管理区分", "第三管理区分"],
    ],
    pins: [
      { law: "特定化学物質障害予防規則", articleNum: "第36条の2" },
      { law: "有機溶剤中毒予防規則", articleNum: "第28条の2" },
      { law: "石綿障害予防規則", articleNum: "第37条" },
      { law: "粉じん障害防止規則", articleNum: "第26条の2" },
      { law: "鉛中毒予防規則", articleNum: "第52条の2" },
    ],
  },
  {
    // 物質別の作業環境測定。汎用の安衛法65条・作環測法3条より前に置き、
    // 明示された規則の測定条文をTop-5から押し出さない。
    triggers: [],
    allTriggerGroups: [
      ["粉じん", "特定粉じん"],
      ["作業環境測定", "粉じん濃度測定", "気中濃度測定"],
    ],
    pins: [{ law: "粉じん障害防止規則", articleNum: "第26条" }],
  },
  {
    triggers: [],
    allTriggerGroups: [
      ["有機溶剤", "有機則"],
      ["作業環境測定", "濃度測定", "気中濃度測定"],
    ],
    pins: [{ law: "有機溶剤中毒予防規則", articleNum: "第28条" }],
  },
  {
    triggers: [],
    allTriggerGroups: [
      ["特定化学物質", "特化物", "特化則"],
      ["作業環境測定", "濃度測定", "気中濃度測定"],
    ],
    pins: [{ law: "特定化学物質障害予防規則", articleNum: "第36条" }],
  },
  {
    // 作業環境測定
    triggers: ["作業環境測定", "気中濃度測定", "管理区分"],
    pins: [
      { law: "労働安全衛生法", articleNum: "第65条" },
      { law: "作業環境測定法", articleNum: "第3条" },
    ],
  },
  {
    // 局所排気装置 / プッシュプル
    // NOTE(Phase 1a): 旧 第16条 は corpus に未収録のため除外（PIN integrity test）。
    // 旧「第16条の2（清掃）」は実在しない条だったため削除（2026-06-10 e-Gov全件突合）。
    // 第5条（設置義務）と第20条（定期自主検査）で本トピックの根拠条文を維持する。
    triggers: ["局所排気装置", "局排"],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第5条" },
      { law: "有機溶剤中毒予防規則", articleNum: "第20条" },
      { law: "有機溶剤中毒予防規則", articleNum: "第28条" },
    ],
  },
  {
    // プッシュプル型換気装置（性能要件=有機則16条の2 / 設置=特化則7条）
    // 2026-06-10: 安衛則600/601（気積・換気）収録により一般語「換気」で枠が埋まりやすくなったためPIN固定
    triggers: ["プッシュプル", "プッシュプル型換気装置", "プッシュプル型"],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第16条の2" },
      { law: "特定化学物質障害予防規則", articleNum: "第7条" },
    ],
  },
  {
    // 足場の点検（作業開始前点検=567条・点検者指名）
    // 2026-07-03 補充: fresh eval Q39「足場の組立て・変更後に必要な点検と記録」型の
    // 言い回しを追加（567条2項が組立て・一部解体・変更後の点検を規定）。
    triggers: [
      "足場の点検",
      "足場点検",
      "足場の作業開始前点検",
      "足場用墜落防止設備の点検",
      "組立て・変更後",
      "組立て、変更後",
    ],
    allTriggerGroups: [
      ["足場"],
      ["点検", "見直す", "強い風", "強風", "悪天候"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第567条" },
      { law: "労働安全衛生規則", articleNum: "第566条" },
    ],
  },
  {
    // 死傷病報告
    triggers: ["死傷病報告", "労働者死傷病報告", "災害報告"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第97条" }],
  },
  {
    // 計画届の対象工事は安衛法88条だけで確定せず、省令の列挙（89・90条）まで返す。
    triggers: [],
    allTriggerGroups: [
      ["計画届", "工事計画届"],
      ["対象工事", "対象となる工事", "工事の範囲"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第88条" },
      { law: "労働安全衛生規則", articleNum: "第89条" },
      { law: "労働安全衛生規則", articleNum: "第90条" },
    ],
  },
  {
    // 届出計画の審査を問う場合は、届出根拠88条ではなく審査規定を先に返す。
    triggers: [],
    allTriggerGroups: [
      ["計画届", "工事計画届", "届出計画"],
      ["事前審査", "審査"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第89条" },
      { law: "労働安全衛生法", articleNum: "第89条の2" },
    ],
  },
  {
    // 工事計画届 / 安衛法第88条
    triggers: ["工事計画届", "計画届", "事前審査"],
    pins: [{ law: "労働安全衛生法", articleNum: "第88条" }],
  },
  {
    // 化学物質管理者（安衛則第12条の5・2024年4月施行。本則57条の3＝RA根拠も併せて提示）
    triggers: ["化学物質管理者"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第12条の5" },
      { law: "労働安全衛生法", articleNum: "第57条の3" },
    ],
  },
  {
    // 保護具着用管理責任者（安衛則第12条の6・2024年4月施行）
    triggers: ["保護具着用管理責任者"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第12条の6" }],
  },
  {
    // SDS / リスクアセスメント
    triggers: ["SDS", "安全データシート", "ラベル表示"],
    pins: [{ law: "労働安全衛生法", articleNum: "第57条の2" }],
  },
  {
    triggers: ["リスクアセスメント", "化学物質リスクアセスメント"],
    allTriggerGroups: [
      ["化学物質", "薬品"],
      ["RA", "危険性評価"],
    ],
    pins: [{ law: "労働安全衛生法", articleNum: "第57条の3" }],
  },
  {
    // 玉掛けの個別技能講習条文（221/222条）と、就業制限の根拠体系
    // （法61条・令20条・則41条）を混同しない。「資格/何号」意図の共起時だけ後者を先行。
    triggers: [],
    allTriggerGroups: [
      ["玉掛け", "玉掛"],
      ["資格", "就業制限", "何号"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第61条" },
      { law: "労働安全衛生法施行令", articleNum: "第20条" },
      { law: "労働安全衛生規則", articleNum: "第41条" },
    ],
  },
  {
    // 玉掛け技能講習
    triggers: ["玉掛け技能講習", "玉掛け", "玉掛", "玉掛け作業"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第221条" },
      { law: "クレーン等安全規則", articleNum: "第222条" },
    ],
  },
  {
    // クレーン運転資格（クレーン=第22条・移動式クレーン=第68条の就業制限）
    // 旧 pin の第73〜75条は実際には搭乗の制限・立入禁止であり運転資格と無関係のため削除
    // （2026-06-10 e-Gov全件突合で条番号⇄内容のずれを是正）。
    triggers: ["クレーン運転", "クレーン免許", "床上操作式"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第22条" },
      { law: "クレーン等安全規則", articleNum: "第68条" },
    ],
    excludeTriggers: ["移動式クレーン"],
  },
  {
    // クレーン定期自主検査（第34条=年次・第35条=月次・第38条=記録）
    triggers: ["クレーン定期自主検査", "クレーン自主検査", "クレーンの定期"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第34条" },
      { law: "クレーン等安全規則", articleNum: "第35条" },
      { law: "クレーン等安全規則", articleNum: "第38条" },
    ],
  },
  {
    // 安全装置の異常・機能確認は、月例自主検査（35条）と作業開始前点検（36条）。
    // 「クレーン」単独や「安全装置」単独では発火させない。
    triggers: [],
    allTriggerGroups: [
      ["クレーン"],
      ["安全装置", "巻過防止装置", "警報装置"],
      ["機能", "異常", "点検", "機能保持"],
    ],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第35条" },
      { law: "クレーン等安全規則", articleNum: "第36条" },
    ],
  },
  {
    // 石綿使用建築物等解体作業の作業計画（石綿則4条）。
    triggers: [],
    allTriggerGroups: [
      ["石綿", "アスベスト", "石綿則"],
      ["作業計画", "計画作成"],
    ],
    pins: [{ law: "石綿障害予防規則", articleNum: "第4条" }],
  },
  {
    // 石綿事前調査
    triggers: ["石綿事前調査", "アスベスト事前調査", "石綿の事前調査", "石綿作業の事前調査", "事前調査"],
    allTriggerGroups: [
      ["石綿", "アスベスト", "石綿含有建材"],
      ["解体前", "改修前", "工事前", "着工前"],
    ],
    pins: [{ law: "石綿障害予防規則", articleNum: "第3条" }],
  },
  {
    // 酸素欠乏の定義（18%未満）を尋ねる場合は、防止措置より定義条文を先に返す。
    triggers: ["酸素濃度18", "酸欠の定義", "酸素欠乏の定義"],
    allTriggerGroups: [
      ["酸欠", "酸素欠乏"],
      ["何パーセント", "何%", "何％", "濃度", "定義"],
    ],
    pins: [{ law: "酸素欠乏症等防止規則", articleNum: "第2条" }],
  },
  {
    // 酸欠作業前の換気
    triggers: [
      "酸欠換気",
      "酸欠の換気",
      "酸素欠乏作業前の換気",
      "酸欠作業前の換気",
      // 2026-07-03 T6: fresh eval Q79「酸素欠乏症等の防止措置（換気・呼吸用保護具）」型の
      // 言い回しを追加（換気PINの excludeTriggers と対で導入）。
      "酸素欠乏症等の防止措置",
      "酸素欠乏の防止措置",
      "酸欠の防止措置",
    ],
    allTriggerGroups: [
      ["酸欠", "酸素欠乏"],
      ["換気", "酸素不足", "対策", "作業前"],
    ],
    pins: [
      { law: "酸素欠乏症等防止規則", articleNum: "第5条" },
      { law: "酸素欠乏症等防止規則", articleNum: "第5条の2" },
    ],
  },
  {
    // 「酸欠作業の資格」は役割によって答えが異なる。作業主任者の技能講習
    // （11条）だけを返すと、従事労働者への特別教育（12条）を見落とすため、
    // 資格・教育を尋ねる広い質問では必ず対で返す。
    triggers: [
      "酸素欠乏危険作業特別教育",
      "酸欠特別教育",
      "酸欠則第12条",
    ],
    allTriggerGroups: [
      ["酸欠", "酸素欠乏"],
      ["資格", "免許", "講習", "教育", "受講"],
    ],
    pins: [
      { law: "酸素欠乏症等防止規則", articleNum: "第11条" },
      { law: "酸素欠乏症等防止規則", articleNum: "第12条" },
    ],
  },
  {
    // 酸欠作業主任者
    triggers: ["酸欠作業主任者", "酸素欠乏危険作業主任者"],
    pins: [{ law: "酸素欠乏症等防止規則", articleNum: "第11条" }],
  },
  {
    // 第一種・第二種酸素欠乏危険作業の区分は酸欠則2条の定義。
    triggers: [],
    allTriggerGroups: [
      ["酸素欠乏危険作業", "酸欠危険作業"],
      ["第1種", "第一種"],
      ["第2種", "第二種", "違い", "区分"],
    ],
    pins: [{ law: "酸素欠乏症等防止規則", articleNum: "第2条" }],
  },
  {
    // セクハラ・マタハラ
    triggers: ["セクシュアルハラスメント", "セクハラ", "性的言動"],
    pins: [{ law: "均等法", articleNum: "第11条" }],
  },
  {
    triggers: ["マタニティハラスメント", "マタハラ", "妊娠出産", "妊娠・出産", "妊娠・出産等"],
    pins: [
      { law: "均等法", articleNum: "第11条の3" },
      { law: "均等法", articleNum: "第12条" },
    ],
  },
  {
    // 高さ2m以上・開口部等の墜落防止
    triggers: [
      "高さが2m以上",
      "高さ2メートル",
      "高さ二メートル",
      "高さ何メートル以上",
      "墜落しないため",
      "墜落のおそれ",
      "屋根や床の開口部",
      "開口部の手すり",
      "囲い・手すり",
      "開口部の養生",
      "開口部の囲い",
    ],
    allTriggerGroups: [
      ["墜落", "フルハーネス", "墜落制止用器具", "開口部"],
      ["高さ", "何メートル", "手すり", "柵", "養生", "囲い", "墜落防止", "落ち"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第518条" },
      { law: "労働安全衛生規則", articleNum: "第519条" },
      { law: "労働安全衛生規則", articleNum: "第520条" },
      { law: "労働安全衛生規則", articleNum: "第521条" },
    ],
  },
  {
    // 貨物自動車の荷積み・荷卸し時の保護帽（安衛則151条の74）。
    // 一般的な保護帽539条より先に、車両・荷役・保護帽の3概念共起で限定する。
    triggers: [],
    allTriggerGroups: [
      ["トラック", "貨物自動車"],
      ["荷積み", "荷下ろし", "荷卸し", "荷を積む", "荷を卸す"],
      ["ヘルメット", "保護帽"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の74" },
    ],
  },
  {
    // 保護帽（現場語「ヘルメット」）
    triggers: ["ヘルメットはどんな作業", "ヘルメットをかぶる", "保護帽の着用"],
    allTriggerGroups: [
      ["ヘルメット", "保護帽"],
      ["必要", "義務", "必須", "どんな作業", "どんな時"],
    ],
    pins: [{ law: "労働安全衛生規則", articleNum: "第539条" }],
  },
  {
    // 脚立・はしご
    triggers: ["脚立やはしご", "脚立・はしご", "はしごで作業", "脚立で作業"],
    allTriggerGroups: [
      ["脚立", "はしご", "梯子"],
      ["作業", "使う", "安全", "決まり", "ルール"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第526条" },
      { law: "労働安全衛生規則", articleNum: "第518条" },
    ],
  },
  {
    // 年少者の深夜業制限は労基法61条。危険業務を列挙する年少者則8条とは分離する。
    triggers: [],
    allTriggerGroups: [
      ["年少者", "18歳未満", "十八歳未満"],
      ["深夜業", "深夜労働", "午後10時", "午後十時"],
    ],
    pins: [{ law: "労働基準法", articleNum: "第61条" }],
  },
  {
    // 年少者の危険業務就業制限
    triggers: ["年少者にクレーン", "18歳未満の年少者", "満18歳に満たない"],
    pins: [{ law: "年少者労働基準規則", articleNum: "第8条" }],
  },
  {
    // 通勤災害
    triggers: ["通勤災害", "通勤途上災害"],
    pins: [
      { law: "労働者災害補償保険法", articleNum: "第7条" },
    ],
  },
  {
    // 労基法上の使用者による療養補償（75条）と、労災保険の療養補償給付を分離。
    triggers: [],
    allTriggerGroups: [
      ["業務上負傷", "業務上の負傷", "業務上疾病", "業務上の疾病"],
      ["療養補償"],
    ],
    pins: [{ law: "労働基準法", articleNum: "第75条" }],
    excludeTriggers: ["療養補償給付", "労災保険", "請求"],
  },
  {
    // 業務災害に関する給付種類の列挙は労災保険法12条の8。
    triggers: [],
    allTriggerGroups: [
      ["業務災害", "業務上災害"],
      ["給付", "保険給付", "給付種類"],
    ],
    pins: [
      { law: "労働者災害補償保険法", articleNum: "第12条の8" },
    ],
  },
  {
    // 業務災害
    triggers: ["業務災害", "労災保険給付", "労災給付"],
    pins: [
      { law: "労働者災害補償保険法", articleNum: "第7条" },
      { law: "労働者災害補償保険法", articleNum: "第14条" },
    ],
  },
  {
    // 雇入れ時教育
    triggers: ["雇入れ時教育", "雇入れ時の教育", "雇入れ時の安全衛生教育"],
    allTriggerGroups: [
      ["雇入れ", "雇い入れ", "入社", "新人"],
      ["教育"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第59条" },
      { law: "労働安全衛生規則", articleNum: "第35条" },
    ],
  },
  {
    // 危険有害業務教育
    triggers: ["危険有害業務", "危険業務", "有害業務の教育"],
    pins: [{ law: "労働安全衛生法", articleNum: "第59条" }],
  },
  {
    // 屋内作業場の気積（安衛則600条）。
    triggers: ["気積"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第600条" }],
  },
  {
    // 屋内作業場の換気（安衛則601条）。酸欠・坑内・有機溶剤等は専用規則を優先。
    triggers: ["換気"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第601条" }],
    excludeTriggers: ["酸欠", "酸素欠乏", "坑内", "有機溶剤"],
  },
  {
    // 採光・照明方法と照明設備点検（安衛則605条）。604条の「照度」と分離する。
    triggers: ["採光", "採光及び照明"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第605条" }],
  },
  {
    // 温度単独は多義的なため、屋内作業場の衛生要素との共起時だけ606条へ。
    triggers: ["温湿度調節"],
    allTriggerGroups: [
      ["気積", "採光", "換気", "屋内作業場", "事務所衛生基準"],
      ["温度", "温湿度", "暑熱", "寒冷", "多湿"],
    ],
    pins: [{ law: "労働安全衛生規則", articleNum: "第606条" }],
  },
  {
    // 重量物・腰痛（重量物取扱いの制限は女性則第3条・年少者則第7条が法定根拠。
    // 年少者則は第7条＝重量物を取り扱う業務／第8条＝危険業務の就業制限で、重量物は第7条）
    triggers: ["重量物", "腰痛", "腰痛予防"],
    pins: [
      { law: "女性労働基準規則", articleNum: "第3条" },
      { law: "年少者労働基準規則", articleNum: "第7条" },
    ],
  },
  {
    // 作業指揮者（車両系荷役運搬機械等=第151条の4、車両系建設機械の修理等=第165条）
    // フォークリフト汎用 pin 群（後段）より先に置き、top-5 から押し出されないようにする。
    triggers: ["作業指揮者", "作業の指揮者"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の4" },
      { law: "労働安全衛生規則", articleNum: "第165条" },
    ],
  },
  {
    // 岩石落下のおそれがある場所で用いる特定の車両系建設機械のヘッドガード。
    // 機械名・落下危険・設備名の3概念が揃う場合だけ153条へ。
    triggers: [],
    allTriggerGroups: [
      [
        "車両系建設機械",
        "パワーショベル",
        "パワー・ショベル",
        "ドラグショベル",
        "トラクターショベル",
      ],
      ["岩石の落下", "岩が落ち", "落石"],
      ["ヘッドガード"],
    ],
    pins: [{ law: "労働安全衛生規則", articleNum: "第153条" }],
  },
  {
    // ゴンドラ操作
    triggers: ["ゴンドラ操作", "ゴンドラの特別教育"],
    pins: [{ law: "ゴンドラ安全規則", articleNum: "第12条" }],
  },
  {
    // 投下設備
    // NOTE(Phase 1a): 第536条 は corpus に未収録のため除外（PIN integrity test）。
    triggers: ["投下設備", "投下", "監視人配置", "上下作業"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第519条" },
    ],
  },
  {
    // デリック（定期自主検査 第119条=年次・第120条=月次）
    // 旧 pin の第111条は実際にはデリックの運転の合図であり、コーパスの旧「第111条=
    // 移動式クレーン定検」が誤りだったため是正（2026-06-10 e-Gov全件突合）。
    triggers: ["デリック設置", "デリック設置届", "デリック"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第119条" },
      { law: "クレーン等安全規則", articleNum: "第120条" },
    ],
  },
  {
    // クレーン検査証（第9条=交付・第10条=有効期間・第40条=性能検査）
    triggers: ["クレーン検査証", "検査証の有効期間", "クレーンの検査証", "クレーン検査"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第9条" },
      { law: "クレーン等安全規則", articleNum: "第10条" },
      { law: "クレーン等安全規則", articleNum: "第40条" },
    ],
  },
  {
    // ガス溶接の資格根拠を体系で問う場合だけ、資格者を具体化する安衛則41条まで返す。
    triggers: [],
    allTriggerGroups: [
      ["ガス溶接", "ガス溶断", "可燃性ガス"],
      ["資格", "技能講習"],
      ["根拠", "条文", "何条"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第61条" },
      { law: "労働安全衛生法施行令", articleNum: "第20条" },
      { law: "労働安全衛生規則", articleNum: "第41条" },
    ],
  },
  {
    // 就業制限（安衛法61条＋施行令20条セット）
    // フォークリフト以外の就業制限業務（玉掛け・移動式クレーン・建設機械・ガス溶接・電気取扱）をカバー
    explicitOnly: true,
    triggers: [
      "就業制限",
      "就業制限に係る業務",
      "就業制限業務",
      "安衛令第20条",
      "安衛令20条",
      "施行令第20条",
      "施行令20条",
      // ガス溶接（第10号）
      "ガス溶接技能講習",
      "ガス溶接",
      "ガス溶断",
      "ガス加熱",
      "アセチレン溶接",
      "ガス溶接の資格",
      "ガス溶接資格",
      "溶接の仕事は資格",
      "溶接の仕事 資格",
      "可燃性ガス",
      "施行令20条10号",
      "20条第10号",
      // 玉掛け（第16号）
      "玉掛け資格",
      "玉掛けの資格",
      "玉掛け技能講習",
      "玉掛けの業務",
      "施行令20条16号",
      "20条第16号",
      // 移動式クレーン（第7号）
      "移動式クレーン資格",
      "移動式クレーンの資格",
      "移動式クレーン運転資格",
      "移動式クレーン運転士",
      "施行令20条7号",
      "20条第7号",
      // 車両系建設機械（第12号）
      // 注: "車両系建設機械" 単体は除外（用途外使用 第164条 を引きたい質問と
      //     就業制限を引きたい質問の双方があり、単独トリガーだとフォークリフト系の
      //     第151条の5/14 が混ざってしまうため）。資格を明示するキーワードに限定する。
      "車両系建設機械の資格",
      "建設機械の資格",
      "ユンボを運転するのに資格",
      "ユンボの資格",
      "ユンボ 資格",
      "機体重量3トン",
      "施行令20条12号",
      "20条第12号",
      // 発破（第1号）
      "発破技士",
      // 揚貨装置（第2号）
      "揚貨装置運転士",
      // 潜水業務（第9号）
      "潜水士",
      "潜水業務",
      // 高所作業車（第15号）
      "高所作業車運転",
    ],
    allTriggerGroups: [
      [
        "ユンボ",
        "ショベルカー",
        "油圧ショベル",
        "車両系建設機械",
        "溶接",
        "溶断",
      ],
      ["資格", "講習", "免許", "運転", "操縦"],
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第61条" },
      { law: "労働安全衛生法施行令", articleNum: "第20条" },
    ],
  },
  {
    // 特化物の区分
    triggers: ["特定化学物質第1類", "特化物の区分", "第1類物質", "第2類物質", "第3類物質"],
    pins: [{ law: "特定化学物質障害予防規則", articleNum: "第2条" }],
  },
  {
    // 特化物 第1類 製造許可（第48条）— "許可" "第1類物質" 系の質問用
    triggers: ["第1類物質の製造", "第一類物質の製造", "特化第1類許可", "特化則第48条", "48条", "第1類 許可"],
    pins: [{ law: "特定化学物質障害予防規則", articleNum: "第48条" }],
  },
  {
    // 特化則 特殊健診（第39/40条）— "特定化学物質" + "健診/特殊健康診断" 系で安定化
    triggers: [
      "特定化学物質特殊健診",
      "特化則 特殊健診",
      "特化健診",
      "特化物特殊健診",
      "特化則第39条",
      "特化則第40条",
      "特定化学物質に係る業務",
      "特定化学物質業務",
      "特化物業務",
      "特定化学物質 特殊健康診断",
      "特定化学物質 特殊健診",
    ],
    pins: [
      { law: "特定化学物質障害予防規則", articleNum: "第39条" },
      { law: "特定化学物質障害予防規則", articleNum: "第40条" },
    ],
  },
  {
    // フォークリフト 定期自主検査（1年以内）安衛則第151条の21
    // 既存の汎用フォークリフト pin より先に走らせ、年次定期自主検査の条文番号を先頭に出す。
    triggers: [
      "フォークリフトの定期自主検査",
      "フォークリフト 年次自主検査",
      "フォークリフト年次",
      "フォークリフト 定期自主検査",
      "フォークリフト 1年",
      "フォークリフト 一年",
    ],
    allTriggerGroups: [
      ["フォークリフト"],
      ["定期自主検査"],
      ["年1回", "1年", "一年", "年次"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の21" },
    ],
  },
  {
    // フォークリフト等 用途外使用（第151条の14）。"主たる用途以外" と "フォークリフト" の併出を捕捉。
    triggers: [
      "フォークリフトを主たる用途以外",
      "フォークリフト用途以外",
      "フォークリフト 主たる用途",
      "フォークリフト 用途外",
      "フォークリフトの用途外",
      "フォークリフトの主たる用途",
      "フォークリフトを荷のつり上げ",
      "フォークリフトを荷",
      "フォークリフトの用途",
      // "フォークリフト" + "主たる用途以外" の組合せを最広で捕捉する
      "主たる用途以外で使用",
    ],
    allTriggerGroups: [
      ["フォークリフト"],
      ["人", "作業者", "労働者"],
      ["パレット", "フォーク", "爪"],
      ["乗せ", "持ち上げ", "運搬"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の14" },
    ],
  },
  {
    // 重大事故報告（安衛則第96条）— 第97条（死傷病報告）と区別する pin
    triggers: ["重大事故報告", "事故報告書", "事故報告", "重大事故", "安衛則第96条", "96条"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第96条" }],
  },
  {
    // 危険または有害な業務 教育義務（安衛法第59条）
    triggers: ["危険または有害な業務", "危険若しくは有害な業務", "危険又は有害な業務"],
    pins: [{ law: "労働安全衛生法", articleNum: "第59条" }],
  },
  {
    // 作業主任者の選任根拠 安衛法第14条（"プレス機械" "酸欠" 単体に圧倒される対策）
    triggers: ["作業主任者の選任根拠", "作業主任者を定める法律", "作業主任者は何条", "プレス機械や酸欠"],
    pins: [{ law: "労働安全衛生法", articleNum: "第14条" }],
  },
  {
    // クレーン 設置届出（クレーン則第5条）
    triggers: ["クレーンの設置届出", "クレーン設置届", "クレーン設置届出", "つり上げ荷重3トン以上のクレーン設置"],
    pins: [{ law: "クレーン等安全規則", articleNum: "第5条" }],
  },
  {
    // クレーン 製造許可（クレーン則第3条）
    triggers: ["クレーンの製造許可", "クレーン製造", "つり上げ荷重5トン以上のクレーン製造", "クレーン製造許可"],
    pins: [{ law: "クレーン等安全規則", articleNum: "第3条" }],
  },
  {
    // 移動式クレーン 定格荷重表示（クレーン則第70条の2）
    triggers: ["移動式クレーン定格荷重表示", "定格荷重表示", "定格荷重を表示", "定格荷重の表示"],
    pins: [{ law: "クレーン等安全規則", articleNum: "第70条の2" }],
  },
  {
    // 移動式クレーン 過負荷の制限
    // NOTE(Phase 1a): 第23条 は corpus に未収録のため除外（PIN integrity test）。
    triggers: ["定格荷重を超える", "定格荷重を超え", "過負荷の制限", "過負荷制限", "クレーンの過負荷", "移動式クレーンの定格荷重"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第69条" },
    ],
  },
  {
    // ゴンドラ 設置届（ゴンドラ則第10条）
    triggers: ["ゴンドラ設置届", "ゴンドラの設置届", "ゴンドラ設置届出"],
    pins: [{ law: "ゴンドラ安全規則", articleNum: "第10条" }],
  },
  {
    // ゴンドラ操作 特別教育（ゴンドラ則第12条）— "特別教育" 単体が安衛則第36条群に
    // 引っ張られるのを防ぐ
    triggers: ["ゴンドラ操作", "ゴンドラの操作", "ゴンドラ操作特別教育"],
    pins: [{ law: "ゴンドラ安全規則", articleNum: "第12条" }],
  },
  {
    // ボイラー 設置届（ボイラー則第10条 = 公式の設置届。2026-06-10 第3弾是正でコーパスも第10条に統一済み）
    triggers: ["ボイラー設置届", "ボイラーの設置届", "ボイラー設置届出"],
    pins: [{ law: "ボイラー及び圧力容器安全規則", articleNum: "第10条" }],
  },
  {
    // 車両系建設機械 用途外使用（安衛則第164条）
    // 注: "主たる用途以外" 単独ではフォークリフト Q (第151条の14) と競合するため、
    //     車両系建設機械を明示するトリガーに限定する。フォークリフト用途外は別 pin が捕捉する。
    triggers: ["車両系建設機械の用途", "車両系建設機械用途以外", "車両系建設機械主たる用途", "車両系建設機械の主たる用途", "用途以外の使用制限"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第164条" },
    ],
  },
  {
    // 局所排気装置 設置義務（有機則第5条が中核）
    // NOTE(Phase 1a): 第16条 は corpus に未収録のため除外（PIN integrity test）。
    triggers: ["局所排気装置の設置", "局排の設置", "局所排気装置設置義務", "有機溶剤局所排気"],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第5条" },
    ],
  },
  {
    // 有機溶剤の区分（第1/2/3種）— 有機則第1条
    triggers: ["有機溶剤の区分", "第1種有機溶剤", "第2種有機溶剤", "第3種有機溶剤", "有機溶剤 区分"],
    pins: [{ law: "有機溶剤中毒予防規則", articleNum: "第1条" }],
  },
  {
    // 電離放射線 被ばく線量限度
    triggers: ["電離放射線の被ばく線量", "被ばく線量限度", "実効線量限度", "等価線量限度"],
    pins: [
      { law: "電離放射線障害防止規則", articleNum: "第3条" },
      { law: "電離放射線障害防止規則", articleNum: "第8条" },
      // 旧コーパスの第2条の2（実在しない条）をe-Gov突合で是正：実効線量限度=第4条/等価線量限度=第5条
      { law: "電離放射線障害防止規則", articleNum: "第4条" },
      { law: "電離放射線障害防止規則", articleNum: "第5条" },
    ],
  },
  {
    // パワハラ防止措置義務 労施法第30条の2
    triggers: ["パワハラ防止措置", "パワーハラスメント防止", "事業主のパワハラ防止", "労施法第30条の2", "30条の2"],
    pins: [{ law: "労働施策総合推進法", articleNum: "第30条の2" }],
  },
  {
    // 子の看護休暇 育介法第16条の2
    triggers: ["子の看護休暇", "看護休暇", "子の看護"],
    pins: [{ law: "育児・介護休業法", articleNum: "第16条の2" }],
  },
  {
    // じん肺管理4 取扱い じん肺法第23条
    triggers: ["じん肺管理4", "じん肺 管理4", "管理4と決定", "管理四と決定"],
    pins: [{ law: "じん肺法", articleNum: "第23条" }],
  },
  {
    // 安全衛生教育の記録保存 安衛則第38条
    triggers: ["安全衛生教育の記録", "教育記録の保存", "教育記録 3年", "安衛則第38条", "教育の実施記録"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第38条" },
      { law: "労働安全衛生法", articleNum: "第59条" },
    ],
  },
  {
    // 店社安全衛生管理者 安衛法第15条の3
    triggers: ["店社安全衛生管理者", "店社安全管理者", "店社安衛管理者", "店社", "15条の3", "安衛法第15条の3"],
    pins: [{ law: "労働安全衛生法", articleNum: "第15条の3" }],
  },
  {
    // 等価騒音85dB 安衛則第588条
    triggers: ["等価騒音85dB", "85dB以上の作業場", "騒音作業場の措置", "安衛則第588条", "588条"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第588条" }],
  },
  {
    // 漏電遮断装置 安衛則第333条 / 自動電撃防止装置 第332条
    triggers: ["漏電遮断装置", "感電防止用漏電遮断", "漏電遮断器"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第333条" }],
  },
  {
    triggers: ["自動電撃防止装置", "アーク溶接機の電撃防止", "交流アーク溶接電撃防止"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第332条" }],
  },
  {
    // 電気機械器具 使用前点検 安衛則第352条
    triggers: ["電気機械器具の点検", "電気機械器具使用前点検", "絶縁用保護具の点検"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第352条" }],
  },
  {
    // プレス機械 安全装置 安衛則第131条
    triggers: ["プレス機械の安全装置", "動力プレスの安全装置", "プレス安全装置"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第131条" }],
  },
  {
    // 研削といし 覆い 安衛則第117条
    triggers: ["研削といしの覆い", "研削盤の覆い", "研削といし覆い"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第117条" }],
  },
  {
    // 研削といしの取替え等は特別教育対象（安衛則第36条）
    triggers: ["グラインダーの砥石の交換", "砥石の交換は資格", "研削といしの取替え"],
    allTriggerGroups: [
      ["グラインダー", "研削といし", "砥石"],
      ["交換", "取替え", "資格", "講習"],
    ],
    pins: [{ law: "労働安全衛生規則", articleNum: "第36条" }],
  },
  {
    // 事務作業の照度
    triggers: ["事務作業に必要な照度", "事務所の照度", "照度は何ルクス"],
    pins: [{ law: "事務所衛生基準規則", articleNum: "第10条" }],
  },
  {
    // 機械等による危険の防止
    triggers: ["安全カバーが邪魔", "安全カバーを外して", "機械の安全カバー"],
    pins: [{ law: "労働安全衛生法", articleNum: "第20条" }],
  },
  {
    // 定期健康診断の口語表現
    triggers: ["健康診断って毎年", "健診って毎年", "毎年やらないとダメ"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第44条" }],
  },
  {
    // 危険有害物の容器・包装への表示
    triggers: ["容器に表示", "ラベル表示", "危険物の表示"],
    pins: [{ law: "労働安全衛生法", articleNum: "第57条" }],
  },
  {
    // 酸素欠乏危険場所の作業前測定
    triggers: ["酸素濃度測定", "酸素濃度を測定", "酸欠作業前の測定"],
    pins: [{ law: "酸素欠乏症等防止規則", articleNum: "第3条" }],
  },
  {
    // 時間外・休日労働の協定
    triggers: ["36協定", "三六協定", "時間外・休日労働"],
    pins: [{ law: "労働基準法", articleNum: "第36条" }],
  },
  {
    // 妊産婦 時間外労働制限 労基法第66条
    triggers: ["妊産婦の時間外", "妊産婦時間外労働", "妊産婦の労働時間制限"],
    pins: [{ law: "労働基準法", articleNum: "第66条" }],
  },
  {
    // 年次有給休暇 労基法第39条
    triggers: ["年次有給休暇の付与", "年休の付与", "労基法第39条", "年5日"],
    pins: [{ law: "労働基準法", articleNum: "第39条" }],
  },
  {
    // 解雇予告 労基法第20条（Fable差分監査F5・GQ23=RAGスコア0.12でno-hit経路に落ちていた）
    triggers: ["解雇予告", "解雇の予告", "予告手当", "解雇予告手当"],
    pins: [{ law: "労働基準法", articleNum: "第20条" }],
  },
  {
    // 粉じん作業対策
    triggers: ["粉じん作業", "特定粉じん発生源"],
    pins: [
      { law: "粉じん障害防止規則", articleNum: "第4条" },
      { law: "粉じん障害防止規則", articleNum: "第22条" },
      { law: "粉じん障害防止規則", articleNum: "第27条" },
    ],
  },
  {
    // 足場手すり（安衛則第563条）— 高さ85cm／中さん35-50cm
    // 足場用墜落防止設備の強化は2009年6月施行。2015年に中さん等が初導入されたものではない。
    triggers: [
      "足場の手すり",
      "足場の作業床",
      "手すり高さ",
      "85cm",
      "85センチ",
      "中さん",
      "中桟",
      "わく組足場",
      "交さ筋かい",
      "幅木",
      "墜落防止設備",
      "563条",
      "第563条",
      "2015年改正",
      "平成27年改正",
    ],
    allTriggerGroups: [
      ["足場"],
      ["手すり", "手摺"],
    ],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第563条" },
      { law: "労働安全衛生規則", articleNum: "第552条" },
    ],
  },
  // フォークリフトは「資格」だけで検査・速度・用途外使用の条文を混ぜない。
  // 資格の1t未満/以上分岐は applyPinnedTopics の条件付き根拠束で扱い、
  // 個別の運用規定は、その意図が明示されたときだけ固定する。
  {
    triggers: ["フォークリフトの制限速度", "151条の5"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第151条の5" }],
  },
  {
    triggers: ["フォークリフトの用途外使用", "151条の14"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第151条の14" }],
  },
  {
    triggers: ["フォークリフトの定期自主検査", "151条の21"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第151条の21" }],
  },
];

function applyPinnedTopics(
  query: string,
  articles: LawArticle[],
  explicitQuery = query,
  pinSource: readonly LawArticle[] = verifiedRagArticles
): { articles: LawArticle[]; hadPins: boolean } {
  const normalizedQuery = query.normalize("NFKC");
  const pinned: LawArticle[] = [];
  const seen = new Set<string>();

  const addPinnedArticle = (article: LawArticle | undefined) => {
    if (!article) return;
    const key = `${article.law}:${article.articleNum}`;
    if (seen.has(key)) return;
    seen.add(key);
    pinned.push(article);
  };

  // 法令名（正式名または略称）と条番号が明示された質問は、その組合せを最優先する。
  // 「労働安全衛生法」は「同法施行令」の部分文字列でもあるため、最長一致した
  // 法令名グループだけを採用し、条番号だけから法令を推測しない。
  const normalizedExplicitQuery = explicitQuery
    .normalize("NFKC")
    .replace(/衞/g, "衛");
  const normalizedElectricalQuery = normalizeElectricalWorkText(
    normalizedExplicitQuery,
  );
  const electricalMeaning = extractElectricalMeaning(normalizedElectricalQuery);
  const hasElectricalWorkContext =
    electricalMeaning.topicDomain === "electrical" ||
    /(?:電気|電源|電工|電路|制御盤|分電盤|配電盤|受電盤|ブレーカー|開閉器|テスター|絶縁測定|配線|結線|活線|充電部|低圧|高圧|特高)/.test(
      normalizedElectricalQuery,
    );
  const asksElectricalQualification =
    hasElectricalWorkContext &&
    (electricalMeaning.qualificationType !== undefined ||
      /(?:資格|免許|教育|特別教育|特教|講習|作業主任者)/.test(
        normalizedElectricalQuery,
      ));
  const asksElectricalWorkChief =
    hasElectricalWorkContext && /作業主任者/.test(normalizedElectricalQuery);
  const articleNumbers = normalizedExplicitQuery.match(/第\d+条(?:の\d+)*/g) ?? [];
  const explicitLawGroups = [
    ...LAW_ALIAS_GROUPS,
    ["安全衛生特別教育規程", "特別教育規程"],
    ["電気事業法", "電事法"],
    ["電気工事士法施行令", "電工士法令"],
    ["電気工事士法施行規則", "電工士法則"],
  ];
  const explicitLawGroup = explicitLawGroups.map((group) => ({
    group,
    matchedAlias: group
      .map((alias) => alias.normalize("NFKC"))
      .filter((alias) => normalizedExplicitQuery.includes(alias))
      .sort((a, b) => b.length - a.length)[0],
  }))
    .filter(
      (candidate): candidate is { group: string[]; matchedAlias: string } =>
        Boolean(candidate.matchedAlias)
    )
    .sort((a, b) => b.matchedAlias.length - a.matchedAlias.length)[0]?.group;

  if (explicitLawGroup && articleNumbers.length > 0) {
    for (const articleNum of articleNumbers) {
      addPinnedArticle(
        pinSource.find(
          (article) =>
            explicitLawGroup.includes(article.lawShort) &&
            article.articleNum === articleNum
        )
      );
    }
  }

  const pinArticle = (lawShort: string, articleNum: string) => {
    addPinnedArticle(
      pinSource.find(
        (article) =>
          article.lawShort === lawShort && article.articleNum === articleNum
      )
    );
  };

  // つり足場の日常点検は、つり足場を除外する567条1項ではなく568条が
  // 直接根拠。568条が参照する点検項目を確認できるよう567条2項も補助取得する。
  if (
    /(?:つり|吊り)足場/.test(normalizedExplicitQuery) &&
    /(?:点検|始業前|使用前|作業開始前|毎日|毎作業日)/.test(
      normalizedExplicitQuery,
    )
  ) {
    pinArticle("安衛則", "第568条");
    pinArticle("安衛則", "第567条");
  }

  // つり足場の構造・使用基準は安衛則574条が直接根拠。一般の足場用
  // 墜落防止規定（518条以下、563条）が字面検索で先行しても埋もれさせない。
  if (
    /(?:つり|吊り)足場/.test(normalizedExplicitQuery) &&
    /(?:構造|基準|使用|ワイヤ|ロープ|鎖|作業床|幅)/.test(
      normalizedExplicitQuery,
    )
  ) {
    pinArticle("安衛則", "第574条");
  }

  // フォークリフトの複合質問では、現在尋ねられた運用規定を先に確保し、
  // その後へ資格・教育の根拠束を補助取得する。資格5条文だけでtop-5を
  // 埋めて、速度・検査・用途外使用・作業指揮者の直接根拠を落とさない。
  const forkliftIntent = detectForkliftQueryIntent(
    normalizedExplicitQuery,
    normalizedQuery,
  );
  const highLiftIntent = detectHighLiftQueryIntent(
    normalizedExplicitQuery,
    normalizedQuery,
  );
  if (forkliftIntent.hasForkliftContext) {
    if (forkliftIntent.speed) {
      pinArticle("安衛則", "第151条の5");
    }
    if (forkliftIntent.annualInspection) {
      pinArticle("安衛則", "第151条の21");
    }
    if (forkliftIntent.monthlyInspection) {
      pinArticle("安衛則", "第151条の22");
    }
    if (forkliftIntent.genericInspection) {
      pinArticle("安衛則", "第151条の21");
      pinArticle("安衛則", "第151条の22");
    }
    if (forkliftIntent.offPurposeUse) {
      pinArticle("安衛則", "第151条の14");
    }
    if (forkliftIntent.workLeader) {
      pinArticle("安衛則", "第151条の4");
    }
  }

  // 広い制度PIN（例: 健診全般、墜落全般）より、質問中で確定した電気の
  // 行為・電圧・充電状態を先に置く。「点検」という一語を定期自主検査や
  // 性能検査へ落とさず、実際の行為へ直接対応する一次資料を取得する。
  if (hasElectricalWorkContext) {
    const action = electricalMeaning.workAction;
    const voltage = electricalMeaning.voltageClass;
    const state = electricalMeaning.energizedState;
    const asksSpecialEducation =
      electricalMeaning.qualificationType === "special-education" ||
      /(?:特別教育|特教|低圧教育|高圧教育)/.test(normalizedElectricalQuery);
    const asksElectrician = /(?:電気工事士|電工|免状)/.test(
      normalizedElectricalQuery,
    );
    const asksSchemeComparison = asksSpecialEducation && asksElectrician;
    const asksChiefElectricalEngineer =
      electricalMeaning.qualificationType === "chief-electrical-engineer" ||
      /(?:電気主任技術者|主任技術者)/.test(normalizedElectricalQuery);
    const asksWorkLeader =
      electricalMeaning.qualificationType === "work-leader" ||
      /(?:作業指揮者|作業の指揮者)/.test(normalizedElectricalQuery);

    if (asksElectricalWorkChief) {
      // 電気作業全般に一律の作業主任者はない。制度本体（法14条）、
      // 対象作業（令6条）と、電気編の作業指揮者（則350条）を区別する。
      // 令6条1号の「高圧室内作業」は圧気作業であり高圧電気ではない。
      pinArticle("安衛法", "第14条");
      pinArticle("安衛令", "第6条");
      pinArticle("安衛則", "第350条");
    } else if (asksWorkLeader) {
      pinArticle("安衛則", "第350条");
      pinArticle("安衛則", "第339条");
    } else if (asksChiefElectricalEngineer) {
      // 主任技術者は設備の保安監督。個々の工事資格・特別教育の代替ではない。
      pinArticle("電事法", "第43条");
      pinArticle("電事法", "第42条");
      pinArticle("電気工事士法", "第2条");
      pinArticle("電気工事士法", "第3条");
    } else if (asksSchemeComparison) {
      pinArticle("電気工事士法", "第2条");
      pinArticle("電気工事士法", "第3条");
      pinArticle("安衛則", "第36条");
      pinArticle("特別教育規程", "第6条");
      pinArticle("特別教育規程", "第5条");
      pinArticle("安衛法", "第59条");
    } else if (
      action === "wiring-connection" ||
      action === "wiring-removal" ||
      action === "repair"
    ) {
      // 設置・変更に当たる配線作業は電気工事士制度を先行。軽微な工事・
      // 作業の範囲も同時取得し、一律断定を避ける。
      if (state === "de-energized" || action === "wiring-removal") {
        pinArticle("安衛則", "第339条");
        pinArticle("安衛則", "第350条");
      }
      pinArticle("電気工事士法", "第2条");
      pinArticle("電気工事士法", "第3条");
      pinArticle("電工士法則", "第2条");
      pinArticle("電工士法令", "第1条");
    } else if (
      action === "tester-measurement" ||
      action === "insulation-measurement" ||
      action === "open-panel"
    ) {
      // 測定器を配線へ損傷なく当てる場合の電工士法上の扱いを最優先し、
      // 充電部の取扱い/近接に対する安衛則を電圧別に続ける。
      if (action !== "open-panel") {
        pinArticle("経産省電工Q&A", "Q9・Q10");
      }
      if (voltage === "高圧") {
        pinArticle("安衛則", "第341条");
        pinArticle("安衛則", "第342条");
      } else if (voltage === "特別高圧") {
        pinArticle("安衛則", "第344条");
        pinArticle("安衛則", "第345条");
      } else if (voltage === "低圧") {
        pinArticle("安衛則", "第346条");
        pinArticle("安衛則", "第347条");
      } else {
        pinArticle("安衛則", "第346条");
        pinArticle("安衛則", "第347条");
        pinArticle("安衛則", "第341条");
        pinArticle("安衛則", "第342条");
      }
      pinArticle("安衛則", "第36条");
      if (voltage === "高圧" || voltage === "特別高圧") {
        pinArticle("特別教育規程", "第5条");
      } else if (voltage === "低圧") {
        pinArticle("特別教育規程", "第6条");
      } else {
        pinArticle("特別教育規程", "第6条");
        pinArticle("特別教育規程", "第5条");
      }
    } else if (action === "de-energized-work" || state === "de-energized") {
      pinArticle("安衛則", "第339条");
      pinArticle("安衛則", "第350条");
    } else if (action === "live-proximity-work" || state === "proximity") {
      if (voltage === "特別高圧") {
        pinArticle("安衛則", "第345条");
      } else if (voltage === "高圧") {
        pinArticle("安衛則", "第342条");
      } else if (voltage === "低圧") {
        pinArticle("安衛則", "第347条");
      } else {
        pinArticle("安衛則", "第347条");
        pinArticle("安衛則", "第342条");
        pinArticle("安衛則", "第345条");
      }
    } else if (action === "live-work" || state === "energized") {
      if (voltage === "特別高圧") {
        pinArticle("安衛則", "第344条");
      } else if (voltage === "高圧") {
        pinArticle("安衛則", "第341条");
      } else if (voltage === "低圧") {
        pinArticle("安衛則", "第346条");
      } else {
        pinArticle("安衛則", "第346条");
        pinArticle("安衛則", "第341条");
        pinArticle("安衛則", "第344条");
      }
    } else if (action === "breaker-operation") {
      // 低圧は「区画場所の露出充電部をもつ開閉器」、高圧・特高は
      // 充電電路の操作という対象条件を告示本文で確認できる順序にする。
      if (voltage === "低圧") {
        pinArticle("特別教育規程", "第6条");
      } else if (voltage === "高圧" || voltage === "特別高圧") {
        pinArticle("特別教育規程", "第5条");
      } else {
        pinArticle("特別教育規程", "第6条");
        pinArticle("特別教育規程", "第5条");
      }
      pinArticle("安衛則", "第36条");
    } else if (action === "high-voltage-facility-inspection") {
      pinArticle("特別教育規程", "第5条");
      pinArticle("安衛則", "第36条");
      pinArticle("安衛則", "第341条");
      pinArticle("安衛則", "第342条");
      pinArticle("電事法", "第43条");
    } else if (action === "start-of-work-inspection") {
      // 352条は列挙された電気機械器具等の使用前点検であり、あらゆる
      // 電気設備の点検者資格を定める条文ではない。制度境界も続けて取得する。
      pinArticle("安衛則", "第352条");
      pinArticle("電気工事士法", "第2条");
      pinArticle("電気工事士法", "第3条");
      pinArticle("安衛則", "第36条");
      pinArticle("特別教育規程", "第5条");
      pinArticle("特別教育規程", "第6条");
    } else if (
      action === "visual-inspection" ||
      action === "indicator-check" ||
      action === "noise-odor-check"
    ) {
      pinArticle("電気工事士法", "第2条");
      pinArticle("安衛則", "第352条");
    } else if (asksSpecialEducation) {
      pinArticle("安衛則", "第36条");
      if (voltage === "低圧") {
        pinArticle("特別教育規程", "第6条");
        pinArticle("安衛則", "第346条");
        pinArticle("安衛則", "第347条");
      } else if (voltage === "高圧" || voltage === "特別高圧") {
        pinArticle("特別教育規程", "第5条");
        pinArticle("安衛則", voltage === "特別高圧" ? "第344条" : "第341条");
        pinArticle("安衛則", voltage === "特別高圧" ? "第345条" : "第342条");
      } else {
        pinArticle("特別教育規程", "第6条");
        pinArticle("特別教育規程", "第5条");
      }
      pinArticle("安衛法", "第59条");
    } else if (
      asksElectricalQualification &&
      !/(?:点検|検査|確認)/.test(normalizedElectricalQuery)
    ) {
      // 広い資格質問でも、電気工事士と電気取扱業務の特別教育を対で返す。
      pinArticle("電気工事士法", "第3条");
      pinArticle("電気工事士法", "第2条");
      pinArticle("安衛法", "第59条");
      pinArticle("安衛則", "第36条");
      pinArticle("特別教育規程", "第6条");
      pinArticle("特別教育規程", "第5条");
      pinArticle("電事法", "第43条");
    } else if (/点検|検査|確認/.test(normalizedElectricalQuery)) {
      // 点検の広い質問では「見るだけ」から充電部取扱い・高圧点検・
      // 配線変更まで主要分岐を一度で説明できる根拠束を返す。
      pinArticle("特別教育規程", "第5条");
      pinArticle("特別教育規程", "第6条");
      pinArticle("安衛則", "第36条");
      pinArticle("安衛則", "第341条");
      pinArticle("安衛則", "第346条");
      pinArticle("安衛則", "第347条");
      pinArticle("経産省電工Q&A", "Q9・Q10");
      pinArticle("電気工事士法", "第2条");
      pinArticle("電気工事士法", "第3条");
      pinArticle("電事法", "第43条");
    }

    // 充電部を扱う/近接する作業では、作業種別の直接条文に続けて
    // 特別教育の対象業務と課程を取得する。配線資格とは別制度として扱う。
    const hasChargedWork =
      action === "live-work" ||
      action === "live-proximity-work" ||
      state === "energized" ||
      state === "proximity";
    if (hasChargedWork || asksSpecialEducation) {
      pinArticle("安衛則", "第36条");
      if (voltage === "高圧" || voltage === "特別高圧") {
        pinArticle("特別教育規程", "第5条");
      } else if (voltage === "低圧") {
        pinArticle("特別教育規程", "第6条");
      } else {
        pinArticle("特別教育規程", "第6条");
        pinArticle("特別教育規程", "第5条");
      }
    }
  }
  if (highLiftIntent.fallProtection) {
    pinArticle("安衛則", "第194条の22");
  }
  if (
    !highLiftIntent.fallProtection &&
    /(?:フルハーネス|墜落制止用器具)/.test(normalizedQuery) &&
    /(?:教育|特別教育|特教|作業床)/.test(normalizedQuery)
  ) {
    pinArticle("安衛則", "第36条");
    pinArticle("安衛法", "第59条");
  }
  if (highLiftIntent.qualification) {
    pinArticle("安衛令", "第10条");
    pinArticle("安衛則", "第36条");
    pinArticle("安衛法", "第59条");
    pinArticle("安衛法", "第61条");
    pinArticle("安衛令", "第20条");
  }
  if (
    /(?:有機溶剤|有機則|シンナー)/.test(normalizedQuery) &&
    /(?:健康診断|健診)/.test(normalizedExplicitQuery)
  ) {
    pinArticle("有機則", "第29条");
  }
  if (
    /(?:特定化学物質|特化物|特化則)/.test(normalizedQuery) &&
    /(?:健康診断|健診)/.test(normalizedExplicitQuery)
  ) {
    pinArticle("特化則", "第39条");
  }
  if (
    /(?:床開口部|開口部|床の穴)/.test(normalizedQuery) &&
    /(?:囲い|手すり|養生|墜落|落ち|高さ)/.test(normalizedQuery)
  ) {
    pinArticle("安衛則", "第519条");
  }
  if (
    /(?:足場|あしば)/.test(normalizedExplicitQuery) &&
    /(?:墜落|転落|落ちない|墜落防止)/.test(normalizedExplicitQuery) &&
    !/(?:手すり|手摺|中さん|中桟|特別教育|特教)/.test(
      normalizedExplicitQuery,
    )
  ) {
    // 足場からの墜落を広く尋ねる質問では、作業主任者の一般規定より先に、
    // 作業床と端・開口部の具体的な墜落防止規定を案内する。
    pinArticle("安衛則", "第518条");
    pinArticle("安衛則", "第519条");
  }
  if (
    /(?:足場|あしば|安衛則\s*第?563条|労働安全衛生規則\s*第?563条)/.test(
      normalizedQuery,
    ) &&
    /(?:手すり|手摺|中さん|中桟|何センチ|何cm)/i.test(normalizedQuery)
  ) {
    // 第563条が足場種別ごとの設置義務、第552条が「手すり等・中桟等」の
    // 高さを定義するため、数値を断定するときは必ず両方を返す。
    pinArticle("安衛則", "第563条");
    pinArticle("安衛則", "第552条");
  }
  if (
    /(?:手すり|手摺)/.test(normalizedExplicitQuery) &&
    !/(?:足場|あしば|開口部|床の穴|架設通路|階段|作業構台|高所作業車)/.test(
      normalizedExplicitQuery,
    )
  ) {
    // 文脈のない「手すり」は、現場質問で最頻の足場用墜落防止設備を暫定候補にする。
    // 開口部等が明示された場合は既存の個別PINへ譲り、一律85cmとは扱わない。
    pinArticle("安衛則", "第563条");
    pinArticle("安衛則", "第552条");
  }
  if (
    /(?:有機溶剤|有機則|シンナー|塗装|ペンキ)/.test(normalizedQuery) &&
    /(?:屋内|室内|建物内|タンク内)/.test(normalizedExplicitQuery) &&
    /(?:使|使用|扱|塗|作業)/.test(normalizedExplicitQuery)
  ) {
    // 溶剤区分・臨時性・短時間性が未確定でも、主要措置と例外条件を先に説明できる根拠束。
    pinArticle("有機則", "第5条");
    pinArticle("有機則", "第6条");
    pinArticle("有機則", "第8条");
    pinArticle("有機則", "第9条");
    if (/特別有機溶剤/.test(normalizedExplicitQuery)) {
      pinArticle("特化則", "第38条の8");
    }
  }
  if (
    /(?:定期健康診断|定期健診)/.test(normalizedQuery) ||
    (/(?:健康診断|健診)/.test(normalizedQuery) &&
      /(?:毎年|年1回|一年以内|頻度)/.test(normalizedQuery))
  ) {
    pinArticle("安衛則", "第44条");
  }
  if (
    /(?:雇入れ|雇い入れ)/.test(normalizedQuery) &&
    /(?:健康診断|健診)/.test(normalizedQuery)
  ) {
    pinArticle("安衛則", "第43条");
  }
  if (
    /(?:ストレスチェック|心理的な負担の程度を把握するための検査|心の健康[^。！？]{0,12}検査)/.test(
      normalizedQuery
    )
  ) {
    pinArticle("安衛法", "第66条の10");
  }
  if (
    /(?:化学物質|薬品|SDS対象物)/.test(normalizedQuery) &&
    /(?:リスクアセスメント|危険性評価)/.test(normalizedQuery)
  ) {
    pinArticle("安衛法", "第57条の3");
  }
  if (
    /クレーン/.test(normalizedQuery) &&
    /(?:月例|月次|一月以内|1月以内)/.test(normalizedQuery) &&
    /(?:自主検査|点検|検査)/.test(normalizedQuery)
  ) {
    pinArticle("クレーン則", "第35条");
  }
  if (
    /安全管理者/.test(normalizedQuery) &&
    /(?:選任|必要|義務|建設業|製造業|常時\d+人)/.test(normalizedQuery)
  ) {
    pinArticle("安衛法", "第11条");
  }

  if (/玉掛/.test(normalizedQuery)) {
    const slingLoadMatch = normalizedQuery.match(
      /(?:つり上げ荷重(?:は|が)?\s*)?(\d+(?:\.\d+)?)\s*(キロ|kg|トン|t)/i
    );
    if (slingLoadMatch) {
      const amount = Number(slingLoadMatch[1]);
      const unit = slingLoadMatch[2].toLowerCase();
      const loadInTons = unit === "キロ" || unit === "kg" ? amount / 1000 : amount;
      if (Number.isFinite(loadInTons)) {
        pinArticle("クレーン則", loadInTons < 1 ? "第222条" : "第221条");
        if (loadInTons >= 1) pinArticle("安衛令", "第20条");
      }
    } else if (/(?:技能講習|何トン|講習)/.test(normalizedQuery)) {
      pinArticle("クレーン則", "第221条");
      pinArticle("安衛令", "第20条");
    }
  }

  // フォークリフトは最大荷重1t未満なら特別教育、1t以上なら就業制限の
  // 根拠体系へ分かれる。荷重が未入力の広い資格質問では、質問だけを返さず
  // 両分岐を説明できる5条文を先に取得する。
  const asksForkliftQualification = forkliftIntent.qualification;
  if (asksForkliftQualification) {
    const loadMatch = normalizedQuery.match(
      /(?:最大荷重(?:は|が)?\s*)?(\d+(?:\.\d+)?)\s*(キロ|kg|トン|t)/i
    );
    if (loadMatch) {
      const amount = Number(loadMatch[1]);
      const unit = loadMatch[2].toLowerCase();
      const loadInTons = unit === "キロ" || unit === "kg" ? amount / 1000 : amount;
      const explicitlyBelowOneTon =
        /(?:1(?:\.0+)?\s*(?:トン|t)|1000\s*(?:キロ|kg))\s*未満/i.test(
          normalizedExplicitQuery,
        );
      if (
        Number.isFinite(loadInTons) &&
        (loadInTons < 1 || explicitlyBelowOneTon)
      ) {
        pinArticle("安衛則", "第36条");
        pinArticle("安衛法", "第59条");
      } else if (Number.isFinite(loadInTons)) {
        pinArticle("安衛法", "第61条");
        pinArticle("安衛令", "第20条");
        pinArticle("安衛則", "第41条");
      }
    } else {
      pinArticle("安衛法", "第59条");
      pinArticle("安衛則", "第36条");
      pinArticle("安衛法", "第61条");
      pinArticle("安衛令", "第20条");
      pinArticle("安衛則", "第41条");
    }
  }

  if (
    normalizedQuery.includes("移動式クレーン") &&
    /(?:資格|免許|技能講習|講習|運転)/.test(normalizedQuery)
  ) {
    const loadMatch = normalizedQuery.match(
      /(?:つり上げ荷重(?:は|が)?\s*)?(\d+(?:\.\d+)?)\s*(キロ|kg|トン|t)/i,
    );
    if (loadMatch) {
      const amount = Number(loadMatch[1]);
      const unit = loadMatch[2].toLowerCase();
      const loadInTons = unit === "キロ" || unit === "kg" ? amount / 1_000 : amount;
      if (Number.isFinite(loadInTons) && loadInTons < 1) {
        pinArticle("クレーン則", "第67条");
        pinArticle("安衛法", "第59条");
      } else if (Number.isFinite(loadInTons)) {
        pinArticle("クレーン則", "第68条");
        pinArticle("安衛令", "第20条");
        pinArticle("安衛法", "第61条");
      }
    }
  }

  if (
    /(?:石綿|アスベスト)/.test(normalizedQuery) &&
    /(?:事前調査|調査者)/.test(normalizedQuery)
  ) {
    pinArticle("石綿則", "第3条");
  }

  for (const topic of PINNED_TOPICS) {
    const topicQuery = topic.explicitOnly
      ? normalizedExplicitQuery
      : normalizedQuery;
    const topicLowered = topicQuery.toLowerCase();
    const contains = (term: string) =>
      topicQuery.includes(term.normalize("NFKC")) ||
      topicLowered.includes(term.normalize("NFKC").toLowerCase());
    const matchesAnyTrigger = topic.triggers.some(contains);
    const matchesAllGroups =
      topic.allTriggerGroups?.every((group) => group.some(contains)) ?? false;
    if (!matchesAnyTrigger && !matchesAllGroups) {
      continue;
    }
    if (
      topic.excludeTriggers?.some(
        (term) =>
          topicQuery.includes(term.normalize("NFKC")) ||
          topicLowered.includes(term.normalize("NFKC").toLowerCase()),
      )
    ) {
      continue;
    }
    for (const pin of topic.pins) {
      const found = pinSource.find(
        (a) =>
          (a.law === pin.law || a.lawShort === pin.law) &&
          a.articleNum === pin.articleNum
      );
      addPinnedArticle(found);
    }
  }
  const isAllowedElectricalSource = (article: LawArticle) => {
    // 電圧が明示された場合は、別電圧区分だけを扱う条文・告示を候補から外す。
    // 「低圧」という条件に高圧課程が混ざるなど、本文中の共通語による弱一致を防ぐ。
    if (electricalMeaning.voltageClass === "低圧") {
      if (
        (article.lawShort === "特別教育規程" && article.articleNum === "第5条") ||
        (article.lawShort === "安衛則" &&
          ["第341条", "第342条", "第343条", "第344条", "第345条"].includes(
            article.articleNum,
          ))
      ) {
        return false;
      }
    }
    if (electricalMeaning.voltageClass === "高圧") {
      if (
        (article.lawShort === "特別教育規程" && article.articleNum === "第6条") ||
        (article.lawShort === "安衛則" &&
          ["第344条", "第345条", "第346条", "第347条"].includes(
            article.articleNum,
          ))
      ) {
        return false;
      }
    }
    if (electricalMeaning.voltageClass === "特別高圧") {
      if (
        (article.lawShort === "特別教育規程" && article.articleNum === "第6条") ||
        (article.lawShort === "安衛則" &&
          ["第341条", "第342条", "第343条", "第346条", "第347条"].includes(
            article.articleNum,
          ))
      ) {
        return false;
      }
    }
    if (
      [
        "特別教育規程",
        "電事法",
        "電工士法令",
        "電工士法則",
        "経産省電工Q&A",
      ].includes(article.lawShort) ||
      article.law.includes("電気工事士法")
    ) {
      return true;
    }
    const allowedArticles: Partial<Record<string, ReadonlySet<string>>> = {
      安衛法: new Set(["第14条", "第59条"]),
      安衛令: new Set(["第6条"]),
      安衛則: new Set([
        "第36条",
        "第37条",
        "第329条",
        "第339条",
        "第341条",
        "第342条",
        "第343条",
        "第344条",
        "第345条",
        "第346条",
        "第347条",
        "第350条",
        "第352条",
      ]),
    };
    return allowedArticles[article.lawShort]?.has(article.articleNum) ?? false;
  };
  const contextSafePinned = hasElectricalWorkContext
    ? pinned.filter(isAllowedElectricalSource)
    : pinned;
  const contextSafeArticles = hasElectricalWorkContext
    ? articles.filter(isAllowedElectricalSource)
    : articles;

  if (contextSafePinned.length === 0) {
    return { articles: contextSafeArticles, hadPins: false };
  }
  const pinnedKeys = new Set(
    contextSafePinned.map((article) => `${article.law}:${article.articleNum}`),
  );
  const rest = contextSafeArticles.filter(
    (article) => !pinnedKeys.has(`${article.law}:${article.articleNum}`),
  );
  return { articles: [...contextSafePinned, ...rest], hadPins: true };
}

/** キーワードマッチングによる関連条文のRAG検索 */
export function searchRelevantArticles(
  query: string,
  topK = 10,
  category: LawCategoryFilter = "all"
): LawArticle[] {
  return searchRelevantArticlesWithScore(query, topK, category).articles;
}

/**
 * RAG検索結果と最高スコアを返す（信頼度計算用）
 * normalizedScore: topScore / 30 を [0,1] にクランプした値
 *
 * - クエリは expandQuery で同義語展開してからトークン化する。
 * - category が "all" 以外の場合、当該 lawShort の条文のみを対象にする。
 */
export function searchRelevantArticlesWithScore(
  query: string,
  topK = 10,
  category: LawCategoryFilter = "all"
): { articles: LawArticle[]; topScore: number; normalizedScore: number; hadPins: boolean } {
  if (
    PRIMARY_SOURCE_APPROVAL_REQUIRED_TERMS.some((term) =>
      normalizeSearchText(query).includes(normalizeSearchText(term))
    )
  ) {
    return { articles: [], topScore: 0, normalizedScore: 0, hadPins: false };
  }

  // Phase B: 軽量な口語→正式名展開 (expandQuery) → 広域同義語/法令略称展開 (expandQueryRich)
  // の二段でクエリを拡張してからトークン化する。expandQueryRich は安全衛生分野に
  // 特化した 100+ パターンの語彙ゆれを補正する（web/src/lib/rag/synonyms.ts）。
  const expandedQuery = expandQueryRich(expandQuery(query));
  const queryTokens = tokenize(expandedQuery);

  if (queryTokens.length === 0) {
    return { articles: [], topScore: 0, normalizedScore: 0, hadPins: false };
  }

  const corpus =
    category === "all"
      ? verifiedRagArticles
      : verifiedRagArticles.filter((a) => a.lawShort === category);

  // Phase C: BM25 をデンス側スコアの**控えめなブースト**として追加する。
  //
  // 設計上の判断:
  // - Phase B 完了時点でデンス（キーワード/タイトル/法令名 + PIN）だけで両ベンチ 100%。
  //   BM25 を強く混ぜると、調整済みのデンス順位を BM25 由来の IDF シグナルが破壊する
  //   ことが計測で判明（α=0.7 で main 99.1%, fresh 98% に後退）。
  // - そこで BM25 はデンスでヒット済みの記事に対するタイブレーク的なブーストとして
  //   のみ使い、デンス=0 の記事には適用しない（再現率の保護）。
  //   final = dense + BM25_BOOST * bm25, BM25_BOOST=0.5。BM25 値はおおむね 0〜数 の
  //   オーダーなので、デンス（0〜数十）の中で上位グループの順序を微調整する程度の
  //   寄与にとどまる。
  // - 自由文クエリ（テスト fixture 外）に対するロバスト性は確保しつつ、
  //   ベンチ Recall@5 100% を維持する。
  const bm25Index = getOrBuildIndex(verifiedRagArticles, tokenize);
  const BM25_BOOST = 0.5;

  const scored = corpus.map((article) => {
    const dense = calcScore(article, queryTokens);
    if (dense === 0) return { article, score: 0 };
    const sparse = bm25Score(bm25Index, article, queryTokens);
    return { article, score: dense + BM25_BOOST * sparse };
  });

  const filtered = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Phase D: 上位 20 に対してメタデータ・ベースの軽量リランクを適用。
  // 明示された法令略称・連番クラスタ・改正版ペナルティで順位を微調整する。
  const reranked = rerank(filtered, query, 20);

  const topScore = reranked[0]?.score ?? 0;
  // 正規化の分母: 25 (タイトル一致6 + キーワード完全一致5 + テキスト一致数回 + 共起ボーナスで
  // 現実的な上限がおよそ25点になるため)。以前は30だったが、日本語助詞で分割した後の
  // 3トークン質問でも上位条文が 0.7 を十分に超えるよう緩和。
  const normalizedScore = Math.min(topScore / 25, 1.0);

  // 上位1件のスコアだけで下位の偶発一致まで「関連」とみなさない。
  // 一般語1語だけが一致した無関係条文をsources/citationsへ混ぜないため、
  // 絶対下限とトップ比の双方を満たした候補だけを残す。明示PINは後段で
  // 個別に追加されるため、法令名・条番号が確定した導線は失わない。
  const perArticleFloor = Math.max(4, topScore * 0.35);
  const scoredArticles = reranked
    .filter((item) => item.score >= perArticleFloor)
    .slice(0, topK)
    .map((item) => item.article);
  // 2026-07-11 現場口語プロジェクト: PIN照合は**展開後クエリ**で行う。
  // 従来は生クエリのみ照合していたため、「クビ」「マンホール」等の口語が
  // synonym層（expandQuery / expandQueryRich）で正式語に正規化されても
  // PINには届かなかった。展開後クエリで照合することで、語彙正規化が
  // スコアリングとPINの両方に一様に効く（excludeTriggers も同様＝
  // 「シンナー→有機溶剤」の展開で事務所換気PINの誤発火も構造的に抑止される）。
  const { articles: pinnedArticles, hadPins } = applyPinnedTopics(
    expandedQuery,
    scoredArticles,
    query,
    corpus
  );
  const finalArticles = pinnedArticles.slice(0, topK);

  // 強制ピンが刺さった場合は、ヒット扱いで信頼度を最低 0.7 まで引き上げる
  // （ピンは明示的トピックでの確定ソースのため、キーワードスコア不足でも
  //  「関連条文なし」扱いにならないようにする）
  let adjustedScore = hadPins ? Math.max(normalizedScore, 0.7) : normalizedScore;

  // 2026-07-11 E3（GQ51車検リーク）: PINが無く、かつクエリがドメイン外シグナル
  // （車検・確定申告等）を持つ場合は信頼度を減点し、no-hit経路（範囲外テンプレ）へ
  // 落とす。労働・現場文脈の語が併出する場合は減点しない（out-of-domain.ts参照）。
  if (!hadPins && hasOutOfDomainSignal(query)) {
    adjustedScore = normalizedScore * OUT_OF_DOMAIN_PENALTY_FACTOR;
  }

  return {
    articles: finalArticles,
    topScore,
    normalizedScore: adjustedScore,
    hadPins,
  };
}

/**
 * 日本語テキストをトークン化（形態素解析の代替として単純分割）
 * normalizeSearchText で表記ゆれを吸収してからトークン化する。
 *
 * 日本語の助詞（は・が・を・に・で・の・も・と・へ・や・か）でも分割し、
 * スペース無しで続けて入力された質問でも意味単位に分解できるようにする。
 */
/** 条番号パターン（「第」なし揺らぎ含む） */
const ARTICLE_NUM_RE =
  /第\d+条(?:の\d+)*(?:第\d+項)?(?:第\d+号)?/g;

/**
 * P2-6: 漢数字の条番号を算用数字へ正規化する。
 * 「第」で始まる条番号文脈に限定し、化学物質名等（一酸化炭素・二硫化炭素 等）の
 * 漢数字を誤って変換しないようにする。例:「第十二条の五」→「第12条の5」。
 */
const KANJI_ARTICLE_RE =
  /第([〇一二三四五六七八九十百千]+)条(?:の([〇一二三四五六七八九十百千]+))?(?:第([〇一二三四五六七八九十百千]+)項)?(?:第([〇一二三四五六七八九十百千]+)号)?/g;

function normalizeKanjiArticleNumbers(text: string): string {
  return text.replace(KANJI_ARTICLE_RE, (_m, article, branch, paragraph, item) => {
    let s = `第${kanjiToArabic(article)}条`;
    if (branch) s += `の${kanjiToArabic(branch)}`;
    if (paragraph) s += `第${kanjiToArabic(paragraph)}項`;
    if (item) s += `第${kanjiToArabic(item)}号`;
    return s;
  });
}

function tokenize(text: string): string[] {
  // P2-6: 漢数字の条番号（第十二条の五 等）を先に算用数字化してから正規化する
  const fuzzyNormalized = normalizeKanjiArticleNumbers(
    normalizeSearchText(text).replace(/衞/g, "衛"),
  );

  // Fix 2a: 「第」なし数字+条 を正規化（例: "565条" → "第565条"）
  // (?<![第\d]) で「直前が 第 または数字」の場合はスキップする。
  // これにより "第565条" の途中の "65条" が誤マッチするのを防ぐ。
  const withNormNums = fuzzyNormalized.replace(
    /(?<![第\d])(\d+条(?:の\d+)*)/g,
    "第$1"
  );

  // Fix 2b: 条番号トークンを先抽出して汎用分割から保護する
  const articleNumTokens: string[] = [];
  const withoutArticleNums = withNormNums.replace(ARTICLE_NUM_RE, (match) => {
    articleNumTokens.push(match);
    return " ";
  });

  // 汎用トークナイズ（残テキスト）
  const normalized = withoutArticleNums
    .replace(/[？?！!。、.,\s　]/g, " ")
    .replace(/[（）()「」『』【】\[\]]/g, " ")
    // 主要な日本語助詞・助動詞で分割（長い候補を先に評価して残骸を防ぐ）
    .replace(/(について|に関する|から|まで|より|など|は|が|を|に|で|の|も|と|へ|や|か)/g, " ");

  const generalTokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return [...new Set([...articleNumTokens, ...generalTokens])];
}

/**
 * 条文と検索トークンのマッチングスコアを計算
 * 改善点:
 * - 複数トークン共起ボーナス（文脈スコアリング）
 * - キーワード完全一致で追加ボーナス
 * - 法令名完全一致で高スコア
 */
type NormalizedArticleFields = {
  text: string;
  title: string;
  articleNum: string;
  law: string;
  keywords: string[];
};

const normalizedArticleFieldsCache = new WeakMap<LawArticle, NormalizedArticleFields>();

function getNormalizedArticleFields(article: LawArticle): NormalizedArticleFields {
  const cached = normalizedArticleFieldsCache.get(article);
  if (cached) return cached;

  const lawWithoutParens = article.law.replace(/[（(][^）)]*[）)]/g, "");
  const normalized = {
    text: normalizeSearchText(article.text),
    title: normalizeSearchText(article.articleTitle),
    articleNum: article.articleNum.toLowerCase(),
    law: normalizeSearchText(lawWithoutParens + article.lawShort),
    keywords: article.keywords.map((keyword) => normalizeSearchText(keyword)),
  };
  normalizedArticleFieldsCache.set(article, normalized);
  return normalized;
}

function calcScore(article: LawArticle, queryTokens: string[]): number {
  let score = 0;
  const normalized = getNormalizedArticleFields(article);
  const textNorm = normalized.text;
  const titleNorm = normalized.title;
  const articleNumLower = normalized.articleNum;
  // Fix 4: 括弧とその中身を除去してから法令名を正規化する。
  // "労働安全衛生規則（足場等）" → "労働安全衛生規則" として比較するため、
  // law フィールドの表記ゆれ（括弧あり/なし混在）を統一する。元データは変更しない。
  const lawNorm = normalized.law;

  let matchedTokenCount = 0;

  for (const token of queryTokens) {
    const tokenLower = token.toLowerCase();
    let tokenMatched = false;

    // 条文テキスト内のマッチ（出現回数に応じてスコア、最大5回分）
    const textOccurrences = Math.min(countOccurrences(textNorm, tokenLower), 5);
    if (textOccurrences > 0) {
      score += textOccurrences;
      tokenMatched = true;
    }

    // 条文タイトルのマッチ（高スコア）
    if (titleNorm.includes(tokenLower)) {
      score += 6;
      tokenMatched = true;
    }

    // 条文番号のマッチ（高スコア）
    // 条番号形状トークン（/^第\d+条/）は双方向 startsWith で厳密比較する。
    // これにより "第5条" が "第51条" に誤ってマッチするのを防ぎ、かつ
    // "第61条第1項第3号" のような詳細参照が "第61条" 記事に正しくマッチする。
    // tokenLower.startsWith(articleNumLower) は「トークンが 第 で始まる項/号付き参照」
    // の場合のみ許可。数字で続く場合（例: "第151条の67" が "第151条の6" にマッチ）は誤検知のため除外。
    if (/^第\d+条/.test(tokenLower)) {
      if (
        articleNumLower === tokenLower ||
        articleNumLower.startsWith(tokenLower) ||
        (tokenLower.startsWith(articleNumLower) && tokenLower[articleNumLower.length] === "第")
      ) {
        score += 10;
        tokenMatched = true;
      }
    } else if (articleNumLower.includes(tokenLower)) {
      score += 10;
      tokenMatched = true;
    }

    // キーワードリストのマッチ（完全一致=5点、部分一致=3点、どちらか最大のみ加算）
    let keywordBest = 0;
    for (const keyNorm of normalized.keywords) {
      if (keyNorm === tokenLower) {
        keywordBest = 5;
        break;
      } else if (keyNorm.includes(tokenLower) || tokenLower.includes(keyNorm)) {
        if (keywordBest < 3) keywordBest = 3;
      }
    }
    if (keywordBest > 0) {
      score += keywordBest;
      tokenMatched = true;
    }

    // 法令名のマッチ
    if (lawNorm.includes(tokenLower)) {
      score += 4;
      tokenMatched = true;
    }

    if (tokenMatched) matchedTokenCount++;
  }

  // 複数トークン共起ボーナス（文脈スコアリング）
  // 2トークン以上マッチした場合、マッチ数の二乗でボーナス付与
  if (matchedTokenCount >= 2) {
    score += matchedTokenCount * matchedTokenCount;
  }

  return score;
}

/** テキスト中の文字列の出現回数をカウント */
function countOccurrences(text: string, search: string): number {
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(search, index)) !== -1) {
    count++;
    index += search.length;
  }
  return count;
}

/** 条文を「○○法第XX条」形式の引用文字列にフォーマット */
export function formatCitation(article: LawArticle): string {
  return `${article.lawShort}${article.articleNum}`;
}

/** 複数の条文からチャットボット末尾用の出典文字列を生成 */
export function formatSourceCitations(articles: LawArticle[]): string {
  if (articles.length === 0) return "";
  const citations = [
    ...new Set(articles.map((a) => `${a.law}${a.articleNum}`)),
  ].slice(0, 5);
  return `\n\n📎 参照: ${citations.join("、")}`;
}

/** 検索結果をGeminiへ渡すコンテキスト文字列に変換 */
export function buildContextFromArticles(articles: LawArticle[]): string {
  if (articles.length === 0) {
    return "（関連する法令条文が見つかりませんでした）";
  }

  return articles
    .map((a) => {
      const itemMapNote = a.itemNumberMap
        ? `\n[号番号と対象業務の対応（条文表記をそのまま使用すること）]\n${Object.entries(
            a.itemNumberMap
          )
            .map(([key, value]) => `  ・第${key}号 = ${value}`)
            .join("\n")}`
        : "";
      return `【${a.law}（${a.lawShort}）${a.articleNum}「${a.articleTitle}」】\n${a.text}${itemMapNote}`;
    })
    .join("\n\n---\n\n");
}
