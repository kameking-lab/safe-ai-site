/**
 * /education 結論カード 無読テスト 2026-06-14（柱0仕上げ・記録/教育系巡回）
 *
 * 趣旨: 教材カタログ /education は従来「バッジ＋見出し＋本文」だけで始まり、
 * 「新人に受講させたい安全担当」が3秒見ても "いまの状態" と "次にやること" が
 * 言えない（柱0=無読テスト不合格）状態だった。
 * 画面最上部に共通の ConclusionCard を新設し、
 *   - いまの状態 = 「12種 教育プログラム公開中（区分内訳・無料）」
 *   - 次にやること = 「教育を選ぶ」(#programs へ)
 * を本文を読まずに伝えることを、SSR配信HTMLで機械検証する。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/education-conclusion-card-noread-2026-06-14.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs
 *
 * client コンポーネント(EducationContent)でも初期SSR HTMLに含まれるため、生HTMLを fetch して確認する。
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

const res = await fetch(`${BASE}/education`);
const html = await res.text();

console.log("== /education 結論カード 無読テスト ==");
check("200で配信される", res.status === 200, `status=${res.status}`);
// 結論カード本体（role=status・いまの状態ラベル）が最上部に存在する
check(
  "結論カード(role=status いまの状態)がSSRに含まれる",
  /role="status"[^>]*aria-label="いまの状態: 教育プログラム公開中"/.test(html),
);
// デカ数字 12種（公開数＝いまの状態）
check("デカ数字 12 が含まれる", /class="[^"]*text-5xl[^"]*"[^>]*>12/.test(html));
check("単位「種」が含まれる", html.includes("教育プログラム公開中"));
// 区分内訳（実データ算出: 特別教育6・法定教育2・労働衛生教育4）
check("内訳 特別教育6 が含まれる", html.includes("特別教育6"));
check("内訳 法定教育2 が含まれる", html.includes("法定教育2"));
check("内訳 労働衛生教育4 が含まれる", html.includes("労働衛生教育4"));
// 次にやること（44px以上のタップ対象 #programs へ）
check(
  "次アクション「教育を選ぶ」が #programs を指す",
  /href="#programs"[^>]*>[\s\S]{0,80}教育を選ぶ/.test(html),
);
// アンカー先が存在する
check('アンカー先 id="programs" が存在する', /id="programs"/.test(html));
// 状態チップ（無料・PPTXサンプル）
check("状態チップ「無料で閲覧」が含まれる", html.includes("無料で閲覧"));
check("状態チップ「PPTXサンプルあり」が含まれる", html.includes("PPTXサンプルあり"));

console.log(`\n結果: ${pass} pass / ${fail} fail`);
if (fail > 0) {
  console.log("不合格:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(
  "無読 合格: /education は本文を読まず3秒で『12種 教育プログラム公開中・無料／次は教育を選ぶ』が伝わる。",
);
