export const HOME_ACCIDENT_TYPE_VALUES = [
  "fall",
  "caught",
  "traffic",
  "collapse",
  "falling-object",
  "fire-explosion",
  "electric-shock",
  "unknown",
] as const;

export const HOME_ACCIDENT_WORK_VALUES = [
  "construction",
  "manufacturing",
  "transport",
  "unknown",
] as const;

export type HomeAccidentType = (typeof HOME_ACCIDENT_TYPE_VALUES)[number];
export type HomeAccidentWorkCategory =
  (typeof HOME_ACCIDENT_WORK_VALUES)[number];

export const HOME_ACCIDENT_TYPE_LABELS: Record<HomeAccidentType, string> = {
  fall: "墜落・転落",
  caught: "はさまれ・巻き込まれ",
  traffic: "交通事故・激突され",
  collapse: "崩壊・倒壊",
  "falling-object": "飛来・落下",
  "fire-explosion": "爆発・火災",
  "electric-shock": "感電",
  unknown: "事故型未確認",
};

export const HOME_ACCIDENT_WORK_LABELS: Record<
  HomeAccidentWorkCategory,
  string
> = {
  construction: "建設業",
  manufacturing: "製造業",
  transport: "運輸・交通関連",
  unknown: "作業カテゴリ未確認",
};

const PUBLIC_REPORT_ID = /^rpt-[a-f0-9]{16}$/u;

export function classifyHomeAccidentType(label: string): HomeAccidentType {
  if (label.startsWith("墜落・転落")) return "fall";
  if (label.startsWith("はさまれ・巻き込まれ")) return "caught";
  if (label.startsWith("交通事故・激突され")) return "traffic";
  if (label.startsWith("崩壊・倒壊")) return "collapse";
  if (label.startsWith("飛来・落下")) return "falling-object";
  if (label.startsWith("爆発・火災")) return "fire-explosion";
  if (label.startsWith("感電")) return "electric-shock";
  return "unknown";
}

export function classifyHomeAccidentWork(
  label: string,
): HomeAccidentWorkCategory {
  if (label.startsWith("建設業")) return "construction";
  if (label.startsWith("製造業")) return "manufacturing";
  if (label.startsWith("運輸・交通関連")) return "transport";
  return "unknown";
}

export function isHomeAccidentPublicId(value: string): boolean {
  return PUBLIC_REPORT_ID.test(value);
}

export function parseHomeAccidentType(
  value: string | undefined,
): HomeAccidentType | null {
  return HOME_ACCIDENT_TYPE_VALUES.includes(value as HomeAccidentType)
    ? (value as HomeAccidentType)
    : null;
}

export function parseHomeAccidentWork(
  value: string | undefined,
): HomeAccidentWorkCategory | null {
  return HOME_ACCIDENT_WORK_VALUES.includes(value as HomeAccidentWorkCategory)
    ? (value as HomeAccidentWorkCategory)
    : null;
}

export function buildHomeAccidentKyHref(context: {
  publicId: string;
  accidentType: HomeAccidentType;
  workCategory: HomeAccidentWorkCategory;
}): string | null {
  if (!isHomeAccidentPublicId(context.publicId)) return null;
  // 報道見出しは未確認のため、事故候補として自動取込しない。
  // URLへ事故本文等を出さず、利用者が空のKYで現場条件を入力する。
  return "/ky/paper";
}
