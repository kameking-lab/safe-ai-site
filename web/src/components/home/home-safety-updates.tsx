import {
  HOME_ADDITIONAL_LAW_REFORMS,
  HOME_FEATURED_LAW_REFORM,
  buildHomeAccidentPreview,
} from "@/lib/home/effect-first-data";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { HomeSafetyUpdatesView } from "./home-safety-updates-view";

export function HomeSafetyUpdates({
  latestNews,
}: {
  latestNews: HomeLatestAccidentNews;
}) {
  const { period, deaths, sourceUrl } = buildHomeAccidentPreview().featured;
  const reform = HOME_FEATURED_LAW_REFORM;
  return (
    <HomeSafetyUpdatesView
      // 表示値だけを渡し、事故コーパスと未表示の報道をclient bundleへ含めない。
      reports={latestNews.items.slice(0, 2).map((report) => ({
        title: report.title,
        href: report.href,
        publishedAt: report.publishedAt,
        publisher: report.publisher,
        accidentType: report.accidentType,
        summary: report.summary,
      }))}
      aggregate={{ period, deaths, sourceUrl }}
      reform={{
        id: reform.id,
        title: reform.title,
        effectiveAt: reform.effectiveAt,
        target: reform.target,
        action: reform.action,
        sourceUrl: reform.sourceUrl,
        sourceLabel: reform.sourceLabel,
        checkedAt: reform.checkedAt,
        status: reform.status,
        sourceState: reform.sourceState,
      }}
      additionalReforms={HOME_ADDITIONAL_LAW_REFORMS.map((item) => ({
        id: item.id,
        title: item.title,
        effectiveAt: item.effectiveAt,
        action: item.action,
        status: item.status,
        sourceUrl: item.sourceUrl,
      }))}
    />
  );
}
