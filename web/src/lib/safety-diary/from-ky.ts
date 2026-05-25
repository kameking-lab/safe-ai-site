/**
 * P0-010 (usability-audit-day2-2026-05-24):
 * KY → 安全衛生日誌 のワンクリック転記用ローダー。
 *
 * KY ページの保存ロジック (web/src/lib/services/operations-service.ts) が
 * `safe-ai:ky-instruction-record:v1` に最新KY状態を localStorage 保存し、
 * `safe-ai:ky-record-list:v1` に summary を最大30件保持している。
 * 本モジュールはそこから「最新KYのみ」を取り出して日誌フォームに
 * 詰めやすい形に整形する。
 *
 * 設計判断:
 * - KY 側は SSR 対応のため `typeof window` チェックが必須。
 * - パース失敗は黙って null を返し、フォーム側で「見つかりませんでした」
 *   表示する。エラーをユーザーに見せない方が安心。
 * - 取り出す情報は「作業内容」「危険要因+対策」「現場名」「メタ情報」のみ。
 *   日付・天候はKY側の入力品質にばらつきがあり、転記すると逆に手間を増やす
 *   ことが多いため、ユーザーが日誌側で改めて選ぶ前提とする。
 */

import type {
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyInstructionWorkRow,
} from "@/lib/types/operations";

const KY_STORAGE_KEY = "safe-ai:ky-instruction-record:v1";
const KY_AUTOSAVE_KEY = "ky-record";

export type KyToDiaryPayload = {
  workContent: string;
  kyResult: string;
  siteName: string | null;
  meta: {
    workDate: string | null;
    companyName: string | null;
    workDetail: string | null;
  };
};

function safeReadKy(): KyInstructionRecordState | null {
  if (typeof window === "undefined") return null;
  // 監査 P0-4: 手動保存キーを優先し、未保存（自動保存のみ）の場合も拾えるよう
  // 自動保存キー(ky-record)へフォールバックする。これで「保存し忘れで空転記」を防ぐ。
  for (const key of [KY_STORAGE_KEY, KY_AUTOSAVE_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") continue;
      // 必須フィールドは normalizeKyInstructionRecord 側で吸収する前提。
      return parsed as KyInstructionRecordState;
    } catch {
      // 壊れていれば次のキーへ
    }
  }
  return null;
}

function formatWorkContent(rows: KyInstructionWorkRow[] | undefined): string {
  if (!rows || rows.length === 0) return "";
  const lines: string[] = [];
  for (const row of rows) {
    const detail = (row.workDetail ?? "").trim();
    const place = (row.workPlace ?? "").trim();
    if (!detail && !place) continue;
    if (place && detail) {
      lines.push(`【${place}】${detail}`);
    } else if (detail) {
      lines.push(detail);
    } else if (place) {
      lines.push(`【${place}】`);
    }
  }
  return lines.join("\n");
}

function formatKyResult(rows: KyInstructionRiskRow[] | undefined): string {
  if (!rows || rows.length === 0) return "";
  const lines: string[] = [];
  for (const row of rows) {
    const hazard = (row.hazard ?? "").trim();
    const reduction = (row.reduction ?? "").trim();
    if (!hazard && !reduction) continue;
    if (hazard && reduction) {
      lines.push(`・危険: ${hazard}  → 対策: ${reduction}`);
    } else if (hazard) {
      lines.push(`・危険: ${hazard}`);
    } else if (reduction) {
      lines.push(`・対策: ${reduction}`);
    }
  }
  return lines.join("\n");
}

export function loadLatestKyForDiary(): KyToDiaryPayload | null {
  const ky = safeReadKy();
  if (!ky) return null;
  const workContent = formatWorkContent(ky.workRows);
  const kyResult = formatKyResult(ky.riskRows);
  // KY は工事会社名 (coop1Name 等) を持つが現場名は持たないことが多い。
  // workPlace は workRows[0] にあるためそちらをフォールバックに使う。
  const siteName =
    ky.siteName?.trim() ||
    ky.coop1Name?.trim() ||
    ky.workRows?.[0]?.workPlace?.trim() ||
    null;
  if (!workContent && !kyResult && !siteName) return null;
  const workDate = ky.workDateYear
    ? `${ky.workDateYear}-${(ky.workDateMonth ?? "").padStart(2, "0")}-${(
        ky.workDateDay ?? ""
      ).padStart(2, "0")}`
    : null;
  return {
    workContent,
    kyResult,
    siteName,
    meta: {
      workDate,
      companyName:
        ky.coop1Name?.trim() ||
        ky.coop2Name?.trim() ||
        ky.coop3Name?.trim() ||
        null,
      workDetail: ky.workRows?.[0]?.workDetail?.trim() || null,
    },
  };
}
