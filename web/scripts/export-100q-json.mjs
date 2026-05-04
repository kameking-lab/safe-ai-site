#!/usr/bin/env node
/**
 * web/src/lib/rag-100q.fixture.ts から web/test/chatbot-basic-100.json を生成。
 * fixture が単一の真実の源。手動でこの JSON を編集しないこと。
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// fixture の生 TS をパースする代わりに、必要な配列リテラルを読み出す簡易抽出。
const fixturePath = resolve(root, "src/lib/rag-100q.fixture.ts");
const txt = readFileSync(fixturePath, "utf8");
const start = txt.indexOf("[", txt.indexOf("RAG_100_QUESTIONS"));
const end = txt.lastIndexOf("];");
if (start < 0 || end < 0) {
  console.error("fixture array not found");
  process.exit(1);
}
const arrayLiteral = txt.slice(start, end + 1);
// JSON5 風のキー無クォートを許容するため、軽量にキーをクォート化してから JSON.parse する手間を避け
// JS として eval せず、関数経由で評価する。
const items = new Function(`return ${arrayLiteral};`)();

const out = {
  generated_at: new Date().toISOString(),
  source: "src/lib/rag-100q.fixture.ts",
  total: items.length,
  description:
    "RAG 検索精度ベンチマーク 100 問。各問は (question, gold[]) で構成。" +
    "RAG top-5 に gold いずれか 1 件でも含まれれば正答とみなす。",
  questions: items,
};

const outPath = resolve(root, "test/chatbot-basic-100.json");
if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`[export-100q] ${items.length} questions -> ${outPath}`);
