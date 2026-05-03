#!/usr/bin/env node
/**
 * 30日分テストデータ生成スクリプト
 *
 * 生成対象:
 * - 安全衛生日誌: 2026年4月 営業日約22日分（建設業・テスト現場A）
 *   スキーマ: SafetyDiaryEntry (safety-diary-v3)
 *   - 作業バリエーション（鉄筋・コンクリート・足場解体等）
 *   - ヒヤリハット5回、災害1回
 *   - KY実施率85%
 * - KYリスト: 日誌連動（safe-ai:ky-record-list:v1）
 * - 化学物質マイリスト: 5物質（anzen-chemical-mylist-v1）
 * - 会社プロファイル: 建設業・30名・バックホー/クレーン/足場
 *
 * Usage:
 *   node scripts/generate-test-data.mjs        # 22/100/365日分を全て生成
 *   node scripts/generate-test-data.mjs 100    # 100日分のみ
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

// ────────────────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────────────────

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isHoliday(date) {
  const holidays = new Set([
    "2026-01-01", "2026-01-12", "2026-02-11", "2026-02-23",
    "2026-03-20", "2026-04-29", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-23",
    "2026-10-12", "2026-11-03", "2026-11-23", "2026-12-23",
  ]);
  return holidays.has(date);
}

function getDatesForDays(targetDayCount, startYear = 2026, startMonth = 4) {
  const dates = [];
  let year = startYear;
  let month = startMonth;
  let day = 1;

  while (dates.length < targetDayCount) {
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      month++;
      if (month > 12) { month = 1; year++; }
      day = 1;
      continue;
    }
    const dateStr = isoDate(year, month, day);
    const dow = new Date(dateStr).getDay();
    const isSaturday = dow === 6;
    // 建設業: 平日（祝日除く） + 隔週土曜
    const workOnSaturday = isSaturday && (Math.floor((day - 1) / 7) % 2 === 0);
    if ((dow !== 0 && dow !== 6 && !isHoliday(dateStr)) || workOnSaturday) {
      dates.push(dateStr);
    }
    day++;
  }
  return dates;
}

// ────────────────────────────────────────────────────────────
// 建設現場定数
// ────────────────────────────────────────────────────────────

const SITE_NAME = "テスト現場A（RC造5階建集合住宅新築工事）";

/** SafetyDiaryEntry の weather フィールドで使える値のみ */
const WEATHERS = ["晴れ", "晴れ", "晴れ", "曇り", "曇り", "雨", "強風"];

const SUPERVISORS = ["山田太郎", "鈴木次郎", "佐藤健"];

const WORK_PHASES = [
  { works: ["地盤改良工事", "掘削工事", "捨てコン打設", "基礎鉄筋組立工事"] },
  { works: ["1F型枠工事", "1F鉄筋組立工事", "1Fコンクリート打設工事", "コンクリート養生・型枠解体"] },
  { works: ["足場組立工事（2F）", "2F型枠工事", "2F鉄筋組立工事", "2Fコンクリート打設工事"] },
  { works: ["足場組立工事（3F）", "3F鉄筋組立工事", "3Fコンクリート打設工事", "3F型枠解体工事"] },
  { works: ["外壁工事", "内装下地工事", "設備配管工事", "足場解体工事"] },
];

const CONTRACTORS = [
  { name: "株式会社山田工務店", works: ["鉄筋組立", "型枠工事"] },
  { name: "佐藤建設株式会社", works: ["コンクリート打設", "基礎工事"] },
  { name: "高橋鉄筋工業", works: ["鉄筋加工・組立"] },
  { name: "山田型枠工業", works: ["型枠製作・組立・解体"] },
];

const PREDICTED_DISASTERS_BY_WORK = {
  "鉄筋": ["墜落・転落", "飛来・落下", "激突"],
  "コンクリート": ["溺れ・水没", "有害物接触", "飛来・落下"],
  "足場": ["墜落・転落", "飛来・落下", "崩壊・倒壊"],
  "型枠": ["崩壊・倒壊", "激突", "飛来・落下"],
  "掘削": ["崩壊・倒壊", "墜落・転落", "激突"],
  "解体": ["飛来・落下", "崩壊・倒壊", "粉じん"],
  "配管": ["激突", "有害物接触", "切れ・こすれ"],
  "外壁": ["墜落・転落", "飛来・落下", "強風による転倒"],
};

function getPredictedDisasters(workContent) {
  for (const [key, disasters] of Object.entries(PREDICTED_DISASTERS_BY_WORK)) {
    if (workContent.includes(key)) return disasters.slice(0, 2);
  }
  return ["墜落・転落", "飛来・落下"];
}

// ────────────────────────────────────────────────────────────
// ヒヤリハット・災害定義（22日以下のデータに適用）
// ────────────────────────────────────────────────────────────

const NEAR_MISS_EVENTS = [
  { dateIdx: 3,  detail: "【ヒヤリ】鉄筋束吊り上げ中、ワイヤー掛け不完全で鉄筋が30cm落下。作業員への接触なし。対処: 作業停止・手順書見直し。" },
  { dateIdx: 9,  detail: "【ヒヤリ】生コン圧送ホース接続部が緩み生コンが飛散。近隣作業員1名に付着。対処: 全員に保護眼鏡着用徹底。" },
  { dateIdx: 14, detail: "【ヒヤリ】高さ4m作業床でスパナを誤落下。下部に2名いたが声掛けで退避済み。対処: 工具袋常時携行義務化。" },
  { dateIdx: 18, detail: "【ヒヤリ】強風で外壁パネル（約20kg）が倒れかける。周囲に人なし。対処: 資材転倒防止措置（バタ角＋番線固定）実施。" },
  { dateIdx: 21, detail: "【ヒヤリ】足場解体時に踏板がずれ、作業員が約10cm沈み込む。転落には至らず。対処: 解体手順再確認、2人1組作業義務化。" },
];

// dateIdx 16 は労働災害扱い（nearMissOccurred + 重大内容）
const DISASTER_EVENT = {
  dateIdx: 16,
  detail: "【労働災害】作業員が2F足場上でつまずき転倒。左手首打撲・擦過傷、休業4日。救急搬送・労働者死傷病報告提出済み。",
};

// ────────────────────────────────────────────────────────────
// SafetyDiaryEntry 生成
// ────────────────────────────────────────────────────────────

function getWorkContent(dateIdx, totalDays) {
  const phaseLen = Math.ceil(totalDays / WORK_PHASES.length);
  const phaseIdx = Math.min(Math.floor(dateIdx / phaseLen), WORK_PHASES.length - 1);
  const works = WORK_PHASES[phaseIdx].works;
  return works[dateIdx % works.length];
}

function makeEntry(date, dateIdx, totalDays, kyDone) {
  const nearMissEvent = NEAR_MISS_EVENTS.find((e) => e.dateIdx === dateIdx) ?? null;
  const disasterEvent = DISASTER_EVENT.dateIdx === dateIdx ? DISASTER_EVENT : null;
  const nearMissOccurred = !!(nearMissEvent || disasterEvent);
  const nearMissDetail = disasterEvent?.detail ?? nearMissEvent?.detail ?? undefined;

  const workContent = getWorkContent(dateIdx, totalDays);
  const weather = WEATHERS[dateIdx % WEATHERS.length];
  const supervisor = SUPERVISORS[dateIdx % SUPERVISORS.length];
  const plannedPeopleCount = 3 + (dateIdx % 5); // 3〜7名

  // 業者
  const contractorCount = 1 + (dateIdx % 3);
  const contractorWorks = CONTRACTORS.slice(0, contractorCount).map((c) => ({
    name: c.name,
    work: workContent,
  }));

  // 資格
  const requiredQualifications = ["足場の組立て等作業主任者", "玉掛け技能講習修了者"].slice(0, 1 + (dateIdx % 2));

  // KY結果
  const kyResult = kyDone
    ? `本日の作業（${workContent}）における主なリスク: ${getPredictedDisasters(workContent).join("、")}。\n対策: 保護具着用・KY活動実施・安全帯使用徹底。指差呼称: 「${workContent}の安全 よし！」`
    : "";

  const now = new Date(`${date}T08:00:00+09:00`).toISOString();

  return {
    id: randomUUID(),
    industry: "construction",
    required: {
      date,
      weather,
      siteName: SITE_NAME,
      workContent: `${workContent}（担当: ${supervisor}）`,
      kyResult,
      nearMissOccurred,
      ...(nearMissDetail ? { nearMissDetail } : {}),
    },
    optional: {
      contractorWorks,
      requiredQualifications,
      plannedPeopleCount,
      predictedDisasters: getPredictedDisasters(workContent),
      riskAssessment: {
        severity: 2 + (dateIdx % 3),
        likelihood: 1 + (dateIdx % 3),
        summary: `${workContent}に伴う主リスク評価`,
      },
      safetyInstructions: `本日の安全指示: 保護具（ヘルメット・安全帯・保護眼鏡）の着用を徹底すること。${nearMissOccurred ? "ヒヤリハット発生につき特別注意。" : ""}`,
      nextDayPlan: getWorkContent(dateIdx + 1, totalDays),
    },
    weatherAlerts: [],
    similarAccidentIds: [],
    relatedLawRevisionIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ────────────────────────────────────────────────────────────
// KY レコードリスト生成（safe-ai:ky-record-list:v1）
// ────────────────────────────────────────────────────────────

function makeKyRecordList(workDates, kyDaysSet, totalDays) {
  const records = [];
  for (const date of [...workDates].reverse()) {
    if (!kyDaysSet.has(date)) continue;
    const dateIdx = workDates.indexOf(date);
    records.push({
      id: `ky-${date}`,
      workDate: date,
      companyName: "株式会社山田工務店",
      workDetail: getWorkContent(dateIdx, totalDays),
      weather: WEATHERS[dateIdx % WEATHERS.length],
      savedAt: new Date(`${date}T08:00:00+09:00`).toISOString(),
    });
  }
  return records;
}

// ────────────────────────────────────────────────────────────
// 化学物質マイリスト（anzen-chemical-mylist-v1）
// ────────────────────────────────────────────────────────────

const CHEMICAL_MY_LIST = [
  { id: "toluene",      name: "トルエン",             cas: "108-88-3",   categories: ["有機溶剤2種"],                         addedAt: "2026-04-01T09:00:00+09:00" },
  { id: "xylene",       name: "キシレン",             cas: "1330-20-7",  categories: ["有機溶剤2種"],                         addedAt: "2026-04-01T09:05:00+09:00" },
  { id: "formaldehyde", name: "ホルムアルデヒド",     cas: "50-00-0",    categories: ["特化則2類", "リスクアセスメント対象物"], addedAt: "2026-04-05T09:00:00+09:00" },
  { id: "n-hexane",     name: "n-ヘキサン",           cas: "110-54-3",   categories: ["有機溶剤2種", "リスクアセスメント対象物"],addedAt: "2026-04-08T10:00:00+09:00" },
  { id: "cement-dust",  name: "セメント粉じん（水酸化カルシウム）", cas: "1305-62-0", categories: ["粉じん則", "皮膚等障害化学物質等"], addedAt: "2026-04-10T09:30:00+09:00" },
];

// ────────────────────────────────────────────────────────────
// 会社プロファイル（anzen-company-profile-v1）
// ────────────────────────────────────────────────────────────

const COMPANY_PROFILE = {
  name: "株式会社山田工務店",
  industry: "建設業",
  employeeCount: 30,
  address: "東京都港区芝浦1-1-1",
  tel: "03-0000-0000",
  safetyManager: "山田太郎",
  equipments: [
    { type: "バックホウ",       model: "KOMATSU PC200",   count: 2 },
    { type: "クレーン（移動式）",model: "TADANO GR-300N",  count: 1 },
    { type: "足場材（くさび式）",model: "標準セット",        count: 1 },
  ],
  certifications: [
    "建設業許可（国土交通大臣）",
    "足場の組立て等作業主任者選任",
    "移動式クレーン運転士選任",
  ],
  updatedAt: "2026-04-01T08:00:00+09:00",
};

// ────────────────────────────────────────────────────────────
// メイン処理
// ────────────────────────────────────────────────────────────

function generateData(targetWorkDays) {
  const workDates = getDatesForDays(targetWorkDays);
  const totalDays = workDates.length;

  // KY未実施日（15%）を等間隔で設定
  const nonKyCount = Math.round(totalDays * 0.15);
  const kyDaysSet = new Set(workDates);
  const step = Math.floor(totalDays / (nonKyCount + 1));
  for (let i = 0; i < nonKyCount; i++) {
    const idx = step * (i + 1) - 1;
    if (idx < workDates.length) kyDaysSet.delete(workDates[idx]);
  }

  const diary = workDates.map((date, i) => makeEntry(date, i, totalDays, kyDaysSet.has(date)));
  const kyList = makeKyRecordList(workDates, kyDaysSet, totalDays);

  const kyDoneCount = diary.filter((e) => e.required.kyResult.trim().length > 0).length;
  const nearMissCount = diary.filter((e) => e.required.nearMissOccurred).length;

  return {
    diary,
    kyList,
    chemicalMyList: CHEMICAL_MY_LIST,
    companyProfile: COMPANY_PROFILE,
    meta: {
      totalDays,
      kyDoneCount,
      kyRate: Math.round((kyDoneCount / totalDays) * 1000) / 10,
      nearMissCount,
      dateRange: { from: workDates[0], to: workDates[totalDays - 1] },
      generatedAt: new Date().toISOString(),
    },
  };
}

// ────────────────────────────────────────────────────────────
// ブラウザ投入スクリプト生成
// ────────────────────────────────────────────────────────────

function generateLoaderScript(data) {
  const { meta } = data;
  // 月次まとめURLは YYYY-MM 形式
  const fromYm = meta.dateRange.from.slice(0, 7);
  return `// ============================================================
// ANZEN AI テストデータ投入スクリプト
// ブラウザ DevTools > Console に貼り付けて実行してください
//
// 生成日時  : ${meta.generatedAt}
// 期間      : ${meta.dateRange.from} 〜 ${meta.dateRange.to}
// 作業日数  : ${meta.totalDays}日
// KY実施率  : ${meta.kyRate}% (${meta.kyDoneCount}/${meta.totalDays}日)
// ヒヤリ件数: ${meta.nearMissCount}件
//
// 投入後の確認URL:
//   /safety-diary/monthly/${fromYm.replace("-", "")}   ← 月次まとめ (6桁形式)
//   /safety-diary/monthly/${fromYm}                    ← 月次まとめ (YYYY-MM形式)
// ============================================================

(function() {
  const diary = ${JSON.stringify(data.diary)};
  const kyList = ${JSON.stringify(data.kyList)};
  const chemicalMyList = ${JSON.stringify(data.chemicalMyList)};
  const companyProfile = ${JSON.stringify(data.companyProfile)};

  localStorage.setItem('safety-diary-v3', JSON.stringify(diary));
  localStorage.setItem('safe-ai:ky-record-list:v1', JSON.stringify(kyList));
  localStorage.setItem('anzen-chemical-mylist-v1', JSON.stringify(chemicalMyList));
  localStorage.setItem('anzen-company-profile-v1', JSON.stringify(companyProfile));

  console.log('\\u2705 テストデータ投入完了:');
  console.log('  安全衛生日誌 (safety-diary-v3):', diary.length, '件');
  console.log('  KYリスト:', kyList.length, '件');
  console.log('  化学物質マイリスト:', chemicalMyList.length, '件');
  console.log('  会社プロファイル: 設定済み');
  console.log('');
  console.log('  月次まとめ →', window.location.origin + '/safety-diary/monthly/${fromYm}');
})();
`;
}

// ────────────────────────────────────────────────────────────
// 実行
// ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const requestedDays = parseInt(args[0]) || 0;
const sizes = requestedDays > 0 ? [requestedDays] : [22, 100, 365];

const outputDir = join(REPO_ROOT, "scripts", "test-data");
mkdirSync(outputDir, { recursive: true });

console.log("\n=== ANZEN AI テストデータ生成 (safety-diary-v3スキーマ) ===");

for (const days of sizes) {
  const data = generateData(days);
  const { meta } = data;

  console.log(`\n[${days}日モード]`);
  console.log(`  期間      : ${meta.dateRange.from} 〜 ${meta.dateRange.to}`);
  console.log(`  作業日数  : ${meta.totalDays}日`);
  console.log(`  KY実施率  : ${meta.kyRate}% (${meta.kyDoneCount}/${meta.totalDays}日)`);
  console.log(`  ヒヤリ件数: ${meta.nearMissCount}件`);

  const jsonStr = JSON.stringify(data, null, 2);
  const jsonPath = join(outputDir, `test-data-${days}d.json`);
  writeFileSync(jsonPath, jsonStr, "utf-8");
  const sizeKb = (Buffer.byteLength(jsonStr, "utf-8") / 1024).toFixed(1);
  console.log(`  JSON      : ${jsonPath} (${sizeKb}KB)`);

  const loaderPath = join(outputDir, `load-test-data-${days}d.js`);
  writeFileSync(loaderPath, generateLoaderScript(data), "utf-8");
  console.log(`  ローダー  : ${loaderPath}`);
}

console.log("\n✅ 生成完了 → scripts/test-data/");
console.log("\nブラウザ投入手順:");
console.log("  1. http://localhost:3000 を開く");
console.log("  2. DevTools > Console を開く");
console.log("  3. load-test-data-22d.js の内容を貼り付けて実行");
console.log("  4. /safety-diary/monthly/202604 で月次まとめを確認\n");
