import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Control the browser's stream boundary; no model, credentials or provider requests.
async function prepare(page: Page) {
  await page.route("https://**/*", route => route.abort());
  await page.addInitScript(() => {
    const send = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input) !== "/api/chatbot/stream") return send(input, init);
      const encoder = new TextEncoder();
      return new Response(new ReadableStream({ start(controller) {
        Object.assign(window, {
          mascotText: () => controller.enqueue(encoder.encode('event: text\ndata: {"chunk":"確認する条件を整理します。","provisional":true}\n\n')),
          mascotDone: () => {
            controller.enqueue(encoder.encode('event: meta\ndata: {"answer":"確認する条件を整理します。","sources":[]}\n\n'));
            controller.close();
          },
          mascotFail: () => controller.error(new Error("fixture failure")),
        });
        init?.signal?.addEventListener("abort", () => controller.error(new DOMException("Stopped", "AbortError")));
      } }), { headers: { "Content-Type": "text/event-stream" } });
    };
  });
  await page.goto("/chatbot");
  await page.getByRole("textbox", { name: "質問入力" }).fill("作業前に確認する条件を整理したい");
}

async function control(page: Page, action: "mascotText" | "mascotDone" | "mascotFail") {
  await page.evaluate(name => (window as unknown as Record<string, () => void>)[name](), action);
}

for (const reduced of [false, true]) test(`three mascot states, immediate text and stable composer; reduced=${reduced}`, async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await prepare(page);
  await page.getByRole("button", { name: "送信", exact: true }).evaluate(button => {
    let start = 0;
    button.addEventListener("click", () => { start = performance.now(); }, { once: true, capture: true });
    const observer = new MutationObserver(() => {
      const img = document.querySelector<HTMLImageElement>('[data-chat-mascot="thinking"] img');
      if (!start || !img) return;
      observer.disconnect();
      void img.decode().then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        Object.assign(window, { mascotPaintMs: performance.now() - start });
      })));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "送信", exact: true }).click();
  const composer = page.locator("[data-chatbot-composer]");
  const initial = await composer.boundingBox();
  const directory = process.env.ANZ_MASCOT_CAPTURE_DIR;
  for (const phase of ["thinking", "researching", "idea"]) {
    if (phase === "idea") await control(page, "mascotText");
    const mascot = page.locator(`[data-chat-mascot="${phase}"]`);
    await expect(mascot).toBeVisible();
    await expect.poll(() => mascot.locator("img").evaluate(img => (img as HTMLImageElement).currentSrc)).toContain(`chat-${phase}${reduced ? "-still" : ""}.webp`);
    const rect = await mascot.locator("img").boundingBox();
    expect(rect!.width).toBe(144);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect((await composer.boundingBox())!.y).toBe(initial!.y);
    if (phase === "idea") await expect(page.getByText("確認する条件を整理します。", { exact: true })).toBeVisible();
    if (directory) {
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `web-${info.project.name}-${reduced ? "still" : "motion"}-${phase}.png`), scale: "css" });
    }
  }
  const paintMs = await page.evaluate(() => (window as unknown as { mascotPaintMs: number }).mascotPaintMs);
  expect(paintMs).toBeLessThan(300);
  await control(page, "mascotDone");
  await expect(page.locator("[data-chat-mascot]")).toHaveCount(0);
  if (directory) await writeFile(path.join(directory, `web-${info.project.name}-${reduced ? "still" : "motion"}-timing.json`), JSON.stringify({ paintMs, composer: initial }, null, 2));
});

for (const ending of ["fast", "cancel", "fail", "clear"]) test(`mascot lifecycle: ${ending}`, async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: "送信", exact: true }).click();
  await expect(page.locator('[data-chat-mascot="thinking"]')).toBeVisible();
  if (ending === "fast") {
    await control(page, "mascotText");
    await control(page, "mascotDone");
    await expect(page.locator('[data-chat-mascot="idea"]')).toBeVisible();
    await expect(page.getByText("確認する条件を整理します。", { exact: true })).toBeVisible();
  } else if (ending === "cancel") await page.getByRole("button", { name: "生成を停止" }).click();
  else if (ending === "clear") await page.getByRole("button", { name: "新しい相談" }).click();
  else await control(page, "mascotFail");
  await expect(page.locator("[data-chat-mascot]")).toHaveCount(0);
  await page.waitForTimeout(2_100);
  await expect(page.locator("[data-chat-mascot]")).toHaveCount(0);
});

test("GIF fallback and reduced-motion PNG fallback decode", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: "送信", exact: true }).click();
  const picture = page.locator("[data-chat-mascot] picture");
  await picture.locator('source[type="image/webp"]').evaluateAll(sources => sources.forEach(source => source.remove()));
  const img = picture.locator("img");
  await expect.poll(() => img.evaluate(img => (img as HTMLImageElement).currentSrc)).toContain("chat-thinking.gif");
  await img.evaluate(img => (img as HTMLImageElement).decode());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => img.evaluate(img => (img as HTMLImageElement).currentSrc)).toContain("chat-thinking-still.png");
  await img.evaluate(img => (img as HTMLImageElement).decode());
  await page.getByRole("button", { name: "生成を停止" }).click();
});
