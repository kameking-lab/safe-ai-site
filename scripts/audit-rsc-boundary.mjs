#!/usr/bin/env node
// React Server / Client Component boundary audit for web/src.
//
// Detects patterns that would cause hydration mismatch or runtime errors in
// production: server modules calling client-only hooks, client modules pulling
// server-only APIs, render-path non-determinism (Date.now / Math.random / new
// Date()), DOM event handlers on server-classified JSX, and the classic
// useState(() => localStorage.getItem(...)) lazy-initializer regression
// resolved in PR #138.
//
// BOM-aware so the classifier matches Next.js' own directive detection.
// Run with: node scripts/audit-rsc-boundary.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'web', 'src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full);
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
}
walk(ROOT);

const rel = (f) => path.relative(process.cwd(), f).replace(/\\/g, '/');

function readSrc(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s;
}

function classify(src) {
  // Honor only directive on the very first non-empty, non-comment line
  const lines = src.split('\n');
  let directive = null;
  for (const l of lines) {
    const t = l.trim();
    if (t === '') continue;
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) continue;
    if (/^['"]use client['"];?\s*$/.test(t)) directive = 'client';
    else if (/^['"]use server['"];?\s*$/.test(t)) directive = 'server-action';
    break;
  }
  return directive ?? 'server';
}

const issues = {
  bomFiles: [],
  classification: { client: 0, server: 0, serverAction: 0 },
  serverImportsClientHook: [],
  serverImportsNextNavClientHook: [],
  serverImportsReactDomClientHook: [],
  serverJsxWithDateNow: [],
  serverJsxWithMathRandom: [],
  serverJsxWithNewDateInline: [],
  serverDomOnHandler: [],
  clientImportsFs: [],
  clientImportsNodePath: [],
  clientServerOnlyEnv: [],
  clientAsyncDefaultExport: [],
  useClientNotFirstLine: [],
  hookInUseStateInit: [],
  legacyHydrationLocalStorageInit: [],
};

const CLIENT_HOOKS = new Set(['useState','useEffect','useReducer','useCallback','useMemo','useRef','useContext',
  'useLayoutEffect','useImperativeHandle','useDeferredValue','useTransition',
  'useId','useSyncExternalStore','useInsertionEffect','useOptimistic']);
const REACTDOM_HOOKS = new Set(['useFormStatus','useFormState']);
const NEXTNAV_HOOKS = new Set(['useRouter','usePathname','useSearchParams','useParams','useSelectedLayoutSegment','useSelectedLayoutSegments']);

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) issues.bomFiles.push(rel(file));
  const src = readSrc(file);
  const cls = classify(src);
  if (cls === 'client') issues.classification.client++;
  else if (cls === 'server-action') issues.classification.serverAction++;
  else issues.classification.server++;

  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const isApiRoute = /\/(api|sitemap)/.test(file) || /\/route\.ts$/.test(file);

  // Check directive placement
  if (cls === 'client') {
    const firstLine = src.split('\n').find(l => l.trim() !== '') ?? '';
    if (!/^['"]use client['"];?\s*$/.test(firstLine.trim())) {
      issues.useClientNotFirstLine.push({ file: rel(file), firstLine: firstLine.slice(0, 100) });
    }
  }

  if (cls === 'server') {
    const reactImports = [...noComments.matchAll(/import\s*(?:type\s+)?\{([^}]+)\}\s*from\s*['"]react['"]/g)];
    for (const m of reactImports) {
      // skip type-only imports
      const isTypeImport = /import\s+type/.test(m[0]);
      if (isTypeImport) continue;
      const names = m[1].split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()).filter(Boolean);
      const bad = names.filter(n => CLIENT_HOOKS.has(n));
      if (bad.length) issues.serverImportsClientHook.push({ file: rel(file), hooks: bad });
    }
    const rdImports = [...noComments.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]react-dom['"]/g)];
    for (const m of rdImports) {
      const names = m[1].split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim());
      const bad = names.filter(n => REACTDOM_HOOKS.has(n));
      if (bad.length) issues.serverImportsReactDomClientHook.push({ file: rel(file), hooks: bad });
    }
    const navImports = [...noComments.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]next\/navigation['"]/g)];
    for (const m of navImports) {
      const isTypeImport = /import\s+type/.test(m[0]);
      if (isTypeImport) continue;
      const names = m[1].split(',').map(s => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim());
      const bad = names.filter(n => NEXTNAV_HOOKS.has(n));
      if (bad.length) issues.serverImportsNextNavClientHook.push({ file: rel(file), hooks: bad });
    }

    // Render-path checks: only for .tsx files
    if (/\.tsx$/.test(file)) {
      const returns = [...noComments.matchAll(/return\s*\(([\s\S]*?)\)\s*;?/g)];
      let jsx = returns.map(r => r[1]).join('\n');
      if (jsx) {
        if (/\bDate\.now\s*\(\s*\)/.test(jsx)) issues.serverJsxWithDateNow.push({ file: rel(file) });
        if (/\bMath\.random\s*\(\s*\)/.test(jsx)) issues.serverJsxWithMathRandom.push({ file: rel(file) });
        // new Date() called inline in JSX (toLocaleDateString, getFullYear) - hydration risk
        if (/new\s+Date\s*\(\s*\)\s*\.[a-zA-Z]/.test(jsx)) {
          const ex = jsx.match(/new\s+Date\s*\(\s*\)\s*\.[a-zA-Z][^,;\n)}]{0,60}/)?.[0];
          issues.serverJsxWithNewDateInline.push({ file: rel(file), excerpt: ex });
        }
        // onClick={ on lowercase DOM tag in server JSX
        const handlerMatch = jsx.match(/<[a-z][a-zA-Z0-9]*\s+[^>]{0,200}\bon[A-Z][a-zA-Z]+\s*=\s*\{/);
        if (handlerMatch) issues.serverDomOnHandler.push({ file: rel(file), excerpt: handlerMatch[0].slice(0, 160) });
      }
    }
  }

  if (cls === 'client') {
    if (/from\s+['"](node:)?(fs|fs\/promises)['"]/.test(noComments)) {
      issues.clientImportsFs.push({ file: rel(file) });
    }
    if (/from\s+['"]node:path['"]/.test(noComments)) {
      issues.clientImportsNodePath.push({ file: rel(file) });
    }
    const envHits = noComments.match(/process\.env\.[A-Z_][A-Z0-9_]*/g) || [];
    const leaks = [...new Set(envHits.filter(e => !/NEXT_PUBLIC_/.test(e) && e !== 'process.env.NODE_ENV'))];
    if (leaks.length) issues.clientServerOnlyEnv.push({ file: rel(file), envs: leaks });

    if (/export\s+default\s+async\s+function/.test(noComments)) {
      issues.clientAsyncDefaultExport.push({ file: rel(file) });
    }

    // Classic hydration bug: useState(() => localStorage.getItem(...))
    if (/useState\s*\(\s*\(\s*\)\s*=>\s*(?:[^)]*\b)?(?:window\.)?(?:localStorage|sessionStorage)/.test(noComments)) {
      issues.legacyHydrationLocalStorageInit.push({ file: rel(file) });
    }
  }
}

function section(t, arr, fmt) {
  console.log(`\n--- ${t} (${arr.length}) ---`);
  for (const r of arr) console.log('  ' + (fmt ? fmt(r) : JSON.stringify(r)));
}

console.log('=== RSC Boundary Audit — Final ===');
console.log(`Total .ts/.tsx: ${files.length}`);
console.log(`Files with UTF-8 BOM: ${issues.bomFiles.length}`);
console.log(`Client components: ${issues.classification.client}`);
console.log(`Server components/modules: ${issues.classification.server}`);
console.log(`Server actions: ${issues.classification.serverAction}`);

section('B-1.a Server file imports client-only react hook', issues.serverImportsClientHook, r => `${r.file} → ${r.hooks.join(',')}`);
section('B-1.b Server file imports client-only react-dom hook', issues.serverImportsReactDomClientHook, r => `${r.file} → ${r.hooks.join(',')}`);
section('B-1.c Server file imports client-only next/navigation hook', issues.serverImportsNextNavClientHook, r => `${r.file} → ${r.hooks.join(',')}`);
section('B-1.d Server JSX render path Date.now()', issues.serverJsxWithDateNow, r => r.file);
section('B-1.e Server JSX render path Math.random()', issues.serverJsxWithMathRandom, r => r.file);
section('B-1.f Server JSX inline new Date().xxx() — hydration risk', issues.serverJsxWithNewDateInline, r => `${r.file} — ${r.excerpt}`);
section('B-1.g Server JSX has DOM event handler (lowercase tag, onXxx={...})', issues.serverDomOnHandler, r => `${r.file} — ${r.excerpt}`);
section('B-2.a Client file imports fs', issues.clientImportsFs, r => r.file);
section('B-2.b Client file imports node:path', issues.clientImportsNodePath, r => r.file);
section('B-2.c Client file references non-NEXT_PUBLIC process.env.*', issues.clientServerOnlyEnv, r => `${r.file} → ${r.envs.join(',')}`);
section('B-4.a Client file has async default export component', issues.clientAsyncDefaultExport, r => r.file);
section('B-3.a useState(() => localStorage...) lazy init (PR#138 class regression check)', issues.legacyHydrationLocalStorageInit, r => r.file);
section('"use client" directive not on first line', issues.useClientNotFirstLine, r => `${r.file} — first: ${r.firstLine}`);

if (issues.bomFiles.length) {
  console.log('\n--- Files with BOM (informational, Next handles correctly) ---');
  for (const f of issues.bomFiles) console.log('  ' + f);
}
console.log('\n=== DONE ===');
