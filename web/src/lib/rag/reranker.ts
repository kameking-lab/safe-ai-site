import type { LawArticle } from "@/data/laws";

/**
 * Phase D: 上位 candidate に対するメタデータ・ベースの軽量リランカー。
 *
 * 戦略:
 * - 検索で上位 N（topK の 4 倍程度 / 最大 20）を取り、最終 topK へ絞る。
 * - 既存の calcScore + bm25 をベースに、以下のメタデータ・シグナルを加点する:
 *   1. **法令名明示ボーナス**: クエリに lawShort（例: 「クレーン則」「安衛則」）が
 *      明示的に登場する場合、当該 lawShort の記事を強くブーストする。
 *      → 法令を絞り込んだ質問で別法令が紛れ込むのを防ぐ。
 *   2. **改正版ペナルティ**: 安衛則改正R4/R5 のような改正条文一覧は、
 *      ベースの安衛則条文があれば順位を下げる（重複表示の抑制）。
 *   3. **article-number クラスタリングボーナス**: 上位に同一法令の連番条文
 *      （第539条の2、第539条の3、第539条の4 …）が複数含まれる場合、
 *      それぞれに小さな共起ボーナスを付与する。マルチ gold 質問で
 *      クラスタ条文を引き上げる。
 *
 * 制約:
 * - シグナルは「順序の微調整」レベルに抑え、Recall@5 を維持する。
 * - PIN は再ランク後にもう一度適用するので、PIN 結果はリランカーの影響を受けない。
 */

const REVISION_LAW_SHORTS = [
  "安衛則改正R4",
  "安衛則改正R5",
  "安衛令関係",
];

/** クエリに明示された法令略称を抽出（複数可）。正式名 → 略称への正規化付き。 */
function extractMentionedLawShorts(query: string): string[] {
  // 既知の lawShort と正式名→lawShort のマッピング
  const aliasMap: Array<[string, string]> = [
    ["労働安全衛生法施行令", "安衛令"],
    ["労働安全衛生法", "安衛法"],
    ["労働安全衛生規則", "安衛則"],
    ["クレーン等安全規則", "クレーン則"],
    ["ゴンドラ安全規則", "ゴンドラ則"],
    ["ボイラー及び圧力容器安全規則", "ボイラー則"],
    ["有機溶剤中毒予防規則", "有機則"],
    ["特定化学物質障害予防規則", "特化則"],
    ["酸素欠乏症等防止規則", "酸欠則"],
    ["電離放射線障害防止規則", "電離則"],
    ["粉じん障害防止規則", "粉じん則"],
    ["石綿障害予防規則", "石綿則"],
    ["鉛中毒予防規則", "鉛則"],
    ["四アルキル鉛中毒予防規則", "四アルキル鉛則"],
    ["事務所衛生基準規則", "事務所則"],
    ["高気圧作業安全衛生規則", "高圧則"],
    ["じん肺法", "じん肺法"],
    ["労働者災害補償保険法", "労災保険法"],
    ["労災保険法", "労災保険法"],
    ["労災法", "労災法"],
    ["労働基準法施行規則", "労基則"],
    ["労働基準法", "労基法"],
    ["女性労働基準規則", "女性則"],
    ["年少者労働基準規則", "年少者則"],
    ["育児・介護休業法", "育介法"],
    ["育介法", "育介法"],
    ["男女雇用機会均等法", "均等法"],
    ["均等法", "均等法"],
    ["労働施策総合推進法", "労施法"],
    ["労施法", "労施法"],
    ["労働契約法", "労契法"],
    ["労契法", "労契法"],
    ["最低賃金法", "最賃法"],
    ["労働者派遣法", "派遣法"],
    ["派遣法", "派遣法"],
    ["建設業法", "建設業法"],
    ["作業環境測定法", "作環測法"],
    ["作環測法", "作環測法"],
    // lawShort 直接表記（短い方は最後に置いて長一致を優先）
    ["安衛法", "安衛法"],
    ["安衛則", "安衛則"],
    ["安衛令", "安衛令"],
    ["クレーン則", "クレーン則"],
    ["ゴンドラ則", "ゴンドラ則"],
    ["ボイラー則", "ボイラー則"],
    ["有機則", "有機則"],
    ["特化則", "特化則"],
    ["酸欠則", "酸欠則"],
    ["電離則", "電離則"],
    ["粉じん則", "粉じん則"],
    ["石綿則", "石綿則"],
    ["鉛則", "鉛則"],
    ["事務所則", "事務所則"],
    ["高圧則", "高圧則"],
    ["労基法", "労基法"],
    ["労基則", "労基則"],
    ["女性則", "女性則"],
    ["年少者則", "年少者則"],
  ];
  const hits = new Set<string>();
  for (const [alias, short] of aliasMap) {
    if (query.includes(alias)) hits.add(short);
  }
  return [...hits];
}

/** クエリに含まれる「条のみ（枝番なし）」の条文番号を列挙する。 */
function extractBaseArticleNums(query: string): string[] {
  const hits: string[] = [];
  const re = /(?<![第\d])(\d+条)(?!の\d)/g;
  const re2 = /第(\d+)条(?!の\d)/g;
  for (const m of query.matchAll(re)) hits.push(`第${m[1]}`);
  for (const m of query.matchAll(re2)) hits.push(`第${m[1]}条`);
  return hits;
}

function articleNumKey(num: string): { prefix: string; suffix: number | null } {
  // 「第539条の2」→ prefix="第539条", suffix=2
  // 「第38条」→ prefix="第38条", suffix=null
  const m = num.match(/^(第\d+条)(?:の(\d+))?/);
  if (!m) return { prefix: num, suffix: null };
  const suffix = m[2] != null ? Number.parseInt(m[2], 10) : null;
  return { prefix: m[1], suffix };
}

type Scored = { article: LawArticle; score: number };

/**
 * 上位候補に対してリランクを適用し、新しいスコアでソートして返す。
 * @param scored 既存スコア順で sort 済みの候補配列（filter 済み, score > 0）
 * @param query 元クエリ（lawShort 抽出用）
 * @param windowSize リランク対象とする上位件数（デフォルト 20）
 */
export function rerank(
  scored: Scored[],
  query: string,
  windowSize = 20,
): Scored[] {
  if (scored.length <= 1) return scored;

  const window = scored.slice(0, Math.min(scored.length, windowSize));
  const mentionedLawShorts = extractMentionedLawShorts(query);
  const exactBaseArticleNums = new Set(extractBaseArticleNums(query));

  // 連番クラスタの集計: ウィンドウ内で同一法令 × 同一 prefix が何件あるか
  const clusterCount = new Map<string, number>();
  for (const { article } of window) {
    const { prefix } = articleNumKey(article.articleNum);
    const k = `${article.law}|${prefix}`;
    clusterCount.set(k, (clusterCount.get(k) ?? 0) + 1);
  }

  const reranked = window.map(({ article, score }) => {
    let bonus = 0;

    // 1. 法令名明示ボーナス: クエリで明示された lawShort と一致する記事を強く押し上げる
    if (mentionedLawShorts.length > 0 && mentionedLawShorts.includes(article.lawShort)) {
      bonus += 8;
    }

    // 2. 改正版ペナルティ: 改正条文一覧テーブルは順位を控えめにする
    if (REVISION_LAW_SHORTS.includes(article.lawShort)) {
      bonus -= 3;
    }

    // 3. 連番クラスタボーナス: 同一法令で複数の枝番条文（第539条の2/3/4）が
    //    ウィンドウ内に揃っている場合、各候補に共起ボーナスを付与する。
    //    ただしクエリに具体的な条番号（枝番なし）が含まれる場合は、
    //    ユーザは exact match を期待しているのでクラスタボーナスをスキップする
    //    （例: "第518条" のクエリで "第518条の2" にクラスタボーナス → 誤上位を防ぐ）。
    const { prefix, suffix } = articleNumKey(article.articleNum);
    if (suffix !== null && !exactBaseArticleNums.has(prefix)) {
      const cnt = clusterCount.get(`${article.law}|${prefix}`) ?? 1;
      if (cnt >= 2) bonus += Math.min(cnt, 4); // 最大 +4
    }

    // 4. 完全一致ボーナス: クエリに含まれる base 条番号と一致する base 記事
    //    (枝番なし) はクラスタ候補より優先する。
    if (suffix === null && exactBaseArticleNums.has(article.articleNum)) {
      bonus += 3;
    }

    return { article, score: score + bonus };
  });

  reranked.sort((a, b) => b.score - a.score);
  // ウィンドウ外（より下位）はそのまま末尾に連結
  return [...reranked, ...scored.slice(window.length)];
}
