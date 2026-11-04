import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const allowNonMacOS = process.argv.includes('--allow-non-macos');
if (process.argv.slice(2).some(arg => arg !== '--allow-non-macos')) throw new Error('Unknown prepare argument');
if (process.platform !== 'darwin' && !allowNonMacOS) {
  console.error('Use macOS, or --allow-non-macos for native-file verification only. No native files changed.');
  process.exit(1);
}
const cwd = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CAPACITOR_TELEMETRY_DISABLED: '1' } });
const cap = (...args) => run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args]);
await access(new URL('../out/index.html', import.meta.url));
run('ruby', ['-rxcodeproj', '-e', "abort 'Invalid build number' unless ENV.fetch('BUILD_NUMBER', '1').match?(/\\A[1-9]\\d*\\z/)"]);
const python = process.platform === 'win32' ? 'python' : 'python3';
run(python, ['--version']);
try { await access(new URL('../ios/App/App.xcodeproj', import.meta.url)); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  cap('add', 'ios', '--packagemanager', 'SPM');
}
cap('sync', 'ios');
// capacitor:sync:after finalizes both add's initial sync and direct CLI sync.
run('ruby', ['scripts/verify-ios.rb']);
if (process.platform !== 'darwin') console.log('Native files verified only. SPM resolution, Swift compilation, signing and upload require macOS.');
