export const HEAT_ILLNESS_CAMPAIGN_PERIOD = {
  timeZone: "Asia/Tokyo",
  startMonth: 5,
  startDay: 1,
  endMonth: 9,
  endDay: 30,
  rationale:
    "暑熱順化を始める時期から残暑期まで、職場の作業計画を早めに見直せるよう毎年5月1日〜9月30日を大型表示期間とする。",
} as const;

export type HeatCampaignPresentation = "seasonal-large" | "standard-card";

function getJstMonthDay(date: Date): { month: number; day: number } | null {
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HEAT_ILLNESS_CAMPAIGN_PERIOD.timeZone,
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Number.isInteger(month) && Number.isInteger(day)
    ? { month, day }
    : null;
}

export function isHeatIllnessCampaignSeason(date: Date): boolean {
  const parts = getJstMonthDay(date);
  if (!parts) return false;
  const ordinal = parts.month * 100 + parts.day;
  const start =
    HEAT_ILLNESS_CAMPAIGN_PERIOD.startMonth * 100 +
    HEAT_ILLNESS_CAMPAIGN_PERIOD.startDay;
  const end =
    HEAT_ILLNESS_CAMPAIGN_PERIOD.endMonth * 100 +
    HEAT_ILLNESS_CAMPAIGN_PERIOD.endDay;
  return ordinal >= start && ordinal <= end;
}

export function getHeatCampaignPresentation(
  date: Date,
): HeatCampaignPresentation {
  return isHeatIllnessCampaignSeason(date)
    ? "seasonal-large"
    : "standard-card";
}
