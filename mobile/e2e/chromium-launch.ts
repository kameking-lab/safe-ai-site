import { createRequire } from 'node:module';
import type { LaunchOptions } from '@playwright/test';

// Backport https://github.com/microsoft/playwright/pull/43605 until a stable
// Playwright release includes it. A second --disable-features replaces the
// defaults, so preserve the complete list from our pinned 1.64.1 release.
const disabledFeatures = [
  'AvoidUnnecessaryBeforeUnloadCheckSync', 'DestroyProfileOnBrowserClose',
  'DialMediaRouteProvider', 'GlobalMediaControls', 'HttpsUpgrades', 'LensOverlay',
  'MediaRouter', 'PaintHolding', 'ThirdPartyStoragePartitioning',
  'BlockOriginHeaderModificationOnRedirect', 'AvoidCorsURLLoaderRestartOnRedirect',
  'Translate', 'AutoDeElevate', 'OptimizationHints', 'NetworkTimeServiceQuerying',
  'AimEnabled', 'msForceBrowserSignIn', 'msEdgeUpdateLaunchServicesPreferredVersion',
];

export function chromiumLaunchOptions(): LaunchOptions {
  if (process.platform !== 'win32') return {};
  const require = createRequire(import.meta.url);
  if (require('playwright-core/package.json').version !== '1.64.1') {
    throw new Error('Recheck the Windows TCP workaround against the updated Playwright defaults.');
  }
  return { args: [`--disable-features=${[...disabledFeatures, 'TcpPortRandomizationWin'].join(',')}`] };
}
