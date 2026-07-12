/**
 * fidelity v2: 安衛則(347M50002000032) の plain を fulltext スナップショットに対しても照合する。
 *
 * plain-fidelity.test.ts は「コーパス(要約層)」を照合先にしているため、コーパスに
 * 抄録・要旨(gap-fill 由来)がある条は原文と乖離していても検知できない。
 * FT-D1 で全文層が入った安衛則については、plain を fulltext に対しても
 * 通し、gap-fill／簡略コーパスの盲点で通過してきた欠落を炙り出す。
 *
 * 現時点の適用範囲:
 *  - lawId: 347M50002000032（安衛則のみ）
 *  - 未取込法令(有機則・鉛則・特化則ほか)は plain-fidelity.test.ts のコーパス照合を
 *    アンカーに使い続ける(=抄録照合。盲点は現行の警告経路で表明する)。
 *
 * ここが赤くなったら、plain と e-Gov 実法文が乖離しているという直接の合図。
 */
import { describe, expect, it } from "vitest";
import { checkFidelity } from "@/lib/plain/fidelity";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import type { LawArticle } from "@/data/laws";
import { plainSourceHash } from "@/lib/plain/text-hash";
import type { FulltextLaw } from "@/lib/laws-fulltext/types";
import { plainAnzenEiseiKisoku } from "./anzen-eisei-kisoku";
import anzenFulltext from "../laws-fulltext/347M50002000032.json";
import {
  normalizeFullwidthAlnum,
  normalizeKanjiNumbers,
} from "@/lib/article-number-normalize";

const LAW_ID = "347M50002000032";
const ft = anzenFulltext as unknown as FulltextLaw;

function keyOf(articleNum: string): string | null {
  const norm = normalizeKanjiNumbers(normalizeFullwidthAlnum(articleNum));
  const m = /^第?([0-9]+)条((?:の[0-9]+)*)/.exec(norm);
  if (!m) return null;
  const parts = [m[1]];
  if (m[2]) for (const b of m[2].split("の").filter(Boolean)) parts.push(b);
  return parts.join("-");
}

const FT_BY_KEY = new Map(ft.articles.map((a) => [a.sortKey.join("-"), a]));

const CORPUS_BY_KEY = new Map(
  LAW_NAVI_ENTRIES.map((e) => [`${e.egovLawId}|${e.article.articleNum}`, e.article])
);

/**
 * 安衛則の plain のうち、コーパスと fulltext の text が「別文」だった条を洗い出す。
 * gap-fill 由来の抄録／簡略コーパスに紐づいた plain は原文照合が甘い可能性が高いので、
 * 少なくとも警告として表面化させる。
 */
describe("安衛則 plain × fulltext スナップショット照合", () => {
  it("全 plain が fulltext に articleNum で解決できる", () => {
    const missing = plainAnzenEiseiKisoku
      .map((p) => p.articleNum)
      .filter((num) => !FT_BY_KEY.has(keyOf(num) ?? "__none__"));
    expect(missing).toEqual([]);
  });

  it(
    "コーパスと fulltext が同一の条は 原文=fulltext としてもゲートが緑（Ratchet アンカー）",
    () => {
      const failures: string[] = [];
      let matchedCount = 0;
      for (const p of plainAnzenEiseiKisoku) {
        if (p.checkStatus !== "verified") continue;
        const ftArticle = FT_BY_KEY.get(keyOf(p.articleNum) ?? "__none__");
        const corpus = CORPUS_BY_KEY.get(`${LAW_ID}|${p.articleNum}`);
        if (!ftArticle || !corpus) continue;
        // コーパス text と fulltext text が違う条は gap-fill/簡略の疑い。
        // ここでは「一致する条」だけを fulltext アンカーの直接テスト対象にする。
        // 差分がある条は plain-fulltext-gap.report で別途一覧化する。
        if (corpus.text !== ftArticle.text) continue;
        matchedCount++;
        if (plainSourceHash(ftArticle.text) !== p.sourceTextHash) continue;
        const article: LawArticle = {
          ...corpus,
          text: ftArticle.text,
        };
        const violations = checkFidelity(article, p);
        for (const v of violations) {
          failures.push(`${p.articleNum} [${v.kind}] ${v.message}`);
        }
      }
      expect(
        matchedCount,
        "fulltext と一致するコーパス条 (アンカー対象) が 0 件（アンカー未成立）"
      ).toBeGreaterThan(0);
      expect(
        failures,
        `安衛則 plain × fulltext アンカー違反 ${failures.length} 件:\n${failures.join("\n")}`
      ).toEqual([]);
    }
  );

  it("gap-fill/簡略でコーパスと fulltext が乖離している安衛則の条は列挙して警告する（リライトキュー投入対象）", () => {
    const diverged: Array<{
      articleNum: string;
      corpusChars: number;
      fulltextChars: number;
    }> = [];
    for (const p of plainAnzenEiseiKisoku) {
      const ftArticle = FT_BY_KEY.get(keyOf(p.articleNum) ?? "__none__");
      const corpus = CORPUS_BY_KEY.get(`${LAW_ID}|${p.articleNum}`);
      if (!ftArticle || !corpus) continue;
      if (corpus.text !== ftArticle.text) {
        diverged.push({
          articleNum: p.articleNum,
          corpusChars: corpus.text.length,
          fulltextChars: ftArticle.text.length,
        });
      }
    }
    if (diverged.length > 0) {
      console.warn(
        `[plain:fulltext-gap] 安衛則 ${diverged.length}条 が gap-fill/簡略コーパス由来 — BACKLOG-plain-fulltext-rewrite で順次是正:\n` +
          diverged
            .map(
              (d) =>
                `  ${d.articleNum}: corpus=${d.corpusChars}字 vs fulltext=${d.fulltextChars}字`
            )
            .join("\n")
      );
    }
    // ここでは fail させない（ratchet: 増えたら fail・後述テスト）
    expect(Array.isArray(diverged)).toBe(true);
  });

  /**
   * 乖離条のラチェット: 上限値は現在の実測値。減る方向にしか動かせない。
   * fulltext 由来のリライト（安衛則第117条など）を進めれば、この上限を下げていく。
   */
  it("gap-fill/簡略コーパス乖離条の総数がラチェット上限を超えていない", () => {
    const diverged: string[] = [];
    for (const p of plainAnzenEiseiKisoku) {
      const ftArticle = FT_BY_KEY.get(keyOf(p.articleNum) ?? "__none__");
      const corpus = CORPUS_BY_KEY.get(`${LAW_ID}|${p.articleNum}`);
      if (!ftArticle || !corpus) continue;
      if (corpus.text !== ftArticle.text) diverged.push(p.articleNum);
    }
    // 2026-07-13 時点の実測 (fidelity v2 導入直後・102条)。
    // 増加は禁止、減少のみ許容。安衛則 plain を fulltext ベースに書き直すたびに
    // ここを下げていく(BACKLOG-plain-fulltext-rewrite で管理)。
    const RATCHET_MAX = 102;
    expect(
      diverged.length,
      `安衛則 gap-fill/簡略乖離条が上限 ${RATCHET_MAX} を超えました (=${diverged.length}件)。` +
        `新しい gap-fill を足したか、簡略コーパスに戻したかを確認してください:\n  ${diverged.join(", ")}`
    ).toBeLessThanOrEqual(RATCHET_MAX);
  });
});
