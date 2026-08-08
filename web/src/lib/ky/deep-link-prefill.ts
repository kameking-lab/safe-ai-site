/**
 * KY全面再設計 P1-C: クロスツール連携の復活。
 * 旧 /ky のクエリ起点取り込み（preset / industry+topic / fromAccident / fromDiary）と、
 * allowlist済みIDによる旧リンクだけを
 * /ky/paper でも解釈できるよう、純関数として再実装（既存ヘルパを流用）。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { getPresetById, type KyIndustryPreset } from "@/data/mock/ky-industry-presets";
import { mapIndustryParamToPresetId, describeTopic } from "@/lib/ky-deep-link";
import { getEntryById } from "@/lib/safety-diary/store";
import { getVisualKyScenarioById } from "@/data/visual-ky/scenarios";

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

function limitedText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
    changed = true;
    notice = `公開事故IDからKYを起票しています。${preset ? "テンプレ適用済み。" : "作業内容を入力してください。"}`;
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

  if (params.get("import") === "visual-kyt") {
    const scenarioId = limitedText(params.get("scenario"), 16);
    const scenario = getVisualKyScenarioById(scenarioId);
    if (
      scenario &&
      scenario.reviewStatus === "reviewed" &&
      scenario.kyPrefill.humanReviewRequired
    ) {
      record = {
        ...record,
        workRows: record.workRows.map((row, index) =>
          index === 0
            ? { ...row, workDetail: scenario.kyPrefill.workDetail }
            : row,
        ),
        riskRows: record.riskRows.map((row, index) => {
          if (index === 0) return row;
          const candidate = scenario.kyPrefill.risks[index - 1];
          if (!candidate) return row;
          return {
            ...row,
            hazard: candidate.hazard,
            reduction: candidate.reduction,
            candidateSource: {
              kind: "rule",
              label: `${scenario.id} ビジュアルKYTの未確認候補`,
              basis: `安全教育用の合成場面から作成。根拠資料: ${scenario.officialSources
                .map((source) => source.organization)
                .join("、")}`,
              grounded: true,
              requiresHumanReview: true,
            },
          };
        }),
      };
      notice = `${scenario.shortTitle}からKY候補を取り込みました。これは合成教育場面の候補で、自動確定されていません。設備・作業方法・人員・気象・メーカー手順と一次資料を人が確認するまで提出・承認できません。`;
      changed = true;
    } else {
      notice =
        "指定されたビジュアルKYTの公開済み・人手確認必須の候補を読み込めませんでした。内容を手動で入力してください。";
    }
  } else if (params.get("import") === "meeting-record") {
    // 作業・危険・対策の自由文をURLへ載せる旧方式は拒否する。
    // 現行画面は同一originの短期session handoffだけを使用する。
    notice =
      "工程打合せ書のURL取込は停止しました。現在のKY作成画面から、端末内の短期引継ぎを利用してください。";
  } else if (params.get("import") === "risk-prediction") {
    // 隔離した旧リスク予測からの任意JSON取込は、出所も確認状態も保持できないため拒否する。
    notice =
      "旧リスク予測からの自動取込は安全確認の境界を満たさないため停止しました。現場条件を確認して手動で入力してください。";
  }

  if (params.get("topic") === "heat-illness" && !notice) {
    changed = true;
    notice =
      "熱中症KYを開始しました。地域・日付・作業時間・現場実測WBGTまたは推定情報の区分・休憩・水分補給・体調確認・緊急連絡・役割分担を確認して入力してください。入力候補は自動確定していません。";
  }

  return { record, notice, changed };
}
