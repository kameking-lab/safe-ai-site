import type { LawArticle } from "@/data/laws";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { verifiedPrimaryNoticeArticles } from "@/data/laws/verified-primary-notices";
import { getProvisionEffectiveDate } from "@/data/law-metadata";
import {
  classifyLegalQuestionTime,
  legalDateTextToGregorian,
  requestedLegalPeriod,
  type LegalRequestedPeriod,
} from "@/lib/legal-answer-temporal";
import {
  extractLegalConversationContext,
  normalizeLegalConversationText,
  type LegalConversationContext,
} from "@/lib/legal-conversation-context";
import {
  extractLegalItems,
  extractLegalParagraph,
  extractRequestedLegalItem,
} from "@/lib/legal-unit-extract";
import { kanjiToArabic } from "@/lib/article-number-normalize";
import { detectForkliftQueryIntent } from "@/lib/rag/forklift-intent";
import { detectHighLiftQueryIntent } from "@/lib/rag/high-lift-intent";

function compact(value: string): string {
  return normalizeLegalConversationText(value).replace(
    /[\s　、。,!?！？]/g,
    "",
  );
}

/**
 * 酸欠則12条1項3号・4号が第二種にも及ぶかを尋ねる表現揺れを、
 * 回答本文と引用範囲で同じように判定する。
 */
export function isOxygenEducationSubjectsThreeAndFourCommonIntent(
  query: string,
): boolean {
  const normalized = compact(query)
    .normalize("NFKC")
    .replace(
      /第?([一二三四五六七八九十百千]+)(条|項|号)/gu,
      (_match, number: string, unit: string) =>
        `第${kanjiToArabic(number)}${unit}`,
    );

  return (
    /(?:酸欠|酸素欠乏|酸欠則)/.test(normalized) &&
    /第?12条第?1項/.test(normalized) &&
    /第?3号/.test(normalized) &&
    /第?4号/.test(normalized) &&
    /(?:第?二種|第?2種)/.test(normalized) &&
    /(?:同じ|共通|変わらない|読み替えない|適用|準用|対象|含まれ|必要|要る|受講|履修)/.test(
      normalized,
    )
  );
}

function isEmploymentEducationQuery(value: string): boolean {
  const normalized = compact(value);
  return (
    /(?:雇(?:い)?入れ|入社|新人).*(?:教育|きょういく)/.test(normalized) ||
    /(?:教育|きょういく).*(?:雇(?:い)?入れ|入社|新人)/.test(normalized)
  );
}

function explicitlyRequestedItemLabel(query: string): string | undefined {
  const match = query
    .normalize("NFKC")
    .match(
      /第?\s*([0-9一二三四五六七八九十百千]+)\s*号((?:\s*の\s*[0-9一二三四五六七八九十百千]+)*)/,
    );
  if (!match?.[1]) return undefined;
  const convert = (value: string): number | null => {
    const normalized = value.replace(/\s+/g, "");
    const number = /^\d+$/.test(normalized)
      ? Number(normalized)
      : Number(kanjiToArabic(normalized));
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const head = convert(match[1]);
  if (head === null) return undefined;
  const branches = [
    ...(match[2] ?? "").matchAll(/の\s*([0-9一二三四五六七八九十百千]+)/g),
  ].map((candidate) => (candidate[1] ? convert(candidate[1]) : null));
  if (branches.some((branch) => branch === null)) return undefined;
  return `第${head}号${branches.map((branch) => `の${branch}`).join("")}`;
}

function explicitItemQueryScope(query: string, articleNum?: string): string {
  return articleNum && explicitlyRequestsArticle(query, articleNum)
    ? explicitUnitQueryScope(query, articleNum)
    : query;
}

export function explicitlyRequestedItemRangeLabel(
  query: string,
  articleNum?: string,
): string | undefined {
  const match = explicitItemQueryScope(query, articleNum)
    .normalize("NFKC")
    .match(
      /第?\s*([0-9一二三四五六七八九十百千]+)\s*号\s*(?:から|〜|～|~|－|-)\s*第?\s*([0-9一二三四五六七八九十百千]+)\s*号/,
    );
  if (!match?.[1] || !match[2]) return undefined;
  const convert = (value: string): number | null => {
    const converted = Number(
      /^\d+$/.test(value) ? value : kanjiToArabic(value),
    );
    return Number.isFinite(converted) && converted > 0 ? converted : null;
  };
  const start = convert(match[1]);
  const end = convert(match[2]);
  if (start === null || end === null || start > end) return undefined;
  return `第${start}号〜第${end}号`;
}

/** Preserve every explicitly requested item instead of reducing a list/range to its first item. */
export function explicitlyRequestedItemLabels(
  query: string,
  articleNum?: string,
): string[] {
  const normalized = explicitItemQueryScope(query, articleNum).normalize(
    "NFKC",
  );
  const labels: string[] = [];
  const append = (label: string) => {
    if (!labels.includes(label)) labels.push(label);
  };
  const convert = (value: string): number | null => {
    const compactValue = value.replace(/\s+/g, "");
    const number = /^\d+$/.test(compactValue)
      ? Number(compactValue)
      : Number(kanjiToArabic(compactValue));
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  for (const range of normalized.matchAll(
    /第?\s*([0-9一二三四五六七八九十百千]+)\s*号\s*(?:から|〜|～|~|－|-)\s*第?\s*([0-9一二三四五六七八九十百千]+)\s*号/g,
  )) {
    const start = range[1] ? convert(range[1]) : null;
    const end = range[2] ? convert(range[2]) : null;
    // Avoid allocating an unbounded list from malformed or hostile input.
    if (start === null || end === null || start > end || end - start > 100)
      continue;
    for (let number = start; number <= end; number += 1) {
      append(`第${number}号`);
    }
  }

  for (const item of normalized.matchAll(
    /第?\s*([0-9一二三四五六七八九十百千]+)\s*号((?:\s*の\s*[0-9一二三四五六七八九十百千]+)*)/g,
  )) {
    if (!item[1]) continue;
    const head = convert(item[1]);
    if (head === null) continue;
    const branches = [
      ...(item[2] ?? "").matchAll(/の\s*([0-9一二三四五六七八九十百千]+)/g),
    ].map((branch) => (branch[1] ? convert(branch[1]) : null));
    if (branches.some((branch) => branch === null)) continue;
    append(`第${head}号${branches.map((branch) => `の${branch}`).join("")}`);
  }
  return labels;
}

export function explicitlyRequestedItemSelectionLabel(
  query: string,
  articleNum?: string,
): string | undefined {
  const range = explicitlyRequestedItemRangeLabel(query, articleNum);
  const labels = explicitlyRequestedItemLabels(query, articleNum);
  const rangeBounds = range?.match(/^第(\d+)号〜第(\d+)号$/);
  const rangeStart = rangeBounds?.[1] ? Number(rangeBounds[1]) : null;
  const rangeEnd = rangeBounds?.[2] ? Number(rangeBounds[2]) : null;
  if (
    range &&
    rangeStart !== null &&
    rangeEnd !== null &&
    labels.length === rangeEnd - rangeStart + 1
  ) {
    return range;
  }
  return labels.length > 1 ? labels.join("・") : undefined;
}

function explicitArticleLocation(
  query: string,
  articleNum: string,
): { start: number; end: number } | null {
  const normalized = compact(query);
  const core = compact(articleNum).replace(/^第/, "");
  let offset = normalized.indexOf(core);
  while (offset >= 0) {
    const hasPrefix = normalized[offset - 1] === "第";
    const start = hasPrefix ? offset - 1 : offset;
    const previous = normalized[start - 1] ?? "";
    const suffix = normalized.slice(offset + core.length);
    const embeddedInNumber = /[0-9一二三四五六七八九十百千]/.test(previous);
    const isLongerArticle =
      !core.includes("条の") &&
      /^の[0-9一二三四五六七八九十百千]+/u.test(suffix);
    if (!embeddedInNumber && !isLongerArticle) {
      return { start, end: offset + core.length };
    }
    offset = normalized.indexOf(core, offset + 1);
  }
  return null;
}

function explicitlyRequestsArticle(query: string, articleNum: string): boolean {
  return explicitArticleLocation(query, articleNum) !== null;
}

function explicitUnitQueryScope(query: string, articleNum: string): string {
  const normalized = compact(query);
  const location = explicitArticleLocation(normalized, articleNum);
  if (!location) return normalized;
  const afterCurrent = location.end;
  const nextArticle = normalized
    .slice(afterCurrent)
    .search(
      /第[0-9一二三四五六七八九十百千]+条(?:の[0-9一二三四五六七八九十百千]+)?/u,
    );
  return nextArticle < 0
    ? normalized.slice(location.start)
    : normalized.slice(location.start, afterCurrent + nextArticle);
}

type LoadRange = {
  minimum: number;
  minimumInclusive: boolean;
  maximum: number;
  maximumInclusive: boolean;
};

function toTons(amount: number, unit: string): number {
  return /^(?:kg|キログラム)$/i.test(unit) ? amount / 1_000 : amount;
}

/** Keep threshold words from quick replies instead of reducing them to one number. */
function loadRangeInTons(value: string): LoadRange | null {
  const normalized = value.normalize("NFKC");
  const rangeMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:〜|~|～|から)\s*(\d+(?:\.\d+)?)\s*(kg|キログラム|t|トン)(未満|以下)?/i,
  );
  if (rangeMatch) {
    const lower = toTons(Number(rangeMatch[1]), rangeMatch[3]!);
    const upper = toTons(Number(rangeMatch[2]), rangeMatch[3]!);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
      return null;
    }
    return {
      minimum: lower,
      minimumInclusive: true,
      maximum: upper,
      maximumInclusive: rangeMatch[4] === "以下",
    };
  }

  const match = normalized.match(
    /(\d+(?:\.\d+)?)\s*(kg|キログラム|t|トン)(未満|以下|以上|超)?/i,
  );
  if (!match) return null;
  const amount = toTons(Number(match[1]), match[2]!);
  if (!Number.isFinite(amount)) return null;
  switch (match[3]) {
    case "未満":
      return {
        minimum: 0,
        minimumInclusive: true,
        maximum: amount,
        maximumInclusive: false,
      };
    case "以下":
      return {
        minimum: 0,
        minimumInclusive: true,
        maximum: amount,
        maximumInclusive: true,
      };
    case "以上":
      return {
        minimum: amount,
        minimumInclusive: true,
        maximum: Number.POSITIVE_INFINITY,
        maximumInclusive: false,
      };
    case "超":
      return {
        minimum: amount,
        minimumInclusive: false,
        maximum: Number.POSITIVE_INFINITY,
        maximumInclusive: false,
      };
    default:
      return {
        minimum: amount,
        minimumInclusive: true,
        maximum: amount,
        maximumInclusive: true,
      };
  }
}

function isDefinitelyBelow(load: LoadRange | null, threshold: number): boolean {
  return Boolean(
    load &&
    (load.maximum < threshold ||
      (load.maximum === threshold && !load.maximumInclusive)),
  );
}

function isDefinitelyAtLeast(
  load: LoadRange | null,
  threshold: number,
): boolean {
  return Boolean(
    load &&
    (load.minimum > threshold ||
      (load.minimum === threshold && load.minimumInclusive)),
  );
}

/** Add only verified provisions that directly define a retrieved threshold. */
export function expandVerifiedLegalEvidenceArticles(
  query: string,
  candidates: LawArticle[],
): LawArticle[] {
  const normalized = compact(query);
  const load = loadRangeInTons(normalized);
  const forkliftIntent = detectForkliftQueryIntent(query);
  const highLiftIntent = detectHighLiftQueryIntent(query);
  const required: Array<[string, string]> = [];
  const conversationContext = extractLegalConversationContext(query);
  const employmentEducationIntent = isEmploymentEducationQuery(query);
  const lacksWorkContext = Boolean(
    !conversationContext.workType && !conversationContext.equipment,
  );
  const specificFumigationMonitorIntent =
    /(?:特化則|特定化学物質障害予防規則)第?38条の14/.test(normalized) &&
    /(?:監視人|監視者|監視)/.test(normalized);

  if (/フォー?クリフト/.test(normalized) && forkliftIntent.qualification) {
    if (isDefinitelyBelow(load, 1)) {
      required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
    } else if (isDefinitelyAtLeast(load, 1)) {
      required.push(["安衛法", "第61条"], ["安衛令", "第20条"]);
    } else {
      required.push(
        ["安衛法", "第59条"],
        ["安衛則", "第36条"],
        ["安衛法", "第61条"],
        ["安衛令", "第20条"],
      );
    }
    if (
      /技能講習/.test(normalized) &&
      /(?:いつまで有効|有効期限|期限|更新)/.test(normalized)
    ) {
      required.push(["安衛則", "第82条"]);
    }
  }
  if (forkliftIntent.annualInspection || forkliftIntent.genericInspection) {
    required.push(["安衛則", "第151条の21"]);
  }
  if (forkliftIntent.monthlyInspection || forkliftIntent.genericInspection) {
    required.push(["安衛則", "第151条の22"]);
  }
  if (forkliftIntent.workLeader) {
    required.push(["安衛則", "第151条の4"]);
  }
  if (
    /(?:つり|吊り)足場/.test(normalized) &&
    /(?:点検|始業前|使用前|作業開始前|毎日|毎作業日)/.test(normalized)
  ) {
    required.push(["安衛則", "第568条"], ["安衛則", "第567条"]);
  }
  if (
    /玉掛/.test(normalized) &&
    /資格|免許|技能講習|特別教育|何(?:t|トン)から|必要|いる|要る/i.test(
      normalized,
    )
  ) {
    if (isDefinitelyBelow(load, 1)) {
      required.push(["安衛令", "第10条"], ["クレーン則", "第222条"]);
    } else if (isDefinitelyAtLeast(load, 1)) {
      required.push(
        ["安衛令", "第10条"],
        ["安衛令", "第20条"],
        ["クレーン則", "第221条"],
      );
    } else {
      required.push(
        ["安衛令", "第10条"],
        ["安衛令", "第20条"],
        ["クレーン則", "第221条"],
        ["クレーン則", "第222条"],
      );
    }
  }
  if (
    /移動式クレーン/.test(normalized) &&
    /資格|免許|技能講習|特別教育/.test(normalized)
  ) {
    if (isDefinitelyBelow(load, 1)) {
      required.push(["クレーン則", "第67条"]);
    } else if (isDefinitelyAtLeast(load, 1)) {
      required.push(["クレーン則", "第68条"]);
    }
  }
  if (
    /有機溶剤/.test(normalized) &&
    /(?:屋内|換気|局所排気|局排|プッシュプル)/.test(normalized)
  ) {
    required.push(
      ["有機則", "第1条"],
      ["有機則", "第5条"],
      ["有機則", "第6条"],
      ["有機則", "第8条"],
      ["有機則", "第9条"],
    );
  }
  if (/(?:酸欠|酸素欠乏|酸素濃度)/.test(normalized)) {
    if (/(?:測定|濃度|記録|保存|何年|硫化水素|H2S|ppm)/i.test(normalized)) {
      required.push(["酸欠則", "第2条"], ["酸欠則", "第3条"]);
    }
    if (
      /(?:換気|酸素濃度|硫化水素|H2S|ppm|何パーセント|何%)/i.test(normalized)
    ) {
      required.push(["酸欠則", "第2条"], ["酸欠則", "第5条"]);
    }
    if (
      /(?:換気.*(?:例外|できない|困難)|保護具|空気呼吸器|酸素呼吸器|送気マスク)/.test(
        normalized,
      )
    ) {
      required.push(["酸欠則", "第5条の2"]);
    }
    if (/作業主任者/.test(normalized)) {
      required.push(["酸欠則", "第11条"]);
    }
    if (/(?:特別教育|教育)/.test(normalized)) {
      required.push(["安衛法", "第59条"], ["酸欠則", "第12条"]);
    }
    if (/(?:監視人|監視者|監視)/.test(normalized)) {
      required.push(
        ["酸欠則", "第3条"],
        ["酸欠則", "第5条"],
        ["酸欠則", "第11条"],
        ["酸欠則", "第12条"],
        ["酸欠則", "第13条"],
      );
    }
  }
  if (
    /(?:足場|第?563条)/.test(normalized) &&
    /(?:手すり|中さん|中桟|高さ|何センチ|何cm)/i.test(normalized)
  ) {
    required.push(["安衛則", "第563条"], ["安衛則", "第552条"]);
  }
  if (
    /(?:足場|作業床|第?563条)/.test(normalized) &&
    /(?:幅|隙間|すき間)/.test(normalized)
  ) {
    required.push(["安衛則", "第563条"]);
  }
  if (
    /開口部/.test(normalized) &&
    /(?:手すり|囲い|覆い|養生|墜落防止|どうする|必要)/.test(normalized)
  ) {
    required.push(["安衛則", "第519条"]);
  }
  if (/(?:電気作業|電気工事|充電電路)/.test(normalized)) {
    if (/(?:作業指揮者|作業の指揮者)/.test(normalized)) {
      required.push(["安衛則", "第350条"]);
    } else if (/作業主任者/.test(normalized)) {
      required.push(
        ["安衛法", "第14条"],
        ["安衛令", "第6条"],
        ["安衛則", "第339条"],
        ["安衛則", "第341条"],
        ["安衛則", "第342条"],
        ["安衛則", "第344条"],
        ["安衛則", "第345条"],
        ["安衛則", "第350条"],
        ["安衛則", "第36条"],
      );
    } else if (/資格|免許|教育|電気工事士/.test(normalized)) {
      required.push(
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
        ["安衛法", "第59条"],
        ["安衛則", "第36条"],
      );
    }
  }
  if (highLiftIntent.fallProtection) {
    required.push(["安衛則", "第194条の22"]);
  } else if (highLiftIntent.hasHighLiftContext) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛法", "第61条"],
      ["安衛令", "第20条"],
      ["安衛令", "第10条"],
    );
  }
  if (/(?:フルハーネス|墜落制止用器具)/.test(normalized)) {
    if (/(?:特別教育|教育)/.test(normalized)) {
      required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
    } else if (/(?:使用|着用|装着|作業床|必要)/.test(normalized)) {
      required.push(
        ["安衛則", "第518条"],
        ["安衛則", "第519条"],
        ["安衛則", "第520条"],
      );
    }
  }
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized) &&
    /(?:誰|資格|できる|行える|調査者|必要な知識)/.test(normalized)
  ) {
    required.push(["石綿則", "第3条"], ["厚労省告示276号", "第1項"]);
  }
  if (
    /安全管理者/.test(normalized) &&
    /(?:技能講習|資格|研修)/.test(normalized)
  ) {
    required.push(["安衛則", "第5条"]);
  }
  if (specificFumigationMonitorIntent) {
    required.push(["特化則", "第38条の14"]);
  }
  if (
    /(?:労災(?:事故)?|労働災害|休業災害|死傷病|休業)/.test(normalized) &&
    /(?:報告|届出|届け|提出|いつまで)/.test(normalized)
  ) {
    required.push(["安衛則", "第97条"]);
  }
  if (
    lacksWorkContext &&
    /(?:監視人|監視者)/.test(normalized) &&
    !specificFumigationMonitorIntent
  ) {
    required.push(["酸欠則", "第13条"], ["特化則", "第38条の14"]);
  }
  if (lacksWorkContext && /(?:作業指揮者|作業の指揮者)/.test(normalized)) {
    required.push(["安衛則", "第151条の4"], ["安衛則", "第350条"]);
  }
  // A bare qualification label must not inherit whichever specialised law
  // happens to rank first for the word "資格".  Retrieve the framework
  // provisions so the response can explain the available legal branches
  // before asking for one work/equipment condition.
  if (employmentEducationIntent) {
    required.push(["安衛法", "第59条"], ["安衛則", "第35条"]);
  } else if (lacksWorkContext && /作業主任者/.test(normalized)) {
    required.push(["安衛法", "第14条"], ["安衛令", "第6条"]);
  } else if (lacksWorkContext && /特別教育/.test(normalized)) {
    required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
  } else if (
    lacksWorkContext &&
    /(?:資格|免許|技能講習|教育)/.test(normalized)
  ) {
    required.push(
      ["安衛法", "第14条"],
      ["安衛法", "第59条"],
      ["安衛法", "第61条"],
    );
  }

  const primarySources = [
    ...verifiedLawArticles,
    ...verifiedPrimaryNoticeArticles,
  ];
  const additions = required.flatMap(([lawShort, articleNum]) => {
    const found = primarySources.find(
      (article) =>
        article.lawShort === lawShort && article.articleNum === articleNum,
    );
    return found ? [found] : [];
  });
  return [...additions, ...candidates].filter(
    (article, index, values) =>
      values.findIndex(
        (candidate) =>
          candidate.lawShort === article.lawShort &&
          candidate.articleNum === article.articleNum,
      ) === index,
  );
}

function marker(index: number): string {
  return `［${index + 1}］`;
}

function markers(...indexes: number[]): string {
  return [...new Set(indexes)]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)
    .map(marker)
    .join("");
}

export type LegalProvisionUnit = {
  paragraph?: string;
  item?: string;
};

function explicitlyRequestedProvisionUnit(
  article: LawArticle,
  query: string,
): LegalProvisionUnit {
  const normalized = compact(query);
  if (!explicitlyRequestsArticle(normalized, article.articleNum)) return {};
  const scope = explicitUnitQueryScope(query, article.articleNum);
  const paragraphMatch = scope.match(
    /第?\s*([0-9一二三四五六七八九十百千]+)\s*項(?!目)/,
  );
  const paragraphNumber = paragraphMatch?.[1]
    ? Number(
        /^\d+$/.test(paragraphMatch[1])
          ? paragraphMatch[1]
          : kanjiToArabic(paragraphMatch[1]),
      )
    : null;
  return {
    paragraph:
      paragraphNumber !== null &&
      Number.isFinite(paragraphNumber) &&
      paragraphNumber > 0
        ? `第${paragraphNumber}項`
        : undefined,
    item: explicitlyRequestedItemLabel(scope),
  };
}

/** Resolve only provision units whose effective date is confirmed metadata. */
export function legalProvisionUnitForQuery(
  article: LawArticle,
  query: string,
): LegalProvisionUnit {
  const normalized = compact(query);
  const directlyRequested = explicitlyRequestsArticle(
    normalized,
    article.articleNum,
  );
  const explicitUnitScope = directlyRequested
    ? explicitUnitQueryScope(query, article.articleNum)
    : normalized;
  const paragraphMatch = explicitUnitScope.match(
    /第?\s*([0-9一二三四五六七八九十百千]+)\s*項(?!目)/,
  );
  const paragraphNumber = paragraphMatch?.[1]
    ? Number(
        /^\d+$/.test(paragraphMatch[1])
          ? paragraphMatch[1]
          : kanjiToArabic(paragraphMatch[1]),
      )
    : null;
  const requestedItemLabel = explicitlyRequestedItemLabel(explicitUnitScope);
  const hasExplicitUnit =
    directlyRequested &&
    ((paragraphNumber !== null &&
      Number.isFinite(paragraphNumber) &&
      paragraphNumber > 0) ||
      Boolean(requestedItemLabel));
  const organicHealthScopeIntent = /(?:対象業務|どの業務|誰が対象|対象者)/.test(
    normalized,
  );
  // 健診の実施義務は第2項。誤って第1項を指定した質問でも、回答が
  // 訂正して採用する実体的な根拠を優先する。
  if (
    article.lawShort === "有機則" &&
    /^第?29条$/.test(article.articleNum) &&
    /(?:有機溶剤|シンナー)/.test(normalized) &&
    /(?:健康診断|健診)/.test(normalized)
  ) {
    return { paragraph: organicHealthScopeIntent ? "第1項" : "第2項" };
  }
  if (
    article.lawShort === "電気工事士法" &&
    /^第?2条$/.test(article.articleNum) &&
    (/(?:電気作業|充電電路)/.test(normalized) ||
      /(?:電気工事とは|電気工事の定義)/.test(normalized) ||
      (!hasExplicitUnit &&
        /電気工事/.test(normalized.replace(/電気工事士法/g, ""))))
  ) {
    return { paragraph: "第3項" };
  }
  if (
    article.lawShort === "電気工事士法" &&
    /^第?3条$/.test(article.articleNum)
  ) {
    if (/簡易電気工事|認定電気工事従事者/.test(normalized)) {
      return { paragraph: "第4項" };
    }
    if (/特殊電気工事|特種電気工事資格者/.test(normalized)) {
      return { paragraph: "第3項" };
    }
    if (/一般用電気工作物/.test(normalized)) return { paragraph: "第2項" };
    if (/自家用電気工作物/.test(normalized)) return { paragraph: "第1項" };
  }
  const specialEducationIntent =
    /特別教育/.test(normalized) ||
    (/(?:電気作業|電気工事|充電電路|フォー?クリフト|高所作業車|フルハーネス|墜落制止用器具|酸欠|酸素欠乏)/.test(
      normalized,
    ) &&
      /教育/.test(normalized)) ||
    (/(?:フォー?クリフト|高所作業車|フルハーネス|墜落制止用器具)/.test(
      normalized,
    ) &&
      /(?:資格|免許)/.test(normalized));
  const broadQualificationEducationIntent =
    /(?:必要な資格|現場作業.*(?:資格|教育)|資格.*教育|教育.*資格)/.test(
      normalized,
    );
  if (
    article.lawShort === "安衛法" &&
    /^第?59条$/.test(article.articleNum) &&
    (specialEducationIntent ||
      broadQualificationEducationIntent ||
      (/(?:電気作業|電気工事|充電電路)/.test(normalized) &&
        /(?:資格|免許)/.test(normalized)))
  ) {
    return { paragraph: "第3項" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?563条$/.test(article.articleNum) &&
    /(?:足場|手すり|中さん|中桟)/.test(normalized) &&
    /(?:手すり|中さん|中桟|高さ|何センチ|何cm)/i.test(normalized)
  ) {
    return { paragraph: "第1項", item: "第3号" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?563条$/.test(article.articleNum) &&
    /(?:足場|作業床)/.test(normalized) &&
    /(?:幅|隙間|すき間)/.test(normalized)
  ) {
    return { paragraph: "第1項", item: "第2号" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?552条$/.test(article.articleNum) &&
    /(?:足場|第?563条|手すり|中さん|中桟)/.test(normalized) &&
    /(?:手すり|中さん|中桟|高さ|何センチ|何cm)/i.test(normalized)
  ) {
    return { paragraph: "第1項", item: "第4号" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?567条$/.test(article.articleNum) &&
    /足場/.test(normalized) &&
    /点検/.test(normalized) &&
    /(?:記録|保存|残す|保管)/.test(normalized)
  ) {
    return { paragraph: "第3項", item: "第1号・第2号" };
  }
  if (
    article.lawShort === "有機則" &&
    /(?:有機溶剤|シンナー)/.test(normalized) &&
    /屋内/.test(normalized)
  ) {
    const tankOutside =
      /(?:タンク等?の?外|タンク外|内部以外|それ以外の屋内)/.test(normalized);
    const tankInside = /(?:タンク等?の?内部|タンク内)/.test(normalized);
    if (/^第?[89]条$/.test(article.articleNum)) {
      if (tankOutside) return { paragraph: "第1項" };
      if (tankInside) return { paragraph: "第2項" };
    }
    if (
      /^第?6条$/.test(article.articleNum) &&
      /(?:第三種|第[3三]種)/.test(normalized)
    ) {
      if (
        /(?:吹付け以外|吹き?付け(?:作業)?ではない|非吹付け)/.test(normalized)
      ) {
        return { paragraph: "第1項" };
      }
      if (/(?:吹き?付け|スプレー)(?:作業)?/.test(normalized)) {
        return { paragraph: "第2項" };
      }
    }
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    /(?:電気作業|電気工事|充電電路)/.test(normalized) &&
    (/(?:資格|教育|免許|低圧|高圧|特別高圧|敷設|修理|点検|操作)/.test(
      normalized,
    ) ||
      !hasExplicitUnit)
  ) {
    return { item: "第4号" };
  }
  if (
    article.lawShort === "安衛令" &&
    /^第?10条$/.test(article.articleNum) &&
    /高所作業車/.test(normalized)
  ) {
    return { item: "第7号" };
  }
  if (
    article.lawShort === "安衛令" &&
    /^第?10条$/.test(article.articleNum) &&
    /(?:玉掛|つり上げ荷重)/.test(normalized)
  ) {
    return { item: "第1号" };
  }
  if (article.lawShort === "安衛令" && /^第?20条$/.test(article.articleNum)) {
    if (/フォー?クリフト/.test(normalized)) return { item: "第11号" };
    if (/高所作業車/.test(normalized)) return { item: "第15号" };
    if (/玉掛/.test(normalized)) return { item: "第16号" };
  }
  if (article.lawShort === "安衛則" && /^第?36条$/.test(article.articleNum)) {
    if (/フォー?クリフト/.test(normalized)) return { item: "第5号" };
    if (/高所作業車/.test(normalized)) return { item: "第10号の5" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    /フルハーネス|墜落制止用器具/.test(normalized)
  ) {
    return { item: "第41号" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?51[89]条$/.test(article.articleNum) &&
    /(?:フルハーネス|墜落制止用器具)/.test(normalized) &&
    !/(?:特別教育|教育)/.test(normalized)
  ) {
    return { paragraph: "第2項" };
  }
  if (
    article.lawShort === "石綿則" &&
    /^第?3条$/.test(article.articleNum) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized) &&
    /誰|資格|できる|行える|調査者|必要な知識/.test(normalized)
  ) {
    return { paragraph: "第4項" };
  }
  if (article.lawShort === "酸欠則") {
    if (hasExplicitUnit) {
      return {
        paragraph:
          paragraphNumber !== null &&
          Number.isFinite(paragraphNumber) &&
          paragraphNumber > 0
            ? `第${paragraphNumber}項`
            : undefined,
        item: requestedItemLabel,
      };
    }
    if (
      /^第?3条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏|酸素濃度)/.test(normalized) &&
      /(?:測定|濃度|記録|保存|何年)/.test(normalized)
    ) {
      return {
        paragraph: /(?:記録|保存|何年)/.test(normalized) ? "第2項" : "第1項",
      };
    }
    if (
      /^第?5条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏|酸素濃度)/.test(normalized) &&
      /(?:換気|濃度|硫化水素|H2S|ppm|何パーセント|何%)/i.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
    if (
      /^第?11条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /作業主任者/.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
    if (
      /^第?12条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /(?:特別教育|教育)/.test(normalized)
    ) {
      return {
        paragraph: /(?:第二種|第2種|読み替)/.test(normalized)
          ? "第2項"
          : "第1項",
      };
    }
    if (
      /^第?13条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /(?:監視人|監視者|監視)/.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
  }
  // 既知の現場条件に対応する実体的な項・号を先に選ぶ。利用者が誤った
  // 項号を前提にした場合も、回答が訂正して採用した根拠へsourceを揃える。
  if (
    directlyRequested &&
    ((paragraphNumber !== null &&
      Number.isFinite(paragraphNumber) &&
      paragraphNumber > 0) ||
      requestedItemLabel)
  ) {
    return {
      paragraph:
        paragraphNumber !== null &&
        Number.isFinite(paragraphNumber) &&
        paragraphNumber > 0
          ? `第${paragraphNumber}項`
          : undefined,
      item: requestedItemLabel,
    };
  }
  return {};
}

export function applicableLegalProvisionEffectiveDate(
  article: LawArticle,
  query: string,
): string | undefined {
  const normalized = compact(query);
  const asksAsbestosSurveyQualification =
    /(?:石綿|アスベスト)/.test(normalized) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized);
  const isAsbestosSurveyProvision =
    (article.lawShort === "石綿則" && /^第?3条$/.test(article.articleNum)) ||
    article.lawShort === "厚労省告示276号";
  if (asksAsbestosSurveyQualification && isAsbestosSurveyProvision) {
    const building = /(?:建築物|一戸建て|共同住宅|住戸)/.test(normalized);
    const structure = /工作物/.test(normalized);
    const ship = /船舶/.test(normalized);
    const targetCount = [building, structure, ship].filter(Boolean).length;
    if (targetCount === 1 && structure) {
      return "令和8年1月1日施行（工作物の事前調査者要件）";
    }
    if (targetCount === 1 && (building || ship)) {
      return "令和5年10月1日施行（建築物・船舶の事前調査者要件）";
    }
    return "令和5年10月1日施行（建築物・船舶）／令和8年1月1日施行（工作物）";
  }
  return getProvisionEffectiveDate(
    article.lawShort,
    article.articleNum,
    legalProvisionUnitForQuery(article, query),
  );
}

/** 結論・条件が実際に参照した出典だけを返す。根拠一覧自身の番号は数えない。 */
export function citedLegalAnswerArticles(
  answer: string,
  articles: readonly LawArticle[],
): LawArticle[] {
  const decisionText = answer.split("\n根拠\n", 1)[0] ?? "";
  const markedIndexes = [
    ...new Set(
      [...decisionText.matchAll(/［(\d+)］/g)].map(
        (match) => Number(match[1]) - 1,
      ),
    ),
  ].filter((index) => index >= 0 && index < articles.length);
  const indexes =
    markedIndexes.length > 0 ? markedIndexes : articles.length > 0 ? [0] : [];
  return indexes.map((index) => articles[index]!);
}

function articleIndex(
  articles: LawArticle[],
  predicate: (article: LawArticle) => boolean,
): number {
  return articles.findIndex(predicate);
}

function firstCompleteSentence(text: string, max = 180): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  let depth = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]!;
    if (character === "（" || character === "(") depth += 1;
    if (character === "）" || character === ")") depth = Math.max(0, depth - 1);
    if (character !== "。" || depth !== 0) continue;
    const sentence = normalized.slice(0, index).trim();
    return sentence.length >= 8 && sentence.length <= max ? sentence : null;
  }
  return normalized.length >= 8 && normalized.length <= max ? normalized : null;
}

function requestedPeriodLabel(period: LegalRequestedPeriod): string {
  if (period.precision === "year") return period.start.slice(0, 4);
  if (period.precision === "month") return period.start.slice(0, 7);
  return period.start;
}

function isIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * Current e-Gov snapshots do not prove the wording at an earlier date.
 * Historical answers are eligible only when every cited article is an
 * integrity-checked, explicitly dated historical version covering the whole
 * requested period.
 */
export function hasVerifiedHistoricalLegalText(
  articles: readonly LawArticle[],
  requestedPeriod: LegalRequestedPeriod | null,
): boolean {
  if (!requestedPeriod || articles.length === 0) return false;
  return articles.every(
    (article) =>
      article.sourceKind === "egov-fulltext-snapshot" &&
      article.verificationStatus === "snapshot-hash-verified" &&
      article.sourceVersionKind === "historical" &&
      isIsoDate(article.sourceValidFrom) &&
      isIsoDate(article.sourceValidTo) &&
      article.sourceValidFrom <= requestedPeriod.start &&
      article.sourceValidTo >= requestedPeriod.end,
  );
}

export function isUnverifiedHistoricalLegalAnswer(answer: string): boolean {
  return answer.includes(
    "収録している現行本文だけでは当時の内容を確定できないため、回答を保留します。",
  );
}

export function legalEffectiveStatusConclusion(
  query: string,
  article: LawArticle,
  now: Date,
): string | null {
  if (!/(?:施行日|施行済み|施行されて|有効|現行)/.test(query)) return null;
  const effectiveText = applicableLegalProvisionEffectiveDate(article, query);
  const effectiveDate = effectiveText
    ? legalDateTextToGregorian(effectiveText)
    : null;
  if (!effectiveText || !effectiveDate) return null;
  const temporal = classifyLegalQuestionTime(query, now);
  const requestedPeriod = requestedLegalPeriod(query);
  if (requestedPeriod && effectiveDate > requestedPeriod.end) {
    return `${article.lawShort}${article.articleNum}は${effectiveText}です。指定時点ではまだ施行前です。`;
  }
  if (
    requestedPeriod &&
    effectiveDate > requestedPeriod.start &&
    effectiveDate <= requestedPeriod.end
  ) {
    return `${article.lawShort}${article.articleNum}は${effectiveDate}から施行されています。指定期間内で施行前後に分かれます。`;
  }
  const targetDate = temporal.requestedDate ?? temporal.asOf;
  if (!requestedPeriod && targetDate < effectiveDate) {
    return `${article.lawShort}${article.articleNum}は${effectiveText}です。指定時点ではまだ施行前です。`;
  }
  return `${article.lawShort}${article.articleNum}は${effectiveText}です。${temporal.requestedDate ? "指定時点で施行済みです。" : "現在施行中です。"}`;
}

function jstDateKey(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
}

/** 現行e-Gov本文の取得日を返す。古い取得物や未来時刻は現在扱いしない。 */
export function verifiedCurrentSnapshotDate(
  article: LawArticle | undefined,
  now: Date,
): string | null {
  if (
    !article ||
    !(
      (article.sourceKind === "egov-fulltext-snapshot" &&
        article.verificationStatus === "snapshot-hash-verified") ||
      (article.sourceKind === "mhlw-official-primary" &&
        article.verificationStatus === "primary-source-verified")
    ) ||
    !article.sourceFetchedAt
  ) {
    return null;
  }
  const fetched = new Date(article.sourceFetchedAt);
  if (Number.isNaN(fetched.getTime())) return null;
  const checkedOn = jstDateKey(fetched);
  const today = jstDateKey(now);
  const ageDays =
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${checkedOn}T00:00:00Z`)) /
    86_400_000;
  return ageDays >= 0 && ageDays <= 31 ? checkedOn : null;
}

export function legalApplicationStatusLine(
  query: string,
  articles: LawArticle[],
  now: Date,
): string {
  const temporal = classifyLegalQuestionTime(query, now);
  const requestedPeriod = requestedLegalPeriod(query);
  const datedProvision = articles
    .map((article) => ({
      article,
      effectiveText: applicableLegalProvisionEffectiveDate(article, query),
    }))
    .find(({ effectiveText }) => Boolean(effectiveText));
  const effectiveText = datedProvision?.effectiveText;
  const effectiveDate = effectiveText
    ? legalDateTextToGregorian(effectiveText)
    : null;
  if (temporal.status === "future") {
    if (effectiveText && effectiveDate && effectiveDate > temporal.asOf) {
      return `将来施行（${effectiveText}）`;
    }
    return `確認不能（${requestedPeriod ? requestedPeriodLabel(requestedPeriod) : (temporal.requestedDate ?? "将来時点")}・対象日版未収録）`;
  }
  if (temporal.status === "past") {
    if (
      requestedPeriod &&
      effectiveDate &&
      effectiveDate > requestedPeriod.end
    ) {
      return `過去時点（${requestedPeriodLabel(requestedPeriod)}・当時未施行）`;
    }
    if (
      requestedPeriod &&
      effectiveDate &&
      effectiveDate > requestedPeriod.start &&
      effectiveDate <= requestedPeriod.end
    ) {
      return `過去期間（${requestedPeriodLabel(requestedPeriod)}・${effectiveDate}から施行）`;
    }
    if (!hasVerifiedHistoricalLegalText(articles, requestedPeriod)) {
      return `確認不能（${requestedPeriod ? requestedPeriodLabel(requestedPeriod) : (temporal.requestedDate ?? "日付不明")}・対象日版未収録）`;
    }
    return `過去時点（${requestedPeriod ? requestedPeriodLabel(requestedPeriod) : (temporal.requestedDate ?? "日付不明")}）`;
  }
  if (!effectiveText || !effectiveDate) {
    const snapshotDate = verifiedCurrentSnapshotDate(articles[0], now);
    if (snapshotDate) {
      return `現在施行中（公式本文を${snapshotDate}確認）`;
    }
    if (articles[0]?.verificationStatus === "snapshot-hash-verified") {
      return "情報が古い（公式原文を確認）";
    }
    return "確認不能（公式原文の附則を確認）";
  }
  if (effectiveDate > temporal.asOf) return `将来施行（${effectiveText}）`;
  return `現在施行中（${effectiveText}）`;
}

/** Return the source whose metadata directly supports the application-status line. */
export function legalApplicationStatusEvidenceIndex(
  query: string,
  articles: readonly LawArticle[],
  now: Date,
): number {
  const statusLine = legalApplicationStatusLine(query, [...articles], now);
  const datedIndex = articles.findIndex((article) => {
    const effectiveText = applicableLegalProvisionEffectiveDate(article, query);
    return Boolean(effectiveText && statusLine.includes(effectiveText));
  });
  if (datedIndex >= 0) return datedIndex;

  const snapshotIndex = articles.findIndex((article) => {
    const snapshotDate = verifiedCurrentSnapshotDate(article, now);
    return Boolean(snapshotDate && statusLine.includes(snapshotDate));
  });
  return snapshotIndex >= 0 ? snapshotIndex : 0;
}

function nextQuestion(
  context: LegalConversationContext,
  query: string,
): string | null {
  const normalized = compact(query);
  if (
    /(?:電気作業|電気工事|充電電路)/.test(normalized) &&
    /(?:資格|免許|教育|作業主任者)/.test(normalized) &&
    !/(?:配線工事|充電部|近接作業|充電電路.*(?:敷設|修理|点検|操作)|操作・点検|設備操作|設備点検)/.test(
      normalized,
    )
  ) {
    return "必要な資格・教育や作業管理を絞るため、実際の作業は配線工事・充電部付近の作業・設備の操作点検のどれに近いですか？";
  }
  if (context.equipment === "フォークリフト") {
    const forkliftIntent = detectForkliftQueryIntent(query);
    if (forkliftIntent.qualification && !context.load) {
      return "資格区分を確定するため、車両銘板の最大荷重は1トン以上ですか？";
    }
    return null;
  }
  if (context.workType === "玉掛け" && !context.load) {
    return "教育区分を確定するため、機械のつり上げ荷重は1トン以上ですか？";
  }
  const highLiftIntent = detectHighLiftQueryIntent(query);
  if (
    context.equipment === "高所作業車" &&
    highLiftIntent.qualification &&
    !context.height
  ) {
    return "教育区分を確定するため、銘板・仕様上の作業床最高高さは10m以上ですか？";
  }
  if (context.equipment === "高所作業車") return null;
  if (
    context.equipment === "墜落制止用器具" ||
    /フルハーネス|墜落制止用器具/.test(normalized)
  ) {
    const hasWorkFloorCondition =
      /作業床(?:あり|なし)|作業床を設け(?:られる|られない|にくい)|作業床.*困難/.test(
        normalized,
      );
    if (!hasWorkFloorCondition) return "作業床を設けられますか？";
    if (!context.height) return "作業する高さを教えてください。";
    return null;
  }
  if (
    /石綿|アスベスト/.test(normalized) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized)
  ) {
    if (!/(?:建築物|工作物|船舶)/.test(normalized)) {
      return "対象は建築物・工作物・船舶のどれですか？";
    }
    return null;
  }
  if (/有機溶剤/.test(normalized) && /屋内/.test(normalized)) {
    const hasOrganicClass = /(?:第一種|第二種|第三種|第[123一二三]種)/.test(
      normalized,
    );
    const needsTankLocation =
      /(?:第三種|第[3三]種|臨時|短時間)/.test(normalized) &&
      !/(?:不明|分からない|わからない)/.test(normalized) &&
      !/(?:タンク等?の?内部|タンク内|タンク等?の?外|タンク外|内部以外|それ以外の屋内)/.test(
        normalized,
      );
    if (needsTankLocation) {
      return "設備の適用条件を絞るため、作業場所はタンク等の内部ですか、それ以外の屋内ですか？";
    }
    if (hasOrganicClass) return null;
    return "設備要件を絞るため、SDS上の区分は第1種・第2種・第3種のどれですか？";
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:監視人|監視者|監視)/.test(normalized)
  ) {
    if (/(?:タンク|ピット|マンホール|坑内)/.test(normalized)) return null;
    return "酸素欠乏危険場所への該当を絞るため、場所はタンク・ピット、マンホール・坑内、その他のどれですか？";
  }
  if (/(?:熱中症|暑熱|WBGT)/i.test(normalized)) {
    return null;
  }
  if (
    /(?:つり|吊り)足場/.test(normalized) &&
    /(?:点検|始業前|使用前|作業開始前|毎日|毎作業日)/.test(normalized)
  ) {
    return null;
  }
  if (/(?:施行日|施行済み|施行されて|有効|現行|適用時点)/.test(query)) {
    return null;
  }
  if (!context.height && /墜落|足場/.test(context.workType ?? "")) {
    return "必要な墜落防止設備を絞るため、対象はわく組足場・わく組以外の足場・作業床や開口部のどれですか？";
  }
  return null;
}

type LegalPresentationIntent =
  | "article"
  | "paragraph"
  | "item"
  | "official-text"
  | "effective-date"
  | "exception"
  | "related-material"
  | "conditions";

function legalPresentationIntent(
  query: string,
): LegalPresentationIntent | null {
  const normalized = compact(query);
  const rejectsExceptionPresentation =
    /例外(?:条文)?(?:ではなく|でなく|じゃなく|ではない)|例外を除(?:く|いて)/.test(
      normalized,
    );
  if (/公式原文/.test(normalized)) return "official-text";
  if (/(?:いつから|施行日|適用日)/.test(normalized)) return "effective-date";
  if (/例外/.test(normalized) && !rejectsExceptionPresentation)
    return "exception";
  if (/何号/.test(normalized)) return "item";
  if (/何項/.test(normalized)) return "paragraph";
  if (/(?:告示|通達|指針|ガイドライン|判例)/.test(normalized)) {
    return "related-material";
  }
  if (/(?:根拠|法源)(?:は|を|どこ|何)/.test(normalized)) return "article";
  if (/(?:法律|法令)(?:は|を|どれ|何)/.test(normalized)) return "article";
  if (/条件(?:は|を|で|によ)/.test(normalized)) return "conditions";
  if (
    /何条/.test(normalized) ||
    (/条文/.test(normalized) && !rejectsExceptionPresentation)
  ) {
    return "article";
  }
  return null;
}

function presentationTopicLabel(query: string): string {
  const normalized = compact(query);
  if (/フォー?クリフト/.test(normalized))
    return "フォークリフト運転の資格・教育";
  if (/(?:足場|手すり|中さん|中桟)/.test(normalized)) return "足場の手すり等";
  if (/(?:酸欠|酸素欠乏|酸欠則)/.test(normalized)) {
    if (/(?:監視人|監視者|監視)/.test(normalized))
      return "酸素欠乏危険作業の監視";
    if (/(?:測定|記録|保存)/.test(normalized))
      return "酸素欠乏危険作業の測定・記録";
    if (/換気/.test(normalized)) return "酸素欠乏危険作業の換気";
    if (/(?:特別教育|教育)/.test(normalized))
      return "酸素欠乏危険作業の特別教育";
    return "酸素欠乏危険作業";
  }
  if (/(?:有機溶剤|シンナー)/.test(normalized)) return "有機溶剤業務";
  if (/玉掛/.test(normalized)) return "玉掛け業務";
  if (/(?:電気作業|電気工事|充電電路)/.test(normalized))
    return "電気作業の資格・教育";
  if (/(?:フルハーネス|墜落制止用器具|墜落防止)/.test(normalized)) {
    return "墜落防止措置";
  }
  return "今回の質問";
}

/**
 * Keep presentation follow-ups anchored to the verified sources retrieved for
 * the current topic.  Generic duties (for example, sections 59 and 61 of the
 * Act) are included only for the qualification topic that made them relevant.
 */
function presentationEvidenceIndexes(
  query: string,
  articles: LawArticle[],
): number[] {
  const normalized = compact(query);
  const presentationIntent = legalPresentationIntent(query);
  const explicitlyRequested = articles.flatMap((article, index) =>
    explicitlyRequestsArticle(normalized, article.articleNum) ? [index] : [],
  );
  // An explicit article/paragraph/item always wins over broad topic expansion.
  // This prevents「酸欠則12条2項」from pulling neighbouring acid rules.
  if (explicitlyRequested.length > 0) {
    return [...new Set(explicitlyRequested)].slice(0, 6);
  }
  const indexes = articles.flatMap((article, index) => {
    const provision = `${article.articleTitle ?? ""} ${article.text}`;
    if (/フォー?クリフト/.test(normalized)) {
      const relevant =
        /フ[オォ]ー?クリフト/.test(provision) ||
        (article.lawShort === "安衛法" &&
          /^第?(?:59|61)条$/.test(article.articleNum));
      return relevant ? [index] : [];
    }
    if (
      /(?:足場|手すり|中さん|中桟)/.test(normalized) &&
      !(
        /(?:墜落防止|墜落.*措置)/.test(normalized) &&
        !/(?:手すり|中さん|中桟|高さ)/.test(normalized)
      )
    ) {
      const opening = /開口部/.test(normalized);
      return article.lawShort === "安衛則" &&
        (opening
          ? /^第?519条$/.test(article.articleNum)
          : /^第?(?:552|563)条$/.test(article.articleNum))
        ? [index]
        : [];
    }
    if (/(?:酸欠|酸素欠乏|酸欠則)/.test(normalized)) {
      if (article.lawShort !== "酸欠則") return [];
      if (
        presentationIntent === "conditions" ||
        presentationIntent === "related-material"
      ) {
        if (/(?:監視人|監視者|監視)/.test(normalized)) {
          const rescueOrEquipment = /(?:救出|救助|退避|事故|設備|保護具)/.test(
            normalized,
          );
          return /^第?(?:3|5|11|12|13)条$/.test(article.articleNum) ||
            (rescueOrEquipment && /^第?(?:26|27)条$/.test(article.articleNum))
            ? [index]
            : [];
        }
        return [index];
      }
      if (/(?:監視人|監視者|監視)/.test(normalized)) {
        return /^第?13条$/.test(article.articleNum) ? [index] : [];
      }
      if (/(?:測定|記録|保存)/.test(normalized)) {
        return /^第?3条$/.test(article.articleNum) ? [index] : [];
      }
      if (/換気/.test(normalized)) {
        return /^第?5条(?:の2)?$/.test(article.articleNum) ? [index] : [];
      }
      if (/(?:特別教育|教育)/.test(normalized)) {
        return /^第?12条$/.test(article.articleNum) ? [index] : [];
      }
      if (/作業主任者/.test(normalized)) {
        return /^第?11条$/.test(article.articleNum) ? [index] : [];
      }
      return [index];
    }
    if (/(?:有機溶剤|シンナー)/.test(normalized)) {
      if (article.lawShort !== "有機則") return [];
      if (/^第?29条$/.test(article.articleNum)) {
        return /(?:健康診断|健診)/.test(normalized) ? [index] : [];
      }
      return /^第?(?:1|5|6|8|9)条$/.test(article.articleNum) ? [index] : [];
    }
    if (/玉掛/.test(normalized)) {
      const relevant =
        (article.lawShort === "安衛令" &&
          /^第?(?:10|20)条$/.test(article.articleNum)) ||
        (article.lawShort === "クレーン則" &&
          /^第?(?:221|222)条$/.test(article.articleNum));
      return relevant ? [index] : [];
    }
    if (/(?:電気作業|電気工事|充電電路)/.test(normalized)) {
      const directedWork =
        /(?:作業主任者|作業指揮者|作業の指揮者|停電作業|活線作業|活線近接作業)/.test(
          normalized,
        );
      const relevant = directedWork
        ? (article.lawShort === "安衛法" &&
            /^第?14条$/.test(article.articleNum)) ||
          (article.lawShort === "安衛令" &&
            /^第?6条$/.test(article.articleNum)) ||
          (article.lawShort === "安衛則" &&
            /^第?(?:36|339|341|342|344|345|350)条$/.test(article.articleNum))
        : (article.lawShort === "電気工事士法" &&
            /^第?[23]条$/.test(article.articleNum)) ||
          (article.lawShort === "安衛法" &&
            /^第?59条$/.test(article.articleNum)) ||
          (article.lawShort === "安衛則" &&
            /^第?36条$/.test(article.articleNum));
      return relevant ? [index] : [];
    }
    if (/(?:フルハーネス|墜落制止用器具|墜落防止)/.test(normalized)) {
      return article.lawShort === "安衛則" &&
        /^第?(?:36|518|519|520|521)条$/.test(article.articleNum)
        ? [index]
        : [];
    }
    return [];
  });
  if (indexes.length > 0) return [...new Set(indexes)].slice(0, 6);
  return [0];
}

function presentationProvisionLabel(article: LawArticle): string {
  return `${article.lawShort}${article.articleNum.replace(/^第/, "")}`;
}

function verifiedPresentationException(
  query: string,
  articles: LawArticle[],
  indexes: number[],
): { conclusion: string; conditions: string[] } | null {
  const normalized = compact(query);
  const find = (predicate: (article: LawArticle) => boolean): number =>
    indexes.find((index) => predicate(articles[index]!)) ?? -1;

  if (/フォー?クリフト/.test(normalized)) {
    const roadExclusion = find((article) =>
      /道路上を走行させる運転を除く/.test(article.text),
    );
    const specialEducation = find(
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?36条$/.test(article.articleNum) &&
        /一トン未満のフ[オォ]ー?クリフト|1トン未満のフォークリフト/.test(
          article.text,
        ),
    );
    const restrictedWork = find(
      (article) =>
        article.lawShort === "安衛令" &&
        /^第?20条$/.test(article.articleNum) &&
        /一トン以上のフ[オォ]ー?クリフト|1トン以上のフォークリフト/.test(
          article.text,
        ),
    );
    if (specialEducation >= 0 && restrictedWork >= 0) {
      return {
        conclusion: `フォークリフト運転は、最大荷重1トン未満でも特別教育、1トン以上では技能講習修了等が必要で、無教育で運転できる区分はありません。${markers(specialEducation, restrictedWork)}`,
        conditions: [
          ...(roadExclusion >= 0
            ? [
                `各規定の道路上走行除外だけで資格・免許が不要とは判断できません。道路上では道路交通法上の免許等を別に確認します。${marker(roadExclusion)}`,
              ]
            : []),
        ],
      };
    }
  }

  if (/(?:足場|手すり|中さん|中桟)/.test(normalized)) {
    const oneSideScaffold = find((article) =>
      /一側足場を除く/.test(article.text),
    );
    if (oneSideScaffold >= 0) {
      return {
        conclusion: `取得した足場の作業床規定は、一側足場を対象から除いています。${marker(oneSideScaffold)}`,
        conditions: [
          `この除外だけで他の墜落防止義務がなくなるとは判断できません。足場の種類と作業箇所に応じ、別の作業床・手すり・囲い等の規定を確認します。${marker(oneSideScaffold)}`,
        ],
      };
    }
  }

  if (/(?:酸欠|酸素欠乏|酸欠則)/.test(normalized) && /換気/.test(normalized)) {
    const ventilation = find(
      (article) =>
        article.lawShort === "酸欠則" &&
        /^第?5条$/.test(article.articleNum) &&
        /爆発、酸化等を防止するため換気することができない場合|作業の性質上換気することが著しく困難/.test(
          article.text,
        ),
    );
    if (ventilation >= 0) {
      const protection = find(
        (article) =>
          article.lawShort === "酸欠則" &&
          /^第?5条の2$/.test(article.articleNum),
      );
      return {
        conclusion: `爆発・酸化等の防止のため換気できない場合、または作業の性質上換気が著しく困難な場合は、酸欠則5条の換気義務の例外です。${marker(ventilation)}`,
        conditions:
          protection >= 0
            ? [
                `例外時も、同時就業者数以上の空気呼吸器等を備え、労働者に使用させます。${marker(protection)}`,
              ]
            : [],
      };
    }
  }

  if (/(?:有機溶剤|シンナー)/.test(normalized)) {
    const temporary = find(
      (article) =>
        article.lawShort === "有機則" &&
        /^第?8条$/.test(article.articleNum) &&
        /臨時に有機溶剤業務/.test(article.text),
    );
    const shortTime = find(
      (article) =>
        article.lawShort === "有機則" &&
        /^第?9条$/.test(article.articleNum) &&
        /短時間/.test(article.text),
    );
    if (temporary >= 0 || shortTime >= 0) {
      return {
        conclusion: `有機溶剤業務には、臨時作業または短時間作業について設備義務の適用除外・特例があります。ただし、屋内の場所、タンク等の内外、換気設備または送気マスク等の条文条件を満たす場合に限られます。${markers(temporary, shortTime)}`,
        conditions: [
          `今回の作業に適用できるかは、臨時・短時間の別と、タンク等の内部か外部かを有機則8条・9条で照合します。${markers(temporary, shortTime)}`,
        ],
      };
    }
  }

  if (/玉掛/.test(normalized)) {
    const specialEducation = find(
      (article) =>
        article.lawShort === "クレーン則" &&
        /^第?222条$/.test(article.articleNum) &&
        /一トン未満|1トン未満/.test(article.text),
    );
    const skillCourse = find(
      (article) =>
        (article.lawShort === "クレーン則" &&
          /^第?221条$/.test(article.articleNum) &&
          /玉掛け技能講習/.test(article.text)) ||
        (article.lawShort === "安衛令" &&
          /^第?20条$/.test(article.articleNum) &&
          /一トン以上.*玉掛け|1トン以上.*玉掛け/.test(article.text)),
    );
    if (specialEducation >= 0 && skillCourse >= 0) {
      return {
        conclusion: `玉掛けは、つり上げ荷重1トン未満でも特別教育、1トン以上では玉掛け技能講習修了等が必要で、無教育で行える区分はありません。${markers(specialEducation, skillCourse)}`,
        conditions: [
          `境界は実際のつり荷ではなく、クレーン等の「つり上げ荷重」で判定します。${markers(specialEducation, skillCourse)}`,
        ],
      };
    }
  }

  if (/(?:電気作業|電気工事|充電電路)/.test(normalized)) {
    const lowVoltage = find(
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?36条$/.test(article.articleNum) &&
        /対地電圧が五十ボルト以下|対地電圧50ボルト以下/.test(article.text),
    );
    if (lowVoltage >= 0) {
      return {
        conclusion: `安衛則36条4号の低圧業務では、対地電圧50V以下のものと、電信用・電話用等で感電による危害のおそれがないものが対象から除かれます。${marker(lowVoltage)}`,
        conditions: [
          `電気工事士法の従事制限は別制度なので、この特別教育の除外だけで資格不要とは判断できません。${marker(lowVoltage)}`,
        ],
      };
    }
  }

  return null;
}

function requestedRelatedMaterial(query: string): string {
  const normalized = compact(query);
  if (/告示/.test(normalized)) return "告示";
  if (/通達/.test(normalized)) return "通達";
  if (/(?:指針|ガイドライン)/.test(normalized)) return "指針・ガイドライン";
  if (/判例/.test(normalized)) return "判例";
  return "関連資料";
}

function isRequestedVerifiedMaterial(
  article: LawArticle,
  material: string,
): boolean {
  // A statute article whose title or text mentions「指針」is still a statute,
  // not the guideline document itself.  Material answers accept only an
  // independently captured official-primary document and classify it by the
  // document identity (law/lawShort), never article title/text/keywords.
  if (article.sourceKind !== "mhlw-official-primary") return false;
  const identity = `${article.law} ${article.lawShort}`;
  const matches =
    material === "告示"
      ? /告示/.test(identity)
      : material === "通達"
        ? /通達/.test(identity)
        : material === "指針・ガイドライン"
          ? /指針|ガイドライン/.test(identity)
          : material === "判例"
            ? /判例|裁判/.test(identity)
            : false;
  return Boolean(
    matches &&
    article.sourceUrl &&
    article.sourceHash &&
    (article.verificationStatus === "snapshot-hash-verified" ||
      article.verificationStatus === "primary-source-verified"),
  );
}

function presentationConditionsAnswer(
  query: string,
  articles: LawArticle[],
  indexes: number[],
): { conclusion: string; conditions: string[] } {
  const normalized = compact(query);
  const cited = markers(...indexes);
  if (/フォー?クリフト/.test(normalized)) {
    return {
      conclusion: `資格区分を変える主な条件は車両銘板の最大荷重です。1トン未満は特別教育、1トン以上は技能講習修了等の区分で、実際の積荷重量では判定しません。${cited}`,
      conditions: [
        `道路上の走行は取得した安衛法令の運転規定から除かれるため、道路交通法上の免許等を別に確認します。${cited}`,
      ],
    };
  }
  if (/(?:足場|手すり|中さん|中桟)/.test(normalized)) {
    return {
      conclusion: `手すり等の条件は、作業場所の高さ、墜落のおそれ、わく組足場かそれ以外か、一側足場かで変わります。${cited}`,
      conditions: [
        `一側足場の除外だけで他の墜落防止義務がなくなるとは判断せず、作業床・端・開口部の条件も別に照合します。${cited}`,
      ],
    };
  }
  if (/(?:酸欠|酸素欠乏|酸欠則)/.test(normalized)) {
    return {
      conclusion: `酸欠作業の条件は、場所が酸素欠乏危険場所に当たるか、第一種か硫化水素を含む第二種か、確認する義務が測定・換気・監視・教育のどれかで変わります。${cited}`,
      conditions: [],
    };
  }
  if (/(?:有機溶剤|シンナー)/.test(normalized)) {
    return {
      conclusion: `設備要件を変える主な条件は、SDS上の第1種・第2種・第3種の区分、屋内作業場等への該当、タンク等の内外、臨時・短時間・吹付けの別です。${cited}`,
      conditions: [],
    };
  }
  if (/玉掛/.test(normalized)) {
    return {
      conclusion: `教育・資格区分を変える主な条件は、クレーン等の種類と「つり上げ荷重」です。1トン未満は特別教育、1トン以上は技能講習修了等の区分です。${cited}`,
      conditions: [
        `実際のつり荷重量ではなく、機械の構造・材料に応じた最大荷重で判定します。${cited}`,
      ],
    };
  }
  if (/(?:電気作業|電気工事|充電電路)/.test(normalized)) {
    return {
      conclusion: `必要な資格・教育を変える主な条件は、配線・設備工事か充電電路作業か、電圧区分、敷設・修理・点検・操作のどれを行うかです。${cited}`,
      conditions: [],
    };
  }
  return {
    conclusion: `取得した根拠からは、対象作業・設備・数値条件が主な分岐です。${cited}`,
    conditions: [],
  };
}

function presentationConclusion(
  query: string,
  articles: LawArticle[],
): { conclusion: string; conditions: string[] } | null {
  const intent = legalPresentationIntent(query);
  if (!intent) return null;
  const normalized = compact(query);
  const hasExplicitProvisionUnit = articles.some(
    (article) =>
      explicitlyRequestsArticle(normalized, article.articleNum) &&
      /第?\s*[0-9一二三四五六七八九十百千]+\s*(?:項|号)/.test(
        explicitUnitQueryScope(query, article.articleNum),
      ),
  );
  // 「12条2項の条文」のような指定は、一覧表示ではなく指定単位の
  // substantive answerへ渡す。何項・何号という質問自体は対象外。
  if (
    intent === "article" &&
    hasExplicitProvisionUnit &&
    !/何条/.test(normalized)
  ) {
    return null;
  }
  // The dedicated oxygen branch also binds the ventilation exception to the
  // mandatory respiratory protection in section 5-2.  Do not shadow it with
  // the generic presentation formatter.
  if (
    intent === "exception" &&
    /(?:酸欠|酸素欠乏|酸欠則)/.test(normalized) &&
    /換気/.test(normalized)
  ) {
    return null;
  }
  const indexes = presentationEvidenceIndexes(query, articles);
  if (indexes.length === 0) return null;
  const topic = presentationTopicLabel(query);
  const citedProvision = (index: number, unit = ""): string =>
    `${presentationProvisionLabel(articles[index]!)}${unit.replace(/^第/, "")}${marker(index)}`;

  if (intent === "article") {
    return {
      conclusion: `${topic}について取得した主な根拠条文は、${indexes
        .map((index) => {
          const unit = legalProvisionUnitForQuery(articles[index]!, query);
          return citedProvision(index, unit.item ?? unit.paragraph);
        })
        .join("、")}です。`,
      conditions: [],
    };
  }

  if (intent === "related-material") {
    const material = requestedRelatedMaterial(query);
    const verifiedMaterialIndexes = articles.flatMap((article, index) =>
      isRequestedVerifiedMaterial(article, material) ? [index] : [],
    );
    if (verifiedMaterialIndexes.length > 0) {
      return {
        conclusion: `${topic}について取得・検証済みの${material}は、${verifiedMaterialIndexes
          .map((index) => citedProvision(index))
          .join("、")}です。`,
        conditions: [
          `回答根拠として使えるのは、公式URL・本文hash・検証状態を確認できた資料だけです。${markers(...verifiedMaterialIndexes)}`,
        ],
      };
    }
    return {
      conclusion: `${topic}について、関連${material}は今回取得した検証済み回答根拠に含めていません。直接根拠として確認できた法令は、${indexes
        .map((index) => citedProvision(index))
        .join("、")}です。`,
      conditions: [
        `未確認の${material}を根拠として推測せず、資料名または発出番号が分かる場合だけ追加確認してください。${markers(...indexes)}`,
      ],
    };
  }

  if (intent === "conditions") {
    return presentationConditionsAnswer(query, articles, indexes);
  }

  if (intent === "official-text") {
    return {
      conclusion: `${topic}の公式原文は、根拠欄にある${indexes
        .map((index) => citedProvision(index))
        .join("、")}の「公式原文」から確認できます。`,
      conditions: [
        `回答ではなく条文そのものを確認する場合は、該当する条・項・号を根拠欄で開いてください。${markers(...indexes)}`,
      ],
    };
  }

  if (intent === "paragraph" || intent === "item") {
    const units = indexes.map((index) => ({
      index,
      unit: legalProvisionUnitForQuery(articles[index]!, query),
    }));
    if (
      intent === "item" &&
      /(?:酸欠則|酸素欠乏症等防止規則)第?12条第?2項/.test(normalized)
    ) {
      const education = indexes.find(
        (index) =>
          articles[index]!.lawShort === "酸欠則" &&
          /^第?12条$/.test(articles[index]!.articleNum),
      );
      if (education !== undefined) {
        return {
          conclusion: `酸欠則12条2項が読み替えるのは、第1号の「酸素欠乏」と、第2号・第5号の「酸素欠乏症」です。第3号・第4号は読み替えず第二種にも準用します。${marker(education)}`,
          conditions: [],
        };
      }
    }
    if (
      intent === "item" &&
      /(?:酸欠|酸素欠乏|酸欠則)/.test(compact(query)) &&
      /(?:特別教育|教育)/.test(compact(query))
    ) {
      const education = indexes.find(
        (index) =>
          articles[index]!.lawShort === "酸欠則" &&
          /^第?12条$/.test(articles[index]!.articleNum),
      );
      if (education !== undefined) {
        return {
          conclusion: `酸欠則12条1項の特別教育科目は第1号から第5号です。第二種にも同じ5科目を準用し、第1号、第2号、第5号は2項の読替え対象、第3号・第4号は共通です。${marker(education)}`,
          conditions: [],
        };
      }
    }
    const matching = units.filter(({ unit }) =>
      intent === "paragraph" ? Boolean(unit.paragraph) : Boolean(unit.item),
    );
    const complementary = units.filter(({ unit }) =>
      intent === "paragraph"
        ? !unit.paragraph && Boolean(unit.item)
        : !unit.item && Boolean(unit.paragraph),
    );
    if (matching.length > 0) {
      return {
        conclusion: `${topic}について確認できた該当${intent === "paragraph" ? "項" : "号"}は、${matching
          .map(({ index, unit }) =>
            citedProvision(
              index,
              intent === "paragraph" ? unit.paragraph : unit.item,
            ),
          )
          .join("、")}です。`,
        conditions:
          complementary.length > 0
            ? [
                `ほかの取得根拠は${complementary
                  .map(({ index, unit }) =>
                    citedProvision(
                      index,
                      intent === "paragraph" ? unit.item : unit.paragraph,
                    ),
                  )
                  .join(
                    "、",
                  )}の単位で規定されており、一つの${intent === "paragraph" ? "項" : "号"}にはまとめられません。`,
              ]
            : [],
      };
    }
    return {
      conclusion: `${topic}について取得した公式本文からは、該当する${intent === "paragraph" ? "項" : "号"}を一つに特定できません。条番号まで確認できた根拠は${indexes
        .map((index) => citedProvision(index))
        .join("、")}です。`,
      conditions: [
        `存在しない${intent === "paragraph" ? "項" : "号"}を推測せず、確認したい義務または条件を追加してください。${markers(...indexes)}`,
      ],
    };
  }

  if (intent === "effective-date") {
    const distinctElectricSchemes = /(?:電気作業|電気工事|充電電路)/.test(
      normalized,
    )
      ? "電気工事士法上の従事制限と安衛法上の特別教育は別制度のため、開始日は一つではありません。"
      : "";
    const dated = indexes.flatMap((index) => {
      const effectiveDate = applicableLegalProvisionEffectiveDate(
        articles[index]!,
        query,
      );
      return effectiveDate ? [{ index, effectiveDate }] : [];
    });
    if (dated.length > 0) {
      return {
        conclusion: `${distinctElectricSchemes}${topic}について取得したmetadataで確認できる現行規定の適用基準日は、${dated
          .map(
            ({ index, effectiveDate }) =>
              `${presentationProvisionLabel(articles[index]!)}の${effectiveDate}${marker(index)}`,
          )
          .join(
            "、",
          )}です。ただし、これは各制度が最初に始まった日を示すものではありません。`,
        conditions: [
          `最初の施行日は取得した根拠だけでは確定できないため、法令沿革を追加取得して確認してください。${markers(...dated.map(({ index }) => index))}`,
        ],
      };
    }
    return {
      conclusion: `${distinctElectricSchemes}${topic}について取得した根拠metadataでは、各規定が最初に施行された日を確認できないため、日付は断定しません。${markers(...indexes)}`,
      conditions: [
        `確認できた対象条文は${indexes.map((index) => citedProvision(index)).join("、")}です。施行沿革を追加取得して確認してください。`,
      ],
    };
  }

  const supportedException = verifiedPresentationException(
    query,
    articles,
    indexes,
  );
  if (supportedException) return supportedException;
  return {
    conclusion: `${topic}について取得した根拠には、この質問に直接対応する例外規定を確認できません。例外があるとは断定しません。${markers(...indexes)}`,
    conditions: [
      `例外を確認するには、機械・作業方法・場所など該当条件を追加し、対応する例外条文を取得してください。${markers(...indexes)}`,
    ],
  };
}

function knownConclusion(
  query: string,
  articles: LawArticle[],
): { conclusion: string; conditions: string[] } | null {
  const normalized = compact(query);
  const conversationContext = extractLegalConversationContext(query);
  const lacksWorkContext = Boolean(
    !conversationContext.workType && !conversationContext.equipment,
  );
  const explicitlyRequested = articles
    .map((article, index) => ({ article, index }))
    .filter(({ article }) =>
      explicitlyRequestsArticle(normalized, article.articleNum),
    );
  if (
    explicitlyRequested.length > 1 &&
    new Set(explicitlyRequested.map(({ article }) => article.law)).size === 1
  ) {
    const provisions = explicitlyRequested
      .map(({ article }) =>
        article.articleTitle
          ? `${article.articleNum}は「${article.articleTitle}」`
          : article.articleNum,
      )
      .join("、");
    return {
      conclusion: `${provisions}を定めています。${markers(
        ...explicitlyRequested.map(({ index }) => index),
      )}`,
      conditions: [
        `対象者と作業条件を各条の本文で照合してください。${markers(
          ...explicitlyRequested.map(({ index }) => index),
        )}`,
      ],
    };
  }

  if (
    /足場/.test(normalized) &&
    /点検/.test(normalized) &&
    /(?:記録|保存|残す|保管)/.test(normalized)
  ) {
    const scaffoldInspection = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" && /^第?567条$/.test(article.articleNum),
    );
    if (scaffoldInspection >= 0) {
      return {
        conclusion: `はい。ただし、安衛則567条3項が記録・保存を求めるのは、同条2項の悪天候・地震・足場の組立て、一部解体または変更後の点検です。点検結果と点検者の氏名、補修等をした場合はその内容を記録し、足場を使う仕事が終了するまで保存します。${marker(scaffoldInspection)}`,
        conditions: [
          `その日の作業開始前に行う同条1項の点検と、2項の事後点検では、567条3項による記録・保存の扱いが異なります。${marker(scaffoldInspection)}`,
        ],
      };
    }
  }

  const suspendedScaffoldDailyInspection =
    /(?:つり|吊り)足場/.test(normalized) &&
    /(?:点検|始業前|使用前|作業開始前|毎日|毎作業日)/.test(normalized);
  if (suspendedScaffoldDailyInspection) {
    const suspendedScaffoldInspection = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" && /^第?568条$/.test(article.articleNum),
    );
    const scaffoldInspectionItems = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" && /^第?567条$/.test(article.articleNum),
    );
    if (suspendedScaffoldInspection >= 0) {
      return {
        conclusion: `つり足場では、点検者を指名し、その日の作業を開始する前に点検させ、異常があれば直ちに補修する必要があります。直接根拠は安衛則568条です。${marker(suspendedScaffoldInspection)}`,
        conditions: [
          ...(scaffoldInspectionItems >= 0
            ? [
                `点検項目は、568条が567条2項1号〜5号・7号・9号を引用して定めています。${markers(suspendedScaffoldInspection, scaffoldInspectionItems)}`,
                `一般の足場の日常点検を定める567条1項は、つり足場を明示的に除外しています。${marker(scaffoldInspectionItems)}`,
              ]
            : []),
        ],
      };
    }
  }

  // 複合質問の各運用意図を、資格の一般説明より先に回答する。運用規定の
  // 本文には「フォークリフト」ではなく「車両系荷役運搬機械等」とだけ書く
  // 条文もあるため、条番号と現在の質問意図を対応させる。
  const forkliftIntent = detectForkliftQueryIntent(query);
  const forkliftQualificationRequested = forkliftIntent.qualification;
  const forkliftSpeedRequested = forkliftIntent.speed;
  const forkliftAnnualInspectionRequested = forkliftIntent.annualInspection;
  const forkliftMonthlyInspectionRequested = forkliftIntent.monthlyInspection;
  const forkliftGenericInspectionRequested = forkliftIntent.genericInspection;
  const forkliftOffPurposeRequested = forkliftIntent.offPurposeUse;
  const forkliftWorkLeaderRequested = forkliftIntent.workLeader;
  const hasForkliftOperationalIntent =
    forkliftSpeedRequested ||
    forkliftAnnualInspectionRequested ||
    forkliftMonthlyInspectionRequested ||
    forkliftGenericInspectionRequested ||
    forkliftOffPurposeRequested ||
    forkliftWorkLeaderRequested;

  if (hasForkliftOperationalIntent) {
    const forkliftSpeed = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?151条の5$/.test(article.articleNum),
    );
    const forkliftAnnualInspection = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?151条の21$/.test(article.articleNum),
    );
    const forkliftMonthlyInspection = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?151条の22$/.test(article.articleNum),
    );
    const forkliftOffPurpose = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?151条の14$/.test(article.articleNum),
    );
    const forkliftWorkLeader = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?151条の4$/.test(article.articleNum),
    );
    const forkliftSafetyEducationDuty = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛法" && /^第?59条$/.test(article.articleNum),
    );
    const forkliftSpecialEducation = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?36条$/.test(article.articleNum) &&
        /一トン未満のフ[オォ]ー?クリフト|1トン未満のフォークリフト/.test(
          article.text,
        ),
    );
    const forkliftRestrictedWorkDuty = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛法" && /^第?61条$/.test(article.articleNum),
    );
    const forkliftRestrictedWork = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛令" &&
        /^第?20条$/.test(article.articleNum) &&
        /一トン以上のフ[オォ]ー?クリフト|1トン以上のフォークリフト/.test(
          article.text,
        ),
    );
    const missingRequestedEvidence =
      (forkliftSpeedRequested && forkliftSpeed < 0) ||
      (forkliftAnnualInspectionRequested && forkliftAnnualInspection < 0) ||
      (forkliftMonthlyInspectionRequested && forkliftMonthlyInspection < 0) ||
      (forkliftGenericInspectionRequested &&
        (forkliftAnnualInspection < 0 || forkliftMonthlyInspection < 0)) ||
      (forkliftOffPurposeRequested && forkliftOffPurpose < 0) ||
      (forkliftWorkLeaderRequested && forkliftWorkLeader < 0) ||
      (forkliftQualificationRequested &&
        [
          forkliftSafetyEducationDuty,
          forkliftSpecialEducation,
          forkliftRestrictedWorkDuty,
          forkliftRestrictedWork,
        ].some((index) => index < 0));

    if (!missingRequestedEvidence) {
      const conclusions: string[] = [];
      const conditions: string[] = [];
      if (forkliftQualificationRequested) {
        conclusions.push(
          `フォークリフト運転は、最大荷重1トン未満では特別教育が必要で、1トン以上では技能講習修了者等に限られます。${markers(forkliftSafetyEducationDuty, forkliftSpecialEducation, forkliftRestrictedWorkDuty, forkliftRestrictedWork)}`,
        );
        conditions.push(
          `資格区分は実際の積荷重量ではなく、車両の最大荷重で判定します。${markers(forkliftSpecialEducation, forkliftRestrictedWork)}`,
          `道路上を走行させる運転はこれらの規定から除かれるため、道路交通法上の免許等を別に確認します。${markers(forkliftSpecialEducation, forkliftRestrictedWork)}`,
        );
      }
      if (forkliftSpeedRequested) {
        conclusions.push(
          `制限速度は、最高速度が毎時10km以下の車両を除き、事業者が地形・地盤等に応じた適正な速度をあらかじめ定め、運転者はその速度を超えて運転してはなりません。${marker(forkliftSpeed)}`,
        );
      }
      if (forkliftGenericInspectionRequested) {
        conclusions.push(
          `フォークリフトの定期自主検査には、一月を超えない期間ごとの月次検査と、一年を超えない期間ごとの年次検査の両方があります。${markers(forkliftMonthlyInspection, forkliftAnnualInspection)}`,
        );
      } else if (forkliftMonthlyInspectionRequested) {
        conclusions.push(
          `フォークリフトは一月を超えない期間ごとに一回の定期自主検査が必要です。一月を超えて使用しない期間は例外ですが、再び使用を開始するときに検査が必要です。${marker(forkliftMonthlyInspection)}`,
        );
      } else if (forkliftAnnualInspectionRequested) {
        conclusions.push(
          `フォークリフトは一年を超えない期間ごとに一回の定期自主検査が必要です。一年を超えて使用しない期間は例外ですが、再び使用を開始するときに検査が必要です。${marker(forkliftAnnualInspection)}`,
        );
      }
      if (forkliftOffPurposeRequested) {
        conclusions.push(
          `荷のつり上げや労働者の昇降等、主たる用途以外への使用は禁止です。ただし、労働者に危険を及ぼすおそれがないときは同条の例外です。${marker(forkliftOffPurpose)}`,
        );
      }
      if (forkliftWorkLeaderRequested) {
        conclusions.push(
          `車両系荷役運搬機械等を用いる作業では、事業者が作業指揮者を定め、作業計画に基づいて指揮させる必要があります。${marker(forkliftWorkLeader)}`,
        );
      }
      return {
        conclusion: conclusions.join("\n"),
        conditions,
      };
    }
  }

  const highLiftIntent = detectHighLiftQueryIntent(query);
  if (highLiftIntent.fallProtection) {
    const fallProtectionDuty = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" &&
        /^第?194条の22$/.test(article.articleNum),
    );
    if (fallProtectionDuty >= 0) {
      return {
        conclusion: `高所作業車の作業床上では、事業者は労働者に要求性能墜落制止用器具等を使用させ、労働者本人も使用しなければなりません。直接根拠は安衛則194条の22です。${marker(fallProtectionDuty)}`,
        conditions: [
          `作業床が接地面に対し垂直にのみ上昇・下降する構造のものは、この条文の対象から除かれます。${marker(fallProtectionDuty)}`,
        ],
      };
    }
  }

  const fumigationMonitorProvision = articleIndex(
    articles,
    (article) =>
      article.lawShort === "特化則" &&
      /^第?38条の14$/.test(article.articleNum) &&
      /五[\s\S]*監視人を置[\s\S]*十二[\s\S]*監視人を置/.test(article.text),
  );
  if (
    /(?:特化則|特定化学物質障害予防規則)第?38条の14/.test(normalized) &&
    /(?:監視人|監視者|監視)/.test(normalized) &&
    /(?:どの号|何号|号)/.test(normalized) &&
    fumigationMonitorProvision >= 0
  ) {
    return {
      conclusion: `特化則38条の14で監視人を定めるのは、第1項第5号ただし書と第1項第12号ただし書です。第5号は、燻蒸の効果確認のため燻蒸中の場所へ立ち入る例外、第12号は、測定濃度が表の値を超える場所へ立ち入る例外に関する規定です。${marker(fumigationMonitorProvision)}`,
      conditions: [
        `第5号ただし書では、必要な呼吸用保護具を労働者に使用させ、労働者以外の確認者の使用も確認し、かつ監視人を置くことが立入りの条件です。${marker(fumigationMonitorProvision)}`,
        `第12号ただし書では、濃度を表の値以下にすることが著しく困難で排気を行う場合に、必要な呼吸用保護具の使用・確認と監視人の配置を満たすことが立入りの条件です。${marker(fumigationMonitorProvision)}`,
      ],
    };
  }

  const workerInjuryReport = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?97条$/.test(article.articleNum) &&
      /労働者死傷病報告/.test(article.articleTitle ?? "") &&
      /休業の日数が四日に満たない/.test(article.text),
  );
  if (
    /(?:労災(?:事故)?|労働災害|休業災害|死傷病|休業)/.test(normalized) &&
    /(?:報告|届出|届け|提出|いつまで)/.test(normalized) &&
    !/(?:何条|根拠|法源|条文)/.test(normalized) &&
    workerInjuryReport >= 0
  ) {
    const asksReportRecipient = /(?:誰|どこ)(?:に|へ)?$|報告先/.test(
      normalized,
    );
    const lessThanFourDays =
      /(?:4日未満|4日に満たない|休業(?:1|2|3|一|二|三)日|休業1(?:日)?(?:から|〜|~)3日)/.test(
        normalized,
      );
    const fourDaysOrMore =
      !lessThanFourDays &&
      /(?:休業(?:日数)?)?(?:4|四)日(?:以上)?/.test(normalized);

    if (asksReportRecipient) {
      return {
        conclusion: `労働者死傷病報告の報告先は、所轄労働基準監督署長です。安衛則97条1項の死亡・休業4日以上の報告も、同条2項の休業4日未満の報告も同じ報告先です。${marker(workerInjuryReport)}`,
        conditions: [
          `死亡または休業4日以上は「遅滞なく」、休業1〜3日は四半期ごとに各期間の最後の月の翌月末日までです。${marker(workerInjuryReport)}`,
        ],
      };
    }

    if (lessThanFourDays) {
      return {
        conclusion: `休業日数が4日に満たない場合（通常は休業1〜3日）は、安衛則97条2項により、1〜3月、4〜6月、7〜9月、10〜12月の四半期ごとにまとめ、各期間の最後の月の翌月末日までに所轄労働基準監督署長へ報告します。${marker(workerInjuryReport)}`,
        conditions: [
          `休業4日以上（4日ちょうどを含む）または死亡の場合は、この四半期報告ではなく、同条1項の「遅滞なく」の報告になります。${marker(workerInjuryReport)}`,
        ],
      };
    }

    if (fourDaysOrMore) {
      return {
        conclusion: `休業4日以上（4日ちょうどを含む）の労働災害は、安衛則97条1項により、遅滞なく、電子情報処理組織を使用して所轄労働基準監督署長へ労働者死傷病報告を行います。同項は「何日以内」という日数ではなく「遅滞なく」と定めています。${marker(workerInjuryReport)}`,
        conditions: [
          `休業日数が4日に満たない場合は、四半期ごとにまとめ、各期間の最後の月の翌月末日までに報告します。${marker(workerInjuryReport)}`,
          `死亡した場合も、同条1項による「遅滞なく」の報告対象です。${marker(workerInjuryReport)}`,
        ],
      };
    }

    return {
      conclusion: `労働者死傷病報告の期限は休業日数で分かれます。死亡または休業4日以上は安衛則97条1項により「遅滞なく」、休業4日未満は同条2項により四半期ごとにまとめて各期間の最後の月の翌月末日までに報告します。${marker(workerInjuryReport)}`,
      conditions: [
        `報告先は所轄労働基準監督署長で、電子情報処理組織を使用して報告します。${marker(workerInjuryReport)}`,
      ],
    };
  }

  const presented = presentationConclusion(query, articles);
  if (presented) return presented;

  const electricWork = /(?:電気作業|電気工事|充電電路)/.test(normalized);
  const electricWorkDefinition = articleIndex(
    articles,
    (article) =>
      article.lawShort === "電気工事士法" &&
      /^第?2条$/.test(article.articleNum) &&
      /電気工事/.test(article.text),
  );
  const electricianRestriction = articleIndex(
    articles,
    (article) =>
      article.lawShort === "電気工事士法" &&
      /^第?3条$/.test(article.articleNum) &&
      /電気工事士/.test(article.text),
  );
  const electricSpecialEducationDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?59条$/.test(article.articleNum),
  );
  const electricSpecialEducationWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?36条$/.test(article.articleNum) &&
      /充電電路/.test(article.text),
  );
  const electricWorkController = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?350条$/.test(article.articleNum) &&
      /作業の指揮者を定めて/.test(article.text),
  );
  const electricQualificationSources = [
    electricWorkDefinition,
    electricianRestriction,
    electricSpecialEducationDuty,
    electricSpecialEducationWork,
  ];
  const hasElectricQualificationSources = electricQualificationSources.every(
    (index) => index >= 0,
  );
  if (
    electricWork &&
    hasElectricQualificationSources &&
    /公式原文/.test(normalized)
  ) {
    return {
      conclusion: `公式原文は、根拠欄の電気工事士法2条・3条、安衛法59条3項、安衛則36条4号の各「公式原文」リンクから確認できます。${markers(...electricQualificationSources)}`,
      conditions: [
        `配線・設備工事は電気工事士法、充電電路の敷設・点検・修理・操作等は安衛法・安衛則の根拠を開いてください。${markers(...electricQualificationSources)}`,
      ],
    };
  }
  if (
    electricWork &&
    hasElectricQualificationSources &&
    /(?:何条|条文)/.test(normalized)
  ) {
    return {
      conclusion: `主な根拠条文は、電気工事の範囲を定める電気工事士法2条、従事制限を定める同法3条、特別教育の根拠となる安衛法59条3項と安衛則36条4号です。${markers(...electricQualificationSources)}`,
      conditions: [
        `作業主任者ではなく作業指揮者を確認する場合は、対象作業を列挙する安衛則350条を別に確認します。`,
      ],
    };
  }
  if (
    electricWork &&
    hasElectricQualificationSources &&
    /何項/.test(normalized)
  ) {
    return {
      conclusion: `特別教育の直接の根拠は安衛法59条3項です。電気工事士法は、2条3項が「電気工事」の定義、3条1項〜4項が設備・工事区分ごとの従事制限を定めています。${markers(...electricQualificationSources)}`,
      conditions: [
        `どの項が当たるかは、自家用・一般用・特殊・簡易の電気工事区分で変わります。${markers(electricWorkDefinition, electricianRestriction)}`,
      ],
    };
  }
  if (
    electricWork &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0 &&
    /何号/.test(normalized)
  ) {
    return {
      conclusion: `充電電路の敷設・点検・修理・操作等に関する特別教育の対象業務は、安衛則36条4号です。電気工事士法3条は号ではなく、工事区分を各項で定めています。${markers(electricianRestriction, electricSpecialEducationWork)}`,
      conditions: [],
    };
  }
  if (
    electricWork &&
    hasElectricQualificationSources &&
    /告示/.test(normalized)
  ) {
    return {
      conclusion: `この電気作業の資格・教育回答で確認済みの直接根拠は法律と省令で、関連告示は現在の検証済み回答根拠に含めていません。${markers(...electricQualificationSources)}`,
      conditions: [
        `告示名や対象作業が分かる場合は、その名称を含めて確認してください。`,
      ],
    };
  }
  if (
    electricWork &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0 &&
    /例外/.test(normalized)
  ) {
    return {
      conclusion: `主な例外は制度ごとに異なります。安衛則36条4号の低圧業務では、対地電圧50V以下のものと、電信用・電話用等で感電危害のおそれがないものが同号の対象から除かれます。${marker(electricSpecialEducationWork)}`,
      conditions: [
        `電気工事士法の従事制限は、まず同法2条3項の「電気工事」に当たるかを確認します。${markers(electricWorkDefinition, electricianRestriction)}`,
      ],
    };
  }
  if (
    electricWork &&
    hasElectricQualificationSources &&
    /(?:いつから|施行日|適用日)/.test(normalized)
  ) {
    return {
      conclusion: `電気工事士法上の従事制限と、安衛法上の特別教育は別制度のため、開始日は一つではありません。現在の検証済み条文が基準日2026年8月3日に施行中であることは確認できますが、この回答の根拠metadataだけでは各制度の最初の施行日を確定できないため、日付は断定しません。${markers(...electricQualificationSources)}`,
      conditions: [
        `開始日を調べる対象を、電気工事士法の資格か、充電電路作業の特別教育かに分けてください。${markers(...electricQualificationSources)}`,
      ],
    };
  }
  if (
    electricWork &&
    /(?:作業指揮者|作業の指揮者)/.test(normalized) &&
    electricWorkController >= 0
  ) {
    return {
      conclusion: `電気作業すべてに一律の作業指揮者を置く規定ではありません。安衛則339条、341条1項、342条1項、344条1項または345条1項の作業では、作業の指揮者を定め、方法・順序の周知と直接指揮等を行わせます。${marker(electricWorkController)}`,
      conditions: [
        `今回の作業が安衛則350条に列挙された作業に当たるかを確認します。${marker(electricWorkController)}`,
      ],
    };
  }
  if (
    electricWork &&
    /低圧/.test(normalized) &&
    /充電電路/.test(normalized) &&
    /(?:敷設|修理)/.test(normalized) &&
    /(?:特別教育|教育)/.test(normalized) &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `はい。低圧の充電電路の敷設または修理は、安衛法59条3項と安衛則36条4号に基づく特別教育が必要です。${markers(electricSpecialEducationDuty, electricSpecialEducationWork)}`,
      conditions: [
        `対地電圧が50V以下のものや、電信用・電話用等で感電による危害のおそれがないものは同号から除かれます。${marker(electricSpecialEducationWork)}`,
        ...(electricWorkDefinition >= 0 && electricianRestriction >= 0
          ? [
              `設備の設置・変更が電気工事士法上の「電気工事」に当たる場合、同法の従事制限も特別教育とは別に確認します。${markers(electricWorkDefinition, electricianRestriction)}`,
            ]
          : []),
      ],
    };
  }
  if (
    electricWork &&
    /(?:資格|免許|教育)/.test(normalized) &&
    !/作業主任者/.test(normalized) &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `電気工事士法上の「電気工事」は、一般用電気工作物等または自家用電気工作物を設置・変更する工事です。${marker(electricWorkDefinition)} 電気工事士法3条は、設備・工事区分に応じて、電気工事士免状または認定証等を持つ者に従事を限っています。${marker(electricianRestriction)} 安衛法59条3項は、省令で定める危険・有害業務に就かせるとき、特別教育を行うよう定めています。${marker(electricSpecialEducationDuty)} 電気では、安衛則36条4号に充電電路の敷設・点検・修理・操作等が掲げられています。${marker(electricSpecialEducationWork)}`,
      conditions: [
        `電気工事士法3条の区分は、自家用・一般用・特殊・簡易の各電気工事で異なります。${marker(electricianRestriction)}`,
        `安衛則36条4号は、高圧・特別高圧では充電電路または支持物の敷設・点検・修理・操作を掲げています。${marker(electricSpecialEducationWork)}`,
        `低圧では、充電電路の敷設・修理と、充電部分が露出した開閉器の操作が同号に掲げられています。${marker(electricSpecialEducationWork)}`,
      ],
    };
  }

  const employmentEducationDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?59条$/.test(article.articleNum),
  );
  const employmentEducationItems = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?35条$/.test(article.articleNum) &&
      /労働者を雇い入れ/.test(article.text),
  );
  if (
    isEmploymentEducationQuery(query) &&
    employmentEducationDuty >= 0 &&
    employmentEducationItems >= 0
  ) {
    return {
      conclusion: `安衛法59条1項は、労働者を雇い入れたとき、その業務に関する安全・衛生教育を行うよう事業者に求めています。${marker(employmentEducationDuty)} 安衛則35条は、当該労働者へ遅滞なく必要事項を教育するよう定めています。${marker(employmentEducationItems)}`,
      conditions: [
        `作業内容を変更したときも、従事する業務に必要な安全・衛生教育が必要です。${markers(employmentEducationDuty, employmentEducationItems)}`,
        `教育事項には、危険・有害性と取扱い、安全装置・保護具、作業手順・開始時点検、疾病予防、整理整頓、事故時の応急措置・退避などが含まれます。${marker(employmentEducationItems)}`,
        `十分な知識・技能があると認められる事項は、その教育を省略できます。${marker(employmentEducationItems)}`,
      ],
    };
  }

  const workLeaderDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?14条$/.test(article.articleNum),
  );
  const workLeaderListedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" && /^第?6条$/.test(article.articleNum),
  );
  const electricalWorkController = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?350条$/.test(article.articleNum) &&
      /作業の指揮者/.test(article.text),
  );
  const safetyManagerQualification = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?5条$/.test(article.articleNum) &&
      /安全管理者の資格|法第十一条第一項の厚生労働省令で定める資格/.test(
        `${article.articleTitle ?? ""}${article.text}`,
      ),
  );
  if (
    /安全管理者/.test(normalized) &&
    /(?:技能講習|資格|研修)/.test(normalized) &&
    safetyManagerQualification >= 0
  ) {
    return {
      conclusion: `安全管理者の資格は、「技能講習」という名称の講習だけで一律に満たす制度ではありません。安衛則5条は、所定の理科系学歴と産業安全の実務経験を有し厚生労働大臣が定める研修を修了した者、労働安全コンサルタント、その他厚生労働大臣が定める者を掲げています。${marker(safetyManagerQualification)}`,
      conditions: [
        `該当性は、学歴区分、産業安全の実務経験年数、修了した研修または他の資格区分で確認します。${marker(safetyManagerQualification)}`,
      ],
    };
  }
  const generalMonitorDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" &&
      /^第?13条$/.test(article.articleNum) &&
      /常時作業の状況を監視/.test(article.text),
  );
  const fumigationMonitorDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "特化則" &&
      /^第?38条の14$/.test(article.articleNum) &&
      /監視人を置/.test(article.text),
  );
  if (
    lacksWorkContext &&
    /(?:監視人|監視者)/.test(normalized) &&
    generalMonitorDuty >= 0 &&
    fumigationMonitorDuty >= 0
  ) {
    return {
      conclusion: `監視人はすべての作業で一律に置くものではなく、対象作業ごとの規則で要否と役割が変わります。酸欠則13条は酸素欠乏危険作業で常時作業を監視し異常を通報する者を置く等の措置を求め、特化則38条の14は臭化メチル等の燻蒸作業について特定の立入り条件等に監視人を定めています。${markers(generalMonitorDuty, fumigationMonitorDuty)}`,
      conditions: [
        `要否を確定するには、作業名、作業場所、扱う物質または設備を確認します。${markers(generalMonitorDuty, fumigationMonitorDuty)}`,
      ],
    };
  }
  const vehicleWorkController = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?151条の4$/.test(article.articleNum) &&
      /作業の指揮者を定め/.test(article.text),
  );
  if (
    lacksWorkContext &&
    /(?:作業指揮者|作業の指揮者)/.test(normalized) &&
    vehicleWorkController >= 0 &&
    electricalWorkController >= 0
  ) {
    return {
      conclusion: `作業指揮者はすべての作業で一律に置くものではなく、対象作業ごとの規則で要否と職務が変わります。安衛則151条の4は車両系荷役運搬機械等を用いる作業、同350条は停電作業や高圧・特別高圧の活線・近接作業等として同条が列挙する作業について、作業の指揮者を定めるよう求めています。${markers(vehicleWorkController, electricalWorkController)}`,
      conditions: [
        `要否を確定するには、実際の作業名と使用する機械・設備を確認します。${markers(vehicleWorkController, electricalWorkController)}`,
      ],
    };
  }
  if (
    lacksWorkContext &&
    /作業主任者/.test(normalized) &&
    workLeaderDuty >= 0 &&
    workLeaderListedWork >= 0
  ) {
    return {
      conclusion: `「作業主任者」はすべての作業に共通する資格ではなく、政令で指定された作業について選任する制度です。作業名が分からない段階では要否を一つに確定できません。${markers(workLeaderDuty, workLeaderListedWork)}`,
      conditions: [
        `実際の作業が安衛令6条の列挙に当たるかを確認します。${markers(workLeaderDuty, workLeaderListedWork)}`,
      ],
    };
  }
  const genericEducationDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?59条$/.test(article.articleNum),
  );
  const genericSpecialEducationWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?36条$/.test(article.articleNum),
  );
  if (
    lacksWorkContext &&
    /特別教育/.test(normalized) &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `特別教育は、危険・有害な業務として厚生労働省令で指定された作業に就かせるときに必要です。作業名が分からない段階では対象号を一つに確定できません。${markers(genericEducationDuty, genericSpecialEducationWork)}`,
      conditions: [
        `実際に行う作業が安衛則36条のどの業務に当たるかを確認します。${marker(genericSpecialEducationWork)}`,
      ],
    };
  }
  const genericRestrictedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?61条$/.test(article.articleNum),
  );
  if (
    lacksWorkContext &&
    /(?:資格|免許|技能講習|教育)/.test(normalized) &&
    workLeaderDuty >= 0 &&
    genericEducationDuty >= 0 &&
    genericRestrictedWork >= 0
  ) {
    return {
      conclusion: `必要な資格・教育は作業で変わります。現在の情報だけでは一つに確定できませんが、主な制度は、指定された危険・有害業務の教育、就業制限業務の免許・技能講習等、指定作業の作業主任者です。${markers(genericEducationDuty, genericRestrictedWork, workLeaderDuty)}`,
      conditions: [
        `作業者本人の資格・教育か、作業主任者の選任かを分けます。${markers(genericEducationDuty, genericRestrictedWork, workLeaderDuty)}`,
      ],
    };
  }
  if (
    electricWork &&
    /作業主任者/.test(normalized) &&
    workLeaderDuty >= 0 &&
    workLeaderListedWork >= 0 &&
    electricalWorkController >= 0
  ) {
    return {
      conclusion: `安衛法14条は、対象作業の区分に応じて作業主任者を選任し、労働者の指揮等を行わせるよう定めています。${marker(workLeaderDuty)} 安衛令6条は、「法第十四条の政令で定める作業」（指定された作業）を列挙しています。${marker(workLeaderListedWork)} 電気作業では、安衛則350条が安衛則339条・341条1項・342条1項・344条1項・345条1項の作業を行うときに作業の指揮者を定めるよう求めています。${marker(electricalWorkController)}`,
      conditions: [
        `安衛令6条の「高圧室内作業」は、大気圧を超える圧気工法の作業であり、高電圧の電気室を意味しません。${marker(workLeaderListedWork)}`,
        ...(electricSpecialEducationWork >= 0
          ? [
              `安衛則36条4号には、高圧・特別高圧の充電電路または支持物の敷設・点検・修理・操作と、一定の低圧業務が掲げられています。${marker(electricSpecialEducationWork)}`,
            ]
          : []),
        ...(electricSpecialEducationWork >= 0
          ? [
              `低圧か高圧・特別高圧かに加え、敷設・点検・修理・操作のどれを行うかを確認します。${marker(electricSpecialEducationWork)}`,
            ]
          : []),
      ],
    };
  }

  const scaffold = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?563条$/.test(article.articleNum) &&
      /作業床/.test(`${article.articleTitle} ${article.text}`),
  );
  const scaffoldDefinition = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?552条$/.test(article.articleNum) &&
      /(?:八十五|85)センチメートル以上/.test(article.text) &&
      /(?:三十五|35)センチメートル以上(?:五十|50)センチメートル以下/.test(
        article.text,
      ),
  );
  if (
    /(?:足場|作業床)/.test(normalized) &&
    /幅/.test(normalized) &&
    !/(?:手すり|中さん|中桟)/.test(normalized) &&
    scaffold >= 0
  ) {
    return {
      conclusion: `つり足場を除く足場の作業床は、幅40cm以上が必要です。${marker(scaffold)}`,
      conditions: [
        `床材間の隙間は3cm以下です。${marker(scaffold)}`,
        `床材と建地との隙間は原則12cm未満です。12cm以上でも、墜落防止措置を講じた上で、両端の隙間の和が24cm未満の場合、または作業上24cm未満が困難な場合には例外があります。${marker(scaffold)}`,
      ],
    };
  }
  const openingProtection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?519条$/.test(article.articleNum) &&
      /高さが二メートル以上の作業床の端、開口部等/.test(article.text) &&
      /囲い、手すり、覆い等/.test(article.text),
  );
  if (
    /開口部/.test(normalized) &&
    /(?:手すり|囲い|覆い|養生|墜落防止|どうする|必要)/.test(normalized) &&
    openingProtection >= 0
  ) {
    return {
      conclusion: `高さ2m以上の作業床の端や開口部で墜落のおそれがある箇所には、囲い・手すり・覆い等を設ける必要があります。${marker(openingProtection)}`,
      conditions: [
        `囲い等を設けることが著しく困難な場合や、作業上いったん外す場合は、防網や要求性能墜落制止用器具の使用等の代替措置が必要です。${marker(openingProtection)}`,
      ],
    };
  }
  if (
    /手すり|中さん|中桟/.test(normalized) &&
    scaffold >= 0 &&
    scaffoldDefinition >= 0
  ) {
    const handrailHeight = normalized.match(/(\d+(?:\.\d+)?)cm/)?.[1];
    const measuredHeight = handrailHeight ? Number(handrailHeight) : null;
    return {
      conclusion:
        measuredHeight !== null &&
        Number.isFinite(measuredHeight) &&
        measuredHeight < 85
          ? `高さ2m以上の一側足場を除く足場で、墜落により危険を及ぼすおそれのある箇所のうち、わく組足場以外の部分には手すり等と中桟等が必要です。${marker(scaffold)} 「手すり等」は高さ85cm以上、「中桟等」は高さ35〜50cmなので、${measuredHeight}cmの手すりは基準を満たしません。${marker(scaffoldDefinition)}`
          : `高さ2m以上の一側足場を除く足場で、墜落により危険を及ぼすおそれのある箇所のうち、わく組足場以外の部分には手すり等と中桟等が必要です。${marker(scaffold)} 「手すり等」は高さ85cm以上、「中桟等」は高さ35〜50cmです。${marker(scaffoldDefinition)}`,
      conditions: [],
    };
  }

  const forkliftDecree = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" &&
      /^第?20条$/.test(article.articleNum) &&
      /一トン以上のフ[オォ]ークリフト/.test(article.text),
  );
  const forkliftTraining = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?36条$/.test(article.articleNum) &&
      /1トン未満のフォークリフト|一トン未満のフ[オォ]ークリフト/.test(
        article.text,
      ),
  );
  const safetyEducationDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?59条$/.test(article.articleNum),
  );
  const restrictedWorkDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?61条$/.test(article.articleNum),
  );
  const skillTrainingCertificateReissue = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?82条$/.test(article.articleNum) &&
      /技能講習修了証の再交付/.test(article.articleTitle ?? ""),
  );
  const statedLoad = loadRangeInTons(normalized);
  if (
    /フォー?クリフト/.test(normalized) &&
    /(?:技能講習|資格|免許)/.test(normalized) &&
    /(?:いつまで有効|有効期限|期限|更新)/.test(normalized) &&
    forkliftDecree >= 0 &&
    restrictedWorkDuty >= 0
  ) {
    return {
      conclusion: `${/技能講習/.test(normalized) ? "フォークリフト運転技能講習について" : "最大荷重1トン以上で必要となるフォークリフト運転技能講習について"}、安衛法61条と安衛令20条11号は「技能講習を修了した者」等に運転を限っていますが、有効期限や定期更新は定めていません。したがって、この就業制限上、修了から一定年数で資格が失効する期限は規定されていません。${markers(restrictedWorkDuty, forkliftDecree)}`,
      conditions: [
        ...(!/技能講習/.test(normalized) &&
        forkliftTraining >= 0 &&
        safetyEducationDuty >= 0
          ? [
              `最大荷重1トン未満は技能講習資格ではなく特別教育の対象なので、車両の最大荷重を確認します。${markers(safetyEducationDuty, forkliftTraining)}`,
            ]
          : []),
        ...(skillTrainingCertificateReissue >= 0
          ? [
              `修了証を紛失・損傷した場合や氏名を変更した場合は、有効期限の更新ではなく、安衛則82条の再交付・書替え手続を確認します。${marker(skillTrainingCertificateReissue)}`,
            ]
          : []),
        `道路上を走行する場合に必要な運転免許等や、事業者が行う再教育は別に確認します。${marker(forkliftDecree)}`,
      ],
    };
  }
  if (
    /フォー?クリフト/.test(normalized) &&
    /(?:技能講習|資格|免許)/.test(normalized) &&
    /(?:誰が|誰に|誰を).*(?:受け|受講)|(?:受け|受講).*(?:誰|対象者)|対象(?:者)?(?:は|が)?誰|誰(?:が)?対象|誰(?:が)?(?:なの|ですか|か)?[?？]?$/.test(
      normalized,
    ) &&
    forkliftDecree >= 0 &&
    restrictedWorkDuty >= 0
  ) {
    return {
      conclusion: `最大荷重1トン以上のフォークリフト運転業務に就く人は、フォークリフト運転技能講習を修了した者等でなければなりません。${markers(restrictedWorkDuty, forkliftDecree)}`,
      conditions: [
        ...(forkliftTraining >= 0 && safetyEducationDuty >= 0
          ? [
              `最大荷重1トン未満の運転者は技能講習ではなく、特別教育の対象です。${markers(safetyEducationDuty, forkliftTraining)}`,
            ]
          : []),
        `判定には実際の積荷重量ではなく、車両の最大荷重を使います。${marker(forkliftDecree)}`,
      ],
    };
  }
  if (/フォー?クリフト/.test(normalized) && forkliftIntent.qualification) {
    if (
      isDefinitelyAtLeast(statedLoad, 1) &&
      forkliftDecree >= 0 &&
      restrictedWorkDuty >= 0
    ) {
      return {
        conclusion: `最大荷重1トン以上のフォークリフト運転は、フォークリフト運転技能講習の修了者等に限られます。${markers(restrictedWorkDuty, forkliftDecree)}`,
        conditions: [
          `道路上を走行させる運転は、この条文の対象外です。${marker(forkliftDecree)}`,
        ],
      };
    }
    if (
      isDefinitelyBelow(statedLoad, 1) &&
      forkliftTraining >= 0 &&
      safetyEducationDuty >= 0
    ) {
      return {
        conclusion: `最大荷重1トン未満のフォークリフト運転には、特別教育が必要です。${markers(safetyEducationDuty, forkliftTraining)}`,
        conditions: [
          `道路上を走行させる運転は、この規定の対象外です。${marker(forkliftTraining)}`,
        ],
      };
    }
    if (
      statedLoad === null &&
      forkliftDecree >= 0 &&
      forkliftTraining >= 0 &&
      safetyEducationDuty >= 0 &&
      restrictedWorkDuty >= 0
    ) {
      return {
        conclusion: `安衛則36条5号は、最大荷重1トン未満のフォークリフト運転を掲げています。${marker(forkliftTraining)} 安衛法59条3項により、省令で定める危険・有害業務に就かせるときは特別教育が必要です。${marker(safetyEducationDuty)} 最大荷重1トン以上のフォークリフト運転は、安衛令20条11号の就業制限業務です。${marker(forkliftDecree)} 安衛法61条は、その業務を技能講習修了者等の所定資格を持つ者に限っています。${marker(restrictedWorkDuty)}`,
        conditions: [
          `「最大荷重」は、車両の構造・材料に応じて基準荷重中心に負荷できる最大の荷重です。${marker(forkliftDecree)}`,
          `最大荷重1トンちょうどは、安衛令20条11号の就業制限側です。${marker(forkliftDecree)}`,
          `1トン未満の規定は道路走行を除きます。${marker(forkliftTraining)} 1トン以上の規定も道路走行を除きます。${marker(forkliftDecree)}`,
        ],
      };
    }
  }

  const sling = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" &&
      /^第?20条$/.test(article.articleNum) &&
      /一トン以上.*玉掛け/.test(article.text),
  );
  const slingLoadDefinition = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" &&
      /^第?10条$/.test(article.articleNum) &&
      /構造及び材料に応じて負荷させることができる最大の荷重/.test(article.text),
  );
  const slingRule = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?221条$/.test(article.articleNum) &&
      /玉掛け技能講習/.test(article.text),
  );
  const slingSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?222条$/.test(article.articleNum) &&
      /特別の教育/.test(article.text),
  );
  if (
    /玉掛/.test(normalized) &&
    (isDefinitelyAtLeast(statedLoad, 1) ||
      /何(?:t|トン)から/.test(normalized)) &&
    (sling >= 0 || slingRule >= 0)
  ) {
    const sourceMarkers = [sling, slingRule].filter((index) => index >= 0);
    if (
      statedLoad === null &&
      /何(?:t|トン)から/.test(normalized) &&
      sling >= 0 &&
      slingRule >= 0 &&
      slingSpecialEducation >= 0
    ) {
      return {
        conclusion: `つり上げ荷重1トン以上のクレーン・移動式クレーン・デリックの玉掛けは、就業制限の対象です。${marker(sling)} その業務は、玉掛け技能講習の修了者等に限られます。${marker(slingRule)} つり上げ荷重1トン未満のクレーン等の玉掛けでは、事業者は特別教育を行わなければなりません。${marker(slingSpecialEducation)}`,
        conditions: [
          `つり上げ荷重1トンちょうどは、就業制限の対象です。${marker(sling)}`,
          ...(slingLoadDefinition >= 0
            ? [
                `「つり上げ荷重」は、機械の構造・材料に応じて負荷できる最大の荷重です。${marker(slingLoadDefinition)}`,
              ]
            : []),
          `揚貨装置は制限荷重で判定するため、機械の種類も確認します。${marker(sling)}`,
        ],
      };
    }
    return {
      conclusion:
        slingRule >= 0
          ? `つり上げ荷重1トン以上のクレーン等の玉掛けは、玉掛け技能講習の修了者等に限られます。${markers(...sourceMarkers)}`
          : `つり上げ荷重1トン以上のクレーン等の玉掛けは、就業制限の対象業務です。${marker(sling)}`,
      conditions: [
        ...(slingLoadDefinition >= 0
          ? [
              `基準は実際の荷の重さではなく、機械の構造・材料に応じた最大荷重である「つり上げ荷重」です。${markers(slingLoadDefinition, ...sourceMarkers)}`,
            ]
          : []),
      ],
    };
  }
  if (
    /玉掛/.test(normalized) &&
    isDefinitelyBelow(statedLoad, 1) &&
    slingSpecialEducation >= 0
  ) {
    return {
      conclusion: `つり上げ荷重1トン未満のクレーン等の玉掛けには、特別教育が必要です。${marker(slingSpecialEducation)}`,
      conditions: [
        ...(slingLoadDefinition >= 0
          ? [
              `基準は実際の荷の重さではなく、機械の構造・材料に応じた最大荷重である「つり上げ荷重」です。${markers(slingLoadDefinition, slingSpecialEducation)}`,
            ]
          : []),
      ],
    };
  }

  const mobileCraneSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?67条$/.test(article.articleNum) &&
      /一トン未満の移動式クレーン/.test(article.text),
  );
  const mobileCraneRestriction = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?68条$/.test(article.articleNum) &&
      /小型移動式クレーン運転技能講習/.test(article.text),
  );
  if (/移動式クレーン/.test(normalized) && statedLoad !== null) {
    if (isDefinitelyBelow(statedLoad, 1) && mobileCraneSpecialEducation >= 0) {
      return {
        conclusion: `つり上げ荷重1トン未満の移動式クレーン運転には、特別教育が必要です。${marker(mobileCraneSpecialEducation)}`,
        conditions: [
          `道路上を走行させる運転は、この規定の対象外です。${marker(mobileCraneSpecialEducation)}`,
        ],
      };
    }
    if (
      isDefinitelyAtLeast(statedLoad, 1) &&
      isDefinitelyBelow(statedLoad, 5) &&
      mobileCraneRestriction >= 0
    ) {
      return {
        conclusion: `つり上げ荷重1トン以上5トン未満の移動式クレーン運転は、小型移動式クレーン運転技能講習の修了者が行えます。${marker(mobileCraneRestriction)}`,
        conditions: [
          `5トン以上は移動式クレーン運転士免許が必要です。${marker(mobileCraneRestriction)}`,
        ],
      };
    }
    if (isDefinitelyAtLeast(statedLoad, 5) && mobileCraneRestriction >= 0) {
      return {
        conclusion: `つり上げ荷重5トン以上の移動式クレーン運転には、移動式クレーン運転士免許が必要です。${marker(mobileCraneRestriction)}`,
        conditions: [
          `1トン以上5トン未満は、小型移動式クレーン運転技能講習でも運転できます。${marker(mobileCraneRestriction)}`,
        ],
      };
    }
  }

  const organicHealthExam = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?29条$/.test(article.articleNum) &&
      /六月以内ごとに一回/.test(article.text) &&
      /健康診断/.test(article.text),
  );
  const organicHealthScopeIntent = /(?:対象業務|どの業務|誰が対象|対象者)/.test(
    normalized,
  );
  if (
    /(?:有機溶剤|シンナー)/.test(normalized) &&
    /(?:健康診断|健診)/.test(normalized) &&
    organicHealthExam >= 0
  ) {
    if (organicHealthScopeIntent) {
      return {
        conclusion: `有機則29条1項の健康診断対象業務は、屋内作業場等で行う有機溶剤業務のうち、同則3条1項の場合の業務を除くものです。第三種有機溶剤等はタンク等の内部で行う業務に限られます。${marker(organicHealthExam)}`,
        conditions: [],
      };
    }
    return {
      conclusion: `有機則29条2項により、同条1項の対象業務に常時従事する労働者には、雇入れ時、配置替え時、その後6か月以内ごとに1回、医師による健康診断が必要です。${marker(organicHealthExam)}`,
      conditions: [],
    };
  }

  const organicDefinitions = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?1条$/.test(article.articleNum) &&
      /有機溶剤業務/.test(article.text),
  );
  const organicIndoorEquipment = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?5条$/.test(article.articleNum) &&
      /密閉する設備、局所排気装置又はプッシュプル型換気装置/.test(article.text),
  );
  const organicTankEquipment = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?6条$/.test(article.articleNum) &&
      /第三種有機溶剤等/.test(article.text) &&
      /全体換気装置/.test(article.text),
  );
  const organicTemporaryException = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?8条$/.test(article.articleNum) &&
      /臨時に有機溶剤業務/.test(article.text),
  );
  const organicShortTimeException = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?9条$/.test(article.articleNum) &&
      /短時間/.test(article.text),
  );
  const organicClassOneOrTwo = /(?:第?[一二12]種|第一種|第二種)/.test(
    normalized,
  );
  const organicClassThree = /(?:第?[三3]種|第三種)/.test(normalized);
  const organicTankOutside =
    /(?:タンク等?の?外|タンク外|内部以外|それ以外の屋内)/.test(normalized);
  const organicTankInside = /(?:タンク等?の?内部|タンク内)/.test(normalized);
  const asksTemporaryOrganicWork = /臨時/.test(normalized);
  const asksShortOrganicWork = /短時間/.test(normalized);
  const organicNonSpray =
    /(?:吹付け以外|吹き?付け(?:作業)?ではない|非吹付け)/.test(normalized);
  const organicSpray =
    !organicNonSpray && /(?:吹き?付け|スプレー)(?:作業)?/.test(normalized);
  const organicLocationUnknown =
    !organicTankInside &&
    !organicTankOutside &&
    /(?:不明|分からない|わからない)/.test(normalized);
  if (
    /有機溶剤/.test(normalized) &&
    /(?:換気|局所排気|局排|プッシュプル)/.test(normalized) &&
    !/屋内/.test(normalized) &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0 &&
    organicTankEquipment >= 0
  ) {
    return {
      conclusion: `有機溶剤の換気設備は、溶剤の種別と作業場所で変わります。第一種・第二種有機溶剤等を屋内作業場等で法定の有機溶剤業務に使う場合は、原則として発散源の密閉設備、局所排気装置またはプッシュプル型換気装置が必要です。${markers(organicDefinitions, organicIndoorEquipment)} 第三種有機溶剤等は、タンク等の内部で行う業務について全体換気装置を含む別の設備区分があります。${marker(organicTankEquipment)}`,
      conditions: [
        `まずSDSの成分・含有率から有機溶剤等の種別を確認します。${marker(organicDefinitions)}`,
        `臨時・短時間作業やタンク等の内部では適用除外・特例があり得るため、場所と作業方法を確認します。${markers(organicIndoorEquipment, organicTankEquipment)}`,
      ],
    };
  }
  if (
    /有機溶剤/.test(normalized) &&
    /屋内/.test(normalized) &&
    organicDefinitions >= 0 &&
    organicClassThree &&
    organicTankEquipment >= 0
  ) {
    if (organicTankOutside) {
      return {
        conclusion: `第三種有機溶剤等について、有機則6条の設備義務はタンク等の内部で行う業務が対象です。タンク等の内部以外の屋内という今回の条件には、同条の設備義務は適用されません。${marker(organicTankEquipment)}`,
        conditions: [
          `SDSで第三種への該当と、実際の作業方法を確認してください。${marker(organicDefinitions)}`,
        ],
      };
    }
    return {
      conclusion:
        asksTemporaryOrganicWork && organicTemporaryException >= 0
          ? organicTankInside && organicNonSpray
            ? `第三種有機溶剤等をタンク等の内部で吹付け以外の臨時作業に使う場合、第6条1項により、密閉設備、局所排気装置、プッシュプル型換気装置または全体換気装置が必要です。第8条2項の特例は第5条または第6条2項の設備を対象としており、第6条1項の設備義務は省略できません。${markers(organicTankEquipment, organicTemporaryException)}`
            : organicTankInside && organicSpray
              ? `第三種有機溶剤等をタンク等の内部で吹付ける臨時作業は第6条2項の対象ですが、全体換気装置を設けた場合、第8条2項により密閉設備・局所排気装置・プッシュプル型換気装置を設けないことができます。${markers(organicTankEquipment, organicTemporaryException)}`
              : organicTankInside
                ? `第三種有機溶剤等をタンク等の内部で臨時に使う場合、吹付け以外は第6条1項により密閉・局所排気・プッシュプル型換気・全体換気のいずれかが必要です。吹付けは第6条2項の対象ですが、全体換気装置を設ける第8条2項の条件を満たせば同項の設備を省略できます。${markers(organicTankEquipment, organicTemporaryException)}`
                : `第三種有機溶剤等の臨時作業は、タンク等の内部か、さらに内部では吹付け作業かで扱いが変わります。内部の吹付け以外は第6条1項、吹付けは第6条2項と第8条2項を確認します。${markers(organicTankEquipment, organicTemporaryException)}`
          : asksShortOrganicWork && organicShortTimeException >= 0
            ? `第三種有機溶剤等の短時間作業では、タンク等の内部で短時間かつ送気マスクを備える等の条件を満たす場合、第6条の設備を設けないことができます。${markers(organicTankEquipment, organicShortTimeException)}`
            : organicSpray
              ? `第三種有機溶剤等をタンク等の内部で吹付ける場合、第6条2項により、密閉設備、局所排気装置またはプッシュプル型換気装置が必要です。全体換気装置だけを選ぶことはできません。${marker(organicTankEquipment)}`
              : organicNonSpray
                ? `第三種有機溶剤等をタンク等の内部で吹付け以外の作業に使う場合、第6条1項により、密閉設備、局所排気装置、プッシュプル型換気装置または全体換気装置が必要です。${marker(organicTankEquipment)}`
                : `第三種有機溶剤等をタンク等の内部で使う場合、吹付け以外は密閉設備・局所排気装置・プッシュプル型換気装置・全体換気装置のいずれか、吹付けは全体換気装置を除く前三設備のいずれかが必要です。${marker(organicTankEquipment)}`,
      conditions: [
        `第6条の設備義務は、第三種有機溶剤等をタンク等の内部で使う場合を対象にしています。${marker(organicTankEquipment)}`,
        `まずSDSで第三種への該当と作業方法を確認してください。${marker(organicDefinitions)}`,
        ...(organicLocationUnknown
          ? [
              "場所が不明な場合は、容器・設備図面と実際の作業場所を確認してください。",
            ]
          : []),
      ],
    };
  }
  if (
    /有機溶剤/.test(normalized) &&
    /屋内/.test(normalized) &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0
  ) {
    const explicitExceptionConclusion =
      asksTemporaryOrganicWork && organicTemporaryException >= 0
        ? organicTankOutside
          ? `第一種・第二種有機溶剤等の臨時作業をタンク等の内部以外で行う場合、第8条1項により第5条の設備義務は適用されません。${markers(organicIndoorEquipment, organicTemporaryException)}`
          : organicTankInside
            ? `第一種・第二種有機溶剤等の臨時作業をタンク等の内部で行う場合、全体換気装置を設ける等の第8条2項の条件を満たせば、第5条の密閉設備・局所排気装置・プッシュプル型換気装置を設けないことができます。${markers(organicIndoorEquipment, organicTemporaryException)}`
            : `第一種・第二種有機溶剤等の臨時作業は場所で分かれます。タンク等の内部以外では第5条は適用されず、タンク等の内部では全体換気装置を設ける等の第8条2項の条件で第5条の設備を省略できます。${markers(organicIndoorEquipment, organicTemporaryException)}`
        : asksShortOrganicWork && organicShortTimeException >= 0
          ? organicTankOutside
            ? `第一種・第二種有機溶剤等の短時間作業をタンク等の内部以外で行う場合、短時間かつ全体換気装置を設ける等の第9条1項の条件を満たせば、第5条の設備を設けないことができます。${markers(organicIndoorEquipment, organicShortTimeException)}`
            : organicTankInside
              ? `第一種・第二種有機溶剤等の短時間作業をタンク等の内部で行う場合、短時間かつ送気マスクを備える等の第9条2項の条件を満たせば、第5条の設備を設けないことができます。${markers(organicIndoorEquipment, organicShortTimeException)}`
              : `第一種・第二種有機溶剤等の短時間作業は場所で分かれます。タンク等の内部以外では短時間かつ全体換気装置、内部では短時間かつ送気マスクを備える等の第9条の条件を満たす場合、第5条の設備を省略できます。${markers(organicIndoorEquipment, organicShortTimeException)}`
          : null;
    return {
      conclusion:
        explicitExceptionConclusion ??
        `有機則1条は、有機溶剤を重量の5%を超えて含む混合物を「有機溶剤含有物」としています。${marker(organicDefinitions)} 第一種・第二種有機溶剤等を屋内作業場等で法定の有機溶剤業務に使う場合は、原則として発散源の密閉設備、局所排気装置またはプッシュプル型換気装置が必要です。${marker(organicIndoorEquipment)}`,
      conditions: [
        `SDSの成分・含有率欄と作業内容を確認し、有機溶剤を重量の5%を超えて含む混合物かを照合します。${marker(organicDefinitions)}`,
        ...(!organicClassOneOrTwo &&
        !asksTemporaryOrganicWork &&
        !asksShortOrganicWork &&
        organicTankEquipment >= 0
          ? [
              `第三種有機溶剤等は扱いが異なり、タンク等の内部では全体換気を含む設備区分があります。${marker(organicTankEquipment)}`,
            ]
          : []),
        ...(!organicClassOneOrTwo &&
        !asksTemporaryOrganicWork &&
        !asksShortOrganicWork &&
        organicTemporaryException >= 0 &&
        organicShortTimeException >= 0
          ? [
              `臨時作業または短時間作業には設備の適用除外・特例がありますが、場所と換気・保護具等の条件を条文どおり満たす必要があります。${markers(organicTemporaryException, organicShortTimeException)}`,
            ]
          : []),
      ],
    };
  }

  const oxygenDeficiencyMonitor = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" &&
      /^第?13条$/.test(article.articleNum) &&
      /常時作業の状況を監視/.test(article.text),
  );
  const oxygenDeficiencyMeasurement = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" && /^第?3条$/.test(article.articleNum),
  );
  const oxygenDeficiencyVentilation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" && /^第?5条$/.test(article.articleNum),
  );
  const oxygenDeficiencyProtection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" && /^第?5条の2$/.test(article.articleNum),
  );
  const oxygenDeficiencySupervisor = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" && /^第?11条$/.test(article.articleNum),
  );
  const oxygenDeficiencyEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" && /^第?12条$/.test(article.articleNum),
  );
  const oxygenDeficiencyDefinition = articleIndex(
    articles,
    (article) =>
      article.lawShort === "酸欠則" &&
      /^第?2条$/.test(article.articleNum) &&
      /酸素の濃度が(?:18|十八)パーセント未満/.test(article.text),
  );
  const asksSecondOxygenEducationAboutHydrogenSulfide =
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:第二種|第2種)/.test(normalized) &&
    /(?:特別教育|教育|科目)/.test(normalized) &&
    /(?:硫化水素|H2S)/i.test(normalized);
  const asksWhetherOxygenEducationSubjectsThreeAndFourAreCommon =
    isOxygenEducationSubjectsThreeAndFourCommonIntent(normalized);
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:測定記録|記録事項|何を記録|記録.*(?:内容|保存)|保存.*何年|何年.*保存|第?3条第?2項)/.test(
      normalized,
    ) &&
    oxygenDeficiencyMeasurement >= 0
  ) {
    return {
      conclusion: `酸欠則3条2項は、測定のつど、①測定日時、②測定方法、③測定箇所、④測定条件、⑤測定結果、⑥測定を実施した者の氏名を記録し、3年間保存するよう定めています。${marker(oxygenDeficiencyMeasurement)}`,
      conditions: [
        `測定結果に基づいて酸素欠乏症等の防止措置を講じたときだけ、その措置の概要も記録します。${marker(oxygenDeficiencyMeasurement)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /測定/.test(normalized) &&
    oxygenDeficiencyMeasurement >= 0
  ) {
    return {
      conclusion: `はい。対象作業場では、その日の作業開始前に酸素濃度を測定します。第二種酸素欠乏危険作業では、酸素に加えて硫化水素の濃度も測定します。${marker(oxygenDeficiencyMeasurement)}`,
      conditions: [
        `測定のつど所定事項を記録し、3年間保存します。${marker(oxygenDeficiencyMeasurement)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:作業開始前|作業前|開始前).*(?:測定|濃度)|(?:測定|濃度).*(?:作業開始前|作業前|開始前)/.test(
      normalized,
    ) &&
    oxygenDeficiencyMeasurement >= 0
  ) {
    return {
      conclusion: `はい。対象となる作業場では、その日の作業開始前に空気中の酸素濃度を測定しなければなりません。第二種酸素欠乏危険作業では、硫化水素濃度も測定します。${marker(oxygenDeficiencyMeasurement)}`,
      conditions: [
        `測定結果は所定事項とともに記録し、3年間保存します。${marker(oxygenDeficiencyMeasurement)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:硫化水素|H2S)/i.test(normalized) &&
    /(?:ppm|何.*以下|濃度|基準)/i.test(normalized) &&
    oxygenDeficiencyVentilation >= 0
  ) {
    return {
      conclusion: `第二種酸素欠乏危険作業で換気により保つ硫化水素濃度は、100万分の10以下、すなわち10ppm以下です。${marker(oxygenDeficiencyVentilation)}`,
      conditions: [
        `同時に、酸素濃度も18%以上に保ちます。${marker(oxygenDeficiencyVentilation)}`,
      ],
    };
  }
  if (
    /(?:酸素濃度|酸欠|酸素欠乏)/.test(normalized) &&
    /(?:何(?:パーセント|%)以上|基準|濃度.*以上)/.test(normalized) &&
    oxygenDeficiencyDefinition >= 0 &&
    oxygenDeficiencyVentilation >= 0
  ) {
    return {
      conclusion: `酸素欠乏危険作業で換気により保つ基準は、酸素濃度18%以上です。酸素濃度18%未満は「酸素欠乏」と定義されています。${markers(oxygenDeficiencyDefinition, oxygenDeficiencyVentilation)}`,
      conditions: [
        `第二種酸素欠乏危険作業では、酸素18%以上に加えて硫化水素濃度を100万分の10以下に保ちます。${marker(oxygenDeficiencyVentilation)}`,
        `爆発・酸化防止のため換気できない場合や、作業の性質上換気が著しく困難な場合は換気義務の例外です。${marker(oxygenDeficiencyVentilation)}`,
        ...(oxygenDeficiencyProtection >= 0
          ? [
              `例外時は、同時就業者数以上の空気呼吸器等を備え、労働者に使用させます。${marker(oxygenDeficiencyProtection)}`,
            ]
          : []),
      ],
    };
  }
  if (
    asksSecondOxygenEducationAboutHydrogenSulfide &&
    !asksWhetherOxygenEducationSubjectsThreeAndFourAreCommon &&
    oxygenDeficiencyDefinition >= 0 &&
    oxygenDeficiencyEducation >= 0
  ) {
    return {
      conclusion: `はい。第二種酸素欠乏危険作業の特別教育では、5科目のうち第1号・第2号・第5号を、硫化水素も含む内容として実施します。${markers(oxygenDeficiencyDefinition, oxygenDeficiencyEducation)}`,
      conditions: [
        `酸欠則12条2項により、第1号の「酸素欠乏」を「酸素欠乏等」、第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」に読み替えます。${marker(oxygenDeficiencyEducation)}`,
        `酸欠則2条は「酸素欠乏等」に、空気中の硫化水素濃度が10ppmを超える状態を含めています。${marker(oxygenDeficiencyDefinition)}`,
      ],
    };
  }
  if (
    asksWhetherOxygenEducationSubjectsThreeAndFourAreCommon &&
    oxygenDeficiencyEducation >= 0
  ) {
    return {
      conclusion: `酸欠則12条1項の第3号「空気呼吸器等の使用の方法」と第4号「事故の場合の退避及び救急そ生の方法」は、第二種の対象外ではなく、第一種・第二種に共通する特別教育科目です。${marker(oxygenDeficiencyEducation)}`,
      conditions: [
        `12条2項は第1項を第二種にも準用し、読み替えるのは第1号・第2号・第5号です。第3号・第4号は変更しません。${marker(oxygenDeficiencyEducation)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏|酸欠則)/.test(normalized) &&
    /第?12条第?1項/.test(normalized) &&
    /(?:科目|第?1号(?:から|〜|～|-)第?5号)/.test(normalized) &&
    oxygenDeficiencyEducation >= 0
  ) {
    return {
      conclusion: `酸欠則12条1項の特別教育5科目は、①酸素欠乏の発生の原因、②酸素欠乏症の症状、③空気呼吸器等の使用方法、④事故時の退避・救急そ生方法、⑤その他の酸素欠乏症防止に必要な事項です。${marker(oxygenDeficiencyEducation)}`,
      conditions: [
        `第二種にもこの5科目を準用し、第1号の「酸素欠乏」を「酸素欠乏等」、第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」に読み替えます。${marker(oxygenDeficiencyEducation)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏|酸欠則)/.test(normalized) &&
    (/(?:第?12条第?2項|12条2項)/.test(normalized) ||
      (/(?:第二種|第2種)/.test(normalized) &&
        /(?:読み替|第1号|第2号|第5号)/.test(normalized))) &&
    oxygenDeficiencyEducation >= 0
  ) {
    return {
      conclusion: `酸欠則12条1項は第一種の特別教育5科目を定め、2項がその規定を第二種にも準用します。その際、第1号の「酸素欠乏」を「酸素欠乏等」、第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」に読み替えます。${marker(oxygenDeficiencyEducation)}`,
      conditions: [
        `第3号の空気呼吸器等の使用方法と、第4号の事故時の退避・救急そ生方法は、第一種・第二種に共通です。${marker(oxygenDeficiencyEducation)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:特別教育|教育|科目)/.test(normalized) &&
    oxygenDeficiencyEducation >= 0
  ) {
    const asksSecondEducation =
      /(?:第二種|第2種|読み替|第?12条第?2項|12条2項)/.test(normalized);
    const asksWhoConductsEducation =
      /(?:誰|どの人)(?:が|に)?(?:教え|講師|実施|行う|担当)|(?:講師|実施者|担当者)(?:は|が)?(?:誰|どの人)/.test(
        normalized,
      );
    const asksWhoReceivesEducation =
      /(?:誰|どの人|対象者).*(?:受け|受講|教育)|(?:受け|受講|教育).*(?:誰|どの人|対象者)|対象(?:者)?(?:は|が)?誰|誰(?:が)?対象/.test(
        normalized,
      );
    const asksEducationTiming =
      /(?:いつまで|いつ受け|受ける時期|受講時期|作業開始前|作業前|業務前|従事前|先に受け|あらかじめ受け|始める前)/.test(
        normalized,
      );

    if (asksWhoConductsEducation) {
      return {
        conclusion: `酸欠特別教育を行う法的義務を負うのは事業者です。酸欠則12条は、事業者が対象労働者を業務に就かせるときに特別教育を行うと定めていますが、講師個人の資格名までは同条で定めていません。${marker(oxygenDeficiencyEducation)}`,
        conditions: [
          `教育では、発生原因、症状、空気呼吸器等の使用方法、事故時の退避・救急そ生など、同条所定の科目を扱う必要があります。${marker(oxygenDeficiencyEducation)}`,
        ],
      };
    }
    if (asksWhoReceivesEducation) {
      return {
        conclusion: `特別教育を受ける対象は、第一種または第二種の酸素欠乏危険作業に係る業務へ就く労働者です。事業者が、その労働者を業務に就かせるときに実施します。${marker(oxygenDeficiencyEducation)}`,
        conditions: [
          `第二種にも第1項を準用し、硫化水素を含む内容へ一部の科目を読み替えます。${marker(oxygenDeficiencyEducation)}`,
        ],
      };
    }
    if (asksEducationTiming) {
      return {
        conclusion: `酸欠則12条は、対象業務に労働者を就かせるときに特別教育を行うよう求めています。したがって、遅くともその酸素欠乏危険作業へ従事させる時点までに実施します。${marker(oxygenDeficiencyEducation)}`,
        conditions: [
          `第一種・第二種のいずれも対象で、第二種は硫化水素を含む内容へ一部の科目を読み替えます。${marker(oxygenDeficiencyEducation)}`,
        ],
      };
    }
    return {
      conclusion: asksSecondEducation
        ? `第二種酸素欠乏危険作業にも酸欠則12条1項の特別教育が準用され、2項により第1号の「酸素欠乏」を「酸素欠乏等」、第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」に読み替えます。${marker(oxygenDeficiencyEducation)}`
        : `はい。酸素欠乏危険作業に係る業務へ労働者を就かせるときは、酸欠則12条の特別教育が必要です。${marker(oxygenDeficiencyEducation)}`,
      conditions: [
        ...(/(?:科目|内容|何を学)/.test(normalized)
          ? [
              `科目は、発生原因、症状、空気呼吸器等の使用方法、事故時の退避・救急そ生、その他必要な事項の5つです。${marker(oxygenDeficiencyEducation)}`,
            ]
          : []),
        ...(!asksSecondEducation
          ? [
              `第二種にも第1項を準用し、第1号の「酸素欠乏」を「酸素欠乏等」、第2号・第5号の「酸素欠乏症」を「酸素欠乏症等」に読み替えます。${marker(oxygenDeficiencyEducation)}`,
            ]
          : []),
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /作業主任者/.test(normalized) &&
    oxygenDeficiencySupervisor >= 0
  ) {
    return {
      conclusion: /(?:第二種|第2種)/.test(normalized)
        ? `第二種酸素欠乏危険作業では、酸素欠乏・硫化水素危険作業主任者技能講習を修了した者から作業主任者を選任します。${marker(oxygenDeficiencySupervisor)}`
        : /(?:第一種|第1種)/.test(normalized)
          ? `第一種酸素欠乏危険作業では、酸素欠乏危険作業主任者技能講習または酸素欠乏・硫化水素危険作業主任者技能講習を修了した者から作業主任者を選任します。${marker(oxygenDeficiencySupervisor)}`
          : `酸素欠乏危険作業では、第一種は酸素欠乏危険作業主任者技能講習または酸素欠乏・硫化水素危険作業主任者技能講習、第二種は後者の講習を修了した者から作業主任者を選任します。${marker(oxygenDeficiencySupervisor)}`,
      conditions: [
        `第二種は硫化水素を含む区分のため、酸素欠乏危険作業主任者技能講習だけでは選任できません。${marker(oxygenDeficiencySupervisor)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:換気.*(?:例外|できない|困難)|保護具|空気呼吸器|酸素呼吸器|送気マスク)/.test(
      normalized,
    ) &&
    oxygenDeficiencyVentilation >= 0 &&
    oxygenDeficiencyProtection >= 0
  ) {
    return {
      conclusion: `爆発・酸化防止のため換気できない場合、または作業の性質上換気が著しく困難な場合は換気義務の例外です。その場合でも、同時就業者数以上の空気呼吸器等を備え、労働者に使用させなければなりません。${markers(oxygenDeficiencyVentilation, oxygenDeficiencyProtection)}`,
      conditions: [],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /換気/.test(normalized) &&
    oxygenDeficiencyVentilation >= 0
  ) {
    return {
      conclusion: `酸素欠乏危険作業では、原則として酸素濃度を18%以上に保つよう換気が必要です。第二種では、硫化水素濃度も100万分の10以下に保ちます。${marker(oxygenDeficiencyVentilation)}`,
      conditions: [
        `爆発・酸化防止のため換気できない場合、または作業の性質上換気が著しく困難な場合は、この換気義務の例外です。${marker(oxygenDeficiencyVentilation)}`,
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:監視人|監視者|監視)/.test(normalized) &&
    oxygenDeficiencyMonitor >= 0
  ) {
    return {
      conclusion: `酸素欠乏危険作業では、作業を常時監視し、異常時に作業主任者などへ直ちに通報する者を置く等の措置が必要です。${marker(oxygenDeficiencyMonitor)}`,
      conditions: [
        `条文上の措置は「異常時に通報する者を置く等」です。${marker(oxygenDeficiencyMonitor)}`,
        ...(oxygenDeficiencyMeasurement >= 0
          ? [
              `その日の作業開始前に、酸素濃度等を測定します。${marker(oxygenDeficiencyMeasurement)}`,
            ]
          : []),
        ...(oxygenDeficiencyVentilation >= 0
          ? [
              `原則として酸素18%以上に保つよう換気し、第二種では硫化水素も100万分の10以下に保ちます。${marker(oxygenDeficiencyVentilation)}`,
            ]
          : []),
      ],
    };
  }

  const specialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?36条$/.test(article.articleNum),
  );
  const fallArrestWorkFloor = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?518条$/.test(article.articleNum) &&
      /作業床を設けることが困難/.test(article.text) &&
      /要求性能墜落制止用器具/.test(article.text),
  );
  const fallArrestOpening = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?519条$/.test(article.articleNum) &&
      /囲い等を設けることが著しく困難/.test(article.text) &&
      /要求性能墜落制止用器具/.test(article.text),
  );
  const fallArrestWorkerDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?520条$/.test(article.articleNum) &&
      /使用を命じられたとき/.test(article.text),
  );
  if (
    /(?:フルハーネス|墜落制止用器具)/.test(normalized) &&
    !/(?:特別教育|教育)/.test(normalized) &&
    fallArrestWorkFloor >= 0 &&
    fallArrestOpening >= 0
  ) {
    return {
      conclusion: `高さ2m以上でも、一律にフルハーネス型と決まるわけではありません。作業床を設けにくい場所や、作業床の端・開口部で囲い等を設けにくい場合は、要求性能墜落制止用器具を使用させる等の措置が必要です。${markers(fallArrestWorkFloor, fallArrestOpening)}`,
      conditions: [
        `作業床を設けられる場合は、まず作業床を設けます。${marker(fallArrestWorkFloor)}`,
        `囲い等を一時的に外す場合も、墜落防止措置が必要です。${marker(fallArrestOpening)}`,
        ...(fallArrestWorkerDuty >= 0
          ? [
              `使用を命じられた作業者は、器具を使用しなければなりません。${marker(fallArrestWorkerDuty)}`,
            ]
          : []),
      ],
    };
  }
  if (
    /(?:フルハーネス|墜落制止用器具)/.test(normalized) &&
    /(?:特別教育|教育)/.test(normalized) &&
    specialEducation >= 0 &&
    safetyEducationDuty >= 0
  ) {
    return {
      conclusion: `高さ2m以上で作業床を設けることが困難な場所において、フルハーネス型を用いる作業には特別教育が必要です。${markers(safetyEducationDuty, specialEducation)}`,
      conditions: [
        `ロープ高所作業は、この号の対象から除かれます。${marker(specialEducation)}`,
        `高さだけでなく、作業床を設けることが困難かを確認します。${marker(specialEducation)}`,
      ],
    };
  }

  if (
    /高所作業車/.test(normalized) &&
    !detectHighLiftQueryIntent(query).fallProtection
  ) {
    const highLiftDefinition = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛令" &&
        /^第?10条$/.test(article.articleNum) &&
        /高所作業車/.test(article.text) &&
        /二メートル以上/.test(article.text),
    );
    const highLiftDecree = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛令" &&
        /^第?20条$/.test(article.articleNum) &&
        /高所作業車/.test(article.text),
    );
    const isUnderTen = /(?:10|十)(?:m|メートル)?未満/.test(normalized);
    const isTenOrMore = /(?:10|十)(?:m|メートル)?以上/.test(normalized);
    const isUnderTwo = /(?:2|二)(?:m|メートル)?未満/.test(normalized);
    if (isUnderTwo && highLiftDefinition >= 0) {
      return {
        conclusion: `銘板・仕様上の作業床最高高さが2m未満なら、安衛令10条7号の「高所作業車」には該当せず、同区分の運転資格判定の対象外です。${marker(highLiftDefinition)}`,
        conditions: [
          `判定は当日の作業高さではなく、作業床を最大まで上げたときの高さで行います。${marker(highLiftDefinition)}`,
          "別種の機械や別の危険・有害業務に当たる場合は、その業務に対応する要件を別に確認します。",
        ],
      };
    }
    if (isUnderTen && safetyEducationDuty >= 0) {
      return {
        conclusion: `銘板・仕様上の作業床最高高さが2m以上10m未満の高所作業車運転には、特別教育が必要です。${markers(safetyEducationDuty, specialEducation, highLiftDefinition)}`,
        conditions: [
          ...(highLiftDefinition >= 0
            ? [
                `判定は当日の作業高さではなく、作業床を最大まで上げたときの高さで行います。${marker(highLiftDefinition)}`,
              ]
            : []),
          `道路上を走行させる運転は、この規定の対象外です。${marker(specialEducation)}`,
        ],
      };
    }
    if (isTenOrMore && highLiftDecree >= 0 && restrictedWorkDuty >= 0) {
      return {
        conclusion: `銘板・仕様上の作業床最高高さが10m以上の高所作業車運転は、高所作業車運転技能講習の修了者等に限られます。${markers(restrictedWorkDuty, highLiftDecree, highLiftDefinition)}`,
        conditions: [
          `作業床最高高さ10mちょうどは技能講習側です。${markers(restrictedWorkDuty, highLiftDecree)}`,
          ...(highLiftDefinition >= 0
            ? [
                `判定は当日の作業高さではなく、作業床を最大まで上げたときの高さで行います。${marker(highLiftDefinition)}`,
              ]
            : []),
          `道路上を走行させる運転は、この規定の対象外です。${marker(highLiftDecree)}`,
        ],
      };
    }
    if (
      specialEducation >= 0 &&
      highLiftDecree >= 0 &&
      restrictedWorkDuty >= 0 &&
      (highLiftDefinition >= 0 || safetyEducationDuty >= 0)
    ) {
      if (highLiftDefinition < 0 && safetyEducationDuty >= 0) {
        return {
          conclusion: `作業床の高さ10m未満は特別教育が必要で、10m以上は高所作業車運転技能講習の修了者等に限られます。${markers(specialEducation, safetyEducationDuty, restrictedWorkDuty, highLiftDecree)}`,
          conditions: [
            `道路上を走行させる運転は、これらの規定の対象外です。${markers(specialEducation, highLiftDecree)}`,
          ],
        };
      }
      return {
        conclusion: `作業床の高さが2m以上のものが、安衛令10条7号の「高所作業車」です。${marker(highLiftDefinition)} 作業床の高さが10m未満の高所作業車運転が、安衛則36条10号の5に掲げられています。${marker(specialEducation)} 作業床の高さが10m以上の高所作業車運転は、安衛令20条15号の就業制限業務です。${marker(highLiftDecree)} 安衛法61条は、政令で定める就業制限業務を技能講習修了者等の所定資格を持つ者に限っています。${marker(restrictedWorkDuty)}`,
        conditions: [
          `作業床最高高さ10mちょうどは、就業制限の対象です。${marker(highLiftDecree)}`,
          ...(highLiftDefinition >= 0
            ? [
                `判定は当日の作業高さではなく、作業床を最大まで上げたときの高さで行います。${marker(highLiftDefinition)}`,
              ]
            : []),
          `道路上を走行させる運転は、これらの規定の対象外です。${markers(specialEducation, highLiftDecree)}`,
        ],
      };
    }
  }

  const heat = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?612条の2$/.test(article.articleNum),
  );

  const asbestosSurvey = articleIndex(
    articles,
    (article) =>
      article.lawShort === "石綿則" &&
      /^第?3条$/.test(article.articleNum) &&
      /事前調査[\s\S]*必要な知識を有する者/.test(article.text),
  );
  const asbestosSurveyQualificationNotice = articleIndex(
    articles,
    (article) =>
      article.lawShort === "厚労省告示276号" &&
      /船舶石綿含有資材調査者/.test(article.text) &&
      /工作物石綿事前調査者/.test(article.text),
  );
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    /(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized) &&
    asbestosSurvey >= 0 &&
    asbestosSurveyQualificationNotice >= 0
  ) {
    const buildingTarget = /(?:建築物|一戸建て|共同住宅|住戸)/.test(normalized);
    const structureTarget = /工作物/.test(normalized);
    const shipTarget = /船舶/.test(normalized);
    const asbestosTargetCount = [
      buildingTarget,
      structureTarget,
      shipTarget,
    ].filter(Boolean).length;
    if (asbestosTargetCount === 1 && shipTarget) {
      return {
        conclusion: `船舶では、石綿則3条の事前調査対象は鋼製の船舶に限られます。その解体・改修前の事前調査は、船舶石綿含有資材調査者または同等以上の知識を有すると認められる者が行い、この調査者要件は令和5年10月1日から適用されています。${markers(asbestosSurvey, asbestosSurveyQualificationNotice)}`,
        conditions: [
          `同条3項各号の方法による場合は、同条4項の調査者要件から除かれます。${marker(asbestosSurvey)}`,
        ],
      };
    }
    if (asbestosTargetCount === 1 && buildingTarget) {
      return {
        conclusion: `建築物の解体・改修前の事前調査は、原則として一般建築物石綿含有建材調査者、特定建築物石綿含有建材調査者または同等以上の能力を有すると認められる者が行い、この調査者要件は令和5年10月1日から適用されています。${markers(asbestosSurvey, asbestosSurveyQualificationNotice)}`,
        conditions: [
          `一戸建て住宅と共同住宅の住戸内部は、これらに加えて一戸建て等石綿含有建材調査者も対象です。${marker(asbestosSurveyQualificationNotice)}`,
          `同条3項各号の方法による場合は、同条4項の調査者要件から除かれます。${marker(asbestosSurvey)}`,
        ],
      };
    }
    if (asbestosTargetCount === 1 && structureTarget) {
      return {
        conclusion: `工作物の区分により、工作物石綿事前調査者、または一般・特定建築物石綿含有建材調査者等が事前調査を行います。この調査者要件は令和8年1月1日から適用されています。${markers(asbestosSurvey, asbestosSurveyQualificationNotice)}`,
        conditions: [
          `対象工作物と除去する材料の区分で、告示上の調査者が変わります。${marker(asbestosSurveyQualificationNotice)}`,
        ],
      };
    }
    return {
      conclusion: `石綿の事前調査を行える人は対象で変わります。建築物は建築物石綿含有建材調査者等、鋼製船舶は船舶石綿含有資材調査者等、所定の工作物は工作物石綿事前調査者等です。建築物・鋼製船舶の調査者要件は令和5年10月1日から、工作物は令和8年1月1日から適用されています。${markers(asbestosSurvey, asbestosSurveyQualificationNotice)}`,
      conditions: [
        `石綿則3条の対象は、建築物、工作物または鋼製の船舶の解体・改修です。${marker(asbestosSurvey)}`,
        `建築物のうち一戸建て住宅等では、一戸建て等石綿含有建材調査者も対象です。${marker(asbestosSurveyQualificationNotice)}`,
        `同条3項各号の方法による場合は、同条4項の調査者要件から除かれます。${marker(asbestosSurvey)}`,
      ],
    };
  }
  if (
    /(?:熱中症|暑熱作業)/.test(normalized) &&
    /報告|連絡|体制|手順|義務|対応/.test(normalized) &&
    heat >= 0
  ) {
    if (
      /(?:誰|どこ)(?:に|へ)?(?:報告|連絡)|(?:その)?(?:報告|連絡)(?:先|は).*?(?:誰|どこ)|(?:報告|連絡)先.*?(?:誰|どこ)/.test(
        normalized,
      ) ||
      /(?:報告|連絡).*(?:誰|どこ)(?:に|へ)?$/.test(normalized)
    ) {
      return {
        conclusion: `安衛則第612条の2は、報告先を労働基準監督署や特定の役職へ一律に指定していません。事業者が、熱中症の自覚症状や疑いを報告させる体制をあらかじめ整備し、作業従事者へ周知する必要があります。したがって、現場で誰へ報告するかは、その体制の中で具体的に定めて周知します。${marker(heat)}`,
        conditions: [
          `報告先の役職名や連絡手段は同条本文に定められていないため、事業場の手順・連絡網を確認します。${marker(heat)}`,
        ],
      };
    }
    return {
      conclusion: `熱中症のおそれがある作業では、症状の自覚や疑いを報告させる体制を整備し、作業従事者へ周知する必要があります。加えて、作業場ごとに作業からの離脱、身体の冷却、必要に応じた受診等の措置内容と実施手順をあらかじめ定め、周知しなければなりません。${marker(heat)}`,
      conditions: [
        `対象は、暑熱な場所で連続して行われる作業等、熱中症を生ずるおそれのある作業です。${marker(heat)}`,
      ],
    };
  }

  return null;
}

export function buildServiceFirstLegalAnswer(input: {
  query: string;
  articles: LawArticle[];
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  // Routes expand verified cross-hierarchy evidence before this formatter.
  // Keep this pass index-stable: routes intentionally rebuild with only cited
  // sources, and re-expanding here would restore pruned sources and leave old
  // citation numbers (for example［2］［4］against a two-source payload).
  const articles = input.articles
    .filter(
      (article, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.law === article.law &&
            candidate.articleNum === article.articleNum,
        ) === index,
    )
    .slice(0, 12);
  if (articles.length === 0)
    return buildServiceFirstNoHitAnswer(input.query, now);

  const context = extractLegalConversationContext(input.query);
  const known = knownConclusion(input.query, articles);
  const effectiveStatus = legalEffectiveStatusConclusion(
    input.query,
    articles[0]!,
    now,
  );
  const explicitlyRequestedUnit = explicitlyRequestedProvisionUnit(
    articles[0]!,
    input.query,
  );
  const requestedUnit = legalProvisionUnitForQuery(articles[0]!, input.query);
  const requestedParagraph = requestedUnit.paragraph
    ? extractLegalParagraph(articles[0]!, requestedUnit.paragraph)
    : null;
  const requestedParagraphArticle = requestedParagraph
    ? {
        ...articles[0]!,
        text: requestedParagraph.text,
        itemNumberMap: undefined,
      }
    : articles[0]!;
  const requestedItem = requestedUnit.item
    ? (extractLegalItems(requestedParagraphArticle).find(
        ({ item }) => item === requestedUnit.item,
      ) ?? extractRequestedLegalItem(requestedParagraphArticle, input.query))
    : extractRequestedLegalItem(requestedParagraphArticle, input.query);
  const explicitlyRequestedParagraph = explicitlyRequestedUnit.paragraph
    ? extractLegalParagraph(articles[0]!, explicitlyRequestedUnit.paragraph)
    : null;
  const explicitlyRequestedParagraphArticle = explicitlyRequestedParagraph
    ? {
        ...articles[0]!,
        text: explicitlyRequestedParagraph.text,
        itemNumberMap: undefined,
      }
    : articles[0]!;
  const explicitlyRequestedItemLabelsForArticle = explicitlyRequestedItemLabels(
    input.query,
    articles[0]!.articleNum,
  );
  const explicitlyRequestedItemSelection =
    explicitlyRequestedItemSelectionLabel(input.query, articles[0]!.articleNum);
  const explicitlyRequestedItems =
    explicitlyRequestedItemLabelsForArticle.flatMap((label) => {
      const found = extractLegalItems(explicitlyRequestedParagraphArticle).find(
        ({ item }) => item === label,
      );
      return found ? [found] : [];
    });
  const explicitlyRequestedItem = explicitlyRequestedUnit.item
    ? (extractLegalItems(explicitlyRequestedParagraphArticle).find(
        ({ item }) => item === explicitlyRequestedUnit.item,
      ) ??
      extractRequestedLegalItem(
        explicitlyRequestedParagraphArticle,
        explicitlyRequestedUnit.item,
      ))
    : null;
  const explicitUnitMissing = Boolean(
    (explicitlyRequestedUnit.paragraph && !explicitlyRequestedParagraph) ||
    (explicitlyRequestedUnit.item && !explicitlyRequestedItem) ||
    (explicitlyRequestedItemLabelsForArticle.length > 1 &&
      explicitlyRequestedItems.length !==
        explicitlyRequestedItemLabelsForArticle.length),
  );
  const explicitUnitLocator = `${articles[0]!.articleNum}${
    explicitlyRequestedUnit.paragraph ?? ""
  }${explicitlyRequestedItemSelection ?? explicitlyRequestedUnit.item ?? ""}`;
  // A numbered item can legitimately be only a few characters (for example
  // 「貧血検査」).  The general sentence helper intentionally rejects such
  // fragments, but an explicitly selected official item is complete evidence.
  const normalizedRequestedItemText = requestedItem?.text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/。+$/, "");
  const requestedItemText =
    normalizedRequestedItemText && normalizedRequestedItemText.length <= 360
      ? normalizedRequestedItemText
      : null;
  const requestedUnitLocator = `${articles[0]!.articleNum}${
    requestedUnit.paragraph &&
    !articles[0]!.articleNum.includes(requestedUnit.paragraph)
      ? requestedUnit.paragraph
      : ""
  }${requestedItem?.item ?? ""}`;
  const explicitOxygenMeasurementItemSevenConclusion =
    articles[0]!.lawShort === "酸欠則" &&
    /^第?3条$/.test(articles[0]!.articleNum) &&
    explicitlyRequestedUnit.paragraph === "第2項" &&
    explicitlyRequestedUnit.item === "第7号" &&
    requestedItem?.item === "第7号" &&
    requestedItemText
      ? `酸欠則3条2項7号は、「${requestedItemText}」を記録事項として定めています。${marker(0)}`
      : null;
  const explicitMultipleItemsConclusion =
    explicitlyRequestedItemSelection &&
    explicitlyRequestedItems.length ===
      explicitlyRequestedItemLabelsForArticle.length
      ? `確認できた${articles[0]!.lawShort}${articles[0]!.articleNum}${
          explicitlyRequestedUnit.paragraph ?? ""
        }${explicitlyRequestedItemSelection}は、${explicitlyRequestedItems
          .map(
            ({ item, text }) =>
              `${item}「${text.replace(/\s+/g, " ").trim().replace(/。+$/, "")}」`,
          )
          .join("、")}です。${marker(0)}`
      : null;
  const directSentence = firstCompleteSentence(
    requestedItem?.text ?? requestedParagraph?.text ?? articles[0]!.text,
    requestedParagraph || requestedItem ? 360 : 180,
  );
  const requestedPeriod = requestedLegalPeriod(input.query);
  const knownDecisionIndexes = known
    ? [known.conclusion, ...known.conditions]
        .flatMap((text) => [...text.matchAll(/［(\d+)］/g)])
        .map((match) => Number(match[1]) - 1)
    : [0];
  const applicationStatusIndexes = [...new Set(knownDecisionIndexes)].filter(
    (index) => index >= 0 && index < articles.length,
  );
  if (applicationStatusIndexes.length === 0) applicationStatusIndexes.push(0);
  const applicationStatusArticles = applicationStatusIndexes.map(
    (index) => articles[index]!,
  );
  const applicationStatusLine = legalApplicationStatusLine(
    input.query,
    applicationStatusArticles,
    now,
  );
  const applicationStatusEvidenceIndex =
    applicationStatusIndexes[
      legalApplicationStatusEvidenceIndex(
        input.query,
        applicationStatusArticles,
        now,
      )
    ] ??
    applicationStatusIndexes[0] ??
    0;
  const changedProvision = requestedPeriod
    ? [...new Set(knownDecisionIndexes)]
        .filter((index) => index >= 0 && index < articles.length)
        .map((index) => {
          const effectiveText = applicableLegalProvisionEffectiveDate(
            articles[index]!,
            input.query,
          );
          return {
            index,
            effectiveText,
            effectiveDate: effectiveText
              ? legalDateTextToGregorian(effectiveText)
              : null,
          };
        })
        .find(({ effectiveDate }) =>
          Boolean(effectiveDate && effectiveDate > requestedPeriod.start),
        )
    : undefined;
  const predatesCurrentProvision = Boolean(
    changedProvision?.effectiveDate &&
    requestedPeriod &&
    changedProvision.effectiveDate > requestedPeriod.end,
  );
  const changesWithinRequestedPeriod = Boolean(
    changedProvision?.effectiveDate &&
    requestedPeriod &&
    changedProvision.effectiveDate > requestedPeriod.start &&
    changedProvision.effectiveDate <= requestedPeriod.end,
  );
  const questionTime = classifyLegalQuestionTime(input.query, now);
  const unverifiedFutureText =
    questionTime.status === "future" &&
    applicationStatusLine.startsWith("確認不能（");
  const unverifiedHistoricalText =
    questionTime.status === "past" &&
    !predatesCurrentProvision &&
    !changesWithinRequestedPeriod &&
    !hasVerifiedHistoricalLegalText(articles, requestedPeriod);
  const temporalEvidenceIndex =
    changedProvision?.index ?? applicationStatusEvidenceIndex;
  const conclusion = unverifiedFutureText
    ? `対象日の施行内容を確認できないため、回答を保留します。${marker(applicationStatusEvidenceIndex)}`
    : predatesCurrentProvision
      ? `対象時点では、収録しているこの規定はまだ施行前です。当時の義務は確定できません。${marker(temporalEvidenceIndex)}`
      : changesWithinRequestedPeriod
        ? `この規定は${changedProvision!.effectiveDate}から施行されています。指定期間のそれ以前の義務は、収録している現行本文だけでは確定できません。${marker(temporalEvidenceIndex)}`
        : unverifiedHistoricalText
          ? `収録している現行本文だけでは当時の内容を確定できないため、回答を保留します。${marker(temporalEvidenceIndex)}`
          : ((effectiveStatus ? `${effectiveStatus}${marker(0)}` : null) ??
            explicitOxygenMeasurementItemSevenConclusion ??
            known?.conclusion ??
            explicitMultipleItemsConclusion ??
            (explicitUnitMissing
              ? `収録した公式本文では${articles[0]!.lawShort}${explicitUnitLocator}を確認できません。存在しない項・号を推測せず、指定を再確認してください。${marker(0)}`
              : null) ??
            (requestedItem && requestedItemText
              ? `確認できた${articles[0]!.lawShort}${requestedUnitLocator}の該当箇所は「${requestedItemText}」です。${marker(0)}`
              : directSentence
                ? `確認できた規定では、${directSentence}。${marker(0)}`
                : `条文は確認できましたが、この条件だけでは該当箇所を短文で特定できません。${marker(0)}`));
  const conditions = (
    unverifiedFutureText
      ? [
          `対象日版の公式本文または公布済みの改正法令を確認してください。${marker(applicationStatusEvidenceIndex)}`,
        ]
      : predatesCurrentProvision
        ? [
            `対象日の法令履歴と当時の条文本文を確認してください。${marker(temporalEvidenceIndex)}`,
          ]
        : changesWithinRequestedPeriod
          ? [
              `指定期間内で施行前後に分かれます。対象日を確認してください。${marker(temporalEvidenceIndex)}`,
            ]
          : unverifiedHistoricalText
            ? [
                `対象日版の公式本文または法令履歴を直接確認してください。${marker(temporalEvidenceIndex)}`,
              ]
            : explicitOxygenMeasurementItemSevenConclusion
              ? []
              : (known?.conditions ??
                (explicitMultipleItemsConclusion
                  ? []
                  : explicitUnitMissing
                    ? [
                        `確認できたのは${articles[0]!.lawShort}${articles[0]!.articleNum}の公式本文までです。${marker(0)}`,
                      ]
                    : [
                        "この条文が対象とする作業・設備・数値条件を照合してください。",
                      ]))
  ).slice(0, 3);
  const markedDecisionIndexes = [conclusion, ...conditions]
    .flatMap((text) => [...text.matchAll(/［(\d+)］/g)])
    .map((match) => Number(match[1]) - 1)
    .filter((index) => index >= 0 && index < articles.length);
  const decisionIndexes = new Set(
    markedDecisionIndexes.length > 0 ? markedDecisionIndexes : [0],
  );
  decisionIndexes.add(applicationStatusEvidenceIndex);
  const evidence = articles
    .flatMap((article, index) =>
      decisionIndexes.has(index)
        ? [
            `・${article.lawShort}${article.articleNum}${article.articleTitle ? `「${article.articleTitle}」` : ""}${marker(index)}`,
          ]
        : [],
    )
    .join("\n");

  const clarification = changesWithinRequestedPeriod
    ? "対象の日付を教えてください。"
    : unverifiedHistoricalText
      ? "確認したい対象日と法令名・条番号を確認してください。"
      : explicitUnitMissing &&
          !known &&
          !unverifiedFutureText &&
          !predatesCurrentProvision &&
          !effectiveStatus
        ? "確認したい正しい項・号を入力してください。"
        : nextQuestion(context, input.query);
  const answer = [
    "結論",
    conclusion,
    "",
    "条件",
    ...conditions.map((condition) => `・${condition}`),
    "",
    "根拠",
    evidence,
    "",
    "適用時点",
    `・${applicationStatusLine}${marker(applicationStatusEvidenceIndex)}`,
    ...(clarification ? ["", "次の質問", clarification] : []),
  ].join("\n");
  return answer.length <= 600 ? answer : `${answer.slice(0, 596).trimEnd()}…`;
}

export function buildServiceFirstNoHitAnswer(
  query: string,
  now: Date = new Date(),
): string {
  const temporal = classifyLegalQuestionTime(query, now);
  const time =
    temporal.status === "past"
      ? `過去時点（${temporal.requestedDate ?? "日付不明"}）`
      : temporal.status === "future"
        ? "将来施行"
        : `現在（${temporal.asOf}）`;
  return [
    "結論",
    "この条件に直接対応する根拠を確認できないため、回答を保留します。",
    "",
    "条件",
    "・作業、設備、数値条件を一つ追加してください。",
    "",
    "根拠",
    "・確認できる条文はありません。",
    "",
    "適用時点",
    `・${time}`,
    "",
    "次の質問",
    "どの作業・設備について知りたいですか？",
  ].join("\n");
}

export function buildServiceFirstUnverifiedReferenceAnswer(
  query: string,
  now: Date = new Date(),
): string {
  return [
    "結論",
    `「${query}」に一致する公式本文を一意に確認できないため、回答を保留します。`,
    "",
    "条件",
    "・法令名と条番号を確認してください。",
    "",
    "根拠",
    "・確認できる条文はありません。",
    "",
    "適用時点",
    `・確認不能（${classifyLegalQuestionTime(query, now).asOf}基準）`,
    "",
    "次の質問",
    "法令名と条番号をもう一度入力してください。",
  ].join("\n");
}
