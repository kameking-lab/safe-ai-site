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
import type { FulltextLaw } from "@/lib/laws-fulltext/types";
import { plainSourceHash } from "./text-hash";
import { PLAIN_TARGETS } from "./targets";
import anzenHouFulltext from "@/data/laws-fulltext/347AC0000000057.json";
import anzenReiFulltext from "@/data/laws-fulltext/347CO0000000318.json";
import anzenKisokuFulltext from "@/data/laws-fulltext/347M50002000032.json";

/**
 * egovLawId → 全文スナップショットに実在する articleNum の集合。
 *
 * 安衛則等では curated コーパス（LAW_NAVI_ENTRIES）に無い全文ギャップ約1,000条を
 * 複数部隊が原文(fulltext)を照合先に量産している（plain-fulltext-anchor.test.ts）。
 * orphans 判定を curated だけで行うと、それら正規の gap 条 plain が軒並み
 * 「幽霊エントリ」に見えてしまう。plain-fidelity.test.ts の
 * FULLTEXT_EXISTENCE と同じ考え方をここにも適用し、全文層に実在する条は
 * orphan から除外する（コーパスにも全文層にも無い条は従来どおり orphan）。
 * 全文スナップショットが無い法令（有機則等）はこの集合が空のため影響なし。
 */
const FULLTEXT_EXISTENCE_BY_LAW: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  ([anzenHouFulltext, anzenReiFulltext, anzenKisokuFulltext] as unknown as FulltextLaw[]).map(
    (ft) => [ft.lawId, new Set(ft.articles.map((a) => a.articleNum))]
  )
);

/** テスト用に公開: egovLawId の全文スナップショットに articleNum が実在するか。 */
export function hasFulltextArticle(egovLawId: string, articleNum: string): boolean {
  return FULLTEXT_EXISTENCE_BY_LAW.get(egovLawId)?.has(articleNum) ?? false;
}

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

export function buildPlainCoverage(): PlainLawCoverage[] {
  const plainByLaw = new Map<string, Map<string, (typeof allPlainArticles)[number]>>();
  for (const p of allPlainArticles) {
    let m = plainByLaw.get(p.egovLawId);
    if (!m) {
      m = new Map();
      plainByLaw.set(p.egovLawId, m);
    }
    m.set(p.articleNum, p);
  }

  return PLAIN_TARGETS.map((t) => {
    const egovLawId = LAW_METADATA[t.lawShort]?.egovLawId ?? "";
    const corpus = LAW_NAVI_ENTRIES.filter((e) => e.egovLawId === egovLawId);
    const plains = plainByLaw.get(egovLawId) ?? new Map();

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

    const fulltextNums = FULLTEXT_EXISTENCE_BY_LAW.get(egovLawId) ?? new Set<string>();
    const orphans = [...plains.keys()].filter(
      (num) => !corpusNums.has(num) && !fulltextNums.has(num)
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
  });
}
