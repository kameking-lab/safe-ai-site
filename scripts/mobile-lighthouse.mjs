#!/usr/bin/env node
// 横断計測: モバイル Lighthouse 実測ハーネス（ops 班・横断計測スクリプト）
//
// 目的: 診断 07 P1-6「柱C-1 第2弾＝残り11ページのモバイル perf 再計測」を、誰でも
// 静穏なマシンで再現・記録できる1コマンドにする。第1弾（docs/site-critique-2026-06-11/
// c1-mobile-perf-structural-2026-06-12.md）は lighthouse 13.4.0 を毎回アドホックに叩いて
// いたため、同じ引数を毎回書き起こす必要があった。それを固定化したもの。
//
// 計測条件は第1弾と同一（比較可能性のため厳守）:
//   lighthouse --only-categories=performance --form-factor=mobile --screenEmulation.mobile
//   headless Chrome / localhost 本番ビルド（`cd web && npm run build && npm run start`）
//
// 前提（本スクリプトは web/src を一切変更しない・純粋な計測のみ）:
//   1. 別ターミナルで本番ビルドを起動:  cd web && npm run build && npm run start
//   2. **他レーンが停止した静穏なマシンで実行する**。6レーン同時稼働下では CPU 競合で
//      Lighthouse の数値が無効化する（第1弾は「3回連続安定」を完了条件にしていた）。
//   3. lighthouse は npx 経由で都度取得（package.json 依存は追加しない＝env/依存の
//      独断追加禁止=Path A を侵さない）。未導入なら --dry-run が導入手順を案内する。
//
// 使い方:
//   node scripts/mobile-lighthouse.mjs --dry-run          # 自己検証のみ（Chrome 不要・CI/無サーバでも 0 終了）
//   node scripts/mobile-lighthouse.mjs                     # 既定11ページ×3回を実測
//   node scripts/mobile-lighthouse.mjs --runs 3 --base-url http://localhost:3000
//   node scripts/mobile-lighthouse.mjs --targets path/to/targets.json   # 対象上書き
//
// 出力: docs/perf/mobile-wave2-<YYYY-MM-DD>/ に summary.json / summary.md / 各生JSON。
// perf<90 のページを summary.md 末尾に「該当レーンへ Opus タスクとして分割起票せよ」と
// 明示（起票そのものは運用者/planner が担当＝本スクリプトは判定材料の提示まで）。

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// --- 既定の対象11ページ（第1弾で 90+ 達成済みの /accidents・/laws・/whats-new は除外） ---
// 診断 07 の C-1 残課題で名指しされた問題ページ（/equipment-finder CLS 0.853・/chatbot・
// /law-search）を核に、実在する主要ユーザー導線を採録。--targets で上書き可。
const DEFAULT_TARGETS = [
  '/',
  '/chatbot',
  '/law-search',
  '/court-cases',
  '/equipment-finder',
  '/chemical-database',
  '/chemical-ra',
  '/education',
  '/e-learning',
  '/contact',
  '/accidents-analytics',
];
// 第1弾で 90+ を実測済み（再計測不要・比較の基準として記録のみ）
const DONE_TARGETS = ['/accidents', '/laws', '/whats-new'];

function parseArgs(argv) {
  const args = { baseUrl: 'http://localhost:3000', runs: 3, dryRun: false, targetsFile: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--base-url') args.baseUrl = argv[++i];
    else if (a === '--runs') args.runs = Math.max(1, parseInt(argv[++i], 10) || 3);
    else if (a === '--targets') args.targetsFile = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--help' || a === '-h') { args.help = true; }
    else throw new Error(`unknown arg: ${a}`);
  }
  return args;
}

function loadTargets(targetsFile) {
  if (!targetsFile) return DEFAULT_TARGETS;
  const raw = fs.readFileSync(targetsFile, 'utf8');
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr) || arr.some((p) => typeof p !== 'string' || !p.startsWith('/'))) {
    throw new Error(`--targets must be a JSON array of "/path" strings: ${targetsFile}`);
  }
  return arr;
}

// lighthouse が npx から解決できるか（実行はしない dry-run 用の軽い可用性チェック）
function checkLighthouse() {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = spawnSync(npx, ['--no-install', 'lighthouse', '--version'], { encoding: 'utf8', timeout: 60000 });
  if (r.status === 0 && r.stdout) return { ok: true, version: r.stdout.trim() };
  return { ok: false, hint: 'lighthouse 未導入。`npx lighthouse@13 --version` で都度取得できます（package.json への依存追加は不要・禁止）。' };
}

async function checkServer(baseUrl) {
  try {
    const res = await fetch(baseUrl, { method: 'GET' });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function today() {
  // 生成物のフォルダ名用。運用者が手で叩く通常の node 実行なので Date は許容。
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pathToSlug(p) {
  return p === '/' ? 'root' : p.replace(/^\//, '').replace(/\//g, '_');
}

// 1ページ×1回の Lighthouse 実測。生JSONを outDir に保存し、主要3値を返す。
function runLighthouseOnce(baseUrl, routePath, outRawPath) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const url = baseUrl.replace(/\/$/, '') + routePath;
  const args = [
    '--no-install', 'lighthouse', url,
    '--only-categories=performance',
    '--form-factor=mobile',
    '--screenEmulation.mobile',
    '--output=json',
    `--output-path=${outRawPath}`,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
  ];
  const r = spawnSync(npx, args, { encoding: 'utf8', timeout: 180000 });
  if (r.status !== 0 || !fs.existsSync(outRawPath)) {
    throw new Error(`lighthouse failed for ${url} (status=${r.status}): ${(r.stderr || '').slice(0, 400)}`);
  }
  const lhr = JSON.parse(fs.readFileSync(outRawPath, 'utf8'));
  const perf = Math.round((lhr.categories?.performance?.score ?? 0) * 100);
  const lcp = (lhr.audits?.['largest-contentful-paint']?.numericValue ?? 0) / 1000;
  const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue ?? 0;
  return { perf, lcp, cls };
}

function printHelp() {
  console.log(`mobile-lighthouse.mjs — モバイル Lighthouse 実測ハーネス（横断計測）

  node scripts/mobile-lighthouse.mjs --dry-run     自己検証のみ（Chrome/サーバ不要・0 終了）
  node scripts/mobile-lighthouse.mjs               既定${DEFAULT_TARGETS.length}ページ×3回を実測

前提: 別ターミナルで  cd web && npm run build && npm run start  を起動し、他レーン停止中に実行。
既定対象(${DEFAULT_TARGETS.length}): ${DEFAULT_TARGETS.join(' ')}
第1弾達成済(除外): ${DONE_TARGETS.join(' ')}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return 0; }

  const repoRoot = process.cwd();
  const targets = loadTargets(args.targetsFile);
  const outDir = args.out || path.join(repoRoot, 'docs', 'perf', `mobile-wave2-${today()}`);

  const lh = checkLighthouse();
  const server = await checkServer(args.baseUrl);

  if (args.dryRun) {
    console.log('=== mobile-lighthouse DRY-RUN（自己検証・計測は実行しない） ===');
    console.log(`対象ページ数: ${targets.length}（既定=${!args.targetsFile}）`);
    for (const t of targets) console.log(`  - ${args.baseUrl.replace(/\/$/, '')}${t}`);
    console.log(`実測回数/ページ: ${args.runs}`);
    console.log(`出力先(予定): ${path.relative(repoRoot, outDir).replace(/\\/g, '/')}`);
    console.log(`lighthouse: ${lh.ok ? 'OK v' + lh.version : 'NG — ' + lh.hint}`);
    console.log(`サーバ(${args.baseUrl}): ${server.ok ? 'OK ' + server.status : 'NG — ' + (server.error || server.status) + '（本番ビルドを起動してから本実行）'}`);
    console.log('DRY-RUN OK: 引数と対象の整合を確認。本実行は --dry-run を外して静穏なマシンで。');
    return 0;
  }

  // --- 本実行（前提チェックを厳格化） ---
  if (!lh.ok) { console.error('ERROR: ' + lh.hint); return 1; }
  if (!server.ok) {
    console.error(`ERROR: ${args.baseUrl} に到達不可（${server.error || server.status}）。別ターミナルで cd web && npm run build && npm run start を起動してください。`);
    return 1;
  }
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`本実行: ${targets.length}ページ × ${args.runs}回（lighthouse v${lh.version}）→ ${path.relative(repoRoot, outDir).replace(/\\/g, '/')}`);

  const rows = [];
  for (const t of targets) {
    const slug = pathToSlug(t);
    const perfs = [], lcps = [], clss = [];
    let failed = 0;
    for (let i = 1; i <= args.runs; i++) {
      const rawPath = path.join(outDir, `${slug}-run${i}.json`);
      try {
        const { perf, lcp, cls } = runLighthouseOnce(args.baseUrl, t, rawPath);
        perfs.push(perf); lcps.push(lcp); clss.push(cls);
        console.log(`  ${t} run${i}: perf ${perf} / LCP ${lcp.toFixed(1)}s / CLS ${cls.toFixed(3)}`);
      } catch (e) {
        failed++;
        console.error(`  ${t} run${i}: FAILED — ${String(e.message || e).slice(0, 200)}`);
      }
    }
    if (perfs.length === 0) {
      rows.push({ path: t, perf: null, lcp: null, cls: null, runs: 0, failed });
      continue;
    }
    rows.push({
      path: t,
      perf: median(perfs),
      lcp: median(lcps),
      cls: median(clss),
      runs: perfs.length,
      failed,
    });
  }

  // --- 集計出力 ---
  const stamp = today();
  const under90 = rows.filter((r) => r.perf !== null && r.perf < 90);
  const summaryJson = { measuredAt: stamp, baseUrl: args.baseUrl, runsPerPage: args.runs, rows, under90: under90.map((r) => r.path) };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summaryJson, null, 2) + '\n');

  const md = [];
  md.push(`# モバイル Lighthouse 第2弾 再計測（${stamp}）`);
  md.push('');
  md.push(`計測条件: lighthouse v${lh.version} \`--only-categories=performance --form-factor=mobile --screenEmulation.mobile\`、headless Chrome、${args.baseUrl}（本番ビルド）、各ページ ${args.runs} 回の中央値。`);
  md.push('第1弾（#500）で 90+ 達成済みの /accidents・/laws・/whats-new は除外。');
  md.push('');
  md.push('| ページ | perf(中央値) | LCP(s) | CLS | 有効run | 失敗 |');
  md.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    const perf = r.perf === null ? '—(全失敗)' : `${r.perf}${r.perf < 90 ? ' ⚠' : ''}`;
    const lcp = r.lcp === null ? '—' : r.lcp.toFixed(1);
    const cls = r.cls === null ? '—' : r.cls.toFixed(3);
    md.push(`| ${r.path} | ${perf} | ${lcp} | ${cls} | ${r.runs} | ${r.failed} |`);
  }
  md.push('');
  if (under90.length === 0) {
    md.push('## 結論: perf<90 なし');
    md.push('全対象ページが perf 90 以上。個別是正の起票は不要。');
  } else {
    md.push('## 起票候補（perf<90 のページのみ）');
    md.push('以下を該当レーンの BACKLOG 冒頭へ **【Opus】** タスクとして分割起票（起票は運用者/planner が担当）:');
    for (const r of under90) {
      md.push(`- \`${r.path}\` : perf ${r.perf} / LCP ${r.lcp?.toFixed(1)}s / CLS ${r.cls?.toFixed(3)} — ページ直下 Suspense＋useSearchParams 同型点検（c1 doc「残課題」参照）`);
    }
  }
  md.push('');
  fs.writeFileSync(path.join(outDir, 'summary.md'), md.join('\n') + '\n');

  console.log(`完了。summary.md / summary.json を ${path.relative(repoRoot, outDir).replace(/\\/g, '/')} に出力。perf<90: ${under90.length}ページ${under90.length ? '（' + under90.map((r) => r.path).join(', ') + '）' : ''}`);
  return under90.length === 0 ? 0 : 0; // 起票は運用者判断のため、perf<90 でも非0にはしない
}

main().then((code) => process.exit(code)).catch((e) => { console.error('FATAL:', e.message || e); process.exit(1); });
