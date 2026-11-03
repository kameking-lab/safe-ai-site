// Each iteration is a separate Playwright process. playwright.config.ts owns a
// fresh static server (reuseExistingServer:false) and a fresh context per test.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createWriteStream, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mobile = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(mobile, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = option('--output');
const count = Number(option('--runs', '50'));
const full = args.includes('--full');
const stopOnFailure = args.includes('--stop-on-failure');
if (!output || !Number.isSafeInteger(count) || count < 1) {
  throw new Error('Usage: node scripts/reproduce-account-deletion.mjs --output <new evidence directory> [--runs 50] [--full] [--stop-on-failure] [--input-events]');
}
const destination = path.resolve(output);
// Refuse to overwrite an earlier experiment.
await mkdir(destination, { recursive: false });
const git = (...command) => execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim();
const fingerprint = () => {
  const hash = createHash('sha256');
  for (const file of git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'mobile').split('\n').sort()) {
    hash.update(file); hash.update(readFileSync(path.join(root, file)));
  }
  return hash.digest('hex');
};
const summary = { head: git('rev-parse', 'HEAD'), sourceDiffSha256: fingerprint(), startedAt: new Date().toISOString(), full, count, retries: 0, timeout: 30000, runs: [] };
const env = { ...process.env };
for (const name of Object.keys(env)) {
  if (/(KEY|TOKEN|SECRET|PASSWORD|DATABASE|DIRECT_URL|POSTGRES|PRISMA)/i.test(name)) delete env[name];
}
// Prevent inherited timing-sweep settings from changing the acceptance test.
delete env.IOS3G_API_TIMING;
delete env.IOS3G_PRESS_DELAY;
Object.assign(env, {
  SAFE_AI_STAGING_MODE: 'true', NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: `--require=${JSON.stringify(path.join(mobile, 'scripts/no-network.cjs'))}`,
  IOS3G_DIAGNOSTICS: args.includes('--input-events') ? '1' : 'network',
  DEBUG: 'pw:webserver',
});
async function portFree() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3213, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve));
  return true;
}
const save = () => writeFile(path.join(destination, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
let failed = false;
try {
  for (let n = 1; n <= count; n++) {
    if (git('rev-parse', 'HEAD') !== summary.head || fingerprint() !== summary.sourceDiffSha256) throw new Error('Source changed during experiment');
    const stem = path.join(destination, `run-${String(n).padStart(3, '0')}`);
    const command = [path.join(mobile, 'node_modules/@playwright/test/cli.js'), 'test', '--reporter=line,json', `--output=${stem}-results`];
    if (!full) command.push('review-fixes.spec.ts', '--project=webkit-phone', '--grep=deletion waits for hydration');
    const run = { n, startedAt: new Date().toISOString(), portFreeBefore: await portFree(), command: [process.execPath, ...command] };
    summary.runs.push(run); await save();
    const log = createWriteStream(stem + '.log');
    const child = spawn(process.execPath, command, { cwd: mobile, env: { ...env, PLAYWRIGHT_JSON_OUTPUT_FILE: stem + '.json' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    run.pid = child.pid;
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    run.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    await new Promise(resolve => log.end(resolve));
    const result = JSON.parse(await readFile(stem + '.json', 'utf8'));
    run.stats = result.stats;
    const cases = [];
    const collect = suite => {
      for (const spec of suite.specs ?? []) for (const test of spec.tests) {
        cases.push({ file: spec.file, title: spec.title, project: test.projectName });
        if (test.results.length !== 1 || test.results[0].retry !== 0) throw new Error('Require exactly one first attempt per test');
      }
      for (const child of suite.suites ?? []) collect(child);
    };
    collect(result);
    const manifest = JSON.stringify(cases.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    if (summary.caseManifest && summary.caseManifest !== manifest) throw new Error('Test case manifest changed');
    summary.caseManifest = manifest;
    run.settings = { workers: result.config.workers, projects: result.config.projects.map(p => ({ name: p.name, retries: p.retries, timeout: p.timeout })) };
    if (run.settings.projects.some(p => p.retries !== 0 || p.timeout !== 30000)) throw new Error('Retry or timeout settings changed');
    if (run.settings.workers !== 3) throw new Error('Worker settings changed');
    run.portFreeAfter = await portFree(); run.endedAt = new Date().toISOString();
    run.success = run.exitCode === 0 && result.stats.expected === cases.length && cases.length > 0 && !result.stats.unexpected && !result.stats.flaky && !result.stats.skipped;
    if (!full && result.stats.expected !== 1) run.success = false;
    failed ||= !run.success;
    await save();
    console.log(`${n}/${count}: ${result.stats.expected} passed, ${result.stats.unexpected} failed`);
    if (!run.success && stopOnFailure) break;
  }
  summary.success = !failed && summary.runs.length === count;
} catch (error) { summary.success = false; summary.error = error.message; }
finally {
  summary.endedAt = new Date().toISOString(); await save();
  if (!summary.success) process.exitCode = 1;
}
