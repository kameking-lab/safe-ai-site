import { execFileSync } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Capacitor invokes this hook for every platform; this app customizes iOS only.
if (process.env.CAPACITOR_PLATFORM_NAME !== 'ios') process.exit(0);
const cwd = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args) => execFileSync(command, args, { cwd, stdio: 'inherit' });
for (const name of ['NativeVault.swift', 'PrivacyInfo.xcprivacy']) {
  await copyFile(new URL(`../ios-resources/${name}`, import.meta.url), new URL(`../ios/App/App/${name}`, import.meta.url));
}
run(process.platform === 'win32' ? 'python' : 'python3', ['scripts/generate-ios-artwork.py']);
run('ruby', ['scripts/configure-ios.rb']);
run('ruby', ['scripts/verify-ios.rb']);
