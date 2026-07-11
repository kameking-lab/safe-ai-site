/**
 * 現場ことば版レジストリ。
 *
 * 法令別ファイル（sankketsu-kisoku.ts 等）をここで束ね、
 * (egovLawId, articleNum) で引けるようにする。新しい法令の言い換えが
 * 完成したら import して PLAIN_LAW_FILES に1行足すだけ（並列執筆でも
 * このファイルの diff は1行なので衝突がほぼ起きない）。
 *
 * 表示可否は getFreshPlainArticle が一元判定する:
 *   checkStatus === "verified" かつ sourceTextHash がコーパス現行原文と一致
 *   （改正でコーパスが更新された条は自動で非表示＝stale。空枠も出さない）。
 */

import type { LawArticle } from "@/data/laws";
import { plainSourceHash } from "@/lib/plain/text-hash";
import type { PlainArticle } from "./types";
import { plainSankketsuKisoku } from "./sankketsu-kisoku";

/** 法令別 plain ファイルの束（ファイル名 → エントリ配列） */
export const PLAIN_LAW_FILES: Readonly<Record<string, readonly PlainArticle[]>> = {
  "sankketsu-kisoku": plainSankketsuKisoku,
};

/** 全 plain エントリ（整合テスト・カバレッジ用） */
export const allPlainArticles: readonly PlainArticle[] = Object.values(PLAIN_LAW_FILES).flat();

const BY_KEY: ReadonlyMap<string, PlainArticle> = (() => {
  const map = new Map<string, PlainArticle>();
  for (const p of allPlainArticles) {
    map.set(`${p.egovLawId}|${p.articleNum}`, p);
  }
  return map;
})();

/** (egovLawId, articleNum) → plain エントリ（stale 判定なしの生引き） */
export function getPlainArticle(egovLawId: string, articleNum: string): PlainArticle | undefined {
  return BY_KEY.get(`${egovLawId}|${articleNum}`);
}

/**
 * 表示してよい plain エントリだけを返す。
 * verified かつ 原文ハッシュ一致（＝言い換えの元にした原文が現行コーパスと同一）
 * のときのみ返し、それ以外は undefined（UI は区画ごと出さない）。
 */
export function getFreshPlainArticle(
  egovLawId: string,
  article: Pick<LawArticle, "articleNum" | "text">
): PlainArticle | undefined {
  const p = getPlainArticle(egovLawId, article.articleNum);
  if (!p) return undefined;
  if (p.checkStatus !== "verified") return undefined;
  if (p.sourceTextHash !== plainSourceHash(article.text)) return undefined;
  return p;
}
