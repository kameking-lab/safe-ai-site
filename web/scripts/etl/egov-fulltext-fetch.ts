/**
 * FT-D1: e-Gov 法令API v2 からの「条文全文スナップショット」自動取込ETL
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §3
 *
 * 取得するのは事実（本則の条文本文）のみ。解釈・要約・整形の創作はゼロ。
 *   - 機械取込のみ。取得不能条は skipped に理由付きで計上（黙って欠かさない＝捏造ゼロ）
 *   - 削除条は「削除」を明示採録（欠番と区別。連番検証のため範囲削除は個別条へ展開）
 *   - ルビ <Ruby>基<Rt>読</Rt></Ruby> は基底のみ残し読みを除去（除去件数を計上）
 *   - 別表(AppdxTable)・附則(SupplProvision) は対象外（設計書 §3-3。別表は既存 snapshot 系が正本）
 *
 * 作法（egov-revisions-fetch.ts 踏襲）:
 *   - API v2 `GET /api/2/law_data/{lawId}`（XML 全文）・APIキー不要・オフライン実行→チェックイン
 *   - diff-only: fetchedAt 以外に差分が無ければ書かない（ビルドコスト削減）
 *   - 政府標準利用規約2.0（商用可・出典明示）。revisionId/sha256/fetchedAt アンカー必須
 *   - チェックイン前に取込検証ゲート6種（§3-4）を全緑。落ちたら書かず異常終了
 *
 * 実行: npx tsx scripts/etl/egov-fulltext-fetch.ts [lawId ...]
 *   引数なしなら DEFAULT_TARGETS（FT-D1 は安衛則のみ）。
 * 出力: web/src/data/laws-fulltext/<lawId>.json
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const API_BASE = "https://laws.e-gov.go.jp/api/2/law_data";
const OUT_DIR = join(process.cwd(), "src/data/laws-fulltext");
const SOURCE_LABEL = "e-Gov 法令API v2（政府標準利用規約2.0・出典明示）";

// FT-D1 の取込対象。安衛則（実法令の最大の穴）。以降の波で TARGET_LAWS を拡張する。
const DEFAULT_TARGETS: { lawId: string; lawShort: string; expectMax: number }[] = [
  { lawId: "347M50002000032", lawShort: "安衛則", expectMax: 700 },
];

// ---- 型（web/src/lib/laws-fulltext/types.ts と一致させること） -------------------

type FulltextItem = { num: string; text: string };
type FulltextParagraph = { num: number; text: string; items?: FulltextItem[] };
type FulltextArticle = {
  articleNum: string; // 当サイト正規表記（"第577条の2"）
  caption: string; // 条見出し。無い条は ""
  isDeleted: boolean; // 「削除」条
  paragraphs: FulltextParagraph[];
  text: string; // 表示用フラット本文（項番号・号マーカー保持）
  sortKey: number[]; // [条, 枝1, 枝2] — 連番検証・整列キー
};
type FulltextLaw = {
  lawId: string;
  lawTitle: string;
  revisionId: string; // lawId プレフィックスを除いた履歴ID（例 20260701_506M60000100079）
  fetchedAt: string; // ISO。diff 比較からは除外
  source: string;
  sha256: string; // articles の正規化直列化のハッシュ
  articleCount: number;
  rubyStripped: number; // 除去した <Rt> 件数（黙った変形をしない）
  skipped: { articleNum: string; reason: string }[];
  articles: FulltextArticle[];
};

// ---- 極小 XML ヘルパ（外部依存なし。e-Gov 法令XMLの固定ネスト規則を利用） -----------
// Article/Paragraph/Item/Subitem1 はいずれも同名でネストしないため、
// 非貪欲マッチで各階層の最初の閉じタグがその要素を閉じる（実測で確認済み）。

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

let rubyStrippedCount = 0;

/** <Rt>（ルビ読み）を除去し件数を計上。基底文字は <Ruby> 直下に残るので保持される。 */
function stripRuby(inner: string): string {
  return inner.replace(/<Rt\b[^>]*>[\s\S]*?<\/Rt>/g, () => {
    rubyStrippedCount += 1;
    return "";
  });
}

/** 見出し・号番号などインライン片から表示テキスト（ルビ読み除去・タグ除去）を得る。 */
function inlineText(inner: string): string {
  return decodeEntities(stripRuby(inner).replace(/<[^>]+>/g, "")).trim();
}

/** Sentence 等の内部HTMLから表示テキストを得る。<Rt>（ルビ読み）は除去し件数を計上。 */
function sentenceText(inner: string): string {
  const stripped = stripRuby(inner).replace(/<[^>]+>/g, "");
  return decodeEntities(stripped).replace(/\s+/g, "").trim();
}

/** ItemSentence / ParagraphSentence 内の Sentence（と Column）を連結。 */
function collectSentences(block: string): string {
  const parts: string[] = [];
  // Column（対欄）ごとにグルーピングされる場合は全角スペース区切り
  const columnRe = /<Column\b[^>]*>([\s\S]*?)<\/Column>/g;
  if (/<Column\b/.test(block)) {
    let m: RegExpExecArray | null;
    while ((m = columnRe.exec(block)) !== null) {
      const t = sentencesIn(m[1]);
      if (t) parts.push(t);
    }
    return parts.join("　");
  }
  return sentencesIn(block);
}

function sentencesIn(block: string): string {
  const re = /<Sentence\b[^>]*>([\s\S]*?)<\/Sentence>/g;
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const t = sentenceText(m[1]);
    if (t) parts.push(t);
  }
  return parts.join("");
}

function firstTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
  return m ? m[1] : null;
}

// ---- 条番号の正規化・展開 ------------------------------------------------------

/** e-Gov Article Num（"577_2","18_2_2"）→ [条, 枝…] の数値配列。 */
function numToSortKey(num: string): number[] {
  return num.split("_").map((p) => Number(p));
}

/** [577,2] → "第577条の2"、[18,2,2] → "第18条の2の2" */
function sortKeyToArticleNum(key: number[]): string {
  const [main, ...branches] = key;
  const b = branches.map((x) => `の${x}`).join("");
  return `第${main}条${b}`;
}

/** 範囲Num（"436:448","95_4:95_5","486:517"）を個別 sortKey 配列へ展開。 */
function expandRange(num: string): number[][] {
  const [lo, hi] = num.split(":").map(numToSortKey);
  // 共通プレフィックス（最終セグメントのみ範囲）を想定
  if (lo.length !== hi.length) {
    throw new Error(`unexpected range shape: ${num}`);
  }
  const prefix = lo.slice(0, -1);
  const start = lo[lo.length - 1];
  const end = hi[hi.length - 1];
  const out: number[][] = [];
  for (let i = start; i <= end; i += 1) out.push([...prefix, i]);
  return out;
}

// ---- 本則の Article を1件パース ------------------------------------------------

function parseParagraphs(articleBody: string): {
  paragraphs: FulltextParagraph[];
  flat: string;
} {
  const paraRe = /<Paragraph\b[^>]*>([\s\S]*?)<\/Paragraph>/g;
  const paragraphs: FulltextParagraph[] = [];
  const flatParts: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraRe.exec(articleBody)) !== null) {
    const body = pm[1];
    const numRaw = /<Paragraph\b[^>]*\bNum="([^"]+)"/.exec(pm[0]);
    const pnum = numRaw ? Number(numRaw[1]) : paragraphs.length + 1;

    // 項の見出し（あれば本文先頭に括弧付きで残す）
    const capRaw = firstTag(body, "ParagraphCaption");
    const caption = capRaw ? inlineText(capRaw) : "";

    // 項本文（ParagraphSentence。Item より前の導入文）
    const psBlock = firstTag(body, "ParagraphSentence") ?? "";
    let lead = collectSentences(psBlock);
    if (caption) lead = `${caption}　${lead}`;

    // 号（Item）
    const items: FulltextItem[] = [];
    const itemRe = /<Item\b[^>]*>([\s\S]*?)<\/Item>/g;
    let im: RegExpExecArray | null;
    while ((im = itemRe.exec(body)) !== null) {
      const ibody = im[1];
      const titleRaw = firstTag(ibody, "ItemTitle");
      const inum = titleRaw ? inlineText(titleRaw) : "";
      const isBlock = firstTag(ibody, "ItemSentence") ?? "";
      const itext = collectSentences(isBlock);
      // 号内の細別（Subitem1: イ・ロ・ハ …）を平文化して連結
      const subRe = /<Subitem1\b[^>]*>([\s\S]*?)<\/Subitem1>/g;
      let sm: RegExpExecArray | null;
      const subs: string[] = [];
      while ((sm = subRe.exec(ibody)) !== null) {
        const sbody = sm[1];
        const stitleRaw = firstTag(sbody, "Subitem1Title");
        const stitle = stitleRaw ? inlineText(stitleRaw) : "";
        const ssBlock = firstTag(sbody, "Subitem1Sentence") ?? "";
        const stext = collectSentences(ssBlock);
        if (stitle || stext) subs.push(`${stitle}　${stext}`.trim());
      }
      const full = subs.length ? `${itext}${itext ? "　" : ""}${subs.join("　")}` : itext;
      if (inum || full) items.push({ num: inum, text: full });
    }

    const para: FulltextParagraph = { num: pnum, text: lead };
    if (items.length) para.items = items;
    paragraphs.push(para);

    // フラット本文の組み立て
    const paraFlatLead = pnum === 1 ? lead : `${toZenkakuNum(pnum)}　${lead}`;
    const itemsFlat = items.map((it) => `${it.num}　${it.text}`).join("");
    flatParts.push(paraFlatLead + itemsFlat);
  }
  return { paragraphs, flat: flatParts.join("") };
}

function toZenkakuNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "０１２３４５６７８９"[Number(d)]);
}

type RawArticle = { num: string; caption: string; body: string };

/** MainProvision から Article を順に抽出（TOC/AppdxTable/SupplProvision を除外）。 */
function extractMainArticles(xml: string): RawArticle[] {
  const mpStart = xml.indexOf("<MainProvision");
  const mpEnd = xml.indexOf("</MainProvision>");
  if (mpStart < 0 || mpEnd < 0) throw new Error("MainProvision not found");
  const main = xml.slice(mpStart, mpEnd);
  const re = /<Article\b([^>]*)>([\s\S]*?)<\/Article>/g;
  const out: RawArticle[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(main)) !== null) {
    const numM = /\bNum="([^"]+)"/.exec(m[1]);
    if (!numM) continue;
    const body = m[2];
    const capRaw = firstTag(body, "ArticleCaption");
    const caption = capRaw ? inlineText(capRaw) : "";
    out.push({ num: numM[1], caption, body });
  }
  return out;
}

function buildArticles(raw: RawArticle[], skipped: { articleNum: string; reason: string }[]): FulltextArticle[] {
  const articles: FulltextArticle[] = [];
  for (const r of raw) {
    if (r.num.includes(":")) {
      // 範囲削除条 → 個別条へ展開（欠番を作らない）
      let keys: number[][];
      try {
        keys = expandRange(r.num);
      } catch (e) {
        skipped.push({ articleNum: r.num, reason: `range expand failed: ${(e as Error).message}` });
        continue;
      }
      for (const key of keys) {
        articles.push({
          articleNum: sortKeyToArticleNum(key),
          caption: "",
          isDeleted: true,
          paragraphs: [{ num: 1, text: "削除" }],
          text: "削除",
          sortKey: key,
        });
      }
      continue;
    }
    const key = numToSortKey(r.num);
    if (key.some((x) => !Number.isFinite(x))) {
      skipped.push({ articleNum: r.num, reason: "unparseable Num attribute" });
      continue;
    }
    const { paragraphs, flat } = parseParagraphs(r.body);
    const flatTrim = flat.replace(/\s/g, "");
    const isDeleted = flatTrim === "削除";
    articles.push({
      articleNum: sortKeyToArticleNum(key),
      caption: r.caption,
      isDeleted,
      paragraphs: paragraphs.length ? paragraphs : [{ num: 1, text: flat }],
      text: flat,
      sortKey: key,
    });
  }
  // sortKey 昇順（[条,枝…] の辞書式）
  articles.sort((a, b) => {
    const len = Math.max(a.sortKey.length, b.sortKey.length);
    for (let i = 0; i < len; i += 1) {
      const av = a.sortKey[i] ?? 0;
      const bv = b.sortKey[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  });
  return articles;
}

// ---- 取込検証ゲート（§3-4）。落ちたら書かない ------------------------------------

function canonicalArticlesJson(articles: FulltextArticle[]): string {
  // sha256 対象は本文構造のみ（fetchedAt を含めない）
  return JSON.stringify(
    articles.map((a) => ({
      articleNum: a.articleNum,
      caption: a.caption,
      isDeleted: a.isDeleted,
      paragraphs: a.paragraphs,
      text: a.text,
      sortKey: a.sortKey,
    })),
  );
}

function runGates(law: FulltextLaw, expectMax: number): string[] {
  const errs: string[] = [];
  const arts = law.articles;

  // ゲート1: 形式（空本文0・重複0）
  const seen = new Set<string>();
  for (const a of arts) {
    if (!a.isDeleted && a.text.replace(/\s/g, "") === "") {
      errs.push(`empty body: ${a.articleNum}`);
    }
    if (seen.has(a.articleNum)) errs.push(`duplicate articleNum: ${a.articleNum}`);
    seen.add(a.articleNum);
  }

  // ゲート2: 連番（基底条番号 1..max に欠番なし。削除条も個別に存在すること）
  const bases = new Set(arts.map((a) => a.sortKey[0]));
  const maxBase = Math.max(...bases);
  for (let i = 1; i <= maxBase; i += 1) {
    if (!bases.has(i)) errs.push(`missing base article: 第${i}条`);
  }

  // ゲート5: 規模アンカー（改正差分の範囲内か）
  if (maxBase > expectMax) {
    errs.push(`max article 第${maxBase}条 exceeds expected ~${expectMax} (改正確認)`);
  }

  // ゲート6: 出典アンカー（sha256 再計算一致・必須メタ）
  if (!law.revisionId) errs.push("missing revisionId");
  if (!law.source) errs.push("missing source");
  const recomputed = createHash("sha256").update(canonicalArticlesJson(arts)).digest("hex");
  if (recomputed !== law.sha256) errs.push("sha256 mismatch");

  return errs;
}

// ---- 取得・組み立て ------------------------------------------------------------

async function fetchXml(lawId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(lawId)}`, {
    headers: { Accept: "application/xml" },
  });
  if (!res.ok) return null;
  return await res.text();
}

function buildLaw(lawId: string, xml: string): FulltextLaw {
  rubyStrippedCount = 0;
  const revFull =
    firstTag(xml, "law_revision_id")?.trim() ?? "";
  const revisionId = revFull.startsWith(`${lawId}_`) ? revFull.slice(lawId.length + 1) : revFull;
  const lawTitle = inlineText(firstTag(xml, "LawTitle") ?? firstTag(xml, "law_title") ?? "");

  const skipped: { articleNum: string; reason: string }[] = [];
  const raw = extractMainArticles(xml);
  const articles = buildArticles(raw, skipped);
  const sha256 = createHash("sha256").update(canonicalArticlesJson(articles)).digest("hex");

  return {
    lawId,
    lawTitle,
    revisionId,
    fetchedAt: new Date().toISOString(),
    source: SOURCE_LABEL,
    sha256,
    articleCount: articles.length,
    rubyStripped: rubyStrippedCount,
    skipped,
    articles,
  };
}

function stripFetchedAt(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    delete obj.fetchedAt;
    return JSON.stringify(obj);
  } catch {
    return json;
  }
}

async function main() {
  const argIds = process.argv.slice(2);
  const targets = argIds.length
    ? argIds.map((lawId) => ({ lawId, lawShort: lawId, expectMax: 9999 }))
    : DEFAULT_TARGETS;

  for (const { lawId, lawShort, expectMax } of targets) {
    let xml: string | null = null;
    try {
      xml = await fetchXml(lawId);
    } catch (e) {
      console.error(`[fulltext] ${lawShort} fetch error: ${(e as Error).message}`);
    }
    if (!xml) {
      console.error(`[fulltext] ${lawShort} (${lawId}) skipped: fetch failed`);
      continue;
    }

    const law = buildLaw(lawId, xml);
    const gateErrs = runGates(law, expectMax);
    if (gateErrs.length) {
      console.error(`[fulltext] ${lawShort} GATE FAILED (${gateErrs.length}):`);
      for (const e of gateErrs.slice(0, 20)) console.error(`  - ${e}`);
      process.exitCode = 1;
      continue; // 落ちたら書かない
    }

    const outPath = join(OUT_DIR, `${lawId}.json`);
    const nextJson = JSON.stringify(law, null, 2);
    if (existsSync(outPath)) {
      const prev = readFileSync(outPath, "utf-8");
      if (stripFetchedAt(prev) === stripFetchedAt(nextJson)) {
        console.log(`[fulltext] ${lawShort} no change (${law.articleCount} articles)`);
        continue;
      }
    } else {
      mkdirSync(dirname(outPath), { recursive: true });
    }
    writeFileSync(outPath, nextJson + "\n", "utf-8");
    console.log(
      `[fulltext] ${lawShort} wrote ${law.articleCount} articles ` +
        `(rev ${law.revisionId}, ruby-stripped ${law.rubyStripped}, skipped ${law.skipped.length})`,
    );
  }
}

main().catch((e) => {
  console.error("[fulltext] fatal:", e);
  process.exit(1);
});
