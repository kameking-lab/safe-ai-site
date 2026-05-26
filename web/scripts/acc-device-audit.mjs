import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "../docs/accidents-deep-audit-2026-05-26/screenshots";
mkdirSync(OUT, { recursive: true });
const B = "https://www.anzen-ai-portal.jp";
const b = await chromium.launch();
const out = [];
for (const url of ["/accidents", "/accidents-reports"]) {
  for (const vp of [{n:"sp375",w:375,h:812},{n:"tab768",w:768,h:1024},{n:"pc1920",w:1920,h:1080}]) {
    const ctx = await b.newContext({ viewport:{width:vp.w,height:vp.h} });
    const p = await ctx.newPage();
    await p.goto(`${B}${url}`, {waitUntil:"domcontentloaded",timeout:30000}).catch(()=>{});
    await p.waitForTimeout(900);
    const m = await p.evaluate(()=>({hscroll: document.documentElement.scrollWidth>window.innerWidth+1, docW: document.documentElement.scrollWidth}));
    out.push({url, vp:vp.n, ...m});
    if (vp.n!=="tab768") await p.screenshot({path:`${OUT}/${url.replace(/\//g,'_')}-${vp.n}.png`});
    await ctx.close();
  }
}
console.log(JSON.stringify(out));
await b.close();
