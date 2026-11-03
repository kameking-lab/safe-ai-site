import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
if (process.platform !== 'darwin') {
  console.error('iOS generation/build is restricted to Codemagic macOS. No native commands were executed.');
  process.exit(1);
}
if (process.env.CI !== 'true' || !process.env.CM_BUILD_DIR) {
  console.error('Run this preparation only in the Codemagic workflow.'); process.exit(1);
}
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, CAPACITOR_TELEMETRY_DISABLED: '1' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
await access('out/index.html');
let exists = true;
try { await access('ios/App/App.xcodeproj'); } catch { exists = false; }
if (!exists) run('node', ['node_modules/@capacitor/cli/bin/capacitor', 'add', 'ios', '--packagemanager', 'SPM']);
run('node', ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'ios']);
run('python3', ['scripts/configure-ios.py']);
