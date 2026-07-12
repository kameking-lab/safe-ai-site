/**
 * 現場ことば版 カバレッジ／stale（改正追従）集計。
 *
 * 対象法令（PLAIN_TARGETS）ごとに、コーパス実体（法令ナビ生成集合）と
 * plain レジストリを突合し、
 *  - done: 言い換え済み・原文ハッシュ一致（表示中）
 *  - stale: 言い換え済みだがコーパス原文が更新済み（UI非表示・要再生成）
 *  - missing: 未生成の条
 * を条単位で返す。`npm run plain:status` がこの結果から
 * カバレッジレポートと再生成キューを生成する。
 */

import { LAW_METADATA } from "@/data/law-metadata";
import { allPlainArticles } from "@/data/plain";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { hasFulltext, loadFulltextLaw } from "@/lib/laws-fulltext/loader";
import { plainSourceHash } from "./text-hash";
import { PLAIN_TARGETS } from "./targets";

export type PlainLawCoverage = {
  lawShort: string;
  egovLawId: string;
  file: string;
  squad: number;
  /** コーパス収載条数（法令ナビ生成集合ベース） */
  total: number;
  /** 言い換え済み・fresh（表示中） */
  done: number;
  /** 原文更新で stale になった条番号（再生成キュー） */
  stale: string[];
  /** 未生成の条番号 */
  missing: string[];
  /** コーパスに対応条が無い幽霊 plain エントリ（データ不整合） */
  orphans: string[];
};

/**
 * curated 非収載の articleNum を「幽霊エントリ」から除外するための、法令ごとの
 * 全文層 articleNum 集合。安衛則等（FULLTEXT_LAW_IDS）は curated が抄録のため、
 * 原文＝全文スナップショットを照合先にした gap 条（量産対象）が正当に存在する
 * （plain-fulltext-anchor.test.ts が原文アンカーで別途 fidelity を保証する）。
 */
async function fulltextArticleNums(egovLawId: string): Promise<ReadonlySet<string> | null> {
  if (!hasFulltext(egovLawId)) return null;
  const law = await loadFulltextLaw(egovLawId);
  if (!law) return null;
  return new Set(law.articles.map((a) => a.articleNum));
}

export async function buildPlainCoverage(): Promise<PlainLawCoverage[]> {
  const plainByLaw = new Map<string, Map<string, (typeof allPlainArticles)[number]>>();
  for (const p of allPlainArticles) {
    let m = plainByLaw.get(p.egovLawId);
    if (!m) {
      m = new Map();
      plainByLaw.set(p.egovLawId, m);
    }
    m.set(p.articleNum, p);
  }

  return Promise.all(
    PLAIN_TARGETS.map(async (t) => {
      const egovLawId = LAW_METADATA[t.lawShort]?.egovLawId ?? "";
      const corpus = LAW_NAVI_ENTRIES.filter((e) => e.egovLawId === egovLawId);
      const plains = plainByLaw.get(egovLawId) ?? new Map();
      const fulltextNums = await fulltextArticleNums(egovLawId);

      let done = 0;
      const stale: string[] = [];
      const missing: string[] = [];
      const corpusNums = new Set<string>();

      for (const e of corpus) {
        corpusNums.add(e.article.articleNum);
        const p = plains.get(e.article.articleNum);
        if (!p || p.checkStatus !== "verified") {
          missing.push(e.article.articleNum);
        } else if (p.sourceTextHash === plainSourceHash(e.article.text)) {
          done++;
        } else {
          stale.push(e.article.articleNum);
        }
      }

      const orphans = [...plains.keys()].filter(
        (num) => !corpusNums.has(num) && !fulltextNums?.has(num)
      );

      return {
        lawShort: t.lawShort,
        egovLawId,
        file: t.file,
        squad: t.squad,
        total: corpus.length,
        done,
        stale,
        missing,
        orphans,
      };
    })
  );
}
