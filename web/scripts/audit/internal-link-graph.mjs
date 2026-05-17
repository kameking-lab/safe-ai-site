#!/usr/bin/env node
// Internal link graph audit: extract page routes, scan src/ for <Link href> / router.push() / useRouter().push()
// outputs JSON + console report
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const APP = path.join(SRC, 'app');

/** Recursively gather files matching extensions */
async function walk(dir, exts = ['.tsx', '.ts']) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walk(p, exts)));
    } else if (exts.includes(path.extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

/** Convert a page.tsx file path to a route */
function pageToRoute(file) {
  const rel = path.relative(APP, file).replaceAll('\\', '/');
  let route = '/' + rel.replace(/\/page\.tsx$/, '');
  // strip route groups like (main)
  route = route.replace(/\([^/)]+\)\//g, '');
  route = route.replace(/\/\([^/)]+\)/g, '');
  if (route === '') route = '/';
  if (route === '/page.tsx') route = '/';
  return route;
}

/** Normalize an href to a route key (strip query/hash, trailing slash, dynamic segments left as [param] symbolic) */
function normalizeHref(href) {
  if (!href || typeof href !== 'string') return null;
  if (!href.startsWith('/')) return null;
  // strip query+hash
  let h = href.split('#')[0].split('?')[0];
  if (h.length > 1 && h.endsWith('/')) h = h.slice(0, -1);
  return h;
}

/** Match a static href against page routes; supports dynamic [param] segments */
function matchHrefToRoute(href, routes) {
  // exact match
  if (routes.includes(href)) return href;
  // try dynamic match
  const hrefSegs = href.split('/').filter(Boolean);
  for (const r of routes) {
    const rSegs = r.split('/').filter(Boolean);
    if (rSegs.length !== hrefSegs.length) continue;
    let ok = true;
    for (let i = 0; i < rSegs.length; i++) {
      if (rSegs[i].startsWith('[') && rSegs[i].endsWith(']')) continue;
      if (rSegs[i] !== hrefSegs[i]) { ok = false; break; }
    }
    if (ok) return r;
  }
  return null;
}

/** Extract href strings from source text. Captures:
 *  - href="/path"
 *  - href={`/path/...`}
 *  - href={`/path`}
 *  - href={"/path"}
 *  - router.push('/path')
 *  - redirect('/path')
 *  Returns two sets:
 *    - exact:    fully literal href strings
 *    - prefixes: literal prefixes from template literals (used to fan-out to all matching dynamic routes)
 */
function extractHrefs(text) {
  const exact = new Set();
  const prefixes = new Set();

  // href="/..." or href='/...'
  for (const m of text.matchAll(/href=(["'])(\/[^"'\s>]*)\1/g)) {
    exact.add(m[2]);
  }
  // href={"/..."} or href={'/...'}
  for (const m of text.matchAll(/href=\{\s*(["'])(\/[^"']*)\1\s*\}/g)) {
    exact.add(m[2]);
  }
  // href={`/.../...${...}...`}  → take prefix up to first ${ as a fan-out prefix
  for (const m of text.matchAll(/href=\{\s*`(\/[^`]*?)`\s*\}/g)) {
    const tpl = m[1];
    const cut = tpl.indexOf('${');
    if (cut === -1) {
      exact.add(tpl);
    } else {
      const prefix = tpl.slice(0, cut).replace(/\/+$/, '');
      if (prefix && prefix.startsWith('/')) prefixes.add(prefix + '/');
    }
  }
  // router.push('/...'), router.replace('/...'), redirect('/...')
  for (const m of text.matchAll(/\b(?:router\.(?:push|replace)|redirect|permanentRedirect)\(\s*(["'`])(\/[^"'`]+?)\1/g)) {
    let h = m[2];
    const cut = h.indexOf('${');
    if (cut !== -1) {
      const p = h.slice(0, cut).replace(/\/+$/, '');
      if (p) prefixes.add(p + '/');
    } else {
      exact.add(h);
    }
  }
  // anchor `<a href="/...">` (fallback for non-Link)
  for (const m of text.matchAll(/<a\b[^>]*href=(["'])(\/[^"'\s>#]*)\1/g)) {
    exact.add(m[2]);
  }

  // Bare template literals that look like routes — captures `const href = `/foo/${id}`` and similar.
  // We intentionally include any backtick template starting with '/' and containing '${'.
  for (const m of text.matchAll(/`(\/[a-z][a-z0-9/\-_[\]]*?)\$\{/gi)) {
    const literal = m[1];
    const prefix = literal.replace(/\/+$/, '');
    if (prefix.startsWith('/')) prefixes.add(prefix + '/');
  }
  // Bare string-literal route constants: `const href = "/foo/bar"` is already covered when used in JSX, but we
  // also add raw literal patterns near identifiers like Href/href/path/route so static constants count.
  for (const m of text.matchAll(/(?:Href|href|path|route|url|to)\s*[:=]\s*(["'])(\/[a-z][a-z0-9/\-_]*)\1/gi)) {
    exact.add(m[2]);
  }

  return { exact: Array.from(exact), prefixes: Array.from(prefixes) };
}

/** Determine which page route a source file belongs to (closest page.tsx ancestor) */
function sourceFileToOwningRoute(file, routes) {
  const rel = path.relative(APP, file).replaceAll('\\', '/');
  if (!rel.startsWith('..')) {
    // inside app/. Walk up until we find a page.tsx sibling
    // pages in app/(main)/foo/bar/x.tsx → belongs to /foo/bar (or nearest ancestor with page.tsx)
    let segs = rel.split('/');
    while (segs.length > 0) {
      const dir = path.join(APP, ...segs.slice(0, -1));
      // check if dir has page.tsx
      try {
        // synchronous-ish: we precomputed routes; map dir back
        const dirRel = path.relative(APP, dir).replaceAll('\\', '/');
        let candidate = '/' + dirRel.replace(/\([^/)]+\)\//g, '').replace(/\/\([^/)]+\)/g, '');
        if (candidate === '/.') candidate = '/';
        // also handle root
        if (candidate === '/' || routes.includes(candidate)) return candidate;
      } catch {}
      segs = segs.slice(0, -1);
    }
    return null;
  }
  // outside app (components/, lib/) — link is shared, attribute to special key 'shared'
  return null;
}

async function main() {
  // 1. enumerate page files
  const pageFiles = (await walk(APP)).filter((f) => f.endsWith('page.tsx'));
  const routes = pageFiles.map(pageToRoute).sort();

  // 2. enumerate all source files inside src/
  const srcFiles = await walk(SRC);

  // 3. build graph
  const outgoing = new Map(); // route -> Set<route>
  const incoming = new Map(); // route -> Set<route or "shared">
  const sharedRefs = new Map(); // file -> Set<route>  for refs from components/lib

  for (const r of routes) {
    outgoing.set(r, new Set());
    incoming.set(r, new Set());
  }

  for (const file of srcFiles) {
    const txt = await fs.readFile(file, 'utf8');
    const { exact, prefixes } = extractHrefs(txt);
    if (exact.length === 0 && prefixes.length === 0) continue;

    const owner = sourceFileToOwningRoute(file, routes);
    const addEdge = (target) => {
      if (owner && routes.includes(owner)) {
        if (owner === target) return; // self-link
        outgoing.get(owner).add(target);
        incoming.get(target).add(owner);
      } else {
        if (!sharedRefs.has(file)) sharedRefs.set(file, new Set());
        sharedRefs.get(file).add(target);
        incoming.get(target).add('shared:' + path.relative(SRC, file).replaceAll('\\', '/'));
      }
    };

    for (const raw of exact) {
      const h = normalizeHref(raw);
      if (!h) continue;
      if (h.startsWith('/api/') || h === '/api' || h.startsWith('/_next')) continue;
      const target = matchHrefToRoute(h, routes);
      if (!target) continue;
      addEdge(target);
    }

    // Fan-out template prefixes: any route starting with prefix becomes a target.
    // Skip prefixes that match a static page (already counted above) — only credit deeper dynamic descendants.
    for (const prefix of prefixes) {
      if (prefix.startsWith('/api/')) continue;
      const matching = routes.filter((r) => r !== prefix.slice(0, -1) && (r + '/').startsWith(prefix));
      for (const t of matching) addEdge(t);
    }
  }

  // 4. summary
  const summary = routes.map((r) => ({
    route: r,
    outgoing: outgoing.get(r).size,
    incoming: incoming.get(r).size,
    incomingFromPages: Array.from(incoming.get(r)).filter((x) => !x.startsWith('shared:')).length,
    incomingFromShared: Array.from(incoming.get(r)).filter((x) => x.startsWith('shared:')).length,
  }));

  const orphans = summary.filter((s) => s.incomingFromPages === 0 && !s.route.includes('['));
  const lowIncoming = summary.filter((s) => s.incomingFromPages > 0 && s.incomingFromPages < 2 && !s.route.includes('['));
  const lowOutgoing = summary.filter((s) => s.outgoing < 2 && !s.route.includes('[') && s.route !== '/');

  console.log('=== ROUTES TOTAL:', routes.length, '===');
  console.log('\n=== ORPHANS (no page-level incoming, excluding dynamic) ===');
  for (const o of orphans) console.log(`  ${o.route}  (shared: ${o.incomingFromShared})`);

  console.log('\n=== LOW INCOMING (1 page-level incoming) ===');
  for (const o of lowIncoming) console.log(`  ${o.route}  in=${o.incomingFromPages} sh=${o.incomingFromShared}`);

  console.log('\n=== LOW OUTGOING (< 2) ===');
  for (const o of lowOutgoing) console.log(`  ${o.route}  out=${o.outgoing}`);

  console.log('\n=== TOP 20 HUBS (by outgoing) ===');
  [...summary].sort((a, b) => b.outgoing - a.outgoing).slice(0, 20)
    .forEach((s) => console.log(`  ${s.route}  out=${s.outgoing} in=${s.incomingFromPages}`));

  console.log('\n=== TOP 20 AUTHORITY (by incoming) ===');
  [...summary].sort((a, b) => b.incomingFromPages - a.incomingFromPages).slice(0, 20)
    .forEach((s) => console.log(`  ${s.route}  in=${s.incomingFromPages} sh=${s.incomingFromShared} out=${s.outgoing}`));

  // also dump per-route incoming/outgoing for the JSON
  const detail = {};
  for (const r of routes) {
    detail[r] = {
      outgoing: Array.from(outgoing.get(r)).sort(),
      incoming: Array.from(incoming.get(r)).sort(),
    };
  }

  const outFile = path.join(__dirname, 'internal-link-graph.json');
  await fs.writeFile(outFile, JSON.stringify({ summary, detail, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\n[wrote ${outFile}]`);
}

main().catch((e) => { console.error(e); process.exit(1); });
