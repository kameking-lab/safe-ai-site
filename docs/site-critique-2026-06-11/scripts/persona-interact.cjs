// ペルソナ実機操作計測（独立酷評レビュー用・本番読み取り中心。chatbotのみ1問送信）
const { chromium } = require("playwright");
const fs = require("node:fs");
const BASE = "https://www.anzen-ai-portal.jp";

(async () => {
  const outDir = process.argv[2] || "shots";
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const log = (...a) => console.log(JSON.stringify(a));

  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // ---- 1) モバイルのヘッダー/ハンバーガー/検索/固定オーバーレイの正体 ----
  {
    const p = await mob.newPage();
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    const hdr = await p.evaluate(() => {
      const burger = [...document.querySelectorAll("header button, nav button")].map((b) => ({
        label: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 30),
        w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height),
      }));
      const fixed = [...document.querySelectorAll("body *")].filter((el) => {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return (s.position === "fixed") && r.width > 100 && r.height > 30 && s.display !== "none" && s.visibility !== "hidden";
      }).map((el) => ({ cls: String(el.className).slice(0, 100), text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 80), h: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top) }));
      return { burger, fixed };
    });
    log("home-mobile-header", hdr);
    // ハンバーガーを開く
    const burgerBtn = p.locator("header button").first();
    if (await burgerBtn.count()) {
      await burgerBtn.click().catch(() => {});
      await p.waitForTimeout(800);
      const menu = await p.evaluate(() => {
        const links = [...document.querySelectorAll("a")].filter((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight;
        });
        return { visibleLinks: links.length, hasSearch: !!document.querySelector('input[type=search], input[placeholder*="検索"]'), sample: links.slice(0, 30).map((a) => a.textContent.trim().slice(0, 20)) };
      });
      log("home-mobile-menu-open", menu);
      await p.screenshot({ path: `${outDir}/menu-open.mobile.png` });
    }
    await p.close();
  }

  // ---- 2) 職長: /ky/paper で用紙を書く(モバイル) ----
  {
    const p = await mob.newPage();
    await p.goto(BASE + "/ky/paper", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3500);
    const form = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const inputs = [...document.querySelectorAll("input, textarea, select")].filter(vis);
      const fixedBars = [...document.querySelectorAll("body *")].filter((el) => {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return s.position === "fixed" && r.bottom > window.innerHeight - 5 && r.width > 300 && vis(el);
      });
      const barButtons = fixedBars.flatMap((b) => [...b.querySelectorAll("button, a")]).filter(vis)
        .map((b) => ({ t: (b.textContent || "").trim().slice(0, 12), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) }));
      return { inputCount: inputs.length, fixedBarCount: fixedBars.length, barButtons, pageH: document.documentElement.scrollHeight };
    });
    log("ky-paper-mobile-form", form);
    await p.screenshot({ path: `${outDir}/ky-paper-top.mobile.png` });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${outDir}/ky-paper-bottom.mobile.png` });
    await p.close();
  }

  // ---- 3) 安全担当: /site-records (デスクトップ) 今日やること→点検 ----
  {
    const p = await desk.newPage();
    await p.goto(BASE + "/site-records", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    const sr = await p.evaluate(() => {
      const main = document.querySelector("main") || document.body;
      return { contentWidth: Math.round((document.querySelector("main > div, main section") || main).getBoundingClientRect().width), text0: (main.innerText || "").slice(0, 400) };
    });
    log("site-records-desktop", sr);
    await p.screenshot({ path: `${outDir}/site-records.desktop.png` });
    await p.close();
  }

  // ---- 4) 元請: /accidents (デスクトップ) 出力手段の有無 ----
  {
    const p = await desk.newPage();
    await p.goto(BASE + "/accidents", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(4000);
    const acc = await p.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasCSV: /CSV|csv/.test(t), hasCopy: /コピー/.test(t), hasPrint: /印刷/.test(t), hasDL: /ダウンロード/.test(t),
        headline: t.slice(0, 200),
      };
    });
    log("accidents-desktop-export", acc);
    await p.screenshot({ path: `${outDir}/accidents.desktop.png` });
    await p.close();
  }

  // ---- 5) コンサル: /circulars 検索応答(モバイル) ----
  {
    const p = await mob.newPage();
    const t0 = Date.now();
    await p.goto(BASE + "/circulars", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(4000);
    const domNodes = await p.evaluate(() => document.querySelectorAll("*").length);
    const search = p.locator('input[type=search], input[placeholder*="検索"]').first();
    let searchInfo = { found: false };
    if (await search.count()) {
      const t1 = Date.now();
      await search.fill("化学物質");
      await p.waitForTimeout(1200);
      const after = await p.evaluate(() => ({ visText: document.body.innerText.length, h: document.documentElement.scrollHeight }));
      searchInfo = { found: true, fillToSettleMs: Date.now() - t1, afterH: after.h };
    }
    log("circulars-mobile", { loadMs: Date.now() - t0, domNodes, searchInfo });
    await p.screenshot({ path: `${outDir}/circulars-search.mobile.png` });
    await p.close();
  }

  // ---- 6) 初見: 通達詳細ページ着地(モバイル) 回遊導線 ----
  {
    const p = await mob.newPage();
    await p.goto(BASE + "/circulars/mhlw-notice-0001", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(2500);
    const detail = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const links = [...document.querySelectorAll("main a, article a")].filter(vis);
      return {
        breadcrumb: !!document.querySelector('[aria-label*="breadcrumb" i], nav ol'),
        internalLinks: links.filter((a) => a.host === location.host).length,
        relatedHeading: /関連/.test(document.body.innerText),
        pageH: document.documentElement.scrollHeight,
      };
    });
    log("circular-detail-mobile", detail);
    await p.screenshot({ path: `${outDir}/circular-detail.mobile.png` });
    await p.close();
  }

  // ---- 7) chatbot 1問実測(モバイル) ----
  {
    const p = await mob.newPage();
    await p.goto(BASE + "/chatbot", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    const input = p.locator("textarea, input[type=text]").first();
    let bot = { inputFound: false };
    if (await input.count()) {
      bot.inputFound = true;
      await input.fill("フォークリフトの点検は毎日必要ですか");
      const before = await p.evaluate(() => document.body.innerText.length);
      const sendBtn = p.locator('button[type=submit], button:has-text("送信")').first();
      const t0 = Date.now();
      if (await sendBtn.count()) await sendBtn.click(); else await input.press("Enter");
      // 回答が伸びるまで最大40秒
      let answered = false;
      for (let i = 0; i < 40; i++) {
        await p.waitForTimeout(1000);
        const now = await p.evaluate(() => document.body.innerText.length);
        if (now > before + 200) { bot.firstAnswerMs = Date.now() - t0; answered = true; break; }
      }
      bot.answered = answered;
      await p.waitForTimeout(4000);
      bot.finalText = (await p.evaluate(() => document.body.innerText)).slice(0, 0 + 0) || undefined;
      const ans = await p.evaluate(() => document.body.innerText);
      bot.citesArticle = /第?\d+条/.test(ans);
      bot.disclaimer = /参考|目安|専門家|正確/.test(ans);
      await p.screenshot({ path: `${outDir}/chatbot-answer.mobile.png` });
    }
    log("chatbot-mobile", bot);
    await p.close();
  }

  // ---- 8) 保護具ファインダー(モバイル) 流れ ----
  {
    const p = await mob.newPage();
    await p.goto(BASE + "/equipment-finder", { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(3000);
    const ef = await p.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const btns = [...document.querySelectorAll("button")].filter(vis).map((b) => (b.textContent || "").trim().slice(0, 16));
      return { buttons: btns.slice(0, 25), count: btns.length };
    });
    log("equipment-finder-mobile", ef);
    await p.screenshot({ path: `${outDir}/equipment-finder.mobile.png` });
    await p.close();
  }

  // ---- 9) デスクトップのコンテンツ幅実測(横間延びチェック) ----
  {
    const p = await desk.newPage();
    for (const path of ["/", "/laws", "/whats-new", "/court-cases"]) {
      await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(2500);
      const w = await p.evaluate(() => {
        const main = document.querySelector("main") || document.body;
        const inner = main.firstElementChild ? main.firstElementChild.getBoundingClientRect().width : main.getBoundingClientRect().width;
        return Math.round(inner);
      });
      log("desktop-content-width", { path, innerWidth: w });
    }
    await p.close();
  }

  await browser.close();
  console.log("INTERACT DONE");
})();
