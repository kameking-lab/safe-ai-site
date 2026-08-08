import {
  getGeneralMeasures,
} from "@/lib/accident-news/serious-cases";
import {
  normalizeTitleForDedupe,
  parsePubDateMs,
  scoreLaborNewsSeriousness,
  type LaborRssItem,
} from "@/lib/signage/parse-labor-rss";

const DAY_MS = 86_400_000;
const FUTURE_TOLERANCE_MS = 60 * 60 * 1000;
const FRESH_DAYS = 14;

const FOREIGN_MARKERS =
  /コソボ|プリシュティナ|カンプ・ノウ|Vietnam\.vn|Chosunbiz|kossev|海外|タイで|韓国で|中国で|米国で|アメリカで|インドで|スペインで|ベトナムで/u;
const WORK_MARKERS =
  /作業員|警備員|従業員|社員|労働者|工事|建設|解体|現場|工場|倉庫|製鉄所|運送|クレーン|フォークリフト|重機|大型特殊自動車/u;
const INCIDENT_MARKERS =
  /死亡|死者|遺体|重傷|重体|意識不明|転落|墜落|崩落|崩壊|倒壊|挟ま|巻き込|はねられ|衝突|激突|爆発|火災|感電|下敷き|落下/u;
const NON_INCIDENT_MARKERS =
  /リスクアセスメント|重点点検|教育を実施|増加傾向|統計|防止週間|講習|セミナー|対策を解説/u;

function splitPublisher(rawTitle: string): {
  headline: string;
  publisher: string;
} {
  const match = rawTitle.match(/\s+[-–—]\s+([^-–—]{1,80})$/u);
  if (!match?.[1]) {
    return { headline: rawTitle.trim(), publisher: "媒体名未確認" };
  }
  return {
    headline: rawTitle.slice(0, match.index).trim(),
    publisher: match[1].trim(),
  };
}

function classifyIndustry(title: string): string {
  if (/製鉄所|工場|製造|鉄製|ローラー/u.test(title)) return "製造業（見出し分類）";
  if (/運送|倉庫|トラック|貨物|新幹線|鉄道/u.test(title)) {
    return "運輸・交通関連（見出し分類）";
  }
  if (/工事|建設|解体|土木|クレーン/u.test(title)) {
    return "建設業（見出し分類）";
  }
  return "業種未確認";
}

function classifyAccidentType(title: string): string {
  if (/転落|墜落/u.test(title)) return "墜落・転落（見出し分類）";
  if (/挟ま|巻き込|下敷き/u.test(title)) {
    return "はさまれ・巻き込まれ（見出し分類）";
  }
  if (/はねられ|衝突|激突/u.test(title)) {
    return "交通事故・激突され（見出し分類）";
  }
  if (/崩落|崩壊|倒壊/u.test(title)) return "崩壊・倒壊（見出し分類）";
  if (/落下|飛来/u.test(title)) return "飛来・落下（見出し分類）";
  if (/爆発|火災/u.test(title)) return "爆発・火災（見出し分類）";
  if (/感電/u.test(title)) return "感電（見出し分類）";
  return "事故型未確認";
}

function measureType(classification: string): string | null {
  if (classification.startsWith("墜落・転落")) return "墜落、転落";
  if (classification.startsWith("はさまれ")) return "はさまれ、巻き込まれ";
  if (classification.startsWith("交通事故")) return "激突され";
  if (classification.startsWith("崩壊")) return "崩壊、倒壊";
  if (classification.startsWith("飛来")) return "飛来、落下";
  if (classification.startsWith("爆発")) return "爆発";
  if (classification.startsWith("感電")) return "感電";
  return null;
}

function bigrams(value: string): Set<string> {
  const normalized = normalizeTitleForDedupe(value).replace(
    /[\s　、。,.「」『』【】（）()＜＞<>・：:]/gu,
    "",
  );
  const chars = Array.from(normalized);
  const result = new Set<string>();
  for (let index = 0; index < chars.length - 1; index += 1) {
    result.add(`${chars[index]}${chars[index + 1]}`);
  }
  return result;
}

function isLikelySameReportEvent(left: string, right: string): boolean {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return false;
  let overlap = 0;
  for (const item of a) {
    if (b.has(item)) overlap += 1;
  }
  return overlap / Math.min(a.size, b.size) >= 0.38;
}

function isoDate(pubDate: string): string | null {
  const timestamp = parsePubDateMs(pubDate);
  if (timestamp === null) return null;
  return new Date(timestamp).toISOString();
}

export type HomeLatestAccidentReport = {
  id: string;
  title: string;
  href: string;
  publishedAt: string;
  publisher: string;
  industry: string;
  accidentType: string;
  summary: string;
  measure: string;
  verification: "reported-unverified";
};

export function selectHomeLatestAccidentReports(
  items: readonly LaborRssItem[],
  nowMs: number,
  limit = 3,
): HomeLatestAccidentReport[] {
  const eligible = items
    .map((item) => ({
      item,
      publishedMs: parsePubDateMs(item.pubDate),
      ...splitPublisher(item.title),
    }))
    .filter(
      (
        entry,
      ): entry is typeof entry & {
        publishedMs: number;
      } =>
        entry.publishedMs !== null &&
        entry.publishedMs <= nowMs + FUTURE_TOLERANCE_MS &&
        nowMs - entry.publishedMs <= FRESH_DAYS * DAY_MS &&
        !FOREIGN_MARKERS.test(entry.item.title) &&
        WORK_MARKERS.test(entry.headline) &&
        INCIDENT_MARKERS.test(entry.headline) &&
        !NON_INCIDENT_MARKERS.test(entry.headline) &&
        scoreLaborNewsSeriousness(entry.headline) >= 55,
    )
    .sort(
      (left, right) =>
        right.publishedMs - left.publishedMs ||
        scoreLaborNewsSeriousness(right.headline) -
          scoreLaborNewsSeriousness(left.headline),
    );

  const selected: HomeLatestAccidentReport[] = [];
  for (const entry of eligible) {
    if (
      selected.some((report) =>
        isLikelySameReportEvent(report.title, entry.headline),
      )
    ) {
      continue;
    }
    const publishedAt = isoDate(entry.item.pubDate);
    if (!publishedAt) continue;
    const accidentType = classifyAccidentType(entry.headline);
    selected.push({
      id: `${publishedAt}:${normalizeTitleForDedupe(entry.headline)}`,
      title: entry.headline,
      href: entry.item.link,
      publishedAt,
      publisher: entry.publisher,
      industry: classifyIndustry(entry.headline),
      accidentType,
      summary:
        "報道見出しの掲載です。発生経緯・原因・法的評価は一次発表で未確認です。",
      measure: getGeneralMeasures(measureType(accidentType)),
      verification: "reported-unverified",
    });
    if (selected.length >= limit) break;
  }
  return selected;
}
