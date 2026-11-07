import { expect, test } from "@playwright/test";
import { assertNoJsAccidentNews } from "./support/nojs-accident-news";

test.use({ javaScriptEnabled: false });

const emptyMessage = "14日以内の国内労災報道を確認できませんでした。0件・事故なしとは判定しません。";
const unavailableMessage = "報道RSSを取得できませんでした。0件・事故なしとは判定せず、厚労省速報集計を表示します。";
const safeFallback = "取得できない状態を「事故なし」とは表示していません。時間をおいて再確認するか、下の死亡事故データベース・公式統計を確認してください。";

// /accident-newsの現在のSSR構造に対応するテスト専用HTML。外部データを改変しない。
function fixture(message: string, count: number, content: string): string {
  return `<main><h1>国内の死亡事故速報</h1>
    <section aria-labelledby="latest-report-heading">
      <div><h2 id="latest-report-heading">直近の報道</h2>${count ? "" : `<p>${message}</p>`}<span>掲載 ${count}記事</span></div>
      ${count ? `<div><p>報道・内容未確認。公表日時は記事の掲載日時であり、事故発生日ではありません。発生経緯・原因・法的評価は一次資料で未確認です。</p><p>掲載件数は報道記事の数です。同じ事故の続報を含む場合があり、全国の事故発生件数ではありません。</p></div>` : ""}
      ${content}
    </section></main>`;
}

const report = `<li data-accident-origin="reported-unverified">
  <p>記事公表 <time datetime="2026-10-13T01:00:00.000Z">2026/10/13 10:00</time> JST</p>
  <h3><a href="https://example.invalid/report">テスト用の報道見出し</a></h3>
  <p>報道媒体：テスト媒体</p><div><a href="https://example.invalid/report">元記事で確認する</a></div>
</li>`;

test("no-JS: 記事ありでは共通注意と各カードの日時・媒体・元記事を検証する", async ({ page }) => {
  await page.setContent(fixture("公表日時順。報道見出しであり、行政・捜査機関による事故確定情報ではありません。", 1,
    `<ol data-accident-news-results data-result-count="1">${report}</ol>`));
  await expect(assertNoJsAccidentNews(page)).resolves.toEqual({ state: "reports", recordedArticles: 1 });
});

for (const [label, message] of [["直近記事未確認", emptyMessage], ["RSS取得不能", unavailableMessage]] as const) {
  test(`no-JS: ${label}では安全な代替表示を厳格に検証する`, async ({ page }) => {
    await page.setContent(fixture(message, 0, `<div role="status">${safeFallback}</div>`));
    await expect(assertNoJsAccidentNews(page)).resolves.toEqual({ state: "fallback", recordedArticles: 0 });
  });
}

test("no-JS: 記事件数と実際の一覧件数が違えば拒否する", async ({ page }) => {
  await page.setContent(fixture("公表日時順。", 2,
    `<ol data-accident-news-results data-result-count="2">${report}</ol>`));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow();
});

test("no-JS: 公表日時と発生日の区別が欠けた共通注意を拒否する", async ({ page }) => {
  await page.setContent(fixture("公表日時順。", 1,
    `<ol data-accident-news-results data-result-count="1">${report}</ol>`)
    .replace("公表日時は記事の掲載日時であり、事故発生日ではありません。", ""));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow();
});

test("no-JS: カードから媒体または元記事確認が欠ければ拒否する", async ({ page }) => {
  const content = `<ol data-accident-news-results data-result-count="1">${report.replace("報道媒体：テスト媒体", "媒体不明")}</ol>`;
  await page.setContent(fixture("公表日時順。", 1, content));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow();

  await page.setContent(fixture("公表日時順。", 1,
    `<ol data-accident-news-results data-result-count="1">${report.replace("元記事で確認する", "詳細")}</ol>`));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow();
});

test("no-JS: 取得不能を事故なしと表示する不正な代替本文を拒否する", async ({ page }) => {
  await page.setContent(fixture(unavailableMessage, 0, '<div role="status">事故なしです。</div>'));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow();
});

test("no-JS: 結果も代替表示もない状態を有限時間で拒否する", async ({ page }) => {
  await page.setContent(fixture(emptyMessage, 0, ""));
  await expect(assertNoJsAccidentNews(page, { timeoutMs: 200 })).rejects.toThrow(/Timeout 200ms exceeded/);
});
