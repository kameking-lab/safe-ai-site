/**
 * KY全面再設計 P1-C: クロスツール連携の復活。
 * 旧 /ky のクエリ起点取り込み（preset / industry+topic / fromAccident / fromDiary / import=risk-prediction）を
 * /ky/paper でも解釈できるよう、純関数として再実装（既存ヘルパを流用）。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { getPresetById, type KyIndustryPreset } from "@/data/mock/ky-industry-presets";
import { mapIndustryParamToPresetId, describeTopic } from "@/lib/ky-deep-link";
import { getEntryById } from "@/lib/safety-diary/store";

/** プリセットを記録に適用（作業内容[0]＋危険行へ反映）。 */
export function applyPresetToRecord(
  record: KyInstructionRecordState,
  preset: KyIndustryPreset
): KyInstructionRecordState {
  const workRows = record.workRows.map((r, i) =>
    i === 0 ? { ...r, workDetail: preset.workExamples[0] ?? r.workDetail } : r
  );
  const riskRows = record.riskRows.map((r, i) => {
    const p = preset.risks[i - 1];
    if (i === 0 || !p) return r;
    return { ...r, hazard: p.hazard, reduction: p.reduction };
  });
  return { ...record, workRows, riskRows };
}

/** preset > template > industry の優先で presetId を解決。 */
export function resolvePresetId(params: URLSearchParams): string | null {
  return (
    params.get("preset") ??
    params.get("template") ??
    mapIndustryParamToPresetId(params.get("industry")) ??
    null
  );
}

function applyDiaryToRecord(
  record: KyInstructionRecordState,
  diary: NonNullable<ReturnType<typeof getEntryById>>
): KyInstructionRecordState {
  const workSummary = diary.required.workContent;
  const kyText = diary.required.kyResult ?? "";
  const lines = kyText.split(/\n+/g);
  const workRows = record.workRows.map((r, i) => (i === 0 ? { ...r, workDetail: workSummary } : r));
  const riskRows = record.riskRows.map((r, i) => {
    if (i === 0) return r;
    const line = lines[i - 1] ?? "";
    const hazardMatch = line.match(/危険[:：]\s*(.+)/);
    const reduceMatch = line.match(/対策[:：]\s*(.+)/);
    return { ...r, hazard: hazardMatch?.[1] ?? r.hazard, reduction: reduceMatch?.[1] ?? r.reduction };
  });
  return { ...record, workRows, riskRows };
}

type RiskPredictionPayload = { workContent?: string; risks?: { hazard?: string; reduction?: string }[] };

export function applyRiskPredictionPayload(
  record: KyInstructionRecordState,
  payload: string | null
): { record: KyInstructionRecordState; notice: string } {
  if (!payload) {
    return { record, notice: "AIリスク予測から起票しています（内容は手動で入力してください）。" };
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(payload)) as RiskPredictionPayload;
    let r = record;
    if (typeof parsed.workContent === "string" && parsed.workContent.trim()) {
      const wc = parsed.workContent;
      r = { ...r, workRows: r.workRows.map((row, i) => (i === 0 ? { ...row, workDetail: wc } : row)) };
    }
    if (Array.isArray(parsed.risks)) {
      const risks = parsed.risks;
      r = {
        ...r,
        riskRows: r.riskRows.map((row, i) => {
          if (i === 0) return row;
          const p = risks[i - 1];
          if (!p) return row;
          return { ...row, hazard: p.hazard ?? row.hazard, reduction: p.reduction ?? row.reduction };
        }),
      };
    }
    return { record: r, notice: "AIリスク予測から作業内容・危険を取り込みました。" };
  } catch {
    return { record, notice: "AIリスク予測データの読み込みに失敗しました。手動で入力してください。" };
  }
}

export type DeepLinkResult = { record: KyInstructionRecordState; notice: string | null; changed: boolean };

/**
 * クエリから取り込みを適用。該当パラメータが無ければ changed=false（何もしない）。
 * 注意: fromDiary は localStorage を参照するためクライアントでのみ実効。
 */
export function applyKyDeepLink(params: URLSearchParams, current: KyInstructionRecordState): DeepLinkResult {
  let record = current;
  let notice: string | null = null;
  let changed = false;

  const presetId = resolvePresetId(params);
  const preset = presetId ? getPresetById(presetId) : undefined;
  if (preset) {
    record = applyPresetToRecord(record, preset);
    changed = true;
    const topic = describeTopic(params.get("topic"));
    notice = topic
      ? `${preset.label}向けプリセットを適用しました（テーマ: ${topic}）。作業内容を確認してください。`
      : `${preset.label}向けプリセットを適用しました。作業内容を確認してください。`;
  }

  const fromAccident = params.get("fromAccident");
  if (fromAccident) {
    const q = params.get("q");
    changed = true;
    notice = q
      ? `事故事例「${q}」からKYを起票しています。${preset ? "テンプレ適用済み。" : "作業内容を入力してください。"}`
      : "事故事例から起票しています。作業内容を入力してください。";
  }

  const diaryId = params.get("fromDiary");
  if (diaryId) {
    const diary = getEntryById(diaryId);
    if (diary) {
      record = applyDiaryToRecord(record, diary);
      changed = true;
      notice = `日誌（${diary.required.date} ${diary.required.siteName}）から作業内容・KY結果を取り込みました。`;
    } else {
      notice = "指定の日誌が見つかりませんでした。";
    }
  }

  if (params.get("import") === "risk-prediction") {
    const applied = applyRiskPredictionPayload(record, params.get("payload"));
    record = applied.record;
    notice = applied.notice;
    changed = true;
  }

  return { record, notice, changed };
}
