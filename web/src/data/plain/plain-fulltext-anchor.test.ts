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
import type { PlainArticle } from "./types";
import { plainAnzenEiseiKisoku } from "./anei-kisoku";
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

/** caption（"（見出し）"）の外側全角括弧を外す（fulltext-navi.ts と同じ整形）。 */
function captionToTitle(caption: string): string {
  const m = /^（([\s\S]*)）$/.exec(caption.trim());
  return m ? m[1] : caption.trim();
}

/**
 * 全文条 → 照合用 LawArticle。checkFidelity は article.text しか読まないが、
 * 型を満たすため見出し等も埋める。curated に無い gap 条の原文アンカーに使う。
 */
function ftToLawArticle(a: FulltextLaw["articles"][number]): LawArticle {
  return {
    law: "労働安全衛生規則",
    lawShort: "安衛則",
    articleNum: a.articleNum,
    articleTitle: captionToTitle(a.caption),
    text: a.text,
    keywords: [],
  };
}

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
    "全 安衛則 plain（verified・原文=fulltext ハッシュ一致）を fulltext に対して fidelity 全緑（全域アンカー）",
    () => {
      // 照合先は原文（fulltext）。curated コーパスに無い gap 条（量産対象・約1,000条）も
      // 含め、plain の sourceTextHash が当該 fulltext 原文と一致するエントリを直接アンカー
      // 対象にする。ハッシュ不一致（＝旧コーパス由来の抄録に紐づく or 改正で原文更新）は
      // 下段の divergence ratchet 側で扱い、ここでは fail させない。
      const failures: string[] = [];
      let anchored = 0;
      let gapAnchored = 0;
      for (const p of plainAnzenEiseiKisoku) {
        if (p.checkStatus !== "verified") continue;
        const ftArticle = FT_BY_KEY.get(keyOf(p.articleNum) ?? "__none__");
        if (!ftArticle) continue; // 実在性は前段テストが担保
        // plain がこの fulltext 原文に対して書かれている条だけを直接アンカーする。
        if (plainSourceHash(ftArticle.text) !== p.sourceTextHash) continue;
        anchored++;
        const corpus = CORPUS_BY_KEY.get(`${LAW_ID}|${p.articleNum}`);
        // curated 収録条は curated の付加メタを保ちつつ原文だけ fulltext に差し替え。
        // gap 条（curated 非収録＝量産分）は fulltext から合成した LawArticle を使う。
        const article: LawArticle = corpus
          ? { ...corpus, text: ftArticle.text }
          : ftToLawArticle(ftArticle);
        if (!corpus) gapAnchored++;
        const violations = checkFidelity(article, p);
        for (const v of violations) {
          failures.push(`${p.articleNum} [${v.kind}] ${v.message}`);
        }
      }
      expect(anchored, "fulltext アンカー対象が 0 件（アンカー未成立）").toBeGreaterThan(0);
      expect(
        failures,
        `安衛則 plain × fulltext アンカー違反 ${failures.length} 件` +
          `（gap 条アンカー ${gapAnchored} 件を含む全域照合）:\n${failures.join("\n")}`
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

/**
 * gap 条（curated コーパス非収載＝量産対象）でも、v2 ゲートが fulltext を原文アンカーに
 * して効くことの実証。量産部隊は curated に無い約1,000条を fulltext を照合先に書くため、
 * 「curated に無い条の plain も原文照合で欠落・改変・捏造を検知できる」ことを固定する。
 *
 * 見本条: 第654条（架設通路についての措置）。curated 非収載・全文層のみに実在し、
 * 注文者×義務・参照（法第31条第1項／第552条）を持つ短条。
 */
describe("gap 条（コーパス非収載）も fulltext アンカーで v2 照合が効く（量産の前提）", () => {
  const SAMPLE = "第654条";
  const ftArticle = FT_BY_KEY.get(keyOf(SAMPLE) ?? "__none__");

  it("見本 gap 条は curated コーパスに無く、全文層に実在する", () => {
    expect(ftArticle, `${SAMPLE} が全文層に無い`).toBeDefined();
    expect(
      CORPUS_BY_KEY.has(`${LAW_ID}|${SAMPLE}`),
      `${SAMPLE} は curated 収録済み（gap 見本として不適）`
    ).toBe(false);
  });

  it("原文に忠実な gap plain は fulltext アンカーで fidelity 全緑（v2 強制モード）", () => {
    if (!ftArticle) throw new Error("見本条が解決できない");
    // 注文者×義務・参照（法第31条第1項／第552条）を原文どおり保存した忠実版。
    const faithful: PlainArticle = {
      egovLawId: LAW_ID,
      articleNum: SAMPLE,
      plainText:
        "注文者は、法第31条第1項に該当する場合に、請負人に係る作業従事者へ架設通路を使用させるときは、その架設通路を第552条に定める架設通路の基準に適合するものとしなければなりません。これは、注文者が請負人の作業従事者に使わせる設備にも、同じ架設通路の安全基準を確保させる趣旨です。",
      sourceTextHash: plainSourceHash(ftArticle.text),
      sourceRevisionId: "fulltext-anchor-proof",
      generatedAt: "2026-07-13", // v2 強制モード
      model: "claude-sonnet-5",
      checkStatus: "verified",
    };
    const violations = checkFidelity(ftToLawArticle(ftArticle), faithful);
    expect(
      violations,
      `忠実な gap plain に違反が出た:\n${violations.map((v) => `[${v.kind}] ${v.message}`).join("\n")}`
    ).toEqual([]);
  });

  it("参照を落とした gap plain は fulltext アンカーが ref-missing で捕捉する", () => {
    if (!ftArticle) throw new Error("見本条が解決できない");
    // 第552条 の参照を省いた（omissions 宣言もしない）改変版。
    const dropRef: PlainArticle = {
      egovLawId: LAW_ID,
      articleNum: SAMPLE,
      plainText:
        "注文者は、法第31条第1項に該当する場合に、請負人に係る作業従事者へ架設通路を使用させるときは、その架設通路を規定の基準に適合するものとしなければなりません。これは、注文者が請負人の作業従事者に使わせる設備の安全を確保させる趣旨です。",
      sourceTextHash: plainSourceHash(ftArticle.text),
      sourceRevisionId: "fulltext-anchor-proof",
      generatedAt: "2026-07-13",
      model: "claude-sonnet-5",
      checkStatus: "verified",
    };
    const violations = checkFidelity(ftToLawArticle(ftArticle), dropRef);
    expect(
      violations.some((v) => v.kind === "ref-missing" && v.message.includes("第552条")),
      `原文参照 第552条 の欠落を fulltext アンカーが検知できていない: ${JSON.stringify(violations)}`
    ).toBe(true);
  });
});
