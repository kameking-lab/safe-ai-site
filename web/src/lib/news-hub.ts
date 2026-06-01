/**
 * P1-2/P1-3: 新着情報ハブ＋RSS の共有アグリゲータ（news-completion 2026-05-29）
 *
 * 法改正（e-Gov自動取込＋手書き）・事故速報（月次速報）・通達・報道feed を
 * 単一の NewsHubItem[] に集約する。/whats-new ページと RSS 配信の両方が利用する。
 *
 * 原則:
 * - 既存データの再構成（presentation）のみ。新規ETL・外部fetchはしない。
 * - 各項目に出典URL・日付を必須付与。AI解釈は載せず事実の集約に徹する。
 * - 法改正は施行ステータスのバッジ（P0-1）を付ける。
 */

import { lawRevisionCores } from "@/data/mock/law-revisions";
import { mhlwNotices } from "@/data/mhlw-notices";
import { buildEnforcementBadge } from "@/lib/law-revision-status";
import { deriveIndustryTags } from "@/lib/law-revision-industry-tags";
import { egovRevisionsMeta } from "@/data/law-revisions/egov-revisions-loaded";
import monthlySokuhou from "@/data/accidents/monthly-sokuhou.json";
import newsFeed from "@/data/news-feed/approved/index.json";
import { filterSeriousCases, SERIOUS_CASES_META } from "@/lib/accident-news/serious-cases";
import type { NewsHubItem } from "@/lib/news-hub-types";

export type { NewsHubCategory, NewsHubItem } from "@/lib/news-hub-types";
export { NEWS_HUB_CATEGORY_LABEL, isRecent } from "@/lib/news-hub-types";

function toYmd(s: string | null | undefined): string {
  if (!s) return "";
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // RFC2822（例: "Wed, 27 May 2026 18:46:00 +0900"）も許容
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

function lawRevisionItems(limit: number): NewsHubItem[] {
  return [...lawRevisionCores]
    .filter((r) => r.publishedAt)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit)
    .map((r) => {
      const badge = buildEnforcementBadge(r);
      const url = r.source_url || r.source?.url || "https://laws.e-gov.go.jp/";
      return {
        id: `news-law-${r.id}`,
        category: "law-revision" as const,
        title: r.title,
        summary: r.summary,
        date: toYmd(r.enforcement_date) || toYmd(r.publishedAt),
        url,
        internalHref: "/laws",
        badge: badge.label,
        // 業種別メール配信のセグメント用。空配列＝全業種向け。
        industries: deriveIndustryTags(r),
      };
    });
}

function noticeItems(limit: number): NewsHubItem[] {
  return mhlwNotices
    .filter((n) => n.issuedDate)
    .sort((a, b) => (b.issuedDate ?? "").localeCompare(a.issuedDate ?? ""))
    .slice(0, limit)
    .map((n) => ({
      id: `news-notice-${n.id}`,
      category: "notice" as const,
      title: n.title,
      summary: `${n.docType}${n.noticeNumber ? `・${n.noticeNumber}` : ""}（${n.issuer}）`,
      date: toYmd(n.issuedDate),
      url: n.detailUrl || n.sourceUrl || "https://www.mhlw.go.jp/hourei/",
      internalHref: "/circulars",
    }));
}

function mediaItems(limit: number): NewsHubItem[] {
  const entries = (newsFeed as { entries?: Array<Record<string, unknown>> }).entries ?? [];
  return entries
    .filter((e) => e.approved !== false)
    .map((e) => {
      const src = (e.source ?? {}) as Record<string, unknown>;
      const date = toYmd((src.fetchedAt as string) || (src.publishedAt as string));
      // P2-1: 構造化補助。判明している推定事故型のみ「AI推定」と明示して付す（推測の断定はしない）。
      const estType = typeof e.estimatedAccidentType === "string" ? e.estimatedAccidentType : "";
      const summary = String(e.aiSummary ?? "");
      return {
        id: `news-media-${String(e.id)}`,
        category: "media" as const,
        title: String(e.headline ?? ""),
        summary: estType ? `${summary}（AI推定事故型: ${estType}）` : summary,
        date,
        url: String(src.url ?? ""),
        internalHref: "/accidents",
        badge: estType || undefined,
      };
    })
    .filter((i) => i.title && i.url)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

function accidentSokuhouItem(): NewsHubItem | null {
  const data = monthlySokuhou as {
    fetchedAt?: string;
    sibou?: { period?: string; sourceUrl?: string; rows?: Array<{ name: string; total: number }> };
  };
  const sibou = data.sibou;
  if (!sibou?.period) return null;
  const top = (sibou.rows ?? [])
    .filter((r) => typeof r.total === "number" && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((r) => `${r.name}${r.total}件`)
    .join("・");
  return {
    id: "news-accident-monthly-sokuhou",
    category: "accident",
    title: `労働災害 月次速報（${sibou.period.split("/")[0].trim()}）`,
    summary: top
      ? `死亡災害が多い業種（速報・累計）: ${top}。確定値は年次プレス・e-Statを参照。`
      : "厚労省の月次速報（業種別）を更新しました。確定値は年次プレス・e-Statを参照。",
    date: toYmd(data.fetchedAt),
    url: sibou.sourceUrl || "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
    internalHref: "/accidents-reports",
  };
}

/** 重大災害事例（匿名・公表事実）の直近を新着ハブ/RSS用に整形。会社名等は扱わない。 */
function seriousCaseItems(limit: number): NewsHubItem[] {
  return filterSeriousCases({ limit }).map((c) => ({
    id: `news-serious-${c.id}`,
    category: "serious-case" as const,
    title: `${c.type ?? "重大災害"}（${c.industry ?? "業種不明"}）${c.year}年`,
    summary: `${c.description}${c.type && c.sameTypeTotal > 0 ? `（同種事故 収録${c.sameTypeTotal}件）` : ""}`,
    date: `${c.year}-${String(c.month ?? 1).padStart(2, "0")}-01`,
    url: SERIOUS_CASES_META.sourceUrl,
    internalHref: "/accident-news",
  }));
}

/**
 * 全カテゴリを集約し日付降順で返す。
 */
export function buildNewsHubItems(
  opts: {
    lawLimit?: number;
    noticeLimit?: number;
    mediaLimit?: number;
    seriousCaseLimit?: number;
  } = {},
): NewsHubItem[] {
  const items: NewsHubItem[] = [
    ...lawRevisionItems(opts.lawLimit ?? 40),
    ...noticeItems(opts.noticeLimit ?? 20),
    ...mediaItems(opts.mediaLimit ?? 12),
    ...seriousCaseItems(opts.seriousCaseLimit ?? 8),
  ];
  const sokuhou = accidentSokuhouItem();
  if (sokuhou) items.push(sokuhou);
  return items
    .filter((i) => i.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** P2-3: 各データ源の最終取得日時（反映ラグの可視化用）。 */
export function getNewsHubMeta(): {
  lawRevisionsFetchedAt: string | null;
  accidentSokuhouFetchedAt: string | null;
  newsFeedUpdatedAt: string | null;
} {
  const sokuhou = monthlySokuhou as { fetchedAt?: string };
  const feed = newsFeed as { updatedAt?: string };
  return {
    lawRevisionsFetchedAt: egovRevisionsMeta.fetchedAt ?? null,
    accidentSokuhouFetchedAt: sokuhou.fetchedAt ?? null,
    newsFeedUpdatedAt: feed.updatedAt ?? null,
  };
}
