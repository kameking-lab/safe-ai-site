import { expect, test, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.setTimeout(90_000);

type LegalPayload = {
  substantiveAnswer: string;
  sources: Array<{ law: string; article: string }>;
  context: Record<string, unknown>;
  effectiveDateStatus: { status: string; asOf: string };
};

async function ask(request: APIRequestContext, mode: "json" | "sse", message: string, correction = false) {
  const response = await request.post(mode === "json" ? "/api/chatbot" : "/api/chatbot/stream", {
    data: {
      message, privacyConfirmed: true,
      ...(correction ? {
        context: { topicDomain: "electrical", equipment: "電気盤", voltageClass: "低圧", confirmedChoices: ["盤外から見る"] },
        history: [{ role: "assistant", content: "低圧設備の盤外から見る作業ですか？" }],
      } : {}),
    },
  });
  expect(response.status()).toBe(200);
  const raw = await response.text();
  if (mode === "json") return JSON.parse(raw) as LegalPayload;
  const encoded = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)].at(-1)?.[1];
  expect(encoded).toBeTruthy();
  return JSON.parse(encoded!) as LegalPayload;
}

test("回転刃物4表現の新規・訂正は両HTTP経路で111条に到達する", async ({ request }, testInfo) => {
  test.setTimeout(120_000);
  const evidence = [];
  for (const mode of ["json", "sse"] as const) {
    for (const message of [
      "ボール盤で穴あけするとき、軍手を使ってよいですか？",
      "回転するドリルで穴を開ける時に軍手を着けてよいですか？",
      "電気の配線ではなく、ボール盤の回転刃への軍手の巻き込まれについて聞いています",
      "ボール盤の感電ではなく、回転刃に軍手が巻き込まれる危険を聞いています",
    ]) {
      for (const correction of [false, true]) {
        const payload = await ask(request, mode, message, correction);
        expect(payload.substantiveAnswer).toMatch(/巻き込まれるおそれ/);
        expect(payload.substantiveAnswer).toMatch(/手袋を使ってはいけません/);
        expect(payload.substantiveAnswer).not.toMatch(/低圧|電気工事士|盤外/);
        expect(payload.sources.some((source) => /^第111条(?:「|$)/.test(source.article))).toBe(true);
        expect(payload.context.voltageClass).toBeUndefined();
        expect(payload.effectiveDateStatus.asOf).toBeTruthy();
        evidence.push({ mode, message, correction, payload });
      }
    }
  }
  await testInfo.attach("回転刃物HTTP16ケース", { body: JSON.stringify(evidence), contentType: "application/json" });
});

test("フォークリフト1トン境界は両HTTP経路で教育・根拠・基準日が揃う", async ({ request }, testInfo) => {
  const evidence = [];
  for (const mode of ["json", "sse"] as const) {
    for (const tonnes of [0.8, 1]) {
      const payload = await ask(request, mode, `最大荷重${tonnes}トンのフォークリフトに必要な教育は？`);
      expect(payload.substantiveAnswer).toContain(tonnes < 1 ? "特別教育" : "技能講習");
      for (const article of tonnes < 1 ? ["第59条", "第36条"] : ["第61条", "第20条"]) {
        expect(payload.sources.some((source) => source.article === article || source.article.startsWith(`${article}「`) || source.article.startsWith(`${article}第`))).toBe(true);
      }
      expect(payload.effectiveDateStatus).toMatchObject({ status: "current" });
      expect(payload.effectiveDateStatus.asOf).toBeTruthy();
      evidence.push({ mode, tonnes, payload });
    }
  }
  await testInfo.attach("フォークリフトHTTP4ケース", { body: JSON.stringify(evidence), contentType: "application/json" });
});

test("10月の2改正は対象条件・行動・一次資料を持ち、未記録の改正に空見出しがない", async ({ page }) => {
  for (const lawId of ["347M50002000032", "347AC0000000057"]) {
    await page.goto("/laws");
    const card = page.locator(`#rev-lr-egov-${lawId}-20261001`);
    await expect.poll(async () => {
      if (await card.count() > 0) return true;
      const more = page.getByRole("button", { name: /^もっと見る/ });
      if (await more.isVisible()) await more.click();
      return await card.count() > 0;
    }, { timeout: 20_000 }).toBe(true);
    await card.scrollIntoViewIfNeeded();
    await card.locator("summary").click();
    await card.getByRole("button", { name: "収録要点を見る", exact: true }).click();
    const summary = page.getByRole("region", { name: "収録要点", exact: true });
    await expect(summary).toContainText("個人ばく露測定");
    await expect(summary).toContainText("全事業場・全化学物質に");
    await expect(summary).toContainText("手順書");
    await expect(summary.locator('a[href*="001736054.pdf"]')).toBeVisible();
    await expect(summary.locator('a[href*="20260401_"]').first()).toBeVisible();
  }
  await page.goto("/laws");
  const unrecorded = page.locator("#rev-lr-egov-347M50002000036-20261001");
  await unrecorded.scrollIntoViewIfNeeded();
  await unrecorded.locator("summary").click();
  await unrecorded.getByRole("button", { name: "収録要点を見る", exact: true }).click();
  const summary = page.getByRole("region", { name: "収録要点", exact: true });
  await expect(summary).toContainText("解説は未収録");
  await expect(summary.getByRole("heading", { name: "現場でやること", exact: true })).toHaveCount(0);
  await expect(summary.getByRole("heading", { name: "対象業種", exact: true })).toHaveCount(0);
});

test("旧RAは条件を復元した原本とせず、印刷でも不足を表示する", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("safe-ai:chemical-ra-records:v1", JSON.stringify([{
    raId: "quality-legacy", cas: "108-88-3", substance: "トルエン", workContent: "旧作業メモ", exposureBand: "",
    savedAt: "2026-07-24T03:04:05.000Z", syncState: "saved-locally",
    payload: { chemicalName: "トルエン", casNumber: "108-88-3", ghsHazards: [], ppeRecommendations: [], safetyMeasures: [], emergencyMeasures: [], regulatoryNotes: [], assessmentStatus: "unavailable", aiStatus: "disabled_for_safety" },
  }])));
  await page.goto("/chemical-ra?raId=quality-legacy");
  await expect(page.getByText("旧形式のため、保存時の評価条件を復元できません", { exact: true })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const report = page.getByTestId("chemical-ra-print-report");
  await expect(report).toContainText("保存時の作業条件を復元できません");
  await expect(report).toContainText("作業時間・換気・数量・SDS・測定値を再確認");
  await expect(report).toContainText("正式なRA結果ではありません");
});

test("建設で使う2物質の詳細も収録範囲・版・製品SDS・同じCASの原典を示す", async ({ page }) => {
  for (const cas of ["108-88-3", "67-64-1"]) {
    await page.goto(`/chemical-database/${cas}`);
    await expect(page.getByText("引火性液体", { exact: true })).toBeVisible();
    await expect(page.getByText(/GHS分類は一部収録です/)).toBeVisible();
    await expect(page.getByText(/収録データ版:.*分類原典の取得日時は未収録/)).toBeVisible();
    const source = page.getByRole("link", { name: "このCASのNITE政府版GHS原典を確認", exact: true });
    await expect(source).toHaveAttribute("href", `https://www.chem-info.nite.go.jp/chem/ghs/m-nite-${cas}.html`);
    await expect(page.getByRole("link", { name: "RAを準備", exact: true })).toHaveAttribute("href", `/chemical-ra?cas=${cas}`);
  }
});

test("速報とは別の過去2事例は原典・不明点・現場条件を持ち、墜落を感電としない", async ({ page }) => {
  await page.goto("/accident-news");
  for (const id of ["100003", "100005"]) {
    const card = page.locator(`[data-verified-case="${id}"]`);
    await card.locator("summary").click();
    await expect(card).toContainText("発生日は個票に記載されていません");
    await expect(card).toContainText("自社で先に確認する条件");
    await expect(card.getByRole("link", { name: `厚労省 個票No.${id}で確認`, exact: true })).toHaveAttribute("href", `https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=${id}`);
  }
  await expect(page.locator('[data-verified-case="100005"]')).toContainText("事故型は墜落・転落");
  // 既存個票の人手確認whitelistは今回の機械照合で拡張しない。
  expect((await page.goto("/accidents/mhlw-100005"))?.status()).toBe(404);
});

test("コンクリートの入力・結果・CSV・印刷が一致し積載量0で旧結果を消す", async ({ page }, testInfo) => {
  await page.goto("/tools/construction-calculators/concrete-quantity");
  await page.locator("#construction-calculator-dimensionUnit").selectOption("m");
  for (const [key, value] of Object.entries({ length: "10", width: "5", height: "0.2", quantity: "1", lossPercent: "5", truckCapacityM3: "4.5" })) {
    await page.locator(`#construction-calculator-${key}`).fill(value);
  }
  await page.getByRole("button", { name: "計算する", exact: true }).click();
  const results = page.locator("#calculation-result-title + dl");
  for (const value of ["10m³", "10.5m³", "3台", "1.5m³"]) await expect(results).toContainText(value);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const download = await downloadPromise;
  const csvPath = testInfo.outputPath("concrete.csv");
  await download.saveAs(csvPath);
  const csv = await readFile(csvPath, "utf8");
  for (const value of ["ロス込み体積", "10.5", "生コン車台数", "3", "最終車の数量", "1.5", "4.5", "高さ・厚さ"]) expect(csv).toContain(value);
  expect(csv).not.toMatch(/NaN|直径/);
  await page.emulateMedia({ media: "print" });
  const print = page.locator(".construction-calculator-print");
  await expect(print).toBeVisible();
  for (const value of ["10.5", "1.5", "4.5", "0.2", "5%"]) await expect(print).toContainText(value);
  const pdfPath = testInfo.outputPath("concrete.pdf");
  await page.pdf({ path: pdfPath, format: "A4", printBackground: false });
  await testInfo.attach("コンクリートCSV", { path: csvPath, contentType: "text/csv" });
  await testInfo.attach("コンクリートA4", { path: pdfPath, contentType: "application/pdf" });
  await page.emulateMedia({ media: "screen" });
  await page.locator("#construction-calculator-truckCapacityM3").fill("0");
  await page.getByRole("button", { name: "計算する", exact: true }).click();
  await expect(page.locator("#calculation-result-title")).toHaveCount(0);
  await expect(page.locator(".construction-calculator-print")).toHaveCount(0);
  await expect(page.getByRole("alert", { name: "計算できません" })).toBeVisible();
});

test("375pxの主要4導線に横あふれがなく相談の送信は行わない", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let outbound = 0;
  await page.route("**/api/inquiry", async (route) => { outbound += 1; await route.abort(); });
  for (const path of ["/chatbot", "/chemical-ra", "/laws", "/contact"]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (path === "/chatbot") {
      const composer = await page.locator("[data-chatbot-composer]").boundingBox();
      expect(composer).not.toBeNull();
      expect(composer!.x + composer!.width).toBeLessThanOrEqual(375);
    }
    if (path === "/contact") {
      await page.getByRole("tab", { name: "法人・コンサルのご相談", exact: true }).click();
      await expect(page.getByRole("main").locator('a[href*="/services/automation"]').first()).toBeVisible();
    }
    await testInfo.attach(`375px-${path.slice(1)}`, { body: await page.screenshot(), contentType: "image/png" });
  }
  expect(outbound).toBe(0);
});
