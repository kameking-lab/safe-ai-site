import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "../docs/chemical-ra-deep-audit-2026-05-26/screenshots";
mkdirSync(OUT, { recursive: true });
const B = "https://www.anzen-ai-portal.jp";
const b = await chromium.launch();
const out = [];
for (const vp of [{n:"smartphone-375",w:375,h:812},{n:"tablet-768",w:768,h:1024},{n:"pc-1920",w:1920,h:1080}]) {
  const ctx = await b.newContext({ viewport:{width:vp.w,height:vp.h} });
  const p = await ctx.newPage();
  await p.goto(`${B}/chemical-database/50-00-0`, {waitUntil:"networkidle",timeout:30000});
  await p.waitForTimeout(500);
  const m = await p.evaluate(()=>({hscroll: document.documentElement.scrollWidth>window.innerWidth+1, docW: document.documentElement.scrollWidth, h2: Array.from(document.querySelectorAll("h2")).map(e=>e.textContent.trim()).slice(0,8)}));
  out.push({vp:vp.n,...m});
  await p.screenshot({path:`${OUT}/${vp.n}.png`, fullPage:false});
  await ctx.close();
}
// 検索操作時間: /chemical-database で「ベンゼン」入力→結果表示まで
const ctx = await b.newContext({viewport:{width:1280,height:800}});
const p = await ctx.newPage();
await p.goto(`${B}/chemical-database`, {waitUntil:"networkidle",timeout:30000});
const inp = await p.$('input[type="search"], input[type="text"]');
let searchInfo = "input not found";
if (inp) {
  const t0 = Date.now();
  await inp.fill("ベンゼン");
  await p.waitForTimeout(700);
  const results = await p.evaluate(()=> (document.body.innerText.match(/71-43-2|ベンゼン/g)||[]).length);
  searchInfo = `「ベンゼン」入力→${Date.now()-t0}ms後 該当語${results}件可視`;
}
console.log(JSON.stringify({devices: out, search: searchInfo}, null, 2));
await b.close();
