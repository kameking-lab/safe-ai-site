/**
 * サイネージ常掲価値の3項目（Fable診断01 T10）: 無災害日数・今日の一言・WBGT。
 * 「毎日見る理由」を作るため、日付が変われば内容が変わることを保証する純関数群。
 */

import { calculateWBGT, determineRiskLevel } from "@/lib/wbgt-engine";
import type { RiskAssessment } from "@/types/heat-illness";

/** 端末ローカル時刻での今日の日付 (yyyy-mm-dd)。 */
export function todayIsoLocal(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 起点日(yyyy-mm-dd)から今日までの経過日数（起点日を1日目とする）。不正な日付は null。 */
export function noAccidentDays(startIso: string, now: Date): number | null {
  const start = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const todayStart = new Date(`${todayIsoLocal(now)}T00:00:00`);
  const diffDays = Math.round((todayStart.getTime() - start.getTime()) / 86_400_000);
  return diffDays < 0 ? 0 : diffDays + 1;
}

/**
 * 現場常掲用スローガン一覧。曜日・季節を問わず通年使える一般的な安全標語を収録。
 * 出典: 中央労働災害防止協会「全国安全週間」等で例年掲げられる標語の類型（固有の著作年度標語は転載しない）。
 */
export const DAILY_SLOGANS: readonly string[] = [
  "その一歩 止まって見よう 足元を",
  "ヘルメットは 命綱 忘れずかぶろう",
  "指差し呼称 ゆびさし確認 ヨシ！",
  "整理整頓 事故を防ぐ第一歩",
  "水分補給は 喉が渇く前に",
  "高所作業 フルハーネス 必ず装着",
  "「危ない」の一言が 仲間を守る",
  "作業前KY 今日の危険を先読みしよう",
  "焦らない 慌てない 確認してから次の一歩",
  "安全帯 かけ替え忘れずワンタッチ",
  "重機周りは 目配り・声かけ・離れて待つ",
  "脚立の上 三点支持を忘れずに",
  "熱中症 休憩・水分・塩分をこまめに",
  "電源OFF 作業前の鉄則確認",
  "ヒヤリハット 報告が次の事故を防ぐ",
  "通路確保で つまずき・転倒ゼロへ",
  "保護メガネ 目を守るのはあなた自身",
  "新人にも ベテランにも 同じ安全ルール",
  "「まあいいか」が 一番の危険",
  "朝礼は 今日のリスクの共有の場",
  "吊り荷の下 絶対に立ち入らない",
  "服装点検 巻き込まれ防止の基本",
  "声かけ運動 気づいたらすぐ注意",
  "手袋の破れ 小さな油断が大きな事故に",
  "非常口・消火器 いつも場所を確認",
  "無理な姿勢 腰痛・ケガのもと",
  "確認は 自分と仲間の命を守る作業",
  "安全第一 品質はその次にある",
];

/** その日の唱和スローガンを日付から決定論的に選ぶ（同日は常に同じ結果）。 */
export function pickDailySlogan(now: Date): string {
  const dayOfYear = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(now.getFullYear(), 0, 0)) /
      86_400_000,
  );
  const index = ((dayOfYear % DAILY_SLOGANS.length) + DAILY_SLOGANS.length) % DAILY_SLOGANS.length;
  return DAILY_SLOGANS[index]!;
}

export type SignageWbgtReading = {
  wbgt: number;
  risk: RiskAssessment;
};

/**
 * 現在気温・湿度からWBGT概算値を求める（屋外・黒球温度未計測=推定式）。
 * 作業強度は「中程度（moderate）」・順化状態は「順化済み」を既定値とする一般的な目安表示。
 * 個人の作業内容に応じた正式判定は /heat-illness-prevention/wbgt-calculator を案内する。
 * 湿度が取得できない場合は null（捏造防止）。
 */
export function computeSignageWbgt(tempC: number, humidityPct: number | undefined): SignageWbgtReading | null {
  if (typeof humidityPct !== "number" || Number.isNaN(humidityPct)) return null;
  try {
    const result = calculateWBGT({
      airTempC: tempC,
      humidity: humidityPct,
      environment: "outdoor",
    });
    const risk = determineRiskLevel(result.wbgt, "moderate", "acclimatized");
    return { wbgt: result.wbgt, risk };
  } catch {
    return null;
  }
}
