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
import { detectAndMatchNotices } from "@/lib/chatbot-notice-detector";
import { searchRelevantNotices, type NoticeHit } from "@/lib/notice-search";

export type AttachedNotice = NoticeHit & {
  /** 検出経路: A=条文紐付け, B=応答中引用照合, C=クエリキーワード */
  source: "A" | "B" | "C";
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

// bindingLevel の優先度（数値が小さいほど上位）
const BINDING_ORDER: Record<MhlwNotice["bindingLevel"], number> = {
  binding: 0,
  indirect: 1,
  reference: 2,
};

function toNoticeHit(n: MhlwNotice, source: "A" | "B" | "C"): AttachedNotice {
  return {
    id: n.id,
    docType: n.docType,
    title: n.title,
    noticeNumber: n.noticeNumber,
    issuedDateRaw: n.issuedDateRaw,
    issuer: n.issuer,
    bindingLevel: n.bindingLevel,
    detailUrl: n.detailUrl,
    category: n.category,
    source,
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
      if (!n) continue;
      seenNoticeIds.add(nid);
      aNotices.push(toNoticeHit(n, "A"));
    }
    for (const lid of mapping.leaflets ?? []) {
      if (seenLeafletIds.has(lid)) continue;
      const l = resolveLeafletById(lid);
      if (!l) continue;
      seenLeafletIds.add(lid);
      aLeaflets.push(toLeaflet(l));
    }
  }

  // ── Layer B: 応答内通達引用 ────────────────────
  const bNotices: AttachedNotice[] = [];
  if (answer) {
    const detection = detectAndMatchNotices(answer);
    for (const m of detection.matched) {
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
      cNotices.push({ ...h, source: "C" });
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
