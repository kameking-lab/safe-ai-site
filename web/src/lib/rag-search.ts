import { allLawArticles } from "@/data/laws";
import type { LawArticle } from "@/data/laws";
import { normalizeSearchText } from "@/lib/fuzzy-search";

/**
 * トピック別の必須条文プライン（キーワードに該当する場合、RAG 検索結果の先頭に
 * 強制的に差し込む）。安衛法第60条のように「政令で定めるもの」で参照切れに
 * なる条文はスコアだけでは十分に引けないため、施行令・規則とセットで返す。
 */
type PinnedTopic = {
  /** このトピックに該当させるキーワード（いずれか1つが query に含まれれば適用） */
  triggers: string[];
  /** 先頭に差し込む条文の { law, articleNum } ペア */
  pins: { law: string; articleNum: string }[];
};

const PINNED_TOPICS: PinnedTopic[] = [
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
      { law: "有機溶剤中毒予防規則", articleNum: "第29条の2" },
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
    triggers: ["局所排気装置", "局排", "プッシュプル"],
    pins: [
      { law: "有機溶剤中毒予防規則", articleNum: "第16条" },
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
    // 化学物質管理者
    triggers: ["化学物質管理者"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第12条" },
      { law: "労働安全衛生法", articleNum: "第57条の3" },
    ],
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
    triggers: ["気積", "採光", "換気", "事務所衛生基準"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第600条" },
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
    triggers: ["投下設備", "投下", "監視人配置", "上下作業"],
    pins: [
      { law: "労働安全衛生規則", articleNum: "第536条" },
      { law: "労働安全衛生規則", articleNum: "第519条" },
    ],
  },
  {
    // デリック設置届
    triggers: ["デリック設置", "デリック設置届", "デリック"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第96条" },
      { law: "クレーン等安全規則", articleNum: "第111条" },
    ],
  },
  {
    // クレーン検査証
    triggers: ["クレーン検査証", "検査証の有効期間"],
    pins: [
      { law: "クレーン等安全規則", articleNum: "第10条" },
      { law: "クレーン等安全規則", articleNum: "第40条" },
    ],
  },
  {
    // 特化物の区分
    triggers: ["特定化学物質第1類", "特化物の区分", "第1類物質", "第2類物質", "第3類物質"],
    pins: [{ law: "特定化学物質障害予防規則", articleNum: "第2条" }],
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
export function searchRelevantArticles(query: string, topK = 10): LawArticle[] {
  return searchRelevantArticlesWithScore(query, topK).articles;
}

/**
 * RAG検索結果と最高スコアを返す（信頼度計算用）
 * normalizedScore: topScore / 30 を [0,1] にクランプした値
 */
export function searchRelevantArticlesWithScore(
  query: string,
  topK = 10
): { articles: LawArticle[]; topScore: number; normalizedScore: number } {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { articles: [], topScore: 0, normalizedScore: 0 };
  }

  const scored = allLawArticles.map((article) => ({
    article,
    score: calcScore(article, queryTokens),
  }));

  const filtered = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topScore = filtered[0]?.score ?? 0;
  // 正規化の分母: 25 (タイトル一致6 + キーワード完全一致5 + テキスト一致数回 + 共起ボーナスで
  // 現実的な上限がおよそ25点になるため)。以前は30だったが、日本語助詞で分割した後の
  // 3トークン質問でも上位条文が 0.7 を十分に超えるよう緩和。
  const normalizedScore = Math.min(topScore / 25, 1.0);

  const scoredArticles = filtered.slice(0, topK).map((item) => item.article);
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
function tokenize(text: string): string[] {
  const fuzzyNormalized = normalizeSearchText(text);

  const normalized = fuzzyNormalized
    .replace(/[？?！!。、.,\s　]/g, " ")
    .replace(/[（）()「」『』【】\[\]]/g, " ")
    // 主要な日本語助詞・助動詞で分割（これらの前後は別トークン扱い）
    .replace(/(は|が|を|に|で|の|も|と|へ|や|か|から|まで|より|など|について|に関する)/g, " ");

  const tokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return [...new Set(tokens)];
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
  const lawNorm = normalizeSearchText(article.law + article.lawShort);

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
    if (articleNumLower.includes(tokenLower)) {
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
    .map(
      (a) =>
        `【${a.law}（${a.lawShort}）${a.articleNum}「${a.articleTitle}」】\n${a.text}`
    )
    .join("\n\n---\n\n");
}
