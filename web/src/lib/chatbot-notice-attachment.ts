/**
 * Phase 4: 通達・告示・リーフレット原文URL自動添付の統合層。
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §4
 *
 * 3つの情報源を統合し、応答に同梱する通達・リーフレット候補を生成する:
 *   Layer A: 引用条文 → article-notice-map → 関連通達/リーフレット
 *   Layer B: Gemini 応答内の通達番号引用 → mhlw-notices と照合
 *   Layer C: 質問キーワード → searchRelevantNotices（既存）
 *
 * マージ規則:
 *   - 重複排除（同一 id）
 *   - 並び順: Layer A → Layer B → Layer C（条文一致が最も信頼）
 *   - bindingLevel 内で再優先（binding > indirect > reference）
 *   - 最大 5 件
 */

import type { LawArticle } from "@/data/laws";
import type { MhlwNotice } from "@/data/mhlw-notices";
import type { MhlwLeaflet } from "@/data/mhlw-leaflets";
import {
  getNoticeMappingForArticle,
  resolveLeafletById,
  resolveNoticeById,
} from "@/data/article-notice-map";
import { isNoticeIndividuallyVerified } from "@/data/public-mhlw-notices";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT } from "@/data/source-snapshots/mhlw-heat-notice-0520-6";
import { detectAndMatchNotices } from "@/lib/chatbot-notice-detector";
import { searchRelevantNotices, type NoticeHit } from "@/lib/notice-search";

export type AttachedNotice = NoticeHit & {
  /** 検出経路: A=条文紐付け, B=応答中引用照合, C=クエリキーワード */
  source: "A" | "B" | "C";
  /** 法令本文そのものではなく、条文の施行・運用に関する関連資料。 */
  evidenceRole: "related-material";
  locator: string | null;
  excerpt: string | null;
  independentlyCheckedAt: string | null;
};

export type AttachedLeaflet = {
  id: string;
  title: string;
  publisher: string;
  publishedDateRaw: string | null;
  target: string;
  category: string;
  sourceUrl: string;
  pdfUrl: string | null;
  detailUrl: string | null;
  /** 検出経路: 現状 A のみ（条文紐付け） */
  source: "A";
};

export type NoticeAttachmentResult = {
  notices: AttachedNotice[];
  leaflets: AttachedLeaflet[];
};

const MAX_NOTICES = 5;
const MAX_LEAFLETS = 5;

type LeafletConcept =
  | "asbestos"
  | "boiler"
  | "chemical"
  | "crane"
  | "dust"
  | "electrical"
  | "foreign-worker"
  | "full-harness"
  | "health-check"
  | "heat"
  | "ionizing-radiation"
  | "mental-health"
  | "organic-solvent"
  | "overwork"
  | "oxygen-deficiency"
  | "scaffold"
  | "special-chemical"
  | "truck-cargo";

const LEAFLET_CONCEPT_PATTERNS: ReadonlyArray<
  readonly [LeafletConcept, RegExp]
> = [
  ["electrical", /(?:電気|感電|充電電路|充電部|低圧|高圧|特別高圧|特高|電工|配線|結線|分電盤|配電盤|制御盤|受電設備|開閉器|ブレーカー)/u],
  ["oxygen-deficiency", /(?:酸素欠乏|酸欠|硫化水素|酸欠則)/u],
  ["organic-solvent", /(?:有機溶剤|有機則|トルエン|キシレン)/u],
  ["asbestos", /(?:石綿|アスベスト|石綿則)/u],
  ["heat", /(?:熱中症|暑熱|WBGT|高温多湿|熱ストレス)/iu],
  ["scaffold", /(?:足場|手すり先行|布板|建地|筋かい)/u],
  ["full-harness", /(?:フルハーネス|墜落制止用器具|安全帯|胴ベルト)/u],
  ["chemical", /(?:化学物質|SDS|安全データシート|ラベル表示|リスクアセスメント|化学物質管理者|chemicals)/iu],
  ["special-chemical", /(?:特定化学物質|特化物|特化則)/u],
  ["dust", /(?:粉じん|粉塵|じん肺|粉じん則)/u],
  ["crane", /(?:クレーン|玉掛け)/u],
  ["boiler", /(?:ボイラー|第一種圧力容器)/u],
  ["health-check", /(?:健康診断|健康管理手帳|産業医)/u],
  ["mental-health", /(?:ストレスチェック|メンタルヘルス|心の健康)/u],
  ["overwork", /(?:過重労働|長時間労働)/u],
  ["ionizing-radiation", /(?:電離放射線|放射線障害|放射線業務)/u],
  ["truck-cargo", /(?:荷役|貨物自動車|テールゲート|昇降設備)/u],
  ["foreign-worker", /(?:外国人|foreign-worker)/iu],
];

function leafletConcepts(value: string | undefined): Set<LeafletConcept> {
  const normalized = value?.normalize("NFKC").trim();
  if (!normalized) return new Set();
  return new Set(
    LEAFLET_CONCEPT_PATTERNS.flatMap(([concept, pattern]) =>
      pattern.test(normalized) ? [concept] : [],
    ),
  );
}

function conceptsOverlap(
  left: ReadonlySet<LeafletConcept>,
  right: ReadonlySet<LeafletConcept>,
): boolean {
  return [...left].some((concept) => right.has(concept));
}

// bindingLevel の優先度（数値が小さいほど上位）
const BINDING_ORDER: Record<MhlwNotice["bindingLevel"], number> = {
  binding: 0,
  indirect: 1,
  reference: 2,
};

function toNoticeHit(n: MhlwNotice, source: "A" | "B" | "C"): AttachedNotice {
  const isHeatNotice = n.id === "mhlw-notice-0014";
  return {
    id: n.id,
    docType: n.docType,
    title: n.title,
    noticeNumber: n.noticeNumber,
    issuedDateRaw: n.issuedDateRaw,
    issuer: n.issuer,
    bindingLevel: n.bindingLevel,
    detailUrl: n.detailUrl,
    sourceUrl: n.sourceUrl,
    pdfUrl: n.pdfUrl,
    category: n.category,
    source,
    evidenceRole: "related-material",
    locator: isHeatNotice ? MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.locator : null,
    excerpt: isHeatNotice ? MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.excerpt : null,
    independentlyCheckedAt: isHeatNotice
      ? MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.independentPrimarySourceReview.reviewedAt
      : null,
  };
}

function attachEvidenceToHit(
  hit: NoticeHit,
  source: "A" | "B" | "C",
): AttachedNotice {
  const notice = resolveNoticeById(hit.id);
  return notice
    ? toNoticeHit(notice, source)
    : {
        ...hit,
        source,
        evidenceRole: "related-material",
        locator: null,
        excerpt: null,
        independentlyCheckedAt: null,
      };
}

function toLeaflet(l: MhlwLeaflet): AttachedLeaflet {
  return {
    id: l.id,
    title: l.title,
    publisher: l.publisher,
    publishedDateRaw: l.publishedDateRaw,
    target: l.target,
    category: l.category,
    sourceUrl: l.sourceUrl,
    pdfUrl: l.pdfUrl,
    detailUrl: l.detailUrl,
    source: "A",
  };
}

/**
 * Article mappings are deliberately broad (for example, 安衛法59条 covers
 * every special-education domain). A mapped leaflet is displayed only when a
 * specific concept in its own metadata also occurs in the user's effective
 * query and, when the answer names a specific domain, in that answer. Unknown
 * and generic-only queries deliberately attach nothing.
 */
export function isLeafletRelevantToQuery(
  leaflet: Pick<
    MhlwLeaflet,
    "title" | "target" | "category" | "categoryLabel" | "subCategory"
  >,
  query: string | undefined,
  answer?: string,
): boolean {
  const queryConcepts = leafletConcepts(query);
  if (queryConcepts.size === 0) return false;
  const metadataConcepts = leafletConcepts(
    [
      leaflet.title,
      leaflet.target,
      leaflet.category,
      leaflet.categoryLabel,
      leaflet.subCategory ?? "",
    ].join(" "),
  );
  if (!conceptsOverlap(queryConcepts, metadataConcepts)) return false;

  const answerConcepts = leafletConcepts(answer);
  return (
    answerConcepts.size === 0 ||
    conceptsOverlap(answerConcepts, metadataConcepts)
  );
}

/**
 * 通達/リーフレット添付の統合。
 *
 * 引数:
 *   - articles: RAG ヒット条文（Layer A の入力）
 *   - answer: Gemini 応答テキスト（Layer B の入力）
 *   - query: 元の質問テキスト（Layer C の入力）
 *
 * 戻り値: 重複排除済の通達・リーフレット配列（最大 5 件ずつ）
 */
export function attachNoticesAndLeaflets(args: {
  articles: readonly LawArticle[];
  answer?: string;
  query?: string;
}): NoticeAttachmentResult {
  const { articles, answer, query } = args;

  // ── Layer A: 条文紐付け ────────────────────────
  const aNotices: AttachedNotice[] = [];
  const aLeaflets: AttachedLeaflet[] = [];
  const seenNoticeIds = new Set<string>();
  const seenLeafletIds = new Set<string>();
  for (const article of articles) {
    const mapping = getNoticeMappingForArticle(article.lawShort, article.articleNum);
    if (!mapping) continue;
    for (const nid of mapping.notices ?? []) {
      if (seenNoticeIds.has(nid)) continue;
      const n = resolveNoticeById(nid);
      if (!n || !isNoticeIndividuallyVerified(n)) continue;
      seenNoticeIds.add(nid);
      aNotices.push(toNoticeHit(n, "A"));
    }
    for (const lid of mapping.leaflets ?? []) {
      if (seenLeafletIds.has(lid)) continue;
      const l = resolveLeafletById(lid);
      if (!l || !isLeafletRelevantToQuery(l, query, answer)) continue;
      seenLeafletIds.add(lid);
      aLeaflets.push(toLeaflet(l));
    }
  }

  // ── Layer B: 応答内通達引用 ────────────────────
  const bNotices: AttachedNotice[] = [];
  if (answer) {
    const detection = detectAndMatchNotices(answer);
    for (const m of detection.matched) {
      if (!isNoticeIndividuallyVerified(m.notice)) continue;
      if (seenNoticeIds.has(m.notice.id)) continue;
      seenNoticeIds.add(m.notice.id);
      bNotices.push(toNoticeHit(m.notice, "B"));
    }
  }

  // ── Layer C: クエリキーワード（既存 searchRelevantNotices）────
  const cNotices: AttachedNotice[] = [];
  if (query) {
    const hits = searchRelevantNotices(query, MAX_NOTICES);
    for (const h of hits) {
      if (seenNoticeIds.has(h.id)) continue;
      seenNoticeIds.add(h.id);
      cNotices.push(attachEvidenceToHit(h, "C"));
    }
  }

  // ── マージ + bindingLevel ソート ──────────────────
  // Layer A → B → C の順を尊重しつつ、bindingLevel 内で再ソート。
  // 同じ source 内では並び順を維持（=配列追加順）。
  const allNotices = [...aNotices, ...bNotices, ...cNotices];
  allNotices.sort((x, y) => {
    // source order を主軸（A < B < C）
    const sX = sourceWeight(x.source);
    const sY = sourceWeight(y.source);
    if (sX !== sY) return sX - sY;
    // 同じ source なら bindingLevel
    return BINDING_ORDER[x.bindingLevel] - BINDING_ORDER[y.bindingLevel];
  });

  return {
    notices: allNotices.slice(0, MAX_NOTICES),
    leaflets: aLeaflets.slice(0, MAX_LEAFLETS),
  };
}

function sourceWeight(s: "A" | "B" | "C"): number {
  return s === "A" ? 0 : s === "B" ? 1 : 2;
}
