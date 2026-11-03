import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const base = resolve('out');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon' };
export const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = resolve(base, `.${!extname(pathname) ? `${pathname.replace(/\/$/,'')}/index.html` : pathname}`);
  if (!file.startsWith(`${base}${sep}`)) { res.writeHead(403); res.end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
}).listen(3213, '127.0.0.1', () => console.log('Bundled mobile app: http://127.0.0.1:3213'));
