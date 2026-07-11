/**
 * 他法令（毒劇法・化審法・消防法・高圧ガス）スナップショット生成 ETL（F2拡張・O11）
 *
 * e-Gov法令API v2 から現行条文XMLを取得し、物質列挙を機械抽出して
 * `web/src/data/legal/other-laws-snapshot.ts` を再生成する。
 * build-anei-beppyo-snapshot.mjs と同型（revisionId/sha256固定・件数ガード）。
 *
 * 抽出対象:
 *   - 毒物及び劇物取締法(325AC0000000303) 別表第1(毒物)/第2(劇物)/第3(特定毒物)
 *   - 毒物及び劇物指定令(340CO0000000002) 第1条(毒物)/第2条(劇物)/第3条(特定毒物)
 *   - 化審法施行令(349CO0000000202) 第1条(第一種特定化学物質)/第2条(第二種特定化学物質)
 *   - 消防法(323AC1000000186) 別表第一（類別・性質・品名）＋備考の石油類例示
 *   - 一般高圧ガス保安規則(341M50000400053) 第2条（可燃性ガス・毒性ガス・特殊高圧ガスの品名列挙）
 *
 * 実行: node scripts/etl/build-other-laws-snapshot.mjs   (web/ から)
 * 出力が変わった場合は法改正の可能性 → other-laws-cas-index.ts の再突合が必要
 * （substance-legal-audit.test.ts が自動で落ちる）。
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/data/legal/other-laws-snapshot.ts",
);

const LAWS = {
  dokugekiLaw: "325AC0000000303", // 毒物及び劇物取締法
  dokugekiRei: "340CO0000000002", // 毒物及び劇物指定令
  kashinhoRei: "349CO0000000202", // 化審法施行令
  shoboLaw: "323AC1000000186", // 消防法
  kouatsuIppan: "341M50000400053", // 一般高圧ガス保安規則
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

/** ルビ（<Rt>読み</Rt>）を除去してからタグを剥がす（「弗ふつ化水素」化の防止） */
function sentenceText(inner) {
  return inner.replace(/<Rt>[^<]*<\/Rt>/g, "").replace(/<[^>]+>/g, "");
}

/** 「一の二」等の漢数字号タイトル → 「1の2」 */
function kanjiToInt(k) {
  const D = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let total = 0;
  let cur = 0;
  for (const ch of k) {
    if (ch in D) cur = D[ch];
    else if (ch === "十") { total += (cur || 1) * 10; cur = 0; }
    else if (ch === "百") { total += (cur || 1) * 100; cur = 0; }
    else throw new Error(`漢数字でない文字: ${ch} in ${k}`);
  }
  return total + cur;
}

function kanjiGoTitle(title) {
  return title
    .split("の")
    .map((part) => String(kanjiToInt(part)))
    .join("の");
}

/**
 * Item列挙（毒劇法別表・指定令・化審法施行令の号）を抽出する。
 * 号のただし書き（「ただし、次に掲げるものを除く。」のSubitem列挙）は
 * exclusions として名称文字列を保持する（区分判定の scopeNote 用）。
 */
function parseItems(sectionXml) {
  const out = [];
  for (const im of sectionXml.matchAll(
    /<Item Num="[^"]+">\s*<ItemTitle>([^<]*)<\/ItemTitle>\s*<ItemSentence>([\s\S]*?)<\/ItemSentence>([\s\S]*?)<\/Item>/g,
  )) {
    const sentences = [...im[2].matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)].map((x) =>
      sentenceText(x[1]),
    );
    const name = sentences.join("");
    const subitems = [...im[3].matchAll(/<Subitem1Sentence>\s*<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)].map(
      (x) => sentenceText(x[1]),
    );
    out.push({
      go: kanjiGoTitle(im[1]),
      name,
      isPreparation: /製剤|前各号に掲げる物|政令で定めるもの/.test(name),
      ...(subitems.length > 0 ? { exclusions: subitems } : {}),
    });
  }
  return out;
}

function findAppdxTables(xml) {
  return [...xml.matchAll(/<AppdxTable\b[\s\S]*?<\/AppdxTable>/g)].map((m) => m[0]);
}

function articleOf(xml, num) {
  const m = xml.match(new RegExp(`<Article Num="${num}"[\\s\\S]*?</Article>`));
  if (!m) throw new Error(`第${num}条が見つからない`);
  return m[0];
}

/** 毒劇法 法別表第1〜3 */
function parseDokugekiLaw(xml) {
  const tables = findAppdxTables(xml);
  const titled = (t) =>
    tables.find((x) => new RegExp(`<AppdxTableTitle[^>]*>${t}<`).test(x)) ??
    (() => {
      throw new Error(`毒劇法の別表が見つからない: ${t}`);
    })();
  const hyo1 = parseItems(titled("別表第一"));
  const hyo2 = parseItems(titled("別表第二"));
  const hyo3 = parseItems(titled("別表第三"));
  if (hyo1.length < 27 || hyo2.length < 90 || hyo3.length < 9) {
    throw new Error(`毒劇法別表の抽出件数が異常: ${hyo1.length}/${hyo2.length}/${hyo3.length}`);
  }
  return { hyo1, hyo2, hyo3 };
}

/** 毒物及び劇物指定令 第1〜3条 */
function parseDokugekiRei(xml) {
  const rei1 = parseItems(articleOf(xml, "1"));
  const rei2 = parseItems(articleOf(xml, "2"));
  const rei3 = parseItems(articleOf(xml, "3"));
  if (rei1.length < 100 || rei2.length < 320 || rei3.length < 9) {
    throw new Error(`指定令の抽出件数が異常: ${rei1.length}/${rei2.length}/${rei3.length}`);
  }
  return { rei1, rei2, rei3 };
}

/** 化審法施行令 第1条(第一種特定)/第2条(第二種特定) */
function parseKashinho(xml) {
  const a1 = articleOf(xml, "1");
  const a2 = articleOf(xml, "2");
  if (!/第一種特定化学物質/.test(a1) || !/第二種特定化学物質/.test(a2)) {
    throw new Error("化審法施行令の条構成が想定と異なる（改正の可能性）");
  }
  const class1 = parseItems(a1);
  const class2 = parseItems(a2);
  if (class1.length < 34 || class2.length < 23) {
    throw new Error(`化審法特定化学物質の抽出件数が異常: 1種${class1.length}/2種${class2.length}`);
  }
  return { class1, class2 };
}

/**
 * 消防法 別表第一: 類別（第一類〜第六類）ごとの品名列挙＋備考。
 * 品名は「一　塩素酸塩類」形式の Sentence 列。備考は石油類の例示
 * （ガソリン・灯油・軽油・重油等）の根拠になるため全文を保持する。
 */
function parseShoboBeppyo1(xml) {
  const tables = findAppdxTables(xml);
  const t1 = tables.find((x) => /<AppdxTableTitle[^>]*>別表第一</.test(x));
  if (!t1) throw new Error("消防法 別表第一が見つからない");
  const rows = [...t1.matchAll(/<TableRow>([\s\S]*?)<\/TableRow>/g)].map((m) => m[1]);
  const classes = [];
  for (const row of rows) {
    const cols = [...row.matchAll(/<TableColumn[^>]*>([\s\S]*?)<\/TableColumn>/g)].map((m) =>
      [...m[1].matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)].map((x) => sentenceText(x[1])),
    );
    if (cols.length !== 3 || !/^第[一二三四五六]類$/.test(cols[0][0] ?? "")) continue;
    const rui = kanjiToInt(cols[0][0].slice(1, -1));
    const items = cols[2].map((s) => {
      const m = s.match(/^([一二三四五六七八九十]+)　(.+)$/);
      return m ? { go: String(kanjiToInt(m[1])), name: m[2] } : { go: "", name: s };
    });
    classes.push({ rui, seishitsu: cols[1].join(""), items });
  }
  if (classes.length !== 6) throw new Error(`消防法別表第一の類数が異常: ${classes.length}`);
  const bikoM = t1.match(/<Remarks>[\s\S]*?<\/Remarks>/);
  if (!bikoM) throw new Error("消防法別表第一の備考が見つからない");
  const biko = [...bikoM[0].matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)]
    .map((x) => sentenceText(x[1]))
    .join("\n");
  if (!biko.includes("ガソリン")) throw new Error("消防法別表第一備考に石油類例示が無い（形式変更の可能性）");
  return { classes, biko };
}

/**
 * 一般高圧ガス保安規則 第2条: 可燃性ガス・毒性ガス・特殊高圧ガスの品名列挙。
 * 「…及びその他のガスであつて」以降（物性基準・毒劇法参照）は列挙対象外として切り落とし、
 * 原文は criterion として保持する。
 */
function parseKouatsu(xml) {
  const a2 = articleOf(xml, "2");
  const text = [...a2.matchAll(/<Sentence[^>]*>([\s\S]*?)<\/Sentence>/g)]
    .map((x) => sentenceText(x[1]))
    .join("\n");
  const pick = (label) => {
    const m = text.match(new RegExp(`${label}\\n([\\s\\S]*?)(?:\\n|$)`));
    if (!m) throw new Error(`一般則第2条の${label}が見つからない`);
    return m[1];
  };
  const splitNames = (s) => {
    const enumerated = s.split(/及びその他のガス|又はフルオロカーボン/)[0];
    return enumerated
      .split("、")
      .map((x) => x.replace(/及び$/, "").trim())
      .filter(Boolean)
      .map((x) => x.replace(/^(.+?)(?:及び)?$/, "$1"));
  };
  const rawFlammable = pick("可燃性ガス");
  const rawToxic = pick("毒性ガス");
  const rawSpecial = pick("特殊高圧ガス");
  const flammable = splitNames(rawFlammable);
  const toxic = splitNames(rawToxic);
  const special = rawSpecial.split("、").map((x) => x.trim()).filter(Boolean);
  // 「硫化水素及びその他のガス…」の末尾要素から「及びその他のガス…」を除去済みか検査
  for (const list of [flammable, toxic]) {
    if (list.some((n) => /その他|該当|パーセント/.test(n))) {
      throw new Error(`高圧ガス品名の切り出しに基準文が混入: ${list.join(",")}`);
    }
  }
  if (flammable.length < 35 || toxic.length < 30 || special.length !== 7) {
    throw new Error(
      `一般則第2条の品名抽出が異常: 可燃${flammable.length}/毒性${toxic.length}/特殊${special.length}`,
    );
  }
  return { flammable, toxic, special, toxicCriterion: rawToxic, flammableCriterion: rawFlammable };
}

function tsArray(entries, indent = "  ") {
  return entries
    .map((e) => `${indent}${JSON.stringify(e).replace(/"([a-zA-Z0-9_]+)":/g, "$1: ")},`)
    .join("\n");
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const [dokuLaw, dokuRei, kashinRei, shobo, kouatsuXml] = await Promise.all([
    fetchLawXml(LAWS.dokugekiLaw),
    fetchLawXml(LAWS.dokugekiRei),
    fetchLawXml(LAWS.kashinhoRei),
    fetchLawXml(LAWS.shoboLaw),
    fetchLawXml(LAWS.kouatsuIppan),
  ]);
  const dokugekiHyo = parseDokugekiLaw(dokuLaw.xml);
  const dokugekiRei = parseDokugekiRei(dokuRei.xml);
  const kashinho = parseKashinho(kashinRei.xml);
  const shoboB1 = parseShoboBeppyo1(shobo.xml);
  const kouatsu = parseKouatsu(kouatsuXml.xml);

  const meta = (l, id) =>
    `{ lawId: "${id}", revisionId: "${l.revisionId}", sha256: "${l.sha256}" }`;

  const file = `/**
 * 【生成物・手書き禁止】他法令（毒劇法・化審法・消防法・高圧ガス）スナップショット
 *
 * scripts/etl/build-other-laws-snapshot.mjs が e-Gov法令API v2 の現行条文から機械生成。
 * substance-legal-audit.test.ts が other-laws-cas-index.ts との全件突合に使用する正本。
 * 編集は必ず ETL の再実行で行うこと。
 *
 * 取得日: ${today}
 */

export const OTHER_LAWS_SNAPSHOT_META = {
  retrievedAt: "${today}",
  dokugekiLaw: ${meta(dokuLaw, LAWS.dokugekiLaw)},
  dokugekiRei: ${meta(dokuRei, LAWS.dokugekiRei)},
  kashinhoRei: ${meta(kashinRei, LAWS.kashinhoRei)},
  shoboLaw: ${meta(shobo, LAWS.shoboLaw)},
  kouatsuIppan: ${meta(kouatsuXml, LAWS.kouatsuIppan)},
} as const;

/**
 * 毒劇法・化審法系の号エントリ。go は号番号（枝番は「1の2」形式）。
 * isPreparation は「〜を含有する製剤」等（物質そのものの号でない）。
 * exclusions は号のただし書き（「ただし、次に掲げるものを除く」）の列挙。
 */
export type LawItemEntry = {
  go: string;
  name: string;
  isPreparation: boolean;
  exclusions?: readonly string[];
};

/** 毒劇法 別表第一（毒物） */
export const DOKUGEKI_HYO1: readonly LawItemEntry[] = [
${tsArray(dokugekiHyo.hyo1)}
];

/** 毒劇法 別表第二（劇物） */
export const DOKUGEKI_HYO2: readonly LawItemEntry[] = [
${tsArray(dokugekiHyo.hyo2)}
];

/** 毒劇法 別表第三（特定毒物） */
export const DOKUGEKI_HYO3: readonly LawItemEntry[] = [
${tsArray(dokugekiHyo.hyo3)}
];

/** 毒物及び劇物指定令 第1条（毒物の指定） */
export const DOKUGEKI_REI1: readonly LawItemEntry[] = [
${tsArray(dokugekiRei.rei1)}
];

/** 毒物及び劇物指定令 第2条（劇物の指定） */
export const DOKUGEKI_REI2: readonly LawItemEntry[] = [
${tsArray(dokugekiRei.rei2)}
];

/** 毒物及び劇物指定令 第3条（特定毒物の指定） */
export const DOKUGEKI_REI3: readonly LawItemEntry[] = [
${tsArray(dokugekiRei.rei3)}
];

/** 化審法施行令 第1条（第一種特定化学物質） */
export const KASHINHO_CLASS1: readonly LawItemEntry[] = [
${tsArray(kashinho.class1)}
];

/** 化審法施行令 第2条（第二種特定化学物質） */
export const KASHINHO_CLASS2: readonly LawItemEntry[] = [
${tsArray(kashinho.class2)}
];

/** 消防法 別表第一（類別・性質・品名） */
export type ShoboClassEntry = {
  rui: number;
  seishitsu: string;
  items: readonly { go: string; name: string }[];
};
export const SHOBO_BEPPYO1: readonly ShoboClassEntry[] = [
${tsArray(shoboB1.classes)}
];

/** 消防法 別表第一 備考（石油類の例示: ガソリン・灯油・軽油・重油等の根拠原文） */
export const SHOBO_BEPPYO1_BIKO = ${JSON.stringify(shoboB1.biko)};

/** 一般高圧ガス保安規則 第2条 品名列挙 */
export const KOUATSU_FLAMMABLE_GAS: readonly string[] = ${JSON.stringify(kouatsu.flammable)};
export const KOUATSU_TOXIC_GAS: readonly string[] = ${JSON.stringify(kouatsu.toxic)};
export const KOUATSU_SPECIAL_GAS: readonly string[] = ${JSON.stringify(kouatsu.special)};
`;

  writeFileSync(OUT, file);
  console.log(`書き出し: ${OUT}`);
  console.log(
    `毒劇法: 別表 毒${dokugekiHyo.hyo1.length}/劇${dokugekiHyo.hyo2.length}/特定${dokugekiHyo.hyo3.length}` +
      ` 指定令 毒${dokugekiRei.rei1.length}/劇${dokugekiRei.rei2.length}/特定${dokugekiRei.rei3.length}`,
  );
  console.log(`化審法: 1種${kashinho.class1.length} / 2種${kashinho.class2.length}`);
  console.log(`消防法: ${shoboB1.classes.length}類 / 高圧ガス: 可燃${kouatsu.flammable.length}・毒性${kouatsu.toxic.length}・特殊${kouatsu.special.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
