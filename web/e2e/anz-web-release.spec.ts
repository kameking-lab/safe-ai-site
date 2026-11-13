import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

const evidenceDir = resolve(process.cwd(), "../research/anz-web-release");
const layouts = [
  { name: "pc", width: 1440, height: 1000 },
  { name: "iphone", width: 390, height: 844 },
];

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const layout of layouts) {
  test(`${layout.name}: トルエン液体の対象外入力と結果`, async ({ page }) => {
    mkdirSync(evidenceDir, { recursive: true });
    await page.setViewportSize(layout);
    await page.goto("/chemical-ra?cas=108-88-3");
    await expect(page.getByRole("list", { name: "判定する物質" })).toContainText("トルエン");
    const state = page.getByRole("radiogroup", { name: "製品の状態" });
    await expect(state.getByRole("radio", { name: "粉体", exact: true })).toBeDisabled();
    await state.getByRole("radio", { name: "液体", exact: true }).click();
    await page.getByRole("radiogroup", { name: "1回（1日）に扱う量" }).getByRole("radio", { name: /中量/ }).click();
    await page.getByRole("radiogroup", { name: "換気", exact: true }).getByRole("radio", { name: /窓・換気扇/ }).click();
    await page.getByLabel(/1日の作業時間/).selectOption("8");
    await page.getByLabel("日数", { exact: true }).selectOption("5");
    await expect(page.getByText("いちばん高いリスクレベル")).toBeVisible();
    await expect(page.getByRole("radio", { name: "液体", exact: true })).toBeChecked();
    await noOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(evidenceDir, `chemical-ra-${layout.name}.png`), fullPage: true });
  });

  test(`${layout.name}: 一行表示・逐次受信・文頭と幅`, async ({ page }) => {
    mkdirSync(evidenceDir, { recursive: true });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize(layout);
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      const state = { calls: 0, firstAt: 0, completedAt: 0 };
      Object.assign(window, { anzReleaseMock: state });
      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (new URL(url, location.href).pathname !== "/api/chatbot/stream") return originalFetch(input, init);
        state.calls++;
        const start = performance.now();
        const lead = "作業前に手すりと作業床の状態を確認してください。";
        const rest = "\n\n作業場所と設備の条件を整理し、必要な点検事項を確認してください。".repeat(30);
        const encoder = new TextEncoder();
        const frame = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        const timers: ReturnType<typeof setTimeout>[] = [];
        const stream = new ReadableStream({
          start(controller) {
            timers.push(setTimeout(() => {
              state.firstAt = performance.now() - start;
              controller.enqueue(frame("text", { chunk: lead, provisional: true }));
            }, 40));
            timers.push(setTimeout(() => controller.enqueue(frame("text", { chunk: rest, provisional: true })), 1800));
            timers.push(setTimeout(() => {
              state.completedAt = performance.now() - start;
              controller.enqueue(frame("meta", { answer: lead + rest, directAnswer: lead, sources: [], source_type: "rag", confidence: "low", requiresHumanReview: true }));
              controller.close();
            }, 4000));
          },
          cancel() { timers.forEach(clearTimeout); },
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8" } });
      };
    });
    await page.goto("/chatbot");
    const input = page.getByLabel("質問入力");
    await expect(input).toHaveAttribute("data-chatbot-hydrated", "true");
    // Root hydration recovery can discard the bootstrap class; initialized chat stays usable.
    await page.evaluate(() => document.documentElement.classList.remove("js-enabled"));
    await expect(input).toBeVisible();
    await page.evaluate(() => document.documentElement.classList.add("js-enabled"));
    const note = page.locator("[data-ai-processing-note]");
    await expect(note).toContainText("Google Gemini");
    await expect(note.getByRole("link")).toHaveAttribute("href", "/privacy#external-services");
    expect(await note.evaluate(node => node.getBoundingClientRect().height <= parseFloat(getComputedStyle(node).lineHeight) + 1)).toBe(true);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await page.screenshot({ path: resolve(evidenceDir, `chatbot-initial-${layout.name}.png`) });
    await input.fill("足場の手すりは？");
    await page.getByRole("button", { name: "送信", exact: true }).click();
    const provisional = page.locator("[data-chatbot-provisional]");
    await expect(provisional).toContainText("作業前に手すり");
    const beforeCompletion = await page.evaluate(() => (window as unknown as { anzReleaseMock: { completedAt: number } }).anzReleaseMock.completedAt);
    expect(beforeCompletion).toBe(0);
    await page.screenshot({ path: resolve(evidenceDir, `chatbot-streaming-${layout.name}.png`) });
    // Wait until the long body arrives; the view must remain at its beginning.
    await expect(provisional).toContainText("作業場所と設備の条件");
    const geometry = await page.locator("[data-chatbot-history]").evaluate(node => {
      const answer = node.querySelector<HTMLElement>("[data-chatbot-answer]:last-child")!;
      return { historyTop: node.getBoundingClientRect().top, answerTop: answer.getBoundingClientRect().top, answerWidth: answer.getBoundingClientRect().width, historyWidth: node.clientWidth, scrollTop: node.scrollTop };
    });
    expect(Math.abs(geometry.answerTop - geometry.historyTop)).toBeLessThanOrEqual(5);
    expect(geometry.answerWidth).toBeLessThanOrEqual(geometry.historyWidth);
    await page.getByRole("button", { name: "送信", exact: true }).waitFor({ state: "visible" });
    await expect(provisional).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "AIへの送信確認" })).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: resolve(evidenceDir, `chatbot-complete-${layout.name}.png`) });
    const timing = await page.evaluate(() => (window as unknown as { anzReleaseMock: { calls: number; firstAt: number; completedAt: number } }).anzReleaseMock);
    expect(timing.calls).toBe(1);
    expect(timing.firstAt).toBeLessThan(timing.completedAt);
    expect(errors).toEqual([]);
    writeFileSync(resolve(evidenceDir, `browser-${layout.name}.json`), JSON.stringify({ viewport: layout, timing, geometry, errors }, null, 2) + "\n");
  });
}
