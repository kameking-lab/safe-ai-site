/**
 * Hybrid pre-filter + per-type threshold logic for the news-feed AI judge.
 *
 * Audit (2026-05-17) of the first cron run found two systematic problems:
 *
 *  1. The single `duplication > 50` threshold was being applied uniformly to
 *     MHLW administrative notices (committee/審査会 announcements), causing
 *     legitimate labor-safety items to be rejected because the model rated
 *     "similar notices recur" as duplication of the accident DB. That was a
 *     misinterpretation of the score's intent.
 *
 *  2. A non-trivial share of NHK candidates that pass the coarse keyword
 *     pre-filter (e.g. 「小中学校でも熱中症対策」) are about schoolchildren,
 *     home cooling failures, or tourists — i.e. clearly not workplace. They
 *     burn one Gemini call each before being rejected, even though they could
 *     be ruled out on the headline alone.
 *
 * Fixes
 * -----
 *  - `prefilter(headline)` runs BEFORE the AI call. If the headline matches a
 *    negative pattern (school/home/general-public context), it is auto-rejected
 *    with `prefilter:negative-keyword`. No Gemini call is made.
 *
 *  - `thresholdsFor(newsType)` returns a per-type threshold object. For
 *    `administrative_notice` the duplication ceiling is dropped (set to 100)
 *    because administrative notices are NOT records in the accident DB; their
 *    recurrence is structural, not redundancy.
 *
 *  - `classifyOutcome(scores, newsType)` returns
 *    `"approved" | "pending" | "rejected"`. `pending` covers borderline cases:
 *    relevance 50-69 with otherwise-clean scores, OR a clean accident report
 *    with duplication 51-70. These land in `pending/index.json` for review
 *    rather than being silently dropped.
 */

/* ---------------------------------------------------------------------- */
/* negative keyword pre-filter                                             */
/* ---------------------------------------------------------------------- */

/**
 * Patterns that strongly indicate the article is NOT about labor safety, even
 * though the coarse keyword filter let it through. Each entry is `[regex, tag]`
 * — the tag goes into the rejection reason for operator audit.
 *
 * Intentionally narrow: prefer false negatives (let AI decide) over false
 * positives (silently drop something we should have judged). Each pattern must
 * be a phrase that is extremely unlikely to co-occur with a workplace incident.
 */
const NEGATIVE_PATTERNS = [
  [/小中学校|小学校|中学校|高校|大学|児童|生徒|学生/, "school-context"],
  [/保育園|幼稚園|こども園/, "childcare-context"],
  [/家庭で|家庭の|自宅で|室内で.*高齢者|エアコン使用.*高齢者/, "home-context"],
  [/観光客|登山客|海水浴|キャンプ場.*事故|釣り客/, "tourist-context"],
  [/スポーツ.*事故|部活動|練習中.*生徒/, "sports-context"],
  [/通学|通園|登校中|下校中/, "commute-school-context"],
];

/**
 * @param {string} headline
 * @returns {{ blocked: boolean, tag?: string }}
 */
export function prefilter(headline) {
  if (typeof headline !== "string" || headline.length === 0) {
    return { blocked: false };
  }
  for (const [re, tag] of NEGATIVE_PATTERNS) {
    if (re.test(headline)) return { blocked: true, tag };
  }
  return { blocked: false };
}

/* ---------------------------------------------------------------------- */
/* per-type thresholds                                                     */
/* ---------------------------------------------------------------------- */

/**
 * @typedef {"accident_report" | "administrative_notice" | "statistics_release" | "general_news" | "unknown"} NewsType
 */

/** @type {NewsType[]} */
export const NEWS_TYPES = [
  "accident_report",
  "administrative_notice",
  "statistics_release",
  "general_news",
  "unknown",
];

/**
 * Per-type thresholds. Conservative defaults intentionally — only loosen the
 * thresholds where the audit shows the original rule misfires for that type.
 *
 *  - accident_report: original strict rule (all four thresholds).
 *  - administrative_notice: duplication does not apply (committee announcements
 *    are not records in the accident DB).
 *  - statistics_release: same as administrative_notice, plus slightly relaxed
 *    relevance floor because broad-scope statistics releases (e.g. national
 *    occupational injury statistics) often score 60-69 on the headline alone
 *    even though they are genuinely on-topic.
 *  - general_news / unknown: keep strict to avoid drift.
 */
const BASE_THRESHOLDS = {
  relevanceMin: 70,
  copyrightRiskMax: 30,
  misinformationRiskMax: 30,
  duplicationMax: 50,
};

/**
 * @param {NewsType} newsType
 * @returns {{ relevanceMin: number, copyrightRiskMax: number, misinformationRiskMax: number, duplicationMax: number }}
 */
export function thresholdsFor(newsType) {
  switch (newsType) {
    case "administrative_notice":
      return { ...BASE_THRESHOLDS, duplicationMax: 100 };
    case "statistics_release":
      return { ...BASE_THRESHOLDS, duplicationMax: 100, relevanceMin: 60 };
    case "accident_report":
    case "general_news":
    case "unknown":
    default:
      return { ...BASE_THRESHOLDS };
  }
}

/* ---------------------------------------------------------------------- */
/* outcome classification (3-state: approved / pending / rejected)         */
/* ---------------------------------------------------------------------- */

/**
 * @typedef {Object} Scores
 * @property {number} relevance
 * @property {number} copyrightRisk
 * @property {number} misinformationRisk
 * @property {number} duplication
 */

/**
 * Decide approval outcome and produce a list of human-readable reasons for any
 * non-approval branch.
 *
 * The "pending" bucket is reserved for two narrow cases: borderline relevance
 * (50-69) with otherwise-clean scores, or otherwise-clean accident reports
 * whose duplication score landed in 51-70 (close to the rejection line). These
 * are surfaced in /audits/news-feed-stats for operator review instead of
 * being silently rejected.
 *
 * @param {Scores} scores
 * @param {NewsType} newsType
 * @returns {{ outcome: "approved" | "pending" | "rejected", reasons: string[] }}
 */
export function classifyOutcome(scores, newsType) {
  const t = thresholdsFor(newsType);
  const reasons = [];

  if (scores.copyrightRisk > t.copyrightRiskMax) {
    reasons.push(
      `copyrightRisk ${scores.copyrightRisk} > ${t.copyrightRiskMax} (Article 32 quotation framing unsafe)`,
    );
  }
  if (scores.misinformationRisk > t.misinformationRiskMax) {
    reasons.push(
      `misinformationRisk ${scores.misinformationRisk} > ${t.misinformationRiskMax} (primary source unclear)`,
    );
  }
  if (scores.duplication > t.duplicationMax) {
    reasons.push(
      `duplication ${scores.duplication} > ${t.duplicationMax} (already covered in accident DB)`,
    );
  }
  if (scores.relevance < t.relevanceMin) {
    reasons.push(
      `relevance ${scores.relevance} < ${t.relevanceMin} (not labor-safety related for type=${newsType})`,
    );
  }

  if (reasons.length === 0) return { outcome: "approved", reasons: [] };

  // Pending: only one reason AND it is the relevance floor by a small margin,
  // OR only one reason AND it is duplication by a small margin on an
  // accident_report. These are the cases the audit flagged as ambiguous.
  if (reasons.length === 1) {
    const onlyRelevance =
      scores.copyrightRisk <= t.copyrightRiskMax &&
      scores.misinformationRisk <= t.misinformationRiskMax &&
      scores.duplication <= t.duplicationMax &&
      scores.relevance >= 50 &&
      scores.relevance < t.relevanceMin;
    const onlyDuplicationOnAccident =
      newsType === "accident_report" &&
      scores.relevance >= t.relevanceMin &&
      scores.copyrightRisk <= t.copyrightRiskMax &&
      scores.misinformationRisk <= t.misinformationRiskMax &&
      scores.duplication > t.duplicationMax &&
      scores.duplication <= 70;
    if (onlyRelevance || onlyDuplicationOnAccident) {
      return { outcome: "pending", reasons };
    }
  }

  return { outcome: "rejected", reasons };
}

/**
 * Normalise an arbitrary string from the model into one of the known types.
 *
 * @param {unknown} raw
 * @returns {NewsType}
 */
export function normalizeNewsType(raw) {
  if (typeof raw !== "string") return "unknown";
  const s = raw.trim().toLowerCase();
  if (!s) return "unknown";
  if (NEWS_TYPES.includes(/** @type {NewsType} */ (s))) {
    return /** @type {NewsType} */ (s);
  }
  // Allow common Japanese fall-back labels that the model sometimes emits.
  if (s.includes("accident") || s.includes("事故")) return "accident_report";
  if (s.includes("admin") || s.includes("行政") || s.includes("notice")) {
    return "administrative_notice";
  }
  if (s.includes("statistic") || s.includes("統計") || s.includes("調査")) {
    return "statistics_release";
  }
  if (s.includes("general") || s.includes("一般")) return "general_news";
  return "unknown";
}
