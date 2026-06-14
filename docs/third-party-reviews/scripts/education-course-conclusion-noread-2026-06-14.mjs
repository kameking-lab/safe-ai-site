/**
 * 教育コース詳細（特別教育/法定教育/労働衛生教育 全12ページ）結論カード 無読テスト 2026-06-14
 *
 * 趣旨: /education/tokubetsu/*・/roudoueisei/*・/hoteikyoiku/* の12ページは
 * 「区分・根拠・時間」の小チップ＋見出し＋本文で始まり、最重要の次操作
 * （サンプル資料ダウンロード）は本文下部に埋もれていた＝「初めて開く安全担当」が
 * 3秒見ても "次にやること" を言えない（柱0=無読不合格）。
 * 各ページ最上部に共通 ConclusionCard(CourseConclusion) を新設し、
 *   - いまの状態 = 区分（特別教育/法定教育/労働衛生教育）＋時間チップ
 *   - 次にやること = 「サンプル資料を見る」(#course-sample へ)
 * を本文を読まず読めること、かつ旧ヘッダーの重複チップ列が撤去されたことを
 * SSR配信HTMLで機械検証する。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル（PORT 指定可）
 *   cp docs/third-party-reviews/scripts/education-course-conclusion-noread-2026-06-14.mjs web/tmp-noread.mjs
 *   cd web && BASE_URL=http://localhost:3000 node tmp-noread.mjs && rm tmp-noread.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : detail ? ` — ${detail}` : ""}`);
}

// [path, 区分ラベル, 時間チップ]
const PAGES = [
  ["/education/tokubetsu/fullharness", "特別教育", "約6時間"],
  ["/education/tokubetsu/ashiba", "特別教育", "約6時間以上"],
  ["/education/tokubetsu/kensaku-toishi", "特別教育", "約4時間（学科2h+実技2h）"],
  ["/education/tokubetsu/sankesu", "特別教育", "約5.5時間"],
  ["/education/tokubetsu/tamakake", "特別教育", "約9時間"],
  ["/education/tokubetsu/teiatsu-denki", "特別教育", "約7時間（活線作業時14時間）"],
  ["/education/hoteikyoiku/chemical-ra", "法定教育", "約2.5〜4時間"],
  ["/education/hoteikyoiku/shokucho", "法定教育", "12時間以上（2日間想定）"],
  ["/education/roudoueisei/necchu", "労働衛生教育", "約1.5時間"],
  ["/education/roudoueisei/shindou", "労働衛生教育", "約2時間"],
  ["/education/roudoueisei/souon", "労働衛生教育", "約1.5時間"],
  ["/education/roudoueisei/youtsu-yobou", "労働衛生教育", "2時間以上"],
];

console.log("== 教育コース詳細12ページ 結論カード 無読テスト ==");

for (const [path, kindLabel, duration] of PAGES) {
  console.log(`\n-- ${path} (${kindLabel}) --`);
  const res = await fetch(`${BASE}${path}`);
  const html = await res.text();
  check(`${path} 200配信`, res.status === 200, `status=${res.status}`);

  // 結論カード本体（role=status・いまの状態=区分ラベル）が最上部に存在
  check(
    `結論カード(role=status いまの状態: ${kindLabel})がSSRに含まれる`,
    new RegExp(`role="status"[^>]*aria-label="いまの状態: ${kindLabel}"`).test(html),
  );
  // 時間チップ（3秒で読める規模）
  check(`時間チップ「${duration}」が含まれる`, html.includes(duration));
  // 次にやること = サンプル資料を見る（#course-sample へ・44px担保は部品側）
  check(
    "次アクション「サンプル資料を見る」が #course-sample を指す",
    /href="#course-sample"[^>]*>[\s\S]{0,120}サンプル資料を見る/.test(html),
  );
  // アンカー先（サンプル資料ダウンロード節）が存在
  check('アンカー先 id="course-sample" が存在する', /id="course-sample"/.test(html));
  // 旧ヘッダーの重複チップ列が撤去されている（区分・時間が二重に出ない）
  check(
    "旧ヘッダーの重複チップ列(flex flex-wrap gap-2 mb-3)が撤去済み",
    !html.includes('flex flex-wrap gap-2 mb-3'),
  );
}

console.log(`\n== 結果: ${pass} PASS / ${fail} FAIL ==`);
if (fail > 0) {
  console.log("FAILURES:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}
