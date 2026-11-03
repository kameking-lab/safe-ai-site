import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { chromiumLaunchOptions } from '../e2e/chromium-launch.ts';

// Public launchServer/process APIs verify the *effective* command line, so the
// Windows workaround cannot silently replace Playwright's other defaults.
const baseline = await chromium.launchServer();
const defaults = baseline.process().spawnargs.find(arg => arg.startsWith('--disable-features='));
await baseline.close();
const options = chromiumLaunchOptions();
const server = await chromium.launchServer(options);
try {
  const args = server.process().spawnargs;
  const effective = args.filter(arg => arg.startsWith('--disable-features=')).at(-1);
  const features = value => value.slice('--disable-features='.length).split(',').sort();
  const expected = [...new Set([...features(defaults), ...(process.platform === 'win32' ? ['TcpPortRandomizationWin'] : [])])].sort();
  assert.deepEqual(features(effective), expected, 'Preserve every disabled feature and add only the Windows TCP fix');
  const browser = await chromium.connect(server.wsEndpoint());
  const evidence = { platform: process.platform, chromium: browser.version(), baselineDisabledFeatures: features(defaults), effectiveDisabledFeatures: features(effective), preservedDefaults: true };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
  await browser.close();
} finally {
  await server.close();
}
