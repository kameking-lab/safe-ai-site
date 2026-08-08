import {
  getAllMergedChemicals,
  regulatoryLabels,
  relatedLawTexts,
  type MergedChemical,
} from "@/lib/mhlw-chemicals";
import { buildGhsHazardsFromNite } from "@/lib/chemical/nite-ghs-hazards";
import { verifiedMhlwPublicDocumentUrl } from "@/lib/chemical/official-source-url";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";

const ASSESSMENT_NOTICE =
  "本サイトは作業条件からCREATE-SIMPLEの判定値やばく露濃度を推定しません。製品固有の最新SDS、実測値、厚生労働省の公式CREATE-SIMPLEを使い、化学物質管理者または専門家が確認してください。";

function normalizeLookup(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s　]+/g, "");
}

function normalizeCas(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s‐‑‒–—―ー−]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function isValidCas(value: string): boolean {
  const normalized = normalizeCas(value);
  const match = normalized.match(/^(\d{2,7})-(\d{2})-(\d)$/);
  if (!match) return false;
  const digits = `${match[1]}${match[2]}`.split("").reverse().map(Number);
  const check =
    digits.reduce((sum, digit, index) => sum + digit * (index + 1), 0) %
    10;
  return check === Number(match[3]);
}

export type ChemicalResolution =
  | { ok: true; chemical: MergedChemical }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "AMBIGUOUS"
        | "INVALID_CAS"
        | "CAS_MISMATCH"
        | "DUPLICATE"
        | "SDS_INSUFFICIENT";
      message: string;
    };

function exactNameCandidates(
  name: string,
  chemicals: MergedChemical[],
): MergedChemical[] {
  const target = normalizeLookup(name);
  return chemicals.filter(
    (item) =>
      normalizeLookup(item.primaryName) === target ||
      item.aliases.some((alias) => normalizeLookup(alias) === target),
  );
}

function hasPublicIdentityReference(chemical: MergedChemical): boolean {
  return Boolean(
    chemical.cas &&
      (chemical.details?.link || chemical.details?.limits?.niteChripUrl),
  );
}

function verifiedMhlwLimitSourceUrl(
  chemical: MergedChemical,
): string | undefined {
  const candidate =
    chemical.details?.link ?? chemical.details?.limits?.mhlwSdsUrl;
  return verifiedMhlwPublicDocumentUrl(candidate);
}

export function resolveExactChemical(
  name: string,
  casNumber?: string,
  chemicals: MergedChemical[] = getAllMergedChemicals(),
): ChemicalResolution {
  const casFromName = isValidCas(name) ? normalizeCas(name) : undefined;
  const requestedCas = casNumber ? normalizeCas(casNumber) : casFromName;
  const nameMatches = casFromName ? [] : exactNameCandidates(name, chemicals);

  if (requestedCas) {
    if (!isValidCas(requestedCas)) {
      return {
        ok: false,
        code: "INVALID_CAS",
        message:
          "CAS番号の形式またはチェックデジットが不正です。SDSを確認してください。",
      };
    }
    const casMatches = chemicals.filter(
      (item) => item.cas && normalizeCas(item.cas) === requestedCas,
    );
    if (casMatches.length === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message:
          "指定されたCAS番号は収録済みの検証データにありません。最新SDSを確認してください。",
      };
    }
    if (casMatches.length !== 1) {
      return {
        ok: false,
        code: "DUPLICATE",
        message:
          "同じCAS番号に複数の化学的同一性が見つかったため判定できません。SDSで物質を確認してください。",
      };
    }
    const chemical = casMatches[0];
    if (
      !casFromName &&
      (nameMatches.length === 0 || !nameMatches.includes(chemical))
    ) {
      return {
        ok: false,
        code: "CAS_MISMATCH",
        message:
          "入力された物質名とCAS番号が一致しません。製品SDSの名称とCAS番号を確認してください。",
      };
    }
    if (!hasPublicIdentityReference(chemical)) {
      return {
        ok: false,
        code: "SDS_INSUFFICIENT",
        message:
          "CAS番号に一致しましたが、同一性を確認できる公的参照先が不足しています。最新SDSで確認してください。",
      };
    }
    return { ok: true, chemical };
  }

  if (nameMatches.length === 0) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message:
        "収録データと完全一致する物質を確認できませんでした。CAS番号または最新SDSを確認してください。",
    };
  }
  const identities = new Set(
    nameMatches.map((item) =>
      item.cas ? normalizeCas(item.cas) : "CAS不明",
    ),
  );
  if (identities.size !== 1 || nameMatches.length !== 1 || !nameMatches[0].cas) {
    return {
      ok: false,
      code: "AMBIGUOUS",
      message:
        "同名でCAS番号または化学的同一性が異なる候補が複数あります。先頭候補では判定せず、製品SDSのCAS番号を入力してください。",
    };
  }
  if (!hasPublicIdentityReference(nameMatches[0])) {
    return {
      ok: false,
      code: "SDS_INSUFFICIENT",
      message:
        "同一性を確認できる公的参照先が不足しています。最新SDSとCAS番号で確認してください。",
    };
  }
  return { ok: true, chemical: nameMatches[0] };
}

function buildRelatedHazards(
  chemical: MergedChemical,
  hasTraceableMhlwLimit: boolean,
): string[] {
  const items = [
    ...regulatoryLabels(chemical.flags),
    ...relatedLawTexts(chemical.flags),
  ];
  if (hasTraceableMhlwLimit && chemical.details?.limit8h) {
    items.push(
      `8時間濃度基準値: ${chemical.details.limit8h}（安衛則第577条の2）`,
    );
  }
  if (chemical.details?.limits?.carcinogenicity?.iarc) {
    items.push(
      `IARC発がん性分類: グループ${chemical.details.limits.carcinogenicity.iarc}`,
    );
  }
  return [...new Set(items)].slice(0, 8);
}

export function buildOfficialResponse(
  chemical: MergedChemical,
): ChemicalRaResponse {
  const notes = [
    ...regulatoryLabels(chemical.flags),
    ...relatedLawTexts(chemical.flags),
  ];
  const ghsHazards = buildGhsHazardsFromNite(
    chemical.details?.limits?.niteGhsClassifications,
  );
  const mhlwLimitSourceUrl = verifiedMhlwLimitSourceUrl(chemical);
  const exposureLimit =
    mhlwLimitSourceUrl && chemical.details?.limit8h
      ? `8時間濃度基準値: ${chemical.details.limit8h}${
          chemical.details.limitShort
            ? ` / 短時間: ${chemical.details.limitShort}`
            : ""
        }`
      : undefined;
  const sourceLinks = [
    mhlwLimitSourceUrl
      ? {
          label:
            "厚生労働省 濃度基準値等の公表資料（製品SDSではありません）",
          url: mhlwLimitSourceUrl,
        }
      : undefined,
    chemical.details?.limits?.niteChripUrl
      ? { label: "NITE-CHRIP", url: chemical.details.limits.niteChripUrl }
      : undefined,
  ].filter((item): item is { label: string; url: string } => Boolean(item));

  return {
    chemicalName: chemical.primaryName,
    casNumber: chemical.cas ?? undefined,
    ghsHazards,
    flashPoint: undefined,
    exposureLimit,
    ppeRecommendations: [],
    safetyMeasures: [],
    emergencyMeasures: [],
    regulatoryNotes: notes,
    rawReply:
      "収録済みの公的データだけを表示しています。GHS分類、保護具、応急措置は製品固有の最新SDSで確認してください。",
    aiStatus: "disabled_for_safety",
    aiErrorDetail: "安全判断に未検証の生成内容を使用しない設定",
    relatedHazards: buildRelatedHazards(
      chemical,
      Boolean(mhlwLimitSourceUrl),
    ),
    assessmentStatus: "unavailable",
    assessmentNotice: ASSESSMENT_NOTICE,
    sourceLinks,
  };
}
