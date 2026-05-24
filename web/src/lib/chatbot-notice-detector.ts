/**
 * Phase 4: AI 応答テキストから通達番号引用を検出し、mhlw-notices.ts と機械照合する。
 *
 * 検出パターン:
 *   - "基発0220第5号" / "基発第0220号" / "基発0318" 等
 *   - "労衛発○号" / "基安発○号" / "健発○号" / "職発○号" / "基収○号"
 *   - "厚生労働省告示第○号"
 *   - "事務連絡" (日付付きで特定)
 *
 * 照合方針:
 *   - mhlw-notices.ts に存在する noticeNumber と完全一致 (正規化後)
 *   - 不一致 (架空通達番号) は除外 (Phase 2 ハルシネーション対策と同じ思想)
 */

import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";

/** 通達番号正規表現
 *
 * カバーするプレフィックス:
 *   基発 / 基安発 / 基安安発 / 健発 / 職発 / 基収 / 労衛発 / 安衛発
 *   厚生労働省告示
 */
const NOTICE_NUMBER_PATTERNS: RegExp[] = [
  // 基発0220第5号 / 基発第0220号 / 基発0318第1号
  /(?:基発|基安発|基安安発|健発|職発|基収|労衛発|安衛発)\s*第?\s*\d{2,4}\s*(?:第\s*\d+\s*号|号)?/g,
  // 厚生労働省告示第○号
  /厚生労働省告示\s*第?\s*\d+\s*号/g,
];

/** 通達番号の比較用正規化 (空白除去、全角→半角) */
function normalizeNoticeNumber(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]/g, "")
    .replace(/[「」『』、,。]/g, "");
}

// mhlw-notices の noticeNumber → MhlwNotice 索引 (正規化キー)
const NOTICE_BY_NUMBER = new Map<string, MhlwNotice>();
for (const n of mhlwNotices) {
  if (n.noticeNumber) {
    NOTICE_BY_NUMBER.set(normalizeNoticeNumber(n.noticeNumber), n);
  }
}

/** AI 応答テキストから通達番号文字列を抽出 (重複除外、本文1回登場でも1件) */
export function extractNoticeNumberCandidates(answer: string): string[] {
  const found = new Set<string>();
  for (const p of NOTICE_NUMBER_PATTERNS) {
    const matches = answer.matchAll(p);
    for (const m of matches) {
      const raw = m[0].trim();
      if (raw) found.add(raw);
    }
  }
  return Array.from(found);
}

/** 抽出した通達番号候補を mhlw-notices と照合し、実在する notices のみ返す */
export function detectNoticesFromAnswer(answer: string): {
  matched: MhlwNotice[];
  unmatchedCandidates: string[];
} {
  const candidates = extractNoticeNumberCandidates(answer);
  const matched: MhlwNotice[] = [];
  const seen = new Set<string>();
  const unmatchedCandidates: string[] = [];

  for (const c of candidates) {
    const key = normalizeNoticeNumber(c);
    const hit = NOTICE_BY_NUMBER.get(key);
    if (hit) {
      if (!seen.has(hit.id)) {
        matched.push(hit);
        seen.add(hit.id);
      }
    } else {
      unmatchedCandidates.push(c);
    }
  }
  return { matched, unmatchedCandidates };
}

/** デバッグ用: 既知の通達番号件数 */
export const KNOWN_NOTICE_NUMBER_COUNT = NOTICE_BY_NUMBER.size;
