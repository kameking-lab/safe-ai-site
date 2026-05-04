/**
 * 30日/100日/365日相当のテストデータを生成し、JSONファイルとして出力する。
 *
 * 用途:
 *  - localStorage 肥大化のパフォーマンス検証
 *  - 開発環境で月次・年次データ表示を即座に確認
 *
 * 実行例:
 *   npx tsx scripts/generate-test-data.ts 30  → out/test-data-30d.json
 *   npx tsx scripts/generate-test-data.ts 100 → out/test-data-100d.json
 *   npx tsx scripts/generate-test-data.ts 365 → out/test-data-365d.json
 *
 * 生成された JSON は DevTools コンソールで以下のように貼り付けて使う:
 *   const data = <貼り付け>;
 *   for (const [k, v] of Object.entries(data)) {
 *     if (k === '_meta') continue;
 *     localStorage.setItem(k, JSON.stringify(v));
 *   }
 *   location.reload();
 *
 * 対応するストレージキー:
 *   - safety-diary-v3              安全衛生日誌（V3スキーマ）
 *   - safe-ai:ky-record-list:v1    KY記録一覧（最大30件で頭打ち）
 *   - cert-quiz-session:<slug>     資格別過去問セッション
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// --- 型 (web/src/lib/safety-diary/schema.ts と web/src/lib/types/operations.ts に対応) ---

type Industry = "construction" | "manufacturing" | "healthcare" | "transport" | "it" | "other";
type Weather = "晴れ" | "曇り" | "雨" | "雪" | "強風" | "猛暑" | "厳寒";

type SafetyDiaryEntry = {
  id: string;
  industry: Industry;
  required: {
    date: string;
    weather: Weather;
    siteName: string;
    workContent: string;
    kyResult: string;
    nearMissOccurred: boolean;
    nearMissDetail?: string;
  };
  optional: {
    contractorWorks: { name: string; work: string }[];
    requiredQualifications: string[];
    plannedPeopleCount?: number;
    predictedDisasters: string[];
    safetyInstructions?: string;
    patrolRecord?: string;
    nextDayPlan?: string;
  };
  weatherAlerts: string[];
  similarAccidentIds: string[];
  relatedLawRevisionIds: string[];
  createdAt: string;
  updatedAt: string;
};

type KyRecordSummary = {
  id: string;
  workDate: string;
  companyName: string;
  workDetail: string;
  weather: string;
  savedAt: string;
};

type SessionAnswer = {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  topic: string;
  level: string;
};

// --- 生成データ ---

const SITES = [
  "渋谷駅前タワー新築工事",
  "○○トンネル耐震補強",
  "△△橋上部工架設",
  "□□製鉄所定修",
  "××物流倉庫増築",
];
const WEATHERS: Weather[] = ["晴れ", "曇り", "雨", "曇り", "晴れ", "強風", "猛暑"];
const WORK_CONTENTS = [
  "鉄筋組立／型枠建込み",
  "コンクリート打設準備",
  "足場組立／解体",
  "重機回送・整地",
  "電気配管・配線",
  "高所作業（屋根葺き）",
];
const COMPANIES = [
  "ABC建設",
  "東京特殊工事",
  "中央電設",
  "山田鳶工業",
  "関東鉄筋",
];
const INDUSTRIES: Industry[] = ["construction", "manufacturing", "healthcare", "transport", "it"];
const TOPICS = ["法令", "実務", "用語", "労働安全衛生法", "化学物質管理"];
const LEVELS = ["basic", "intermediate", "advanced"];

function pick<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length];
}

/** crypto.randomUUID 互換の決定論的UUID（テストデータ再現性のため seeded） */
function deterministicUuid(seed: number): string {
  const hex = (n: number, len: number) =>
    ((seed * (n + 1) * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, len);
  return `${hex(1, 8)}-${hex(2, 4)}-4${hex(3, 3)}-a${hex(4, 3)}-${hex(5, 8)}${hex(6, 4)}`;
}

function dateNDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function generateDiaryEntries(days: number): SafetyDiaryEntry[] {
  return Array.from({ length: days }, (_, i): SafetyDiaryEntry => {
    const date = dateNDaysAgo(days - 1 - i);
    const nearMissOccurred = i % 11 === 0;
    return {
      id: deterministicUuid(i),
      industry: pick(INDUSTRIES, i),
      required: {
        date,
        weather: pick(WEATHERS, i),
        siteName: pick(SITES, i),
        workContent: pick(WORK_CONTENTS, i),
        kyResult: i % 3 === 0 ? "実施済み（指差呼称・ヒヤリ共有）" : "",
        nearMissOccurred,
        ...(nearMissOccurred ? { nearMissDetail: "脚立 4 段目から工具落下、下部に作業員なし" } : {}),
      },
      optional: {
        contractorWorks: [
          { name: pick(COMPANIES, i), work: pick(WORK_CONTENTS, i) },
          { name: pick(COMPANIES, i + 1), work: pick(WORK_CONTENTS, i + 1) },
        ],
        requiredQualifications: i % 4 === 0 ? ["フルハーネス特別教育", "玉掛け技能講習"] : [],
        plannedPeopleCount: 6 + (i % 8),
        predictedDisasters: i % 5 === 0 ? ["墜落・転落", "飛来落下"] : [],
        safetyInstructions: i % 7 === 0 ? "猛暑につき30分毎の水分補給を徹底" : undefined,
        patrolRecord: undefined,
        nextDayPlan: undefined,
      },
      weatherAlerts: i % 13 === 0 ? ["熱中症警戒アラート"] : [],
      similarAccidentIds: [],
      relatedLawRevisionIds: [],
      createdAt: `${date}T07:00:00.000Z`,
      updatedAt: `${date}T17:00:00.000Z`,
    };
  });
}

function generateKyRecords(days: number): KyRecordSummary[] {
  return Array.from({ length: days }, (_, i): KyRecordSummary => {
    const date = dateNDaysAgo(days - 1 - i);
    return {
      id: `${1700000000000 + i * 86400000}`,
      workDate: date,
      companyName: pick(COMPANIES, i),
      workDetail: pick(WORK_CONTENTS, i),
      weather: pick(WEATHERS, i),
      savedAt: `${date}T08:00:00.000Z`,
    };
  });
}

function generateExamSession(days: number): Record<string, SessionAnswer[]> {
  const slugs = ["health-1st", "health-2nd", "anzen-civil"];
  const sessions: Record<string, SessionAnswer[]> = {};
  for (const slug of slugs) {
    const answers: SessionAnswer[] = [];
    for (let i = 0; i < Math.min(days, 50); i++) {
      const correct = i % 4;
      const selected = i % 5 === 0 ? (correct + 1) % 4 : correct; // 80% 正答率
      answers.push({
        questionId: `${slug}-q${i + 1}`,
        selected,
        correct,
        isCorrect: selected === correct,
        topic: pick(TOPICS, i),
        level: pick(LEVELS, i),
      });
    }
    sessions[`cert-quiz-session:${slug}`] = answers;
  }
  return sessions;
}

// --- メイン ---

function main() {
  const arg = process.argv[2] ?? "30";
  const days = Number(arg);
  if (!Number.isFinite(days) || days < 1 || days > 1000) {
    console.error("使い方: npx tsx scripts/generate-test-data.ts <日数 1-1000>");
    process.exit(1);
  }

  const diary = generateDiaryEntries(days);
  const ky = generateKyRecords(days);
  const exam = generateExamSession(days);

  const payload = {
    "safety-diary-v3": diary,
    "safe-ai:ky-record-list:v1": ky.slice(0, 30), // KY は MAX_KY_LIST=30 で頭打ち
    ...exam,
    _meta: {
      generatedAt: new Date().toISOString(),
      days,
      counts: {
        diaryEntries: diary.length,
        kyRecordsTotal: ky.length,
        kyRecordsRetained: Math.min(ky.length, 30),
        examSessions: Object.keys(exam).length,
      },
    },
  };

  const outDir = resolve(process.cwd(), "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `test-data-${days}d.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  const sizeKB = Buffer.byteLength(JSON.stringify(payload), "utf8") / 1024;

  console.log(`✓ 生成完了: ${outPath}`);
  console.log(`  日誌エントリ: ${diary.length} 件 (safety-diary-v3)`);
  console.log(`  KY記録: ${ky.length} 件 (localStorage には先頭 30 件のみ保存される)`);
  console.log(`  資格別セッション: ${Object.keys(exam).length} スラッグ`);
  console.log(`  ペイロード総サイズ: ${sizeKB.toFixed(1)} KB`);
  console.log("");
  console.log("DevTools コンソールに以下を貼り付けると即座にデータ投入できます:");
  console.log("  const data = <上記JSONを貼付>;");
  console.log("  for (const [k, v] of Object.entries(data)) { if (k === '_meta') continue; localStorage.setItem(k, JSON.stringify(v)); }");
  console.log("  location.reload();");
}

main();
