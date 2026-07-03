/**
 * 安衛法施行令 別表第3/第6の2 スナップショット生成 ETL（F2: 化学物質×法令区分の正本突合）
 *
 * e-Gov法令API v2 から現行条文XMLを取得し、特別則の物質列挙を機械抽出して
 * `web/src/data/legal/anei-beppyo-snapshot.ts` を再生成する。
 * 6月のコーパス条番号監査（egov-caption-snapshot.ts）と同じ思想の「物質×区分」版。
 *
 * 抽出対象:
 *   - 施行令(347CO0000000318) 別表第3: 特化則 第一類/第二類/第三類物質の全号
 *   - 施行令 別表第6の2: 有機溶剤の全号
 *   - 施行令 第22条第1項第3号: 特化則健診の対象範囲（第三類は対象外・号5/31の2除外）の原文
 *   - 有機則(347M50002000036) 第1条第1項第3号/第4号: 第一種/第二種有機溶剤の号列挙
 *   - 特化則(347M50002000039) 第38条の4: 特別管理物質の号列挙（レンジ展開）
 *
 * 実行: node scripts/etl/build-anei-beppyo-snapshot.mjs   (web/ から)
 * 出力が変わった場合は法改正の可能性 → cas-law-index.ts と表示タグの再突合が必要
 * （substance-legal-audit.test.ts が自動で落ちる）。
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/data/legal/anei-beppyo-snapshot.ts",
);

const LAWS = {
  seirei: "347CO0000000318", // 労働安全衛生法施行令
  yukisoku: "347M50002000036", // 有機溶剤中毒予防規則
  tokkasoku: "347M50002000039", // 特定化学物質障害予防規則
};

async function fetchLawXml(lawId) {
  const url = `https://laws.e-gov.go.jp/api/2/law_data/${lawId}?law_full_text_format=xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`e-Gov API ${lawId}: HTTP ${res.status}`);
  const json = await res.json();
  const xml = Buffer.from(json.law_full_text, "base64").toString("utf8");
  return {
    xml,
    revisionId: json.revision_info.law_revision_id,
    sha256: createHash("sha256").update(xml).digest("hex"),
  };
}

/** Sentence 内部の Ruby ルビ（<Rt>読み</Rt>）を除去しタグを剥がす */
function sentenceText(inner) {
  return inner.replace(/<Rt>[^<]*<\/Rt>/g, "").replace(/<[^>]+>/g, "");
}

/** 全角数字・「の」混在の号番号（例「３の２」）→ 半角「3の2」 */
function normalizeGo(title) {
  return title.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** 漢数字（〜千）→ 整数 */
function kanjiToInt(k) {
  const D = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let total = 0;
  let cur = 0;
  for (const ch of k) {
    if (ch in D) cur = D[ch];
    else if (ch === "十") { total += (cur || 1) * 10; cur = 0; }
    else if (ch === "百") { total += (cur || 1) * 100; cur = 0; }
    else if (ch === "千") { total += (cur || 1) * 1000; cur = 0; }
    else throw new Error(`漢数字でない文字: ${ch} in ${k}`);
  }
  return total + cur;
}

function findAppdxTable(xml, title) {
  const tables = [...xml.matchAll(/<AppdxTable\b[\s\S]*?<\/AppdxTable>/g)].map((m) => m[0]);
  const t = tables.find((x) =>
    new RegExp(`<AppdxTableTitle[^>]*>${title}<`).test(x),
  );
  if (!t) throw new Error(`別表が見つからない: ${title}`);
  return t;
}

/** 別表第3: Item(第一〜三類) × Subitem1(号) を抽出 */
function parseBeppyo3(xml) {
  const t3 = findAppdxTable(xml, "別表第三");
  const out = { 1: [], 2: [], 3: [] };
  for (const im of t3.matchAll(/<Item Num="(\d)">([\s\S]*?)<\/Item>/g)) {
    const klass = Number(im[1]);
    for (const sm of im[2].matchAll(
      /<Subitem1 Num="[^"]+">\s*<Subitem1Title>([^<]+)<\/Subitem1Title>\s*<Subitem1Sentence>\s*<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g,
    )) {
      const go = normalizeGo(sm[1]);
      const name = sentenceText(sm[2]);
      out[klass].push({
        go,
        name,
        isPreparation: /含有する製剤その他の物|掲げる物のみから成る混合物/.test(name),
      });
    }
  }
  if (out[1].length < 7 || out[2].length < 50 || out[3].length < 8) {
    throw new Error(
      `別表第3の抽出件数が異常: 1類${out[1].length}/2類${out[2].length}/3類${out[3].length}`,
    );
  }
  return out;
}

/** 別表第6の2: Item(漢数字号) を抽出 */
function parseBeppyo62(xml) {
  const t = findAppdxTable(xml, "別表第六の二");
  const out = [];
  for (const im of t.matchAll(
    /<Item Num="[^"]+">\s*<ItemTitle>([^<]+)<\/ItemTitle>\s*<ItemSentence>\s*<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g,
  )) {
    const name = sentenceText(im[2]);
    // 「二十六及び二十七　削除」のような欠番行（平成26年改正で特化則へ移行した号等）は収録しない
    if (name === "削除") continue;
    if (/及び|から/.test(im[1])) throw new Error(`複合号タイトルが削除以外で出現: ${im[1]} ${name}`);
    out.push({
      go: kanjiToInt(im[1]),
      name,
      isMixture: /掲げる物のみから成る混合物/.test(name),
    });
  }
  if (out.length < 40) throw new Error(`別表第6の2の抽出件数が異常: ${out.length}`);
  return out;
}

/** 「第X号」「第X号から第Y号まで」の漢数字列挙をパースして号番号集合へ */
function parseKanjiGoRefs(text, validGoSet) {
  const out = new Set();
  const range = /第([一二三四五六七八九十百]+)号から第([一二三四五六七八九十百]+)号まで/g;
  let stripped = text;
  for (const m of text.matchAll(range)) {
    const a = kanjiToInt(m[1]);
    const b = kanjiToInt(m[2]);
    for (let i = a; i <= b; i++) if (validGoSet.has(i)) out.add(i);
    stripped = stripped.replace(m[0], "");
  }
  for (const m of stripped.matchAll(/第([一二三四五六七八九十百]+)号/g)) {
    const n = kanjiToInt(m[1]);
    if (!validGoSet.has(n)) throw new Error(`存在しない号への参照: 第${n}号 in ${text.slice(0, 60)}`);
    out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** 有機則第1条第1項 第3号(第一種)/第4号(第二種) の令別表第6の2 号列挙 */
function parseYukiClasses(yukiXml, beppyo62) {
  const a1 = yukiXml.match(/<Article Num="1"[\s\S]*?<\/Article>/)[0];
  const validGo = new Set(beppyo62.filter((e) => !e.isMixture).map((e) => e.go));
  const itemText = (num) => {
    const m = a1.match(new RegExp(`<Item Num="${num}">([\\s\\S]*?)</Item>`));
    return [...m[1].matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)]
      .map((x) => sentenceText(x[1]))
      .join("");
  };
  const t3 = itemText(3);
  const t4 = itemText(4);
  if (!t3.includes("第一種有機溶剤等") || !t4.includes("第二種有機溶剤等")) {
    throw new Error("有機則第1条の号構成が想定と異なる（改正の可能性）");
  }
  // 号参照は「令別表第六の二…に掲げる物」の節にのみ現れる
  const yuki1 = parseKanjiGoRefs(t3.split("イに掲げる物")[0], validGo);
  const yuki2 = parseKanjiGoRefs(t4.split("イに掲げる物")[0], validGo);
  const overlap = yuki1.filter((g) => yuki2.includes(g));
  if (yuki1.length === 0 || yuki2.length === 0 || overlap.length > 0) {
    throw new Error(`有機則種別の抽出が異常: 1種${yuki1.length}/2種${yuki2.length}/重複${overlap.length}`);
  }
  return { yuki1, yuki2, article1Item3Text: t3, article1Item4Text: t4 };
}

/**
 * 特化則38条の4: 特別管理物質の「令別表第三第二号」号列挙（全角数字・「から〜まで」レンジ）を展開。
 * レンジ展開は別表第3第2号の実在号の並び順に基づく（例「3の2から6まで」= 3の2,3の3,4,5,6）。
 */
function parseSpecialControlGo(tokkaXml, class2) {
  const a = tokkaXml.match(/<Article Num="38_4"[\s\S]*?<\/Article>/)[0];
  const text = [...a.matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)]
    .map((x) => sentenceText(x[1]))
    .join("");
  const seg = text.match(/令別表第三第二号([\s\S]*?)に掲げる物若しくは別表第一/);
  if (!seg) throw new Error("特化則38条の4の特別管理物質列挙が想定形式でない（改正の可能性）");
  const goOrder = class2.filter((e) => !e.isPreparation).map((e) => e.go);
  const idx = (g) => {
    const i = goOrder.indexOf(g);
    if (i < 0) throw new Error(`38条の4が参照する号が別表第3第2号に無い: ${g}`);
    return i;
  };
  const out = [];
  const normalized = normalizeGo(seg[1]);
  for (const token of normalized.split(/、|若しくは/)) {
    const t = token.trim();
    if (!t) continue;
    const range = t.match(/^(\d+(?:の\d+)?)から(\d+(?:の\d+)?)まで$/);
    if (range) {
      for (let i = idx(range[1]); i <= idx(range[2]); i++) out.push(goOrder[i]);
    } else if (/^\d+(の\d+)?$/.test(t)) {
      idx(t);
      out.push(t);
    } else {
      throw new Error(`38条の4のトークンを解釈できない: "${t}"`);
    }
  }
  if (out.length < 20) throw new Error(`特別管理物質の号展開が異常: ${out.length}件`);
  return { specialControlGo2: out, article38_4Text: text };
}

/** 施行令22条1項3号（特化則健診の対象業務）の原文。第三類が対象外であることの根拠を固定する */
function parseArticle22Item3(seireiXml) {
  const a22 = seireiXml.match(/<Article Num="22"[\s\S]*?<\/Article>/)[0];
  const m = a22.match(/<Item Num="3">([\s\S]*?)<\/Item>/);
  const text = [...m[1].matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)]
    .map((x) => sentenceText(x[1]))
    .join("");
  if (!/別表第三第一号若しくは第二号/.test(text)) {
    throw new Error("令22条1項3号の形式が想定と異なる（改正の可能性）");
  }
  return text;
}

function tsArray(entries, indent = "  ") {
  return entries
    .map((e) => `${indent}${JSON.stringify(e).replace(/"([a-zA-Z0-9_]+)":/g, "$1: ")},`)
    .join("\n");
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const [seirei, yukisoku, tokkasoku] = await Promise.all([
    fetchLawXml(LAWS.seirei),
    fetchLawXml(LAWS.yukisoku),
    fetchLawXml(LAWS.tokkasoku),
  ]);
  const beppyo3 = parseBeppyo3(seirei.xml);
  const beppyo62 = parseBeppyo62(seirei.xml);
  const yuki = parseYukiClasses(yukisoku.xml, beppyo62);
  const special = parseSpecialControlGo(tokkasoku.xml, beppyo3[2]);
  const article22 = parseArticle22Item3(seirei.xml);

  const meta = (l, id) =>
    `{ lawId: "${id}", revisionId: "${l.revisionId}", sha256: "${l.sha256}" }`;

  const file = `/**
 * 【生成物・手書き禁止】安衛法施行令 別表第3/第6の2 スナップショット
 *
 * scripts/etl/build-anei-beppyo-snapshot.mjs が e-Gov法令API v2 の現行条文から機械生成。
 * substance-legal-audit.test.ts がサイト表示タグ（regulation-tag-labels / mock categories）
 * との全件突合に使用する正本。編集は必ず ETL の再実行で行うこと。
 *
 * 取得日: ${today}
 */

export const ANEI_BEPPYO_SNAPSHOT_META = {
  retrievedAt: "${today}",
  seirei: ${meta(seirei, LAWS.seirei)},
  yukisoku: ${meta(yukisoku, LAWS.yukisoku)},
  tokkasoku: ${meta(tokkasoku, LAWS.tokkasoku)},
} as const;

/** 令別表第3の1エントリ。go は号番号（枝番は「3の2」形式）。isPreparation は製剤・混合物行 */
export type Beppyo3Entry = { go: string; name: string; isPreparation: boolean };

/** 令別表第3 第1号（特化則 第一類物質） */
export const BEPPYO3_CLASS1: readonly Beppyo3Entry[] = [
${tsArray(beppyo3[1])}
];

/** 令別表第3 第2号（特化則 第二類物質） */
export const BEPPYO3_CLASS2: readonly Beppyo3Entry[] = [
${tsArray(beppyo3[2])}
];

/** 令別表第3 第3号（特化則 第三類物質） */
export const BEPPYO3_CLASS3: readonly Beppyo3Entry[] = [
${tsArray(beppyo3[3])}
];

/** 令別表第6の2（有機溶剤）。欠番（平成26年改正で特化則へ移行した号等）はそのまま欠番 */
export type Beppyo62Entry = { go: number; name: string; isMixture: boolean };
export const BEPPYO6_2: readonly Beppyo62Entry[] = [
${tsArray(beppyo62)}
];

/** 有機則第1条第1項第3号: 第一種有機溶剤の令別表第6の2 号番号 */
export const YUKI1_GO: readonly number[] = ${JSON.stringify(yuki.yuki1)};

/** 有機則第1条第1項第4号: 第二種有機溶剤の令別表第6の2 号番号 */
export const YUKI2_GO: readonly number[] = ${JSON.stringify(yuki.yuki2)};

/**
 * 特化則38条の4: 特別管理物質に該当する令別表第3第2号の号番号（レンジ展開済）。
 * このほか第一類物質（塩素化ビフェニル等を除く）も特別管理物質。
 */
export const SPECIAL_CONTROL_GO2: readonly string[] = ${JSON.stringify(special.specialControlGo2)};

/**
 * 施行令22条1項3号の原文（特化則健診＝特化則39条の対象業務の範囲）。
 * 対象は「別表第三第一号若しくは第二号」＝第三類物質は特殊健診の対象外。
 * さらに第2号5（エチレンオキシド）・31の2（ホルムアルデヒド）は括弧書きで明示除外。
 * substance-legal-profile.ts の健診対象導出はこの原文への文言ガードで固定する。
 */
export const ARTICLE22_ITEM3_TEXT = ${JSON.stringify(article22)};

/** 特化則38条の4 第1項の原文（特別管理物質の定義列挙の文言ガード用） */
export const TOKKA_ARTICLE38_4_TEXT = ${JSON.stringify(special.article38_4Text)};
`;

  writeFileSync(OUT, file);
  console.log(`書き出し: ${OUT}`);
  console.log(
    `別表第3: 1類${beppyo3[1].length} / 2類${beppyo3[2].length} / 3類${beppyo3[3].length}`,
  );
  console.log(`別表第6の2: ${beppyo62.length}号（第一種${yuki.yuki1.length}・第二種${yuki.yuki2.length}）`);
  console.log(`特別管理物質(第2号): ${special.specialControlGo2.length}号`);
  console.log(
    `rev: seirei=${seirei.revisionId} yuki=${yukisoku.revisionId} tokka=${tokkasoku.revisionId}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
