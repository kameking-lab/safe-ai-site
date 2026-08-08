import { getPresetById } from "@/data/mock/ky-industry-presets";
import { describeTopic, mapIndustryParamToPresetId } from "@/lib/ky-deep-link";
import type { ParsedKyHandoff } from "@/lib/ky/handoff";
import type { KyWorkCategory } from "@/lib/ky/zero-friction-types";

const PRESET_CATEGORY: Readonly<Record<string, KyWorkCategory>> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transport",
  cleaning: "chemical",
};

/**
 * 既存の ?preset / ?template / ?industry / ?topic 導線を、新KYの候補状態へ移す。
 * URLから読むのは既存allowlistの列挙値だけで、自由文は一切解釈しない。
 */
export function parseLegacyPresetKyHandoff(
  search: string,
): ParsedKyHandoff | null {
  const params = new URLSearchParams(search);
  const rawPreset =
    params.get("preset") ??
    params.get("template") ??
    mapIndustryParamToPresetId(params.get("industry"));
  if (!rawPreset) return null;
  const preset = getPresetById(rawPreset);
  if (!preset) return null;
  const topic = describeTopic(params.get("topic"));
  const hazardDrafts = preset.risks.map((risk, index) => ({
    id: `legacy-${preset.id}-hazard-${index + 1}`,
    title: risk.hazard,
  }));
  const measureDrafts = preset.risks.map((risk, index) => ({
    id: `legacy-${preset.id}-measure-${index + 1}`,
    text: risk.reduction,
    level: "administrative" as const,
    hazardId: hazardDrafts[index]!.id,
  }));
  return {
    source: "home",
    sourceId: preset.id,
    label: `${preset.label}の検証済みプリセットを候補として読み込みました。`,
    areaId: null,
    weather: null,
    hazardIds: [],
    hazardDrafts,
    measureIds: [],
    measureDrafts,
    workDraft: topic ?? preset.workExamples[0] ?? null,
    workCategory: PRESET_CATEGORY[preset.id] ?? "unknown",
  };
}
