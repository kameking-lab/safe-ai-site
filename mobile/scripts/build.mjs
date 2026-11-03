import { spawnSync } from 'node:child_process';
const env = { ...process.env, ANZEN_NATIVE_BUILD:'true', SAFE_AI_STAGING_MODE:'true', NEXT_TELEMETRY_DISABLED:'1', NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(new URL('./no-network.cjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'))}` };
for (const [file,args] of [['scripts/pack-seed.mjs',[]],['scripts/share-web.mjs',[]],['node_modules/next/dist/bin/next',['build','--webpack']],['scripts/check-export.mjs',[]],['scripts/audit-parity.mjs',[]]]) {
  const result = spawnSync(process.execPath,[file,...args],{stdio:'inherit',env});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
