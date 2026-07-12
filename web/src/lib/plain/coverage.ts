/**
 * 現場ことば版 カバレッジ／stale（改正追従）集計。
 *
 * 対象法令（PLAIN_TARGETS）ごとに、コーパス実体（法令ナビ生成集合＋全文スナップショット
 * 層）と plain レジストリを突合し、
 *  - done: 言い換え済み・原文ハッシュ一致（表示中）
 *  - stale: 言い換え済みだがコーパス原文が更新済み（UI非表示・要再生成）
 *  - missing: 未生成の条
 * を条単位で返す。`npm run plain:status` がこの結果から
 * カバレッジレポートと再生成キューを生成する。
 *
 * 幽霊（orphans）判定は「法令ナビ生成集合（curated）」だけでなく、全文スナップショット層
 * （laws-fulltext。安衛則量産部隊 anei-fulltext-squad-*.md の照合先）にも articleNum が
 * 実在すれば正当な条として扱う。curated は「既存 curated 条が正本」の dual-exclusion
 * （lib/law-navi/fulltext-navi.ts）で全文条を LAW_NAVI_ENTRIES に混ぜない設計のため、
 * curated 未収載だが全文層には実在する gap 条（fidelity v2 は
 * plain-fulltext-anchor.test.ts が全文層を直接アンカーに照合済み）まで「データ不整合」と
 * 誤検知しないようにする。
 */

import { LAW_METADATA } from "@/data/law-metadata";
import { allPlainArticles } from "@/data/plain";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { normalizeFullwidthAlnum, normalizeKanjiNumbers } from "@/lib/article-number-normalize";
import type { FulltextLaw } from "@/lib/laws-fulltext/types";
import anzenSokuFulltext from "@/data/laws-fulltext/347M50002000032.json";
import anzenHoFulltext from "@/data/laws-fulltext/347AC0000000057.json";
import anzenReiFulltext from "@/data/laws-fulltext/347CO0000000318.json";
import { plainSourceHash } from "./text-hash";
import { PLAIN_TARGETS } from "./targets";

/** egovLawId → 全文スナップショット（FULLTEXT_LAW_IDS と同一の3法令。loader.ts は server-only 動的importのためテスト/集計から使えず、ここは読み取り専用の静的import）。 */
const FULLTEXT_BY_EGOV: ReadonlyMap<string, FulltextLaw> = new Map([
  ["347M50002000032", anzenSokuFulltext as unknown as FulltextLaw],
  ["347AC0000000057", anzenHoFulltext as unknown as FulltextLaw],
  ["347CO0000000318", anzenReiFulltext as unknown as FulltextLaw],
]);

/** 条番号 → [条, 枝…] 正規化キー（loader.ts の keyOf と同一規約）。 */
function fulltextKeyOf(articleNum: string): string | null {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(articleNum));
  const m = /^第?([0-9]+)条((?:の[0-9]+)*)/.exec(norm);
  if (!m) return null;
  const parts = [m[1]];
  if (m[2]) for (const b of m[2].split("の").filter(Boolean)) parts.push(b);
  return parts.join("-");
}

/** egovLawId → 全文層に実在する articleNum の正規化キー集合。全文非対応法令は空集合。 */
function fulltextKeysOf(egovLawId: string): ReadonlySet<string> {
  const law = FULLTEXT_BY_EGOV.get(egovLawId);
  if (!law) return new Set();
  return new Set(law.articles.map((a) => fulltextKeyOf(a.articleNum)).filter((k): k is string => k !== null));
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

    const fulltextKeys = fulltextKeysOf(egovLawId);
    const orphans = [...plains.keys()].filter(
      (num) => !corpusNums.has(num) && !fulltextKeys.has(fulltextKeyOf(num) ?? "__none__")
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
