/**
 * サイネージ最上部「結論ストリップ」の表示状態を決める純関数（柱0 ビジュアルファースト）。
 *
 * 現場のTVを数メートル先から3秒見ただけで「いまの状態」と「次にやること」が
 * 分かるよう、ページ内に散らばる状態（気象警報・本日のリスク予測・記録キットの
 * 要対応）を1本の色帯に集約する。色はJIS安全色の文法に従う:
 *   赤   = 危険・停止級（特別警報・警報発表中 / 是正期日の超過）
 *   黄   = 注意（注意報発表中 / 気象の取得失敗=確認不能 / 高リスク予測 / 要対応の記録）
 *   緑   = 安全・OK（警報なし・停止級なし）
 *   無彩 = 確認中（取得完了前。誤った安心も誤った警告も出さない）
 *
 * 取得失敗(error)を赤にしない理由: 赤=作業停止級の文法を守るため。取得失敗は
 * 「気象庁サイトで自分で確認せよ」という指示すべき注意状態であり、現場を止める
 * 確定情報ではない。一方で緑にもしない（誤った安心の防止。詳細パネル側の
 * rose表示は従来どおり維持）。
 */

import type { WeatherWarningPanelState } from "@/lib/signage/weather-warning-panel-state";

export type SignageConclusionTone = "red" | "amber" | "green" | "slate";

export type SignageConclusionChip = {
  tone: "red" | "amber";
  text: string;
};

export type SignageConclusionRisk = {
  level: "高" | "中" | "低";
  label: string;
};

export type SignageConclusionInput = {
  /** 気象警報パネルの状態（resolveWeatherWarningPanelState の結果）。 */
  warningPanel: WeatherWarningPanelState;
  /** computeTodayRisks の結果（level と label のみ参照）。 */
  risks: ReadonlyArray<SignageConclusionRisk>;
  /** この端末の記録キット集計。記録が1件も無い端末では null。 */
  siteSafety: { overdueCount: number; alertCount: number } | null;
};

export type SignageConclusion = {
  tone: SignageConclusionTone;
  /** デカ表示の主文（体言止め・短文）。 */
  label: string;
  /** 補足1行。無ければ null。 */
  sub: string | null;
  /** 主文以外の状態チップ（スコアボード）。主文と同じ内容は含めない。 */
  chips: SignageConclusionChip[];
};

type Condition = {
  chip: SignageConclusionChip;
  main: Pick<SignageConclusion, "tone" | "label" | "sub">;
};

/**
 * 状態の優先順位: 特別警報/警報発表中 > 期限超過 > 注意報発表中 > 気象取得失敗 >
 * 高リスク予測 > 要対応 > 確認中 > 警報なし。最上位が主文（デカ表示）、残りはチップになる。
 */
export function buildSignageConclusion(input: SignageConclusionInput): SignageConclusion {
  const { warningPanel, risks, siteSafety } = input;
  const highRisks = risks.filter((r) => r.level === "高");
  const midRisks = risks.filter((r) => r.level === "中");
  const overdueCount = siteSafety?.overdueCount ?? 0;
  const alertCount = siteSafety?.alertCount ?? 0;

  const conditions: Condition[] = [];

  if (warningPanel.kind === "special" || warningPanel.kind === "warning") {
    conditions.push({
      chip: { tone: "red", text: "気象警報" },
      main: {
        tone: "red",
        label: warningPanel.kind === "special" ? "特別警報 発表中" : "警報 発表中",
        sub: warningPanel.headline,
      },
    });
  }
  if (overdueCount > 0) {
    conditions.push({
      chip: { tone: "red", text: `期限超過 ${overdueCount}件` },
      main: {
        tone: "red",
        label: `期限超過 ${overdueCount}件`,
        sub: "是正期日を過ぎた記録あり — 記録キットで確認",
      },
    });
  }
  if (warningPanel.kind === "advisory") {
    conditions.push({
      chip: { tone: "amber", text: "気象 注意報" },
      main: {
        tone: "amber",
        label: "注意報 発表中",
        sub: warningPanel.headline,
      },
    });
  }
  if (warningPanel.kind === "error") {
    conditions.push({
      chip: { tone: "amber", text: "気象 取得失敗" },
      main: {
        tone: "amber",
        label: "気象 確認不能",
        sub: "取得失敗 — 気象庁サイトで警報の有無を確認",
      },
    });
  }
  if (highRisks.length > 0) {
    conditions.push({
      chip: { tone: "amber", text: `高リスク ${highRisks.length}件` },
      main: {
        tone: "amber",
        label: `高リスク ${highRisks.length}件`,
        sub: highRisks.map((r) => r.label).join("・"),
      },
    });
  }
  if (alertCount > 0) {
    conditions.push({
      chip: { tone: "amber", text: `要対応 ${alertCount}件` },
      main: {
        tone: "amber",
        label: `要対応 ${alertCount}件`,
        sub: "現場記録（ヒヤリ・指摘など）の未処理あり — 記録キットで確認",
      },
    });
  }

  if (conditions.length > 0) {
    const [top, ...rest] = conditions;
    return {
      ...top.main,
      chips: rest.map((c) => c.chip),
    };
  }

  if (warningPanel.kind === "loading") {
    return { tone: "slate", label: "状態 確認中…", sub: null, chips: [] };
  }

  // ここまで来たら kind === "none"（取得成功・警報なし）かつ停止級・注意級なし。
  return {
    tone: "green",
    label: "本日 警報なし",
    sub: midRisks.length > 0 ? `注意: ${midRisks.map((r) => r.label).join("・")}` : null,
    chips: [],
  };
}
