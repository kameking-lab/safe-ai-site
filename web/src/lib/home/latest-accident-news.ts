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
  /コソボ|プリシュティナ|カンプ・ノウ|Vietnam\.vn|Chosunbiz|kossev|海外(?:の|で)|国外(?:の|で)|ベトナム(?:で|北部|南部|中部|の工場|の現場)|ハイフォン|Hải\s*Phòng|Hai\s*Phong|タイで|韓国で|中国で|米国で|アメリカで|インドで|スペインで/u;
// RSSの配信国は事故発生地の証拠にならない。国内の地名が見出しで確認できる報道だけ掲載する。
const DOMESTIC_MARKERS =
  /北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄|川崎|横浜|名古屋|札幌|仙台|神戸|北九州/u;
const WORK_MARKERS =
  /作業員|警備員|従業員|社員|労働者|工事|建設|解体|現場|工場|倉庫|製鉄所|運送|クレーン|フォークリフト|重機|大型特殊自動車/u;
const INCIDENT_MARKERS =
  /死亡|死者|遺体|転落|墜落|崩落|崩壊|倒壊|挟ま|巻き込|はねられ|衝突|激突|爆発|火災|感電|下敷き|落下/u;
const FATAL_MARKERS = /死亡|死者|遺体|命を落と/u;
const NON_INCIDENT_MARKERS =
  /リスクアセスメント|重点点検|教育を実施|増加傾向|統計|防止週間|講習|セミナー|対策を解説/u;
/**
 * 事故そのものの発生速報ではなく、後日の司法・行政手続や件数集計を
 * 主題にした見出し。これらは事故関連報道ではあるが、速報の先頭へ
 * 混ぜると「直近に起きた事故」と誤認させるため除外する。
 */
const INCIDENT_FOLLOW_UP_MARKERS =
  /書類送検|送検(?:した|へ)|起訴|不起訴|判決|勝訴|敗訴|高裁|地裁|最高裁|賠償|企業責任|労災認定|緊急要請|(?:労働局|労基署).*(?:要請|指導)|死亡事故.*(?:\d+件|件発生)|労災.*\d+件発生/u;

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

export function isDomesticFatalAccidentHeadline(title: string): boolean {
  const { headline } = splitPublisher(title);
  return (
    !FOREIGN_MARKERS.test(title) &&
    DOMESTIC_MARKERS.test(headline) &&
    WORK_MARKERS.test(headline) &&
    FATAL_MARKERS.test(headline) &&
    INCIDENT_MARKERS.test(headline) &&
    !NON_INCIDENT_MARKERS.test(headline) &&
    !INCIDENT_FOLLOW_UP_MARKERS.test(headline)
  );
}

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
        isDomesticFatalAccidentHeadline(entry.item.title) &&
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
