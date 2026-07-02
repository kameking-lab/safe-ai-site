/** 気象庁 bosai forecast JSON から代表地域の当日天気を要約 */

import type { JmaWeatherEntry } from "./jma-data";

type JmaForecastArea = {
  weatherCodes?: string[];
  weathers?: string[];
};

type JmaForecastTimeSeries = {
  areas?: JmaForecastArea[];
};

export type JmaForecastReport = {
  reportDatetime?: string;
  publishingOffice?: string;
  timeSeries?: JmaForecastTimeSeries[];
};

/** forecast/data/forecast/{code}.json のトップレベル配列のうち、先頭要素(直近レポート)から当日天気を抽出 */
export function buildWeatherEntry(label: string, reports: JmaForecastReport[] | undefined): JmaWeatherEntry {
  const today = reports?.[0];
  const series = today?.timeSeries?.[0];
  const area = series?.areas?.[0];
  const weatherCodes = area?.weatherCodes ?? [];
  const weathers = area?.weathers ?? [];
  return {
    label,
    reportDatetime: today?.reportDatetime ?? null,
    publishingOffice: today?.publishingOffice ?? null,
    todayWeatherCode: weatherCodes[0] ?? null,
    todayWeatherText: weathers[0] ?? null,
  };
}
