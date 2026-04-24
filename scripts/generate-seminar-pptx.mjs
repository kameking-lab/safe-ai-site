#!/usr/bin/env node
/**
 * ANZEN AI セミナー PPTX 生成 CLI (Node エントリ)
 *
 * 実体は python-pptx を使用した Python レンダラ (scripts/seminar_pptx.py)。
 * 本スクリプトは「Node プロジェクトから生成を一発で叩く」ためのラッパー。
 *
 * 使い方:
 *   node scripts/generate-seminar-pptx.mjs youtsu-yobou
 *   node scripts/generate-seminar-pptx.mjs --all
 *
 * オプション:
 *   --yaml=<path>        YAML を直接指定（既定: data/seminars/<id>.yaml）
 *   --template=<path>    PPTX テンプレート（既定: templates/seminar-template.pptx）
 *   --out=<path>         出力先 PPTX（既定: dist/seminars/<id>.pptx）
 *   --python=<cmd>       Python 実行コマンド（既定: 自動検出）
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DEFAULT_TEMPLATE = join(ROOT, "templates", "seminar-template.pptx");
const DATA_DIR = join(ROOT, "data", "seminars");
const DIST_DIR = join(ROOT, "dist", "seminars");
const PUBLIC_DIR = join(ROOT, "web", "public", "seminars");

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const token of argv) {
    if (token.startsWith("--")) {
      const [k, v] = token.slice(2).split("=");
      args.flags[k] = v === undefined ? true : v;
    } else {
      args.positional.push(token);
    }
  }
  return args;
}

function detectPython(override) {
  if (override) return override;
  const candidates = [
    "C:/Users/kanet/AppData/Local/Programs/Python/Python312/python.exe",
    "python3",
    "python",
  ];
  for (const cmd of candidates) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  throw new Error("Python 3 が見つかりません。--python= で明示してください。");
}

function generateOne({ id, yamlPath, templatePath, outPath, python }) {
  if (!existsSync(yamlPath)) {
    throw new Error(`YAML が見つかりません: ${yamlPath}`);
  }
  mkdirSync(dirname(outPath), { recursive: true });

  console.log(`\n[generate] ${id}`);
  console.log(`  yaml     : ${yamlPath}`);
  console.log(`  template : ${existsSync(templatePath) ? templatePath : "(new empty)"}`);
  console.log(`  out      : ${outPath}`);

  const script = join(ROOT, "scripts", "seminar_pptx.py");
  const args = [script, yamlPath, existsSync(templatePath) ? templatePath : "", outPath];
  const r = spawnSync(python, args, {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`PPTX 生成に失敗しました (exit=${r.status})`);
  }

  // web/public へコピー（ダウンロード用）
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const publicPath = join(PUBLIC_DIR, `${id}.pptx`);
  copyFileSync(outPath, publicPath);
  console.log(`  public   : ${publicPath}`);
}

function listIds() {
  if (!existsSync(DATA_DIR)) return [];
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => f.replace(/\.ya?ml$/, ""));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const python = detectPython(args.flags.python);
  const template = args.flags.template || DEFAULT_TEMPLATE;

  let ids;
  if (args.flags.all) {
    ids = listIds();
    if (ids.length === 0) {
      console.error("data/seminars/*.yaml が見つかりません。");
      process.exit(1);
    }
  } else {
    if (args.positional.length === 0) {
      console.error("Usage: node scripts/generate-seminar-pptx.mjs <id> [--all]");
      console.error("例: node scripts/generate-seminar-pptx.mjs youtsu-yobou");
      process.exit(1);
    }
    ids = args.positional;
  }

  for (const id of ids) {
    const yamlPath = args.flags.yaml || join(DATA_DIR, `${id}.yaml`);
    const outPath = args.flags.out || join(DIST_DIR, `${id}.pptx`);
    generateOne({ id, yamlPath, templatePath: template, outPath, python });
  }

  console.log("\n[done]");
}

main();
