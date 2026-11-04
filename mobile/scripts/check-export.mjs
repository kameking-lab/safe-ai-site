import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sanitizePdfjsBrowserPath } from './pdfjs-browser-path.mjs';
async function sanitizeChunks(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    if(entry.isDirectory())await sanitizeChunks(file);
    else if(entry.name.endsWith('.js')){const before=await readFile(file,'utf8');const after=sanitizePdfjsBrowserPath(before);if(after!==before)await writeFile(file,after);}
  }
}
await sanitizeChunks(new URL('../out/_next/',import.meta.url));
const config = await readFile(new URL('../capacitor.config.ts', import.meta.url), 'utf8');
assert(!/server\s*:\s*\{[^}]*\burl\s*:/.test(config), 'Remote WebView must never be configured');
assert(!/allowNavigation|allowMixedContent\s*:\s*true/.test(config));
// This is the CLI input, not the shipped Apple identity. Native identity is
// restored by capacitor:sync:after and checked by verify-ios.rb after prepare.
assert(config.includes("appId: 'jp.anzenaiportal.app'"), 'Capacitor generation requires a valid CLI appId');
const html = await readFile(new URL('../out/index.html', import.meta.url), 'utf8');
assert(html.includes('事故速報') && html.includes('安全AIポータル'));
assert(!(await stat(new URL('../out/index.html', import.meta.url))).isDirectory());
console.log('Local static export and Capacitor bundle boundary verified.');
