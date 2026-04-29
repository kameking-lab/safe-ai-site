// scripts/lint-equipment-data.mjs
// 保護具DBのデータ品質チェック。CIや月次cronから呼び出して使う。
//
// チェック内容:
//   1. ID/name の一意性
//   2. カテゴリ別件数（最低件数を満たすか）
//   3. 必須フィールド欠落
//   4. 法令引用が既存通達/法令DBと整合しているか
//
// 終了コード: 違反があれば 1、無ければ 0。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.resolve(ROOT, "web/src/data/safety-equipment-db.json");

const REQUIRED_FIELDS = [
  "id",
  "categoryId",
  "categoryName",
  "name",
  "spec",
  "priceMin",
  "priceMax",
  "priceLabel",
  "industries",
  "hazards",
  "seasons",
  "affiliate",
  "jisOrCertification",
];

// カテゴリ別の最低件数（1,000商品計画）
const MIN_PER_CATEGORY = {
  "fall-protection": 50,
  "head-protection": 80,
  "foot-protection": 150,
  "eye-protection": 60,
  respiratory: 70,
  "respiratory-fitting": 150,
  "hearing-protection": 50,
  "heat-stroke": 150,
  "hand-protection": 80,
  "protective-clothing": 60,
  lifeline: 30,
  rescue: 20,
  "high-vis": 30,
};

// 法令引用キーワード（既存DB側に該当が一つでもあればOK）
const LAW_KEYWORDS = [
  "労働安全衛生法",
  "安衛則",
  "労安則",
  "労安規則",
  "労働安全衛生規則",
  "寒冷ばく露防止",
  "救急法",
  "振動障害予防",
  "振動障害",
  "粉じん障害防止規則",
  "粉じん則",
  "有機溶剤中毒予防規則",
  "有機則",
  "特定化学物質障害予防規則",
  "特化則",
  "石綿障害予防規則",
  "石綿則",
  "酸欠則",
  "電気事業法",
  "船舶安全法",
  "JIS T",
  "JIS L",
  "JIS S",
  "JIS B",
  "JIS",
  "EN ISO",
  "ISO",
  "厚労省告示",
  "国家検定",
  "労検",
  "国土交通省",
  "桜マーク",
  "熱中症予防",
  "騒音障害防止",
  "保護帽の規格",
  "防じんマスクの規格",
  "防毒マスクの規格",
  "墜落制止用器具の規格",
  "電動ファン付き呼吸用保護具の規格",
  "船舶安全法施行規則",
  "ANSI",
  "TCCC",
  "医薬品医療機器等法",
  "JSAA",
];

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`DB not found: ${DB_PATH}`);
  process.exit(2);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
if (!Array.isArray(db.items)) {
  console.error("db.items is not an array");
  process.exit(2);
}

console.log(`▶ Linting ${db.items.length} equipment items …\n`);

// 1. ID/name 一意性
const idSet = new Set();
const nameSet = new Set();
db.items.forEach((it, i) => {
  if (idSet.has(it.id)) fail(`duplicate id: ${it.id} (index ${i})`);
  idSet.add(it.id);
  if (nameSet.has(it.name)) warn(`duplicate name: ${it.name} (index ${i})`);
  nameSet.add(it.name);
});

// 2. カテゴリ別件数
const cnt = {};
db.items.forEach((it) => {
  cnt[it.categoryId] = (cnt[it.categoryId] || 0) + 1;
});
Object.entries(MIN_PER_CATEGORY).forEach(([cat, min]) => {
  const have = cnt[cat] ?? 0;
  if (have < min) fail(`category ${cat}: ${have} items (min ${min})`);
});

// 3. 必須フィールド欠落
db.items.forEach((it, i) => {
  for (const f of REQUIRED_FIELDS) {
    if (it[f] === undefined || it[f] === null) {
      fail(`item ${it.id ?? `#${i}`}: missing field "${f}"`);
    }
  }
  if (it.priceMin >= it.priceMax) fail(`item ${it.id}: priceMin(${it.priceMin}) >= priceMax(${it.priceMax})`);
  if (typeof it.rating === "number" && (it.rating < 4.0 || it.rating > 5.0)) {
    fail(`item ${it.id}: rating ${it.rating} out of [4.0, 5.0]`);
  }
  if (!Array.isArray(it.industries) || it.industries.length === 0) {
    fail(`item ${it.id}: industries empty`);
  }
  if (!Array.isArray(it.hazards) || it.hazards.length === 0) {
    fail(`item ${it.id}: hazards empty`);
  }
  if (!it.affiliate?.amazonUrl || !it.affiliate?.rakutenUrl) {
    fail(`item ${it.id}: affiliate URL missing`);
  }
});

// 4. 法令引用の整合性チェック
db.items.forEach((it) => {
  if (!Array.isArray(it.regulations) || it.regulations.length === 0) {
    warn(`item ${it.id}: regulations empty`);
    return;
  }
  it.regulations.forEach((r) => {
    const matched = LAW_KEYWORDS.some((kw) => r.includes(kw));
    if (!matched) {
      warn(`item ${it.id}: unrecognized regulation reference "${r}"`);
    }
  });
});

// 5. ハザード・業種ラベルの整合性
const validHazards = new Set(Object.keys(db.hazardLabels ?? {}));
const validIndustries = new Set(Object.keys(db.industryLabels ?? {}));
db.items.forEach((it) => {
  it.hazards.forEach((h) => {
    if (!validHazards.has(h)) fail(`item ${it.id}: unknown hazard "${h}"`);
  });
  it.industries.forEach((ind) => {
    if (!validIndustries.has(ind)) fail(`item ${it.id}: unknown industry "${ind}"`);
  });
});

// 結果出力
console.log(`📊 Category counts:`);
Object.entries(cnt)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`   ${k.padEnd(22)} ${v}`));
console.log("");

if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warnings:`);
  warnings.slice(0, 20).forEach((w) => console.log(`   - ${w}`));
  if (warnings.length > 20) console.log(`   …and ${warnings.length - 20} more`);
  console.log("");
}

if (errors.length) {
  console.log(`❌ ${errors.length} errors:`);
  errors.slice(0, 50).forEach((e) => console.log(`   - ${e}`));
  if (errors.length > 50) console.log(`   …and ${errors.length - 50} more`);
  process.exit(1);
}

console.log(`✅ All checks passed. ${db.items.length} items, ${Object.keys(cnt).length} categories.`);
process.exit(0);
