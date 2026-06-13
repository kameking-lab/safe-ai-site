/**
 * /ky/morning 固有メタSSR化 検証 2026-06-14（柱C-4・自班route分）
 *
 * 趣旨: 朝礼サイネージ /ky/morning は client コンポーネント(KyMorningSignage)だが、
 * 固有メタ(title/description/canonical/openGraph/twitter)が **SSR段階の配信HTML** に
 * 含まれていること＝クライアント注入でなくサーバーで確定していることを機械検証する。
 * 兄弟ページ(/ky/paper・/ky/workers)と揃え、LINE等での共有プレビューが成立する状態を担保。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start  # 別ターミナル
 *   cp docs/third-party-reviews/scripts/ky-morning-meta-ssr-2026-06-14.mjs web/tmp-meta.mjs
 *   cd web && node tmp-meta.mjs && rm tmp-meta.mjs
 *
 * JS無効でも成立する検証なので、生の配信HTMLを fetch して文字列で確認する。
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const res = await fetch(`${BASE}/ky/morning`, { headers: { "user-agent": "facebookexternalhit/1.1" } });
const html = await res.text();

console.log("== /ky/morning SSR メタ検証 ==");
check("200で配信される", res.status === 200, `status=${res.status}`);
check("<title> が SSR に含まれる", /<title>[^<]*KY[^<]*朝礼[^<]*<\/title>/.test(html));
check("meta description が SSR に含まれる", /<meta[^>]+name="description"[^>]+content="[^"]*サイネージ/.test(html));
check("canonical が /ky/morning", /<link[^>]+rel="canonical"[^>]+href="[^"]*\/ky\/morning"/.test(html));
check("og:title が SSR に含まれる", /<meta[^>]+property="og:title"[^>]+content="[^"]*KY[^"]*朝礼/.test(html));
check("og:description が SSR に含まれる", /<meta[^>]+property="og:description"/.test(html));
check("og:image が /api/og を指す", /<meta[^>]+property="og:image"[^>]+content="[^"]*\/api\/og/.test(html));
check("twitter:card = summary_large_image", /<meta[^>]+name="twitter:card"[^>]+content="summary_large_image"/.test(html));

console.log(`\n結果: ${pass} pass / ${fail} fail`);
if (fail > 0) {
  console.log("不合格:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("無読/SSRメタ 合格: /ky/morning は共有時に状態と内容が即伝わる固有メタを SSR で備える。");
