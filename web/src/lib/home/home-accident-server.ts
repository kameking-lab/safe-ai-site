import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { fetchLaborTrendItems } from "@/lib/signage/parse-labor-rss";
import {
  selectHomeLatestAccidentReports,
  type HomeLatestAccidentReport,
} from "@/lib/home/latest-accident-news";
import {
  classifyHomeAccidentType,
  classifyHomeAccidentWork,
  type HomeAccidentType,
  type HomeAccidentWorkCategory,
} from "@/lib/home/home-accident-context";

export type HomeLatestAccidentPublicReport = HomeLatestAccidentReport & {
  publicId: string;
  contextAccidentType: HomeAccidentType;
  contextWorkCategory: HomeAccidentWorkCategory;
};

export type HomeLatestAccidentNews = {
  status: "live" | "unavailable";
  checkedAt: string;
  items: HomeLatestAccidentPublicReport[];
  sourceLabel: string;
  sourceUrl: string;
  message: string;
};

function publicReport(report: HomeLatestAccidentReport): HomeLatestAccidentPublicReport {
  const publicId = `rpt-${createHash("sha256")
    .update(`${report.publishedAt}\n${report.href}\n${report.id}`, "utf8")
    .digest("hex")
    .slice(0, 16)}`;
  return {
    ...report,
    publicId,
    contextAccidentType: classifyHomeAccidentType(report.accidentType),
    contextWorkCategory: classifyHomeAccidentWork(report.industry),
  };
}

const loadCached = unstable_cache(
  async (): Promise<HomeLatestAccidentNews> => {
    const nowMs = Date.now();
    const checkedAt = new Date(nowMs).toISOString();
    const items = await fetchLaborTrendItems(40, nowMs);
    const selected = selectHomeLatestAccidentReports(items, nowMs, 2).map(
      publicReport,
    );
    return {
      status: selected.length > 0 ? "live" : "unavailable",
      checkedAt,
      items: selected,
      sourceLabel: "GoogleニュースRSS（各報道媒体の見出し）",
      sourceUrl: "https://news.google.com/",
      message:
        selected.length > 0
          ? "公表日時順。報道見出しであり、行政・捜査機関による事故確定情報ではありません。"
          : "14日以内の国内労災報道を確認できませんでした。0件・事故なしとは判定しません。",
    };
  },
  ["home-latest-accident-news-v3"],
  { revalidate: 3_600 },
);

export async function loadHomeLatestAccidentNews(): Promise<HomeLatestAccidentNews> {
  try {
    return await loadCached();
  } catch {
    return {
      status: "unavailable",
      checkedAt: new Date().toISOString(),
      items: [],
      sourceLabel: "GoogleニュースRSS（各報道媒体の見出し）",
      sourceUrl: "https://news.google.com/",
      message:
        "報道RSSを取得できませんでした。0件・事故なしとは判定せず、厚労省速報集計を表示します。",
    };
  }
}
