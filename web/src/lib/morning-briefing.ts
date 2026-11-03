import type { AccidentCase, AccidentType, SiteRiskWeather } from "@/lib/types/domain";
import type { KyHandoffPayload, KySafeAccidentType, KySafeWorkCategory } from "@/lib/ky/handoff";

type MorningWork = {
  id: string;
  label: string;
  type: AccidentType;
  kyType: KySafeAccidentType;
  category: KySafeWorkCategory;
  attention: string;
  checks: readonly string[];
};

export const MORNING_WORKS: readonly MorningWork[] = [
  { id: "height", label: "高所・足場作業", type: "墜落", kyType: "fall", category: "construction", attention: "開口部・端部の防護と作業床を確認し、不備があれば立ち入らず責任者に報告する。", checks: ["作業床・手すり・開口部の防護を確認した", "昇降経路と使用する墜落制止用器具を確認した", "強風・雨などの中止基準と連絡先を共有した"] },
  { id: "machine", label: "重機・機械作業", type: "はさまれ・巻き込まれ", kyType: "caught", category: "manufacturing", attention: "人と機械の動線を分け、清掃・点検前には停止と再起動防止を確認する。", checks: ["立入禁止範囲と人の通路を確認した", "合図と運転者・誘導者の役割を共有した", "清掃・点検時の停止と再起動防止の手順を確認した"] },
  { id: "transport", label: "運搬・荷役作業", type: "車両", kyType: "traffic", category: "transport", attention: "荷の安定と車両周囲の死角を確認し、人の通路を確保する。", checks: ["荷の固定・重心と運搬経路を確認した", "歩車分離と後退時の確認方法を共有した", "無理な持ち上げを避ける補助具・人数を確認した"] },
  { id: "electric", label: "電気作業", type: "感電", kyType: "electric-shock", category: "construction", attention: "作業対象・停電範囲・検電・誤送電防止を作業責任者と確認する。", checks: ["対象設備と必要な資格・作業範囲を確認した", "停電・検電・誤送電防止の手順を確認した", "濡れ・損傷のある器具を使用しないことを共有した"] },
  { id: "general", label: "一般・屋外作業", type: "転倒", kyType: "unknown", category: "outdoor", attention: "通路の段差・濡れ・障害物を確認し、体調や天候の変化をすぐ共有する。", checks: ["通路・足元・照明を確認した", "体調と休憩場所・連絡先を確認した", "作業変更時に再確認する相手を決めた"] },
];

export type MorningCase = Pick<AccidentCase, "id" | "title" | "summary" | "source" | "occurredOn">;

/** 朝礼由来を保持し、KY側で工程打合せ書の入力と取り違えない。 */
export function buildMorningKyHandoff(
  work: MorningWork,
  example: MorningCase | null | undefined,
  areaId?: string,
): Omit<KyHandoffPayload, "version" | "createdAt" | "expiresAt"> {
  return {
    source: "morning-briefing",
    areaId,
    accidentId: example?.id,
    accidentType: work.kyType,
    workCategory: work.category,
    workDraft: work.label,
    hazardDrafts: [{ id: `morning-${work.id}`, title: work.attention }],
  };
}

/** Start with a work category that has a verified case, keeping its advice relevant. */
export function getInitialMorningWorkId(cases: Record<string, MorningCase | null>): string {
  return MORNING_WORKS.find((work) => cases[work.id])?.id ?? "general";
}

/** Only already-verified official case records enter the briefing. */
export function selectMorningCases(cases: AccidentCase[]): Record<string, MorningCase | null> {
  return Object.fromEntries(MORNING_WORKS.map((work) => {
    const found = cases.find((item) => item.type === work.type && item.provenance === "mhlw" && item.source?.url);
    return [work.id, found ? { id: found.id, title: found.title, summary: found.summary, source: found.source, occurredOn: found.occurredOn } : null];
  }));
}

export function isMorningWeatherCurrent(data: SiteRiskWeather, now: number): boolean {
  const fetched = Date.parse(data.forecastFetchedAt ?? "");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  return data.dataOrigin === "live" && data.date === today && Number.isFinite(fetched) && now - fetched >= -300_000 && now - fetched <= 900_000;
}
