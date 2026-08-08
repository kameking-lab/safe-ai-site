import type { LawArticle } from "@/data/laws";
import { normalizeArticleQuery } from "@/lib/cross-search";
import { normalizeArticleNumToKey } from "@/lib/article-number-normalize";
import {
  hasFutureLegalPremise,
  legalAnswerAsOf,
} from "@/lib/legal-answer-temporal";

export type ExactLegalEvidenceAnswer = {
  answer: string;
  articles: LawArticle[];
  temporalStatus:
    | "effective"
    | "future-unverified"
    | "status-unverified";
  answerAsOf: string;
};

const KNOWN_EFFECTIVE: Record<
  string,
  { effectiveOn: string; officialUrl: string; checkedAt: string }
> = {
  "安衛則:612-2--": {
    effectiveOn: "2025-06-01",
    officialUrl:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9174&dataType=1&pageNo=1",
    checkedAt: "2026-07-28",
  },
};

function compact(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・\-—–,，.。?？!！「」『』（）()]/g, "");
}

export function buildExactLegalEvidenceAnswer(
  query: string,
  candidates: LawArticle[],
  now: Date = new Date(),
): ExactLegalEvidenceAnswer | null {
  const normalizedQuery = normalizeArticleQuery(query);
  const compactQuery = compact(normalizedQuery);
  const requestedArticleKeys = new Set(
    (normalizedQuery.match(/第\d+条(?:の\d+)*/g) ?? [])
      .map((reference) => normalizeArticleNumToKey(reference))
      .filter((key): key is string => Boolean(key)),
  );
  const exact = candidates.filter((article) => {
    const articleKey = normalizeArticleNumToKey(article.articleNum);
    const hasArticle = Boolean(
      articleKey && requestedArticleKeys.has(articleKey),
    );
    const canonicalLaw = article.law.replace(/[（(][^）)]*[）)]/g, "");
    const hasLaw =
      compactQuery.includes(compact(canonicalLaw)) ||
      compactQuery.includes(compact(article.lawShort));
    return hasLaw && hasArticle;
  });
  const knownQuestionMatch =
    exact.length === 0 &&
    /足場/.test(normalizedQuery) &&
    /(?:手すり|中さん|中桟)/.test(normalizedQuery) &&
    /(?:高さ|何センチ|何cm|基準)/i.test(normalizedQuery)
      ? candidates.filter(
          (article) =>
            article.lawShort === "安衛則" &&
            normalizeArticleNumToKey(article.articleNum) === "563---",
        )
      : [];
  const acidQualificationMatch =
    /(?:酸欠|酸素欠乏)/.test(normalizedQuery) &&
    /(?:資格|免許|講習|教育|作業主任者|従事)/.test(normalizedQuery)
      ? candidates.filter(
          (article) =>
            article.lawShort === "酸欠則" &&
            ["11---", "12---"].includes(
              normalizeArticleNumToKey(article.articleNum) ?? "",
            ),
        )
      : [];
  if (acidQualificationMatch.length === 2) {
    const articles = ["11---", "12---"].flatMap((articleKey) =>
      acidQualificationMatch.filter(
        (article) =>
          normalizeArticleNumToKey(article.articleNum) === articleKey,
      ),
    );
    const answerAsOf = legalAnswerAsOf(now);
    const isFuture = hasFutureLegalPremise(query, now);
    const temporalStatus = isFuture
      ? "future-unverified"
      : "status-unverified";
    const temporalText = isFuture
      ? "質問に将来時点の前提が含まれるため、将来の義務内容は推測しません。"
      : "施行状態: 未検証。e-Govの現行法令、改正履歴、附則で確認してください。";
    const sources = articles
      .map(
        (article) =>
          `${article.law} ${article.articleNum}: ${article.sourceUrl ?? "https://laws.e-gov.go.jp/"}`,
      )
      .join("\n");

    return {
      articles,
      temporalStatus,
      answerAsOf,
      answer:
        "【役割別に確認が必要です】\n" +
        "・作業に従事する労働者: 酸欠則第12条に基づく「特別の教育」が必要です。\n" +
        "・作業主任者: 酸欠則第11条に基づき、第1種・第2種の区分に応じた技能講習修了者から選任します。\n\n" +
        "従事者か作業主任者か、また第1種か第2種かが不明なため、単一の資格として確定しません。作業場所と硫化水素のおそれも確認してください。\n\n" +
        `回答基準日: ${answerAsOf} JST\n` +
        `${temporalText}\n` +
        `${sources}\n\n` +
        "この表示は収録条文の役割整理で、個別事案への法的判断ではありません。最新の公式現行法令・所轄機関で確認してください。",
    };
  }
  const unique = [
    ...new Map(
      [...exact, ...knownQuestionMatch].map((article) => [
        `${article.law}|${normalizeArticleNumToKey(article.articleNum) ?? article.articleNum}`,
        article,
      ]),
    ).values(),
  ];
  const requestedExactArticles = [...requestedArticleKeys].flatMap(
    (articleKey) =>
      unique.filter(
        (article) =>
          normalizeArticleNumToKey(article.articleNum) === articleKey,
      ),
  );
  if (
    requestedArticleKeys.size > 1 &&
    requestedExactArticles.length === requestedArticleKeys.size &&
    new Set(requestedExactArticles.map((article) => article.law)).size === 1
  ) {
    const answerAsOf = legalAnswerAsOf(now);
    const temporalStatus = hasFutureLegalPremise(query, now)
      ? "future-unverified"
      : "status-unverified";
    return {
      articles: requestedExactArticles,
      temporalStatus,
      answerAsOf,
      answer: `指定された${requestedExactArticles.map((article) => article.articleNum).join("と")}を確認しました。`,
    };
  }
  if (unique.length !== 1) return null;

  const article = unique[0]!;
  const supportingArticles =
    article.lawShort === "安衛則" &&
    normalizeArticleNumToKey(article.articleNum) === "563---" &&
    /(?:足場|あしば|安衛則\s*第?563条|労働安全衛生規則\s*第?563条)/.test(
      normalizedQuery,
    ) &&
    /(?:手すり|手摺|中さん|中桟|高さ|何センチ|何cm)/i.test(normalizedQuery)
      ? [
          article,
          ...candidates.filter(
            (candidate) =>
              candidate.lawShort === "安衛則" &&
              normalizeArticleNumToKey(candidate.articleNum) === "552---",
          ),
        ].slice(0, 2)
      : unique;
  const answerAsOf = legalAnswerAsOf(now);
  const key = `${article.lawShort}:${normalizeArticleNumToKey(article.articleNum) ?? article.articleNum}`;
  const effective = KNOWN_EFFECTIVE[key];
  const isFuture = hasFutureLegalPremise(query, now);
  const temporalStatus = isFuture
    ? "future-unverified"
    : effective
      ? "effective"
      : "status-unverified";
  const temporalText = isFuture
    ? "質問に将来時点の前提が含まれますが、その時点の施行状態を公式資料で確認できないため、将来の義務内容は推測しません。"
    : effective
      ? `施行日: ${effective.effectiveOn}（厚生労働省資料、確認日 ${effective.checkedAt}）`
      : "施行状態: 未検証。e-Govの現行法令、改正履歴、附則で確認してください。";
  const sourceUrl =
    effective?.officialUrl ??
    article.sourceUrl ??
    "https://laws.e-gov.go.jp/";
  const fetchedAt = article.sourceFetchedAt ?? "取得日時未記録";
  const integrity =
    article.verificationStatus === "snapshot-hash-verified"
      ? "snapshot hash一致"
      : "完全性未検証";
  const scaffoldHeightConclusion =
    supportingArticles.some(
      (supportingArticle) =>
        supportingArticle.lawShort === "安衛則" &&
        normalizeArticleNumToKey(supportingArticle.articleNum) === "552---",
    )
      ? "結論\nわく組足場以外では、手すり等は85センチメートル以上、中桟等は35センチメートル以上50センチメートル以下です。足場の種類によって設備条件が変わります。\n\n"
      : "";

  return {
    articles: supportingArticles,
    temporalStatus,
    answerAsOf,
    answer:
      scaffoldHeightConclusion +
      `【指定条文の収録正本を確認】\n` +
      `${article.law} ${article.articleNum}${article.articleTitle ? `「${article.articleTitle}」` : ""}\n\n` +
      `${article.text}\n\n` +
      `回答基準日: ${answerAsOf} JST\n` +
      `${temporalText}\n` +
      `収録snapshot取得日時: ${fetchedAt}\n` +
      `完全性確認: ${integrity}／人手法務レビュー: ${article.humanReviewStatus === "not-reviewed" ? "未実施" : "記録なし"}\n` +
      `一次資料: ${sourceUrl}\n\n` +
      "この表示は指定条文の原文確認用で、個別事案への法的判断ではありません。適用条件と最新改正は公式現行法令・所轄機関で確認してください。",
  };
}
