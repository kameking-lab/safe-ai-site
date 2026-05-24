/**
 * Phase 4: AI 応答テキストから通達・告示の引用を検出し、mhlw-notices.ts と機械照合する。
 *
 * 設計参照: docs/chatbot-quality-research-2026-05-23/06-notice-attachment-design.md §4
 *
 * 目的:
 * - 応答に出てきた「基発第○号」「事務連絡」等の noticeNumber 引用を全件抽出
 * - mhlw-notices.ts 1,069件と機械照合
 * - 実在通達のみを採用し、架空通達は除外（ハルシネーション抑止）
 * - 一致した noticeId を /api/chatbot レスポンスメタに付与
 */

import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { normalizeFullwidthAlnum, normalizeKanjiNumbers } from "@/lib/article-number-normalize";

export type ExtractedNoticeRef = {
  /** マッチ生文字列（例: 「基発0726第2号」） */
  raw: string;
  /** 正規化済の通達番号 (e.g., "基発0726第2号") */
  normalized: string;
  /** 元テキスト内の出現位置 */
  index: number;
};

export type DetectedNotice = {
  ref: ExtractedNoticeRef;
  notice: MhlwNotice;
};

export type NoticeDetectionResult = {
  /** 抽出された参照（架空含む） */
  extracted: ExtractedNoticeRef[];
  /** mhlw-notices.ts と一致した通達 */
  matched: DetectedNotice[];
  /** 一致しなかった参照（架空通達番号の可能性） */
  unmatched: ExtractedNoticeRef[];
};

// ── 通達番号の正規表現パターン ────────────────────────
//
// 厚労省通達の noticeNumber は概ね次の形式:
//   基発 0220 第 1 号 / 基発0220第1号 / 基発第0220号 / 基安労発 0306 第 1 号
//   雇均発0331第5号 / 安発0306第4号 / 基安発0314第2号 / 基安化発0109第1号
//   基発第○号（古い形式）/ 事務連絡
//
// 正規表現は厳格目に: 接頭辞を限定し、誤検出を避ける。
const NOTICE_NUMBER_PATTERNS = [
  // 基発0220第1号 / 基安労発0306第1号 / 雇均発0331第5号 / 基安化発0109第1号
  /(?:基発|基安発|基安労発|基安安発|基安化発|安発|雇均発|職発|厚労省発|基労発|基補発)\s*\d{0,4}\s*第?\s*\d+\s*号/g,
  // 古い形式: 基発第220号 / 安発第3号
  /(?:基発|安発)\s*第\s*\d+\s*号/g,
  // 事務連絡（番号なし）— mhlw-notices.ts の noticeNumber が "事務連絡" の通達と照合
  /事務連絡/g,
];

/**
 * 応答テキスト内の通達番号らしき文字列を全件抽出する。
 * 全角英数字・空白を正規化してから走査するため、表記ゆれを吸収する。
 */
export function extractNoticeRefs(answer: string): ExtractedNoticeRef[] {
  if (!answer) return [];
  // 全角→半角、漢数字は無関係なのでスキップ
  const normalized = normalizeFullwidthAlnum(answer);
  const seen = new Set<string>();
  const out: ExtractedNoticeRef[] = [];
  for (const re of NOTICE_NUMBER_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized))) {
      const matched = m[0];
      // 空白を除去して正規形を作る
      const compact = matched.replace(/\s+/g, "");
      // 「基発0220第1号」「基発第0220号」のような揺れは元データ側に依存
      if (seen.has(compact)) continue;
      seen.add(compact);
      out.push({
        raw: matched,
        normalized: compact,
        index: m.index,
      });
    }
  }
  return out;
}

// ── 内部キャッシュ ────────────────────────────────────

let noticeIndex: Map<string, MhlwNotice> | null = null;

function ensureIndex() {
  if (noticeIndex) return;
  noticeIndex = new Map();
  for (const n of mhlwNotices) {
    if (!n.noticeNumber) continue;
    const key = normalizeNoticeNumber(n.noticeNumber);
    if (!key) continue;
    // 同じ noticeNumber を持つ通達が複数存在する場合は先勝ち
    if (!noticeIndex.has(key)) noticeIndex.set(key, n);
  }
}

/**
 * 比較用に通達番号を正規化する（全角→半角、空白除去、漢数字→アラビア）。
 */
export function normalizeNoticeNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return normalizeKanjiNumbers(normalizeFullwidthAlnum(raw))
    .replace(/\s+/g, "");
}

/**
 * 応答テキストから抽出した通達参照を mhlw-notices.ts と照合する。
 * Layer 2 同様、架空番号は採用しない（ハルシネーション抑止）。
 */
export function detectAndMatchNotices(answer: string): NoticeDetectionResult {
  ensureIndex();
  const extracted = extractNoticeRefs(answer);
  const matched: DetectedNotice[] = [];
  const unmatched: ExtractedNoticeRef[] = [];

  for (const ref of extracted) {
    const key = normalizeNoticeNumber(ref.normalized);
    const hit = noticeIndex!.get(key);
    if (hit) {
      matched.push({ ref, notice: hit });
    } else {
      unmatched.push(ref);
    }
  }

  return { extracted, matched, unmatched };
}

/**
 * テスト・スクリプト用: 内部 index を破棄して次回呼出で再構築させる。
 * 通常コードからは呼ばない。
 */
export function _resetNoticeDetectorForTest() {
  noticeIndex = null;
}
