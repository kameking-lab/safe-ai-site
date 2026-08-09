import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

async function sendQuestion(page: Page, question: string) {
  const answers = page.locator('article[aria-label="安衛法AIの回答"]');
  const before = await answers.count();
  const composer = page.locator("[data-chatbot-composer]");
  await composer.locator("textarea").fill(question);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/chatbot/stream" &&
      response.request().method() === "POST",
  );
  await composer.getByRole("button", { name: "送信" }).click();
  expect((await responsePromise).status()).toBe(200);
  const answer = answers.nth(before);
  await expect(answer.locator("[data-chatbot-structured-answer]")).toBeVisible({
    timeout: 30_000,
  });
  await expect(composer.locator("textarea")).toBeEnabled();
  return answer;
}

test("390pxで電気点検を一回目から答え、開始前点検と特別教育を会話として継続する", async ({
  page,
}) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": "198.51.100.219",
  });
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname !== "/api/chatbot/stream") return;
    requests.push({
      url: request.url(),
      body: (request.postDataJSON() ?? {}) as Record<string, unknown>,
    });
  });

  await page.goto("/chatbot", { waitUntil: "domcontentloaded" });
  const broad = await sendQuestion(
    page,
    "電気の点検する時に必要な資格ある？",
  );
  const broadText = await broad.innerText();
  expect(broadText).toMatch(/盤の外.*一律の国家資格が必要とは限りません/u);
  expect(broadText).toMatch(/盤を開け.*測定/u);
  expect(broadText).toMatch(/電気工事士.*特別教育/u);
  expect(broadText).toMatch(/電気主任技術者.*保安監督/u);
  expect(broadText).not.toMatch(/酸欠|有機溶剤|石綿|玉掛け/u);
  await expect(broad.locator("[data-chatbot-quick-reply]")).toHaveText([
    "見るだけ",
    "盤を開けて測定",
    "配線・充電部を扱う",
  ]);
  await expect(broad.locator("[data-chatbot-source-details]")).toContainText(
    /^根拠 \d+件/u,
  );
  await expect(broad).toContainText("質問の意図に合っていましたか？");

  await broad.getByRole("button", { name: "違う" }).click();
  await expect(broad).toContainText("知りたい点をもう少し教えてください");
  await expect(broad.locator("[data-chatbot-quick-reply]")).toHaveCount(0);
  await expect(page.locator("[data-chatbot-composer] textarea")).toBeFocused();

  const startCheck = await sendQuestion(page, "作業開始前点検");
  const startText = await startCheck.innerText();
  expect(startText).toMatch(/資格名ではなく.*手順|資格名ではなく.*時点/u);
  expect(startText).toMatch(/盤を開けて充電中/u);
  expect(startText).not.toMatch(/定期自主検査|性能検査|酸欠|有機溶剤|石綿/u);

  await page.getByRole("button", { name: "新しい相談" }).click();
  const education = await sendQuestion(
    page,
    "電気作業の特別教育について教えて",
  );
  const educationText = await education.innerText();
  expect(educationText).toMatch(/国家資格の免状ではありません/u);
  expect(educationText).toMatch(/高圧・特別高圧.*敷設・点検・修理・操作/u);
  expect(educationText).toMatch(/低圧.*敷設・修理.*露出充電部/u);

  expect(requests).toHaveLength(3);
  expect(requests.every(({ body }) => !("history" in body))).toBe(true);
  expect(requests[1]?.body.context).toMatchObject({
    topicDomain: "electrical",
  });
  expect(requests.every(({ url }) => !url.includes("%E9%9B%BB%E6%B0%97"))).toBe(
    true,
  );
  const storageDump = await page.evaluate(() =>
    [localStorage, sessionStorage]
      .flatMap((storage) =>
        Array.from({ length: storage.length }, (_, index) => {
          const key = storage.key(index);
          return `${key}:${key ? storage.getItem(key) : ""}`;
        }),
      )
      .join("\n"),
  );
  expect(storageDump).not.toContain("電気の点検する時に必要な資格ある？");

  const composer = page.locator("[data-chatbot-composer]");
  const composerBox = await composer.boundingBox();
  expect(composerBox).not.toBeNull();
  expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(390);
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
  const floatingOverlap = await page.evaluate(() => {
    const frame = document.querySelector(
      "[data-chatbot-composer] > div",
    )?.getBoundingClientRect();
    const navigation = document
      .querySelector('[data-mobile-nav="bottom"]')
      ?.getBoundingClientRect();
    const cookieControl = [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Cookie設定")
      ?.getBoundingClientRect();
    const overlaps = (target?: DOMRect, overlay?: DOMRect) =>
      Boolean(
        target &&
          overlay &&
          target.width > 0 &&
          target.height > 0 &&
          overlay.width > 0 &&
          overlay.height > 0 &&
          target.left < overlay.right &&
          target.right > overlay.left &&
          target.top < overlay.bottom &&
          target.bottom > overlay.top,
      );
    return {
      bottomNavigation: overlaps(frame, navigation),
      cookieControl: overlaps(frame, cookieControl),
    };
  });
  expect(floatingOverlap).toEqual({
    bottomNavigation: false,
    cookieControl: false,
  });
});
