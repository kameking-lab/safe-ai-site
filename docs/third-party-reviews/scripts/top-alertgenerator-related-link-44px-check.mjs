import { chromium } from "playwright";

const BASE = "http://localhost:3101";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  const results = [];

  // AlertGenerator「注意喚起文を作成」ボタン（3柱すべて）
  const genButtons = await page.getByRole("button", { name: "注意喚起文を作成" }).all();
  for (let i = 0; i < genButtons.length; i++) {
    const box = await genButtons[i].boundingBox();
    results.push([`注意喚起文を作成[${i}]`, box]);
  }

  // 10年事故DB一覧へ
  const dbLink = page.getByText("10年事故DB一覧へ →");
  results.push(["10年事故DB一覧へ", await dbLink.boundingBox()]);

  // 出典・報道URLを開く
  const sourceLink = page.getByText("出典・報道URLを開く");
  if (await sourceLink.count() > 0) {
    results.push(["出典・報道URLを開く", await sourceLink.boundingBox()]);
  }

  let allPass = true;
  for (const [label, box] of results) {
    const h = box ? box.height : null;
    const pass = h !== null && h >= 44;
    if (!pass) allPass = false;
    console.log(`${pass ? "PASS" : "FAIL"} ${label}: height=${h}`);
  }

  console.log(allPass ? "\nALL PASS" : "\nSOME FAILED");
  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
