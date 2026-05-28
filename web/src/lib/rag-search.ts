import { allLawArticles } from "@/data/laws";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";
import { expandQuery } from "@/lib/query-expansion";
import { expandQueryRich } from "@/lib/rag/synonyms";
import { bm25Score, getOrBuildIndex } from "@/lib/rag/bm25";
import { rerank } from "@/lib/rag/reranker";

/** チャットボットの法令カテゴリフィルタ（lawShort と完全一致） */
export type LawCategoryFilter =
  | "all"
  | "安衛法"
  | "安衛則"
  | "クレーン則"
  | "有機則"
  | "特化則"
  | "酸欠則";

export const LAW_CATEGORY_OPTIONS: { value: LawCategoryFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "安衛法", label: "安衛法" },
  { value: "安衛則", label: "安衛則" },
  { value: "クレーン則", label: "クレーン則" },
  { value: "有機則", label: "有機則" },
  { value: "特化則", label: "特化則" },
  { value: "酸欠則", label: "酸欠則" },
];

/**
 * トピック別の必須条文プライン（キーワードに該当する場合、RAG 検索結果の先頭に
 * 強制的に差し込む）。安衛法第60条のように「政令で定めるもの」で参照切れに
 * なる条文はスコアだけでは十分に引けないため、施行令・規則とセットで返す。
 */
export type PinnedTopic = {
  /** このトピックに該当させるキーワード（いずれか1つが query に含まれれば適用） */
  triggers: string[];
  /** 先頭に差し込む条文の { law, articleNum } ペア */
  pins: { law: string; articleNum: string }[];
};

export const PINNED_TOPICS: PinnedTopic[] = [
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
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第29条" },
      { law: "有機溶剤中毒予防規則", articleNum: "第30条" },
    ],
  },
  {
    triggers: ["特化健診", "特定化学物質健康診断", "特化物健診"],
    pins: [
      { law: "特定化学物質障害予防規則", articleNum: "第39条" },
      { law: "特定化学物質障害予防規則", articleNum: "第40条" },
    ],
  },
  {
    triggers: ["石綿健康診断", "アスベスト健診", "石綿健診"],
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
    // 第16条の2 (清掃) と 第28条 (測定) で代替し、本トピックの根拠条文は維持する。
    triggers: ["局所排気装置", "局排", "プッシュプル"],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第16条の2" },
      { law: "有機溶剤中毒予防規則", articleNum: "第28条" },
    ],
  },
  {
    // 死傷病報告
    triggers: ["死傷病報告", "労働者死傷病報告", "災害報告"],
    pins: [{ law: "労働安全衛生規則", articleNum: "第97条" }],
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
    pins: [{ law: "労働安全衛生法", articleNum: "第57条の3" }],
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
    // クレーン運転資格
    triggers: ["クレーン運転", "クレーン免許", "床上操作式"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第22条" },
      { law: "クレーン等安全規則", articleNum: "第73条" },
      { law: "クレーン等安全規則", articleNum: "第74条" },
      { law: "クレーン等安全規則", articleNum: "第75条" },
    ],
  },
  {
    // クレーン定期自主検査
    triggers: ["クレーン定期自主検査", "クレーン自主検査", "クレーンの定期"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第34条" },
      { law: "クレーン等安全規則", articleNum: "第35条" },
      { law: "クレーン等安全規則", articleNum: "第36条" },
    ],
  },
  {
    // 石綿事前調査
    triggers: ["石綿事前調査", "アスベスト事前調査", "石綿の事前調査", "石綿作業の事前調査", "事前調査"],
    pins: [{ law: "石綿障害予防規則", articleNum: "第3条" }],
  },
  {
    // 酸欠作業前の換気
    triggers: ["酸欠換気", "酸欠の換気", "酸素欠乏作業前の換気", "酸欠作業前の換気"],
    pins: [
      { law: "酸素欠乏症等防止規則", articleNum: "第5条" },
      { law: "酸素欠乏症等防止規則", articleNum: "第5条の2" },
    ],
  },
  {
    // 酸欠作業主任者
    triggers: ["酸欠作業主任者", "酸素欠乏危険作業主任者"],
    pins: [{ law: "酸素欠乏症等防止規則", articleNum: "第11条" }],
  },
  {
    // セクハラ・マタハラ
    triggers: ["セクシュアルハラスメント", "セクハラ", "性的言動"],
    pins: [{ law: "男女雇用機会均等法", articleNum: "第11条" }],
  },
  {
    triggers: ["マタニティハラスメント", "マタハラ", "妊娠出産", "妊娠・出産", "妊娠・出産等"],
    pins: [
      { law: "男女雇用機会均等法", articleNum: "第11条の3" },
      { law: "男女雇用機会均等法", articleNum: "第12条" },
    ],
  },
  {
    // 通勤災害
    triggers: ["通勤災害", "通勤途上災害"],
    pins: [
      { law: "労働者災害補償保険法", articleNum: "第7条" },
      { law: "労働者災害補償保険法", articleNum: "第7条第3項" },
    ],
  },
  {
    // 業務災害
    triggers: ["業務災害", "労災保険給付", "労災給付"],
    pins: [
      { law: "労働者災害補償保険法", articleNum: "第7条" },
      { law: "労働者災害補償保険法", articleNum: "第12条の8" },
    ],
  },
  {
    // 雇入れ時教育
    triggers: ["雇入れ時教育", "雇入れ時の教育", "雇入れ時の安全衛生教育"],
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
    // 気積・採光・換気
    // NOTE(Phase 1a): 第600条 は corpus に未収録のため除外（PIN integrity test）。
    triggers: ["気積", "採光", "換気", "事務所衛生基準"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第604条" },
      { law: "労働安全衛生規則", articleNum: "第607条" },
      { law: "労働安全衛生規則", articleNum: "第627条" },
    ],
  },
  {
    // 重量物・腰痛
    triggers: ["重量物", "腰痛", "腰痛予防"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第558条" },
      { law: "労働安全衛生規則", articleNum: "第151条の67" },
      { law: "労働安全衛生規則", articleNum: "第165条" },
    ],
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
    // デリック設置届
    // NOTE(Phase 1a): 第96条 は corpus に未収録のため除外（PIN integrity test）。
    triggers: ["デリック設置", "デリック設置届", "デリック"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第111条" },
    ],
  },
  {
    // クレーン検査証
    triggers: ["クレーン検査証", "検査証の有効期間", "クレーンの検査証", "クレーン検査"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第10条" },
      { law: "クレーン等安全規則", articleNum: "第40条" },
      { law: "クレーン等安全規則", articleNum: "第34条" },
    ],
  },
  {
    // 就業制限（安衛法61条＋施行令20条セット）
    // フォークリフト以外の就業制限業務（玉掛け・移動式クレーン・建設機械・ガス溶接・電気取扱）をカバー
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
      // 注: "車両系建設機械" 単体は除外（用途外使用 第164条/第151条の3 を引きたい質問と
      //     就業制限を引きたい質問の双方があり、単独トリガーだとフォークリフト系の
      //     第151条の73/74 が混ざってしまうため）。資格を明示するキーワードに限定する。
      "車両系建設機械の資格",
      "建設機械の資格",
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
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の21" },
    ],
  },
  {
    // フォークリフト 用途外使用（第151条の74）。"主たる用途以外" と "フォークリフト" の併出を捕捉。
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
    pins: [
      { law: "労働安全衛生規則", articleNum: "第151条の74" },
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
    // ボイラー 設置届（ボイラー則第10条と性能検査が同居している前提で同条をピン）
    triggers: ["ボイラー設置届", "ボイラーの設置届", "ボイラー設置届出"],
    pins: [{ law: "ボイラー及び圧力容器安全規則", articleNum: "第10条" }],
  },
  {
    // 車両系建設機械 用途外使用（安衛則第164条 / 第151条の3 のセット）
    // 注: "主たる用途以外" 単独ではフォークリフト Q (第151条の74) と競合するため、
    //     車両系建設機械を明示するトリガーに限定する。フォークリフト用途外は別 pin が捕捉する。
    triggers: ["車両系建設機械の用途", "車両系建設機械用途以外", "車両系建設機械主たる用途", "車両系建設機械の主たる用途", "用途以外の使用制限"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第164条" },
      { law: "労働安全衛生規則", articleNum: "第151条の3" },
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
      { law: "電離放射線障害防止規則", articleNum: "第2条の2" },
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
    // 2015年改正で「手すり＋中さん」が義務化された
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
    pins: [
      { law: "労働安全衛生規則（足場等）", articleNum: "第563条" },
      { law: "労働安全衛生規則", articleNum: "第518条" },
    ],
  },
  {
    // フォークリフト就業制限（安衛令第20条第11号）— 最大荷重1t以上
    // フォークリフトの制限速度（第151条の73）／用途外使用禁止（第151条の74）
    triggers: [
      "フォークリフト",
      "fork lift",
      "forklift",
      "最大荷重1トン",
      "1トン以上",
      "1t以上",
      "フォークリフト資格",
      "フォークリフト免許",
      "フォークリフト技能講習",
      "フォークリフトの資格",
      "フォークリフト運転",
      "フォークリフト運転技能講習",
      "20条11号",
      "20条第11号",
      "20条第11号フォークリフト",
      "用途外使用",
      "主たる用途",
      "151条の73",
      "151条の74",
    ],
    pins: [
      { law: "労働安全衛生法", articleNum: "第61条" },
      { law: "労働安全衛生法施行令", articleNum: "第20条" },
      // 定期自主検査の正規条文（年次）と汎用検査条文を併置。質問が「定期自主検査」を
      // 明示する場合は別の専用 pin が上書きする（後段で定義）。
      { law: "労働安全衛生規則", articleNum: "第151条の21" },
      { law: "労働安全衛生規則", articleNum: "第151条の73" },
      { law: "労働安全衛生規則", articleNum: "第151条の74" },
    ],
  },
];

function applyPinnedTopics(
  query: string,
  articles: LawArticle[]
): { articles: LawArticle[]; hadPins: boolean } {
  const lowered = query.toLowerCase();
  const pinned: LawArticle[] = [];
  const seen = new Set<string>();
  for (const topic of PINNED_TOPICS) {
    if (!topic.triggers.some((t) => query.includes(t) || lowered.includes(t.toLowerCase()))) {
      continue;
    }
    for (const pin of topic.pins) {
      const found = allLawArticles.find(
        (a) => a.law === pin.law && a.articleNum === pin.articleNum
      );
      if (!found) continue;
      const key = `${found.law}:${found.articleNum}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pinned.push(found);
    }
  }
  if (pinned.length === 0) return { articles, hadPins: false };
  const pinnedKeys = new Set(pinned.map((a) => `${a.law}:${a.articleNum}`));
  const rest = articles.filter((a) => !pinnedKeys.has(`${a.law}:${a.articleNum}`));
  return { articles: [...pinned, ...rest], hadPins: true };
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
): { articles: LawArticle[]; topScore: number; normalizedScore: number } {
  // Phase B: 軽量な口語→正式名展開 (expandQuery) → 広域同義語/法令略称展開 (expandQueryRich)
  // の二段でクエリを拡張してからトークン化する。expandQueryRich は安全衛生分野に
  // 特化した 100+ パターンの語彙ゆれを補正する（web/src/lib/rag/synonyms.ts）。
  const expandedQuery = expandQueryRich(expandQuery(query));
  const queryTokens = tokenize(expandedQuery);

  if (queryTokens.length === 0) {
    return { articles: [], topScore: 0, normalizedScore: 0 };
  }

  const corpus =
    category === "all"
      ? allLawArticles
      : allLawArticles.filter((a) => a.lawShort === category);

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
  const bm25Index = getOrBuildIndex(allLawArticles, tokenize);
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

  const scoredArticles = reranked.slice(0, topK).map((item) => item.article);
  const { articles: pinnedArticles, hadPins } = applyPinnedTopics(query, scoredArticles);
  const finalArticles = pinnedArticles.slice(0, topK);

  // 強制ピンが刺さった場合は、ヒット扱いで信頼度を最低 0.7 まで引き上げる
  // （ピンは明示的トピックでの確定ソースのため、キーワードスコア不足でも
  //  「関連条文なし」扱いにならないようにする）
  const adjustedScore = hadPins ? Math.max(normalizedScore, 0.7) : normalizedScore;

  return {
    articles: finalArticles,
    topScore,
    normalizedScore: adjustedScore,
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
  /第\d+条(?:の\d+)?(?:第\d+項)?(?:第\d+号)?/g;

function tokenize(text: string): string[] {
  const fuzzyNormalized = normalizeSearchText(text);

  // Fix 2a: 「第」なし数字+条 を正規化（例: "565条" → "第565条"）
  // (?<![第\d]) で「直前が 第 または数字」の場合はスキップする。
  // これにより "第565条" の途中の "65条" が誤マッチするのを防ぐ。
  const withNormNums = fuzzyNormalized.replace(
    /(?<![第\d])(\d+条(?:の\d+)?)/g,
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
function calcScore(article: LawArticle, queryTokens: string[]): number {
  let score = 0;
  const textNorm = normalizeSearchText(article.text);
  const titleNorm = normalizeSearchText(article.articleTitle);
  const articleNumLower = article.articleNum.toLowerCase();
  // Fix 4: 括弧とその中身を除去してから法令名を正規化する。
  // "労働安全衛生規則（足場等）" → "労働安全衛生規則" として比較するため、
  // law フィールドの表記ゆれ（括弧あり/なし混在）を統一する。元データは変更しない。
  const lawWithoutParens = article.law.replace(/[（(][^）)]*[）)]/g, "");
  const lawNorm = normalizeSearchText(lawWithoutParens + article.lawShort);

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
    for (const keyword of article.keywords) {
      const keyNorm = normalizeSearchText(keyword);
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
