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
import { hasElectricalDomainSignal } from "@/lib/electrical-work-model";

function compact(value: string): string {
  return normalizeLegalConversationText(value).replace(
    /[\s　、。,!?！？]/g,
    "",
  );
}

/**
 * Detect a request for the conditions needed to perform work without relying
 * on the user knowing the legal labels "資格" or "特別教育".  This is kept
 * separate from domain detection so the same natural phrasing can be used for
 * every work domain while a domain entity is still required before a
 * specialised answer is selected.
 */
function hasWorkRequirementIntent(value: string): boolean {
  const normalized = compact(value);
  return (
    /(?:資格|免許|教育|特別教育|技能講習|講習|作業主任者)/.test(
      normalized,
    ) ||
    /(?:何が(?:必要|要る|いる)|何を(?:すべき|する)|必要なもの|どうすれば)/.test(
      normalized,
    ) ||
    /(?:乗る|使う|扱う|取り扱う|動かす|運転する|操作する|作業する|やる|組み立てる|解体する|塗装する)(?:には|のに)/.test(
      normalized,
    ) ||
    /(?:する|行う|入る|立ち入る|入槽する)(?:には|のに)/.test(
      normalized,
    )
  );
}

/**
 * Narrow the answer-template trigger to a genuinely broad "what is needed"
 * question.  Detailed follow-ups such as who receives an education, when it
 * must be completed, or which statutory item applies must continue to the
 * dedicated provision branch below instead of being swallowed by the broad
 * domain summary.
 */
function hasBroadWorkRequirementIntent(value: string): boolean {
  const normalized = compact(value);
  if (
    /(?:いつ|誰|どの人|講師|実施者|対象者|何時間|時間数|科目|内容|読み替|何条|第\d+(?:条|項|号|種)|第[一二]種|測定|濃度|換気|監視|記録|保存|例外)/.test(
      normalized,
    ) ||
    /(?:特別教育|作業主任者)(?:は|が)?(?:必要|要る|いる)/.test(normalized)
  ) {
    return false;
  }
  return hasWorkRequirementIntent(normalized);
}

function hasForkliftDomainSignal(value: string): boolean {
  const normalized = compact(value);
  return (
    /フォー?クリフト/.test(normalized) ||
    /フォーク(?=(?:を|で|に)?(?:使|乗|運転|操作|作業)|(?:資格|免許))/.test(
      normalized,
    )
  );
}

function hasHarnessDomainSignal(value: string): boolean {
  return /(?:フル)?ハーネス|墜落制止用器具|安全帯/.test(compact(value));
}

function hasHarnessEducationContext(value: string): boolean {
  const normalized = compact(value);
  return (
    hasHarnessDomainSignal(normalized) &&
    (hasWorkRequirementIntent(normalized) ||
      /(?:高い所|高所|高さ(?:が)?(?:2|二)(?:m|メートル)?以上).*(?:ハーネス|墜落制止用器具|安全帯)|(?:ハーネス|墜落制止用器具|安全帯).*(?:高い所|高所|高さ(?:が)?(?:2|二)(?:m|メートル)?以上)/.test(
        normalized,
      ))
  );
}

function hasSlingingDomainSignal(value: string): boolean {
  const normalized = compact(value);
  return (
    /玉掛(?:け)?/.test(normalized) ||
    /(?:荷|吊り荷).*(?:ワイヤ|フック|玉掛|(?:吊|つ)る).*(?:準備|掛け|外し|教育|資格|講習|何が必要|何をすべき|受ける|するには)|荷(?:物)?を(?:吊|つ)る(?:時|とき|作業)?.*(?:教育|資格|講習|何が必要|何をすべき|受ける)/.test(
      normalized,
    )
  );
}

function hasTankEntrySafetyIntent(value: string): boolean {
  const normalized = compact(value);
  return /タンク(?:等)?(?:の)?(?:中|内|内部)?(?:に|へ)?(?:入る|立ち入る|入槽).*(?:必要|何|こと|には|時|とき)|タンク(?:等)?(?:の)?(?:中|内|内部)(?:作業|に入る)/.test(
    normalized,
  );
}

function hasGeneralSpecialEducationIntent(value: string): boolean {
  const normalized = compact(value);
  return (
    /特別教育/.test(normalized) ||
    /(?:危険|有害)(?:な)?作業.*(?:教育|教えて)|(?:教育|教えて).*(?:危険|有害)(?:な)?作業/.test(
      normalized,
    )
  );
}

function hasOxygenDeficiencyDomainSignal(value: string): boolean {
  return /(?:酸欠|酸素欠乏|酸素濃度|酸素(?:が|の)?(?:少ない|薄い|足りない)(?:場所|所|現場)?)/.test(
    compact(value),
  );
}

function hasOrganicSolventDomainSignal(value: string): boolean {
  const normalized = compact(value);
  return (
    /(?:有機溶剤|有機則|シンナー)/.test(normalized) ||
    /(?:溶剤.*(?:塗装|洗浄|拭|扱|使)|(?:塗装|洗浄).*(?:溶剤))/.test(
      normalized,
    )
  );
}

function hasHeatDomainSignal(value: string): boolean {
  return /(?:熱中症|暑熱|WBGT|(?:暑い|熱い)(?:現場|作業場|場所)|暑さ(?:対策)?|夏(?:の)?(?:現場|作業場|作業).*(?:安全)?対策)/i.test(
    compact(value),
  );
}

function hasChemicalManagerDomainSignal(value: string): boolean {
  const normalized = compact(value);
  return (
    /化学物質(?:管理|かんり)者/.test(normalized) ||
    /化学物質.*(?:扱|取扱).*(?:管理者|管理)|(?:管理者|管理).*化学物質.*(?:扱|取扱)/.test(
      normalized,
    ) ||
    /(?:RA|リスクアセスメント)対象物.*(?:管理者|管理)/i.test(normalized) ||
    /(?:管理者|管理).*(?:RA|リスクアセスメント)対象物/i.test(normalized)
  );
}

function hasGenericWorkSupervisorIntent(value: string): boolean {
  const normalized = compact(value);
  return (
    /作業主任者/.test(normalized) ||
    /主任者(?:を)?(?:置く|選任).*(?:仕事|作業)/.test(normalized) ||
    /(?:仕事|作業).*(?:主任者(?:を)?(?:置く|選任))/.test(normalized)
  );
}

function hasGeneralSkillTrainingIntent(value: string): boolean {
  const normalized = compact(value);
  return (
    /技能講習/.test(normalized) &&
    /(?:とは|何|いつ|必要|就業制限|種類|一覧|どんな|受ける(?:仕事|作業)|対象(?:の)?(?:仕事|作業))/.test(
      normalized,
    )
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

  if (hasForkliftDomainSignal(normalized) && forkliftIntent.qualification) {
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
    hasSlingingDomainSignal(normalized) &&
    (hasWorkRequirementIntent(normalized) ||
      /何(?:t|トン)から/i.test(normalized))
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
    /足場/.test(normalized) &&
    hasWorkRequirementIntent(normalized)
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛令", "第6条"],
      ["安衛則", "第565条"],
    );
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    hasWorkRequirementIntent(normalized)
  ) {
    required.push(
      ["安衛法", "第57条の2"],
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛令", "第6条"],
      ["有機則", "第1条"],
      ["有機則", "第5条"],
      ["有機則", "第6条"],
      ["有機則", "第8条"],
      ["有機則", "第9条"],
      ["有機則", "第19条"],
    );
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    /確認済み選択肢:.*第[123]種/.test(normalized)
  ) {
    required.push(
      ["安衛法", "第57条の2"],
      ["有機則", "第1条"],
      ["有機則", "第5条"],
      ["有機則", "第6条"],
      ["有機則", "第8条"],
      ["有機則", "第9条"],
    );
  }
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    hasWorkRequirementIntent(normalized)
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛令", "第6条"],
      ["石綿則", "第3条"],
      ["石綿則", "第4条"],
      ["石綿則", "第27条"],
      ["厚労省告示276号", "第1項"],
      ["石綿則", "第19条"],
    );
  }
  if (hasHeatDomainSignal(normalized)) {
    required.push(["安衛則", "第612条の2"]);
    required.push(["熱中症ガイドライン", "第2・第3"]);
  }
  if (hasTankEntrySafetyIntent(normalized)) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["酸欠則", "第3条"],
      ["酸欠則", "第5条"],
      ["酸欠則", "第11条"],
      ["酸欠則", "第12条"],
      ["酸欠則", "第13条"],
      ["有機則", "第5条"],
      ["有機則", "第6条"],
      ["有機則", "第19条"],
    );
  }
  if (
    hasOxygenDeficiencyDomainSignal(normalized) &&
    hasWorkRequirementIntent(normalized)
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["酸欠則", "第3条"],
      ["酸欠則", "第5条"],
      ["酸欠則", "第11条"],
      ["酸欠則", "第12条"],
      ["酸欠則", "第13条"],
    );
  }
  if (
    /移動式クレーン/.test(normalized) &&
    (hasWorkRequirementIntent(normalized) ||
      /確認済み選択肢:.*移動式クレーン|^移動式クレーン$/.test(normalized))
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛法", "第61条"],
      ["安衛令", "第20条"],
      ["クレーン則", "第67条"],
      ["クレーン則", "第68条"],
    );
  }
  if (
    /デリック/.test(normalized) &&
    (hasWorkRequirementIntent(normalized) ||
      /確認済み選択肢:.*デリック|^デリック$/.test(normalized))
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛法", "第61条"],
      ["安衛令", "第20条"],
      ["クレーン則", "第107条"],
      ["クレーン則", "第108条"],
    );
  }
  if (
    /クレーン/.test(normalized) &&
    !/玉掛/.test(normalized) &&
    (/(?:運転|操作)/.test(normalized) ||
      hasWorkRequirementIntent(normalized) ||
      /確認済み選択肢:.*(?:クレーン|床上操作式)/.test(normalized))
  ) {
    required.push(
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛法", "第61条"],
      ["安衛令", "第20条"],
      ["クレーン則", "第22条"],
      ["クレーン則", "第67条"],
      ["クレーン則", "第68条"],
    );
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
  if (
    /有機溶剤/.test(normalized) &&
    /(?:主な条件|必要な設備|設備要件|設備.*(?:必要|条件))/.test(normalized)
  ) {
    required.push(
      ["安衛法", "第57条の2"],
      ["有機則", "第1条"],
      ["有機則", "第5条"],
      ["有機則", "第6条"],
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
  if (
    conversationContext.topicDomain === "electrical" ||
    /(?:電気|電源|電工|盤内|分電盤|配電盤|制御盤|ブレーカー|開閉器|テスター|絶縁測定|配線|結線|活線|充電部|充電電路|特高|高圧受電)/.test(
      normalized,
    )
  ) {
    const action = conversationContext.workAction;
    const voltage = conversationContext.voltageClass;
    const groupedElectricalChoice =
      /(?:配線・充電部を扱う|盤内測定・配線|確認済み選択肢:[^ ]*(?:両方|充電部に触れる|充電部の近くで作業))/.test(
        normalized,
      );
    const metiMeasurementQaIntent =
      action === "tester-measurement" ||
      /(?:経産省|経済産業省).*(?:電気工事士|電工).*Q&AQ?10/i.test(
        normalized,
      );
    // 電気の資格・教育を説明する全通常回答は、対象業務を列挙する
    // 安衛則36条だけでなく、特別教育義務の本体である安衛法59条3項を
    // 同じ回答内で示す。検索順位に委ねると、短い自然文で59条だけが
    // 欠落し「事業者が行う安全教育」という命題を支えられなくなる。
    required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
    if (groupedElectricalChoice) {
      required.push(
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
        ["安衛則", "第339条"],
        ["安衛則", "第341条"],
        ["安衛則", "第342条"],
        ["安衛則", "第344条"],
        ["安衛則", "第345条"],
        ["安衛則", "第346条"],
        ["安衛則", "第347条"],
      );
    }

    if (
      conversationContext.roleType === "work-supervisor" ||
      conversationContext.qualificationType === "work-supervisor" ||
      /作業主任者/.test(normalized)
    ) {
      required.push(
        ["安衛法", "第14条"],
        ["安衛令", "第6条"],
        ["安衛則", "第350条"],
      );
      if (conversationContext.confirmedChoices?.includes("停電して扱う")) {
        required.push(["安衛則", "第339条"]);
      } else if (
        conversationContext.confirmedChoices?.includes(
          "高圧・特高の活線・近接",
        )
      ) {
        required.push(
          ["安衛則", "第341条"],
          ["安衛則", "第342条"],
          ["安衛則", "第344条"],
          ["安衛則", "第345条"],
        );
      } else if (
        conversationContext.confirmedChoices?.includes("どちらでもない")
      ) {
        required.push(["電事法", "第43条"]);
      }
    } else if (
      conversationContext.roleType === "work-leader" ||
      /(?:作業指揮者|作業の指揮者)/.test(normalized)
    ) {
      required.push(["安衛則", "第350条"]);
    }

    if (
      conversationContext.roleType === "chief-electrical-engineer" ||
      conversationContext.qualificationType === "chief-electrical-engineer" ||
      /電気主任技術者|主任技術者/.test(normalized)
    ) {
      required.push(
        ["電事法", "第43条"],
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
      );
    }

    if (
      conversationContext.qualificationType === "special-education" ||
      (conversationContext.qualificationType === "qualification-general" &&
        /教育/.test(normalized)) ||
      /(?:特別教育|低圧教育|高圧教育)/.test(normalized)
    ) {
      required.push(
        ["安衛法", "第59条"],
        ["特別教育規程", "第5条"],
        ["特別教育規程", "第6条"],
        ["安衛則", "第346条"],
        ["安衛則", "第347条"],
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
      );
      if (
        /(?:電工|電気工事士|免状).*(?:教育|特別教育)|(?:教育|特別教育).*(?:電工|電気工事士|免状)/.test(
          normalized,
        )
      ) {
        required.push(["安衛則", "第37条"]);
      }
    }

    if (
      action === "wiring-connection" ||
      action === "wiring-removal" ||
      action === "repair" ||
      /(?:配線|結線|電線).*(?:接続|つな|外す|取り外)|コンセント.*交換/.test(
        normalized,
      )
    ) {
      required.push(
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
        ["電工士法則", "第2条"],
        ["電工士法令", "第1条"],
        ["経産省電工Q&A", "Q9・Q10"],
        ["安衛則", "第339条"],
      );
      if (conversationContext.energizedState === "energized") {
        if (voltage === "低圧") {
          required.push(["安衛則", "第346条"]);
        } else if (voltage === "高圧") {
          required.push(["安衛則", "第341条"]);
        } else if (voltage === "特別高圧") {
          required.push(["安衛則", "第344条"]);
        } else {
          required.push(
            ["安衛則", "第346条"],
            ["安衛則", "第341条"],
            ["安衛則", "第344条"],
          );
        }
      }
    } else if (
      action === "tester-measurement" ||
      action === "insulation-measurement" ||
      action === "open-panel"
    ) {
      required.push(
        ["安衛則", "第346条"],
        ["安衛則", "第347条"],
        ["安衛則", "第341条"],
        ["安衛則", "第342条"],
        ["安衛則", "第344条"],
        ["安衛則", "第345条"],
        ["経産省電工Q&A", "Q9・Q10"],
      );
      if (action === "insulation-measurement") {
        required.push(["安衛則", "第339条"]);
      }
    } else if (action === "breaker-operation") {
      required.push(
        ["電気工事士法", "第2条"],
        ["特別教育規程", "第5条"],
        ["特別教育規程", "第6条"],
        ["安衛則", "第339条"],
        ["安衛則", "第350条"],
      );
    } else if (
      action === "visual-inspection" ||
      action === "indicator-check" ||
      action === "noise-odor-check" ||
      action === "cleaning" ||
      action === "start-of-work-inspection" ||
      action === "unknown" ||
      !action
    ) {
      required.push(
        ["安衛則", "第346条"],
        ["安衛則", "第347条"],
        ["電気工事士法", "第2条"],
        ["電気工事士法", "第3条"],
        ["電事法", "第43条"],
      );
      if (action === "start-of-work-inspection") {
        required.push(["安衛則", "第352条"]);
      }
    }
    if (metiMeasurementQaIntent) {
      required.push(["経産省電工Q&A", "Q9・Q10"]);
    }

    if (conversationContext.energizedState === "de-energized") {
      required.push(["安衛則", "第339条"], ["安衛則", "第350条"]);
    }
    if (
      conversationContext.energizedState === "energized" ||
      action === "live-work" ||
      /活線/.test(normalized)
    ) {
      if (!voltage) {
        // 電圧不明の活線質問は、低圧と高圧のどちらかを利用者に
        // 決めさせる前に、双方の主要分岐を根拠付きで示す。
        required.push(
          ["安衛則", "第346条"],
          ["安衛則", "第341条"],
          ["安衛則", "第344条"],
        );
      } else {
        required.push([
          "安衛則",
          voltage === "特別高圧"
            ? "第344条"
            : voltage === "高圧"
              ? "第341条"
              : "第346条",
        ]);
      }
    }
    if (
      conversationContext.energizedState === "proximity" ||
      action === "live-proximity-work"
    ) {
      if (!voltage) {
        required.push(
          ["安衛則", "第347条"],
          ["安衛則", "第342条"],
          ["安衛則", "第344条"],
          ["安衛則", "第345条"],
        );
      } else {
        required.push([
          "安衛則",
          voltage === "特別高圧"
            ? "第345条"
            : voltage === "高圧"
              ? "第342条"
              : "第347条",
        ]);
      }
    }
    if (
      voltage === "高圧" ||
      action === "high-voltage-facility-inspection" ||
      (/高圧/.test(normalized) && !/(?:特別高圧|特高)/.test(normalized))
    ) {
      required.push(
        ["特別教育規程", "第5条"],
        ["安衛則", "第341条"],
        ["安衛則", "第342条"],
        ["電事法", "第43条"],
        ["電気工事士法", "第3条"],
      );
    }
    if (voltage === "特別高圧") {
      required.push(
        ["特別教育規程", "第5条"],
        ["安衛則", "第344条"],
        ["安衛則", "第345条"],
      );
    }
  }
  if (hasChemicalManagerDomainSignal(normalized)) {
    required.push(["安衛則", "第12条の5"]);
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
  if (hasHarnessDomainSignal(normalized)) {
    if (hasHarnessEducationContext(normalized)) {
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
  if (hasGeneralSpecialEducationIntent(normalized)) {
    required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
  }
  if (/研削といし/.test(normalized)) {
    required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
  }
  // A bare qualification label must not inherit whichever specialised law
  // happens to rank first for the word "資格".  Retrieve the framework
  // provisions so the response can explain the available legal branches
  // before asking for one work/equipment condition.
  const qualificationFrameworkLabels = [
    /作業主任者/.test(normalized),
    /特別教育/.test(normalized),
    /技能講習/.test(normalized),
  ].filter(Boolean).length;
  if (lacksWorkContext && qualificationFrameworkLabels >= 2) {
    required.push(
      ["安衛法", "第14条"],
      ["安衛令", "第6条"],
      ["安衛法", "第59条"],
      ["安衛則", "第36条"],
      ["安衛法", "第61条"],
      ["安衛令", "第20条"],
    );
  } else if (employmentEducationIntent) {
    required.push(["安衛法", "第59条"], ["安衛則", "第35条"]);
  } else if (lacksWorkContext && hasGenericWorkSupervisorIntent(normalized)) {
    required.push(["安衛法", "第14条"], ["安衛令", "第6条"]);
  } else if (lacksWorkContext && /特別教育/.test(normalized)) {
    required.push(["安衛法", "第59条"], ["安衛則", "第36条"]);
  } else if (lacksWorkContext && hasGeneralSkillTrainingIntent(normalized)) {
    required.push(["安衛法", "第61条"], ["安衛令", "第20条"]);
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
  if (article.lawShort === "経産省電工Q&A") {
    if (
      /(?:Q&AQ?10|Q10|テスター|測定器|電圧計|電流計|クリップ|巻き?付け)/i.test(
        normalized,
      )
    ) {
      return { item: "Q10" };
    }
    if (/(?:Q&AQ?9|Q9|配線|結線|電線).*(?:接続|切断|つな)/i.test(normalized)) {
      return { item: "Q9" };
    }
  }
  if (
    article.lawShort === "クレーン則" &&
    /^第?(?:67|68)条$/.test(article.articleNum) &&
    /移動式クレーン/.test(normalized)
  ) {
    return { paragraph: "第1項" };
  }
  if (
    article.lawShort === "クレーン則" &&
    /^第?(?:107|108)条$/.test(article.articleNum) &&
    /デリック/.test(normalized)
  ) {
    return { paragraph: "第1項" };
  }
  if (
    article.lawShort === "クレーン則" &&
    /^第?22条$/.test(article.articleNum) &&
    /クレーン/.test(normalized)
  ) {
    return { paragraph: "第1項" };
  }
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
    (/(?:電気工事とは|電気工事の定義)/.test(normalized) ||
      (!hasExplicitUnit && hasElectricalDomainSignal(normalized)))
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
    if (!hasExplicitUnit && hasElectricalDomainSignal(normalized)) {
      return { paragraph: "第1項・第2項・第3項・第4項" };
    }
  }
  if (
    article.lawShort === "電工士法令" &&
    /^第?1条$/.test(article.articleNum) &&
    hasElectricalDomainSignal(normalized) &&
    /(?:機器端子|電気機器の端子|端子へ|端子に)/.test(normalized)
  ) {
    return { item: "第2号" };
  }
  const electricalSourceIntent = hasElectricalDomainSignal(normalized);
  const explicitlyRequestedUnit = hasExplicitUnit
    ? {
        paragraph:
          paragraphNumber !== null &&
          Number.isFinite(paragraphNumber) &&
          paragraphNumber > 0
            ? `第${paragraphNumber}項`
            : undefined,
        item: requestedItemLabel,
      }
    : null;
  if (
    article.lawShort === "特別教育規程" &&
    /^第?[56]条$/.test(article.articleNum) &&
    hasElectricalDomainSignal(normalized)
  ) {
    if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
    return { paragraph: "第1項・第2項・第3項" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?339条$/.test(article.articleNum) &&
    hasElectricalDomainSignal(normalized)
  ) {
    if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
    return { paragraph: "第1項", item: "第1号・第2号・第3号" };
  }
  if (
    article.lawShort === "電事法" &&
    /^第?43条$/.test(article.articleNum) &&
    electricalSourceIntent
  ) {
    if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
    // 第1項が保安監督のための選任、第4項が主任技術者の職務、
    // 第5項が従事者の指示遵守を定める。主任技術者が作業資格を
    // 代替するかの回答はこの3項を一体で根拠とする。
    return {
      paragraph: /(?:電気主任技術者|主任技術者)/.test(normalized)
        ? "第1項・第4項・第5項"
        : "第1項・第4項",
    };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?(?:341|342|344|345|346|347)条$/.test(article.articleNum) &&
    electricalSourceIntent
  ) {
    if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
    // 各条の事業者が講ずべき活線・近接作業措置は第1項。
    // 労働者側の遵守義務を定める後続項へ広げない。
    return { paragraph: "第1項" };
  }
  const highLiftSourceIntent = detectHighLiftQueryIntent(normalized);
  const specialEducationIntent =
    hasGeneralSpecialEducationIntent(normalized) ||
    /研削といし/.test(normalized) ||
    (/(?:電気作業|電気工事|充電電路|フォー?クリフト|高所作業車|フルハーネス|墜落制止用器具|酸欠|酸素欠乏)/.test(
      normalized,
    ) &&
      /教育/.test(normalized)) ||
    (/(?:フォー?クリフト|高所作業車|フルハーネス|墜落制止用器具)/.test(
      normalized,
    ) &&
      /(?:資格|免許)/.test(normalized)) ||
    hasHarnessEducationContext(normalized) ||
    (highLiftSourceIntent.hasHighLiftContext &&
      highLiftSourceIntent.qualification) ||
    (hasForkliftDomainSignal(normalized) &&
      hasWorkRequirementIntent(normalized)) ||
    (/クレーン/.test(normalized) &&
      hasWorkRequirementIntent(normalized));
  const organicQualificationIntent =
    (hasOrganicSolventDomainSignal(normalized) &&
      hasWorkRequirementIntent(normalized)) ||
    hasTankEntrySafetyIntent(normalized);
  const oxygenQualificationIntent =
    (hasOxygenDeficiencyDomainSignal(normalized) &&
      hasWorkRequirementIntent(normalized)) ||
    hasTankEntrySafetyIntent(normalized);
  const asbestosQualificationIntent =
    /(?:石綿|アスベスト)/.test(normalized) &&
    hasWorkRequirementIntent(normalized);
  const broadQualificationEducationIntent =
    /(?:必要な資格|現場作業.*(?:資格|教育)|資格.*教育|教育.*資格)/.test(
      normalized,
    );
  if (
    article.lawShort === "有機則" &&
    (hasOrganicSolventDomainSignal(normalized) ||
      hasTankEntrySafetyIntent(normalized))
  ) {
    if (/^第?1条$/.test(article.articleNum)) {
      if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
      return { paragraph: "第1項", item: "第2号" };
    }
    if (/^第?5条$/.test(article.articleNum)) {
      if (explicitlyRequestedUnit) return explicitlyRequestedUnit;
      return { paragraph: "第1項" };
    }
  }
  if (
    article.lawShort === "安衛法" &&
    /^第?57条の2$/.test(article.articleNum) &&
    organicQualificationIntent
  ) {
    // SDSで区分・含有率を確認する根拠は、通知義務の第1項と
    // 「成分及びその含有量」を定める第2号を一体で示す。
    return { paragraph: "第1項", item: "第2号" };
  }
  if (
    article.lawShort === "安衛法" &&
    /^第?59条$/.test(article.articleNum) &&
    (specialEducationIntent ||
      broadQualificationEducationIntent ||
      organicQualificationIntent ||
      oxygenQualificationIntent ||
      asbestosQualificationIntent ||
      hasElectricalDomainSignal(normalized) ||
      (/(?:電気作業|電気工事|充電電路)/.test(normalized) &&
        /(?:資格|免許)/.test(normalized)))
  ) {
    return { paragraph: "第3項" };
  }
  if (
    article.lawShort === "安衛法" &&
    /^第?14条$/.test(article.articleNum) &&
    hasGenericWorkSupervisorIntent(normalized)
  ) {
    return { paragraph: "第1項" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?12条の5$/.test(article.articleNum) &&
    hasChemicalManagerDomainSignal(normalized)
  ) {
    return { paragraph: "第1項・第2項・第3項" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?612条の2$/.test(article.articleNum) &&
    hasHeatDomainSignal(normalized)
  ) {
    return { paragraph: "第1項・第2項" };
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
  if (article.lawShort === "安衛則" && /^第?36条$/.test(article.articleNum)) {
    if (/研削といし/.test(normalized)) return { item: "第1号" };
    if (
      (hasOxygenDeficiencyDomainSignal(normalized) &&
        hasWorkRequirementIntent(normalized)) ||
      hasTankEntrySafetyIntent(normalized)
    ) {
      return { item: "第26号" };
    }
    if (
      /(?:石綿|アスベスト)/.test(normalized) &&
      hasWorkRequirementIntent(normalized)
    ) {
      return { item: "第37号" };
    }
    if (
      /足場/.test(normalized) &&
      hasWorkRequirementIntent(normalized)
    ) {
      return { item: "第39号" };
    }
    if (
      hasGeneralSpecialEducationIntent(normalized) &&
      /(?:必要な作業|必要.*作業|作業.*(?:種類|一覧)|種類|(?:危険|有害)(?:な)?作業.*教育)/.test(
        normalized,
      )
    ) {
      return { item: "第1号・第10号の5・第39号・第41号" };
    }
  }
  if (article.lawShort === "安衛令" && /^第?6条$/.test(article.articleNum)) {
    if (hasElectricalDomainSignal(normalized) && /作業主任者/.test(normalized)) {
      return { item: "第1号" };
    }
    if (/足場/.test(normalized)) return { item: "第15号" };
    if (hasOxygenDeficiencyDomainSignal(normalized)) return { item: "第21号" };
    if (hasOrganicSolventDomainSignal(normalized)) {
      return { item: "第22号" };
    }
    if (/(?:石綿|アスベスト)/.test(normalized)) return { item: "第23号" };
    if (hasGenericWorkSupervisorIntent(normalized)) {
      return { item: "第15号・第21号・第22号・第23号" };
    }
  }
  if (
    article.lawShort === "有機則" &&
    (hasOrganicSolventDomainSignal(normalized) ||
      hasTankEntrySafetyIntent(normalized))
  ) {
    if (/^第?19条$/.test(article.articleNum) && organicQualificationIntent) {
      return { paragraph: "第1項・第2項" };
    }
    if (
      /^第?[89]条$/.test(article.articleNum) &&
      (organicQualificationIntent ||
        /(?:臨時|短時間|例外|特例)/.test(normalized)) &&
      !/(?:タンク等?の?外|タンク外|内部以外|それ以外の屋内|タンク等?の?内部|タンク内)/.test(
        normalized,
      )
    ) {
      return { paragraph: "第1項・第2項" };
    }
  }
  if (
    article.lawShort === "石綿則" &&
    /^第?19条$/.test(article.articleNum) &&
    asbestosQualificationIntent
  ) {
    return { paragraph: "第1項" };
  }
  if (
    article.lawShort === "石綿則" &&
    /^第?(?:4|27)条$/.test(article.articleNum) &&
    asbestosQualificationIntent
  ) {
    return { paragraph: "第1項" };
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
    hasElectricalDomainSignal(normalized) &&
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
    highLiftSourceIntent.hasHighLiftContext
  ) {
    return { item: "第7号" };
  }
  if (
    article.lawShort === "安衛令" &&
    /^第?10条$/.test(article.articleNum) &&
    (hasSlingingDomainSignal(normalized) || /つり上げ荷重/.test(normalized))
  ) {
    return { item: "第1号" };
  }
  if (article.lawShort === "安衛令" && /^第?20条$/.test(article.articleNum)) {
    if (hasForkliftDomainSignal(normalized)) return { item: "第11号" };
    if (highLiftSourceIntent.hasHighLiftContext) return { item: "第15号" };
    if (hasSlingingDomainSignal(normalized)) return { item: "第16号" };
    if (/移動式クレーン/.test(normalized)) return { item: "第7号" };
    if (/デリック/.test(normalized)) return { item: "第8号" };
    // 移動式クレーンとデリックは上の専用分岐でそれぞれ第7号・第8号を返す。
    // 移動式でないクレーンの根拠に、別制度である第7号を混在させない。
    if (/クレーン/.test(normalized)) return { item: "第6号" };
    if (/技能講習/.test(normalized)) {
      return { item: "第10号・第12号・第15号" };
    }
  }
  if (article.lawShort === "安衛則" && /^第?36条$/.test(article.articleNum)) {
    if (hasForkliftDomainSignal(normalized)) return { item: "第5号" };
    if (highLiftSourceIntent.hasHighLiftContext) return { item: "第10号の5" };
    if (/移動式クレーン/.test(normalized)) return { item: "第16号" };
    if (/デリック/.test(normalized)) return { item: "第17号" };
    if (/クレーン/.test(normalized)) return { item: "第15号" };
  }
  if (
    article.lawShort === "安衛則" &&
    /^第?36条$/.test(article.articleNum) &&
    hasHarnessDomainSignal(normalized)
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
  if (
    article.lawShort === "石綿則" &&
    /^第?3条$/.test(article.articleNum) &&
    asbestosQualificationIntent
  ) {
    return { paragraph: "第1項" };
  }
  if (
    article.lawShort === "安衛法" &&
    /^第?61条$/.test(article.articleNum) &&
    /技能講習/.test(normalized)
  ) {
    return { paragraph: "第1項" };
  }
  if (article.lawShort === "酸欠則") {
    const oxygenBroadNeed =
      (hasOxygenDeficiencyDomainSignal(normalized) &&
        hasWorkRequirementIntent(normalized)) ||
      hasTankEntrySafetyIntent(normalized);
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
      const recordIntent = /(?:記録|保存|何年)/.test(normalized);
      return {
        paragraph: recordIntent ? "第2項" : "第1項・第2項",
        item: "第1号・第2号・第3号・第4号・第5号・第6号・第7号",
      };
    }
    if (/^第?3条$/.test(article.articleNum) && oxygenBroadNeed) {
      return {
        paragraph: "第1項・第2項",
        item: "第1号・第2号・第3号・第4号・第5号・第6号・第7号",
      };
    }
    if (
      /^第?5条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏|酸素濃度)/.test(normalized) &&
      /(?:換気|濃度|硫化水素|H2S|ppm|何パーセント|何%)/i.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
    if (/^第?5条$/.test(article.articleNum) && oxygenBroadNeed) {
      return { paragraph: "第1項" };
    }
    if (
      /^第?11条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /作業主任者/.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
    if (/^第?11条$/.test(article.articleNum) && oxygenBroadNeed) {
      return { paragraph: "第1項" };
    }
    if (
      /^第?12条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /(?:特別教育|教育)/.test(normalized)
    ) {
      const secondKindIntent = /(?:第二種|第2種|読み替)/.test(normalized);
      return {
        paragraph: secondKindIntent ? "第2項" : "第1項・第2項",
        item: secondKindIntent
          ? undefined
          : "第1号・第2号・第3号・第4号・第5号",
      };
    }
    if (/^第?12条$/.test(article.articleNum) && oxygenBroadNeed) {
      return {
        paragraph: "第1項・第2項",
        item: "第1号・第2号・第3号・第4号・第5号",
      };
    }
    if (
      /^第?13条$/.test(article.articleNum) &&
      /(?:酸欠|酸素欠乏)/.test(normalized) &&
      /(?:監視人|監視者|監視)/.test(normalized)
    ) {
      return { paragraph: "第1項" };
    }
    if (/^第?13条$/.test(article.articleNum) && oxygenBroadNeed) {
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
      ((article.sourceKind === "mhlw-official-primary" ||
        article.sourceKind === "government-official-primary") &&
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
  const confirmedChoices = new Set(context.confirmedChoices ?? []);
  if (confirmedChoices.has("配線・充電部を扱う")) {
    return "実際に行うのは、配線の接続・取り外し、充電部への接触・近接、停電して行う作業のどれですか？";
  }
  if (confirmedChoices.has("盤内測定・配線")) {
    return "盤内で行うのは、テスター測定、配線の接続・取り外し、その両方のどれですか？";
  }
  if (confirmedChoices.has("電圧が不明")) {
    return "銘板・回路図で電圧を確認した後、接続先が電線同士か機器端子かを教えてください。";
  }
  if (
    confirmedChoices.has("電線同士") ||
    confirmedChoices.has("機器端子")
  ) {
    if (context.voltageClass && context.energizedState) return null;
    if (context.voltageClass) {
      return "その回路は停電して作業できますか？";
    }
    if (context.energizedState) {
      return "接続する回路の電圧を教えてください。";
    }
    return "接続する回路の電圧と、停電して作業できるかを教えてください。";
  }
  if (confirmedChoices.has("研削といし")) {
    return "実際に行うのは、研削といしの取替え・取替え時の試運転・通常の研削作業のどれですか？";
  }
  if (
    confirmedChoices.has("見るだけ") ||
    confirmedChoices.has("盤外から見る")
  ) {
    return null;
  }
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
      confirmedChoices.has("作業床あり") ||
      confirmedChoices.has("作業床なし") ||
      confirmedChoices.has("条件不明") ||
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
  if (hasHeatDomainSignal(normalized)) {
    return null;
  }
  if (
    /足場/.test(context.workType ?? "") &&
    hasWorkRequirementIntent(normalized)
  ) {
    if (
      confirmedChoices.has("作業者の特別教育") ||
      confirmedChoices.has("足場の作業主任者")
    ) {
      return null;
    }
    return "作業者として組立て等を行う場合の特別教育と、作業主任者として選任される要件のどちらを確認しますか？";
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
  if (
    article.sourceKind !== "mhlw-official-primary" &&
    article.sourceKind !== "government-official-primary"
  ) {
    return false;
  }
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

  // A generated quick reply is a structured condition, not a request to
  // display whichever single provision happens to contain the selected word.
  // Preserve it for the domain answer synthesizer below.
  const presented = /確認済み選択肢:/.test(normalized)
    ? null
    : presentationConclusion(query, articles);
  if (presented) return presented;

  const electricWork =
    conversationContext.topicDomain === "electrical" ||
    /(?:電気|電源|電工|盤内|分電盤|配電盤|制御盤|ブレーカー|開閉器|テスター|絶縁測定|配線|結線|活線|充電部|充電電路|特高|高圧受電)/.test(
      normalized,
    );
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
  const deEnergizedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?339条$/.test(article.articleNum),
  );
  const highVoltageLiveWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?341条$/.test(article.articleNum),
  );
  const highVoltageProximityWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?342条$/.test(article.articleNum),
  );
  const extraHighVoltageLiveWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?344条$/.test(article.articleNum),
  );
  const extraHighVoltageProximityWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?345条$/.test(article.articleNum),
  );
  const lowVoltageLiveWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?346条$/.test(article.articleNum),
  );
  const lowVoltageProximityWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?347条$/.test(article.articleNum),
  );
  const electricUseBeforeInspection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" && /^第?352条$/.test(article.articleNum),
  );
  const highVoltageSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "特別教育規程" && /^第?5条$/.test(article.articleNum),
  );
  const lowVoltageSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "特別教育規程" && /^第?6条$/.test(article.articleNum),
  );
  const electricianMinorWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "電工士法令" && /^第?1条$/.test(article.articleNum),
  );
  const electricianRegulatedTasks = articleIndex(
    articles,
    (article) =>
      article.lawShort === "電工士法則" && /^第?2条$/.test(article.articleNum),
  );
  const metiElectricianQa = articleIndex(
    articles,
    (article) => article.lawShort === "経産省電工Q&A",
  );
  const metiNonInvasiveMeasurementAttachment =
    /(?:経産省|経済産業省).*(?:電気工事士|電工).*Q&AQ?10/i.test(
      normalized,
    ) ||
    /(?:屋内配線|内線|配線).{0,20}(?:測定器|電圧計|電流計|テスター).{0,20}(?:取り?付け|クリップ|巻き?付け)/.test(
      normalized,
    ) ||
    /(?:測定器|電圧計|電流計|テスター).{0,20}(?:クリップ|巻き?付け).{0,30}(?:電気工事士|電工|必要|いる|要る)/.test(
      normalized,
    );
  const chiefElectricalEngineer = articleIndex(
    articles,
    (article) =>
      article.lawShort === "電事法" && /^第?43条$/.test(article.articleNum),
  );
  const electricalWorkSupervisorDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?14条$/.test(article.articleNum),
  );
  const electricalWorkSupervisorList = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" && /^第?6条$/.test(article.articleNum),
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
      conclusion: `電気工事士法上の従事制限と、安衛法上の特別教育は別制度のため、開始日は一つではありません。現在の検証済み条文が基準日2026年8月9日に施行中であることは確認できますが、この回答の根拠metadataだけでは各制度の最初の施行日を確定できないため、日付は断定しません。${markers(...electricQualificationSources)}`,
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
  const electricalAction = conversationContext.workAction;
  const asksElectricalWorkSupervisor = Boolean(
    electricWork &&
      (conversationContext.roleType === "work-supervisor" ||
        conversationContext.qualificationType === "work-supervisor" ||
        /作業主任者/.test(normalized)),
  );
  if (
    asksElectricalWorkSupervisor &&
    conversationContext.confirmedChoices?.includes("停電して扱う") &&
    deEnergizedWork >= 0 &&
    electricWorkController >= 0
  ) {
    return {
      conclusion: `「停電して扱う」作業では、電気作業全般の作業主任者ではなく、安衛則339条の停電作業措置と、同条の作業を列挙する350条の「作業の指揮者」を確認します。開閉器の施錠・通電禁止表示または監視人の配置を行い、残留電荷の危険がある電路は放電します。${markers(deEnergizedWork, electricWorkController)}`,
      conditions: [
        `開路前が高圧・特別高圧の電路では、検電器による停電確認と短絡接地も確認します。${marker(deEnergizedWork)}`,
        `作業主任者は安衛法14条・安衛令6条の指定作業の制度で、停電作業の作業指揮者とは別です。${markers(electricalWorkSupervisorDuty, electricalWorkSupervisorList, electricWorkController)}`,
      ],
    };
  }
  if (
    asksElectricalWorkSupervisor &&
    conversationContext.confirmedChoices?.includes(
      "高圧・特高の活線・近接",
    ) &&
    electricWorkController >= 0 &&
    [
      highVoltageLiveWork,
      highVoltageProximityWork,
      extraHighVoltageLiveWork,
      extraHighVoltageProximityWork,
    ].some((index) => index >= 0)
  ) {
    return {
      conclusion: `「高圧・特高の活線・近接」を選んだ場合、電気作業全般の作業主任者ではなく、安衛則341条・342条（高圧）または344条・345条（特別高圧）の活線・近接作業措置と、350条の「作業の指揮者」を確認します。${markers(highVoltageLiveWork, highVoltageProximityWork, extraHighVoltageLiveWork, extraHighVoltageProximityWork, electricWorkController)}`,
      conditions: [
        `直接取り扱う活線作業か、充電部へ近づく活線近接作業かで、絶縁用保護具・防具、活線作業用器具、接近距離に応じた措置が分かれます。${markers(highVoltageLiveWork, highVoltageProximityWork, extraHighVoltageLiveWork, extraHighVoltageProximityWork)}`,
        `作業主任者と作業の指揮者は別制度です。${markers(electricalWorkSupervisorDuty, electricalWorkSupervisorList, electricWorkController)}`,
      ],
    };
  }
  if (
    asksElectricalWorkSupervisor &&
    conversationContext.confirmedChoices?.includes("どちらでもない") &&
    electricalWorkSupervisorDuty >= 0 &&
    electricalWorkSupervisorList >= 0 &&
    electricWorkController >= 0
  ) {
    return {
      conclusion: `「どちらでもない」作業なら、停電作業や高圧・特別高圧の活線・近接作業という選択だけを理由に、安衛則350条の作業指揮者が必要とは判断しません。また、電気作業全般に一律の作業主任者を置く制度もありません。${markers(electricalWorkSupervisorDuty, electricalWorkSupervisorList, electricWorkController)}`,
      conditions: [
        `作業主任者は安衛令6条で指定された別の作業ごとの制度です。電気主任技術者は電気事業法43条に基づく事業用電気工作物の保安監督の制度で、安衛法14条の作業主任者とは別の役割です。${markers(electricalWorkSupervisorDuty, electricalWorkSupervisorList, chiefElectricalEngineer)}`,
        `実際の電気作業が目視・通常操作・測定・配線・修理のどれかで、必要な資格・教育・安全措置を改めて照合します。${marker(electricSpecialEducationWork)}`,
      ],
    };
  }
  if (
    asksElectricalWorkSupervisor &&
    electricalWorkSupervisorDuty >= 0 &&
    electricalWorkSupervisorList >= 0 &&
    electricWorkController >= 0
  ) {
    return {
      conclusion: `電気作業全般に一律の「作業主任者」を置く制度はありません。作業主任者は安衛法14条と安衛令6条で指定された作業ごとの制度で、同令の「高圧室内作業」は圧気工法の高気圧室内作業を指し、電気の高圧作業ではありません。${markers(electricalWorkSupervisorDuty, electricalWorkSupervisorList)}`,
      conditions: [
        `安衛則350条が安衛則339条、341条1項、342条1項、344条1項、345条1項の作業を列挙しており、停電作業と高圧・特別高圧の活線・近接作業では、別制度の「作業の指揮者」が必要です。${marker(electricWorkController)}`,
        `安衛則36条4号の特別教育対象も低圧か高圧・特別高圧かで異なるため、電圧区分に加え、停電・活線・近接のどの作業かを確認します。${markers(electricSpecialEducationWork, electricWorkController)}`,
        ...(chiefElectricalEngineer >= 0
          ? [
              `事業用電気工作物の保安監督をする電気主任技術者も別の役割で、個々の作業者の資格・教育を置き換えるものではありません。${markers(chiefElectricalEngineer, electricianRestriction, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    (conversationContext.roleType === "chief-electrical-engineer" ||
      conversationContext.qualificationType === "chief-electrical-engineer" ||
      /電気主任技術者|主任技術者/.test(normalized)) &&
    chiefElectricalEngineer >= 0 &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `電気主任技術者がいるだけで、誰でも電気作業をできるわけではありません。電気主任技術者は、事業用電気工作物の工事・維持・運用について保安を監督し、従事者はその保安上の指示に従う制度です。${marker(chiefElectricalEngineer)}`,
      conditions: [
        `配線の接続など、設備を設置・変更する「電気工事」に当たる作業には、電気工事士法2条・3条の定義と従事制限が別に適用されます。主任技術者の選任は、作業者の電気工事士資格の代わりではありません。${markers(chiefElectricalEngineer, electricWorkDefinition, electricianRestriction)}`,
        `充電電路等の危険業務には安衛法59条3項・安衛則36条4号の特別教育が別に関係し、主任技術者の選任だけで代替されません。${markers(chiefElectricalEngineer, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
        ...(conversationContext.voltageClass === "高圧" ||
        conversationContext.voltageClass === "特別高圧" ||
        electricalAction === "high-voltage-facility-inspection" ||
        /(?:高圧|特高)/.test(normalized)
          ? [
              `高圧・特別高圧の充電電路または支持物の敷設・点検・修理・操作は特別教育の対象です。充電中の高圧電路を扱う場合は、安衛則341条の活線作業措置も必要で、主任技術者の立会いだけでは代替できません。${markers(chiefElectricalEngineer, electricSpecialEducationDuty, electricSpecialEducationWork, highVoltageLiveWork)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    /(?:電工|電気工事士|免状).*(?:低圧教育|特別教育)|(?:低圧教育|特別教育).*(?:電工|電気工事士|免状)/.test(
      normalized,
    ) &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    const educationOmission = articleIndex(
      articles,
      (article) =>
        article.lawShort === "安衛則" && /^第?37条$/.test(article.articleNum),
    );
    return {
      conclusion: `電気工事士と電気取扱業務の特別教育は別制度です。電気工事士は、電気工事士法2条の設備を設置・変更する「電気工事」（配線の接続等を含み得る作業）について、同法3条の従事制限を受ける国家資格です。一方、特別教育は、安衛法59条3項に基づき危険業務へ就かせる前に事業者が行う安全教育です。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
      conditions: [
        `電気工事士免状があっても、安衛則36条4号の電気取扱業務の特別教育が一律に自動免除されるわけではありません。逆に、特別教育を受けただけで電気工事士法上の配線工事を行えるわけでもありません。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork)}`,
        ...(educationOmission >= 0
          ? [
              `安衛則37条は、事業者が十分な知識・技能を有すると認める事項について教育科目を省略できる規定で、免状だけを理由に全科目を当然免除する規定ではありません。${marker(educationOmission)}`,
            ]
          : []),
        `実際の業務が低圧の充電電路の敷設・修理、または区画場所にある露出充電部付き開閉器の操作に当たるかを確認します。${marker(electricSpecialEducationWork)}`,
      ],
    };
  }

  const asksUnresolvedElectricalSourceGap =
    /(?:メーカー|海外規格|仕様書|作業内容.*(?:未定|決まっていない)|何をするか.*(?:未定|決まっていない))/.test(
      normalized,
    );
  if (
    electricWork &&
    asksUnresolvedElectricalSourceGap &&
    electricWorkDefinition >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    const unresolvedScope = /メーカー/.test(normalized)
      ? "メーカー独自仕様に固有の点検資格"
      : /海外規格/.test(normalized)
        ? "海外規格への適合や、その設備固有の点検資格"
        : "まだ決まっていない作業内容に固有の資格・教育";
    return {
      conclusion: `今分かる範囲では、点検中の実際の行為で資格・教育の要件が変わります。盤外から非接触で見るだけ、盤を開けて測定する、配線を接続する、充電部を扱う、の順に確認すべき制度と感電防止措置が増えます。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      conditions: [
        `収録している日本の公式資料・法令だけでは、${unresolvedScope}までは確定できません。メーカーの仕様書、適用する海外規格、または実際の作業内容を別に確認する必要があります。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
        `配線の接続など設備を設置・変更する作業は、電気工事士法2条の「電気工事」に当たり得ます。高圧・特別高圧の充電電路等の点検は安衛則36条4号の特別教育対象で、低圧は敷設・修理と一定の露出充電部付き開閉器操作が対象です。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      ],
    };
  }

  const asksSpecialEducationForWiring =
    /特別教育/.test(normalized) &&
    /(?:配線工事|配線|結線|電線|コンセント|端子)/.test(normalized);

  if (
    electricWork &&
    conversationContext.confirmedChoices?.includes("配線・充電部を扱う") &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0 &&
    deEnergizedWork >= 0 &&
    lowVoltageLiveWork >= 0 &&
    lowVoltageProximityWork >= 0 &&
    highVoltageLiveWork >= 0 &&
    highVoltageProximityWork >= 0
  ) {
    return {
      conclusion: `「配線・充電部を扱う」だけでは、充電したままの活線作業とは確定しません。配線の接続・取り外し、充電部への接触・近接、停電して行う作業では、必要な資格・教育・感電防止措置が異なります。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork, deEnergizedWork, lowVoltageLiveWork, lowVoltageProximityWork, highVoltageLiveWork, highVoltageProximityWork)}`,
      conditions: [
        `配線を接続・取り外して設備を設置・変更する場合は、電気工事士法上の電気工事に該当する可能性があり、同法3条の従事制限を確認します。${markers(electricWorkDefinition, electricianRestriction)}`,
        `充電部に触れる・近づく作業は、低圧か高圧か、接触のおそれ、充電状態に応じて安衛則346条・347条または341条・342条等の措置を確認します。停電作業では安衛則339条の遮断・施錠表示等を確認します。${markers(deEnergizedWork, lowVoltageLiveWork, lowVoltageProximityWork, highVoltageLiveWork, highVoltageProximityWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    (conversationContext.confirmedChoices?.includes("盤内測定・配線") ||
      conversationContext.confirmedChoices?.includes("両方")) &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0 &&
    lowVoltageLiveWork >= 0 &&
    lowVoltageProximityWork >= 0 &&
    highVoltageLiveWork >= 0 &&
    highVoltageProximityWork >= 0
  ) {
    return {
      conclusion: `${conversationContext.confirmedChoices?.includes("両方") ? "測定と配線の両方を行う場合は、二つの制度判定を重ねて確認します。" : "「盤内測定・配線」には別の行為が含まれます。"}テスター測定は充電中か停電済みか、充電部へ接触・近接するおそれ、電圧で感電防止措置が変わり、配線の接続・取り外しは電気工事士法上の電気工事に該当する可能性を別に確認します。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork, highVoltageLiveWork, highVoltageProximityWork)}`,
      conditions: [
        `測定だけの場合でも「見るだけ」ではなく、低圧は安衛則346条・347条、高圧は341条・342条等の適用条件を確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork, highVoltageLiveWork, highVoltageProximityWork)}`,
        `配線を接続・取り外して設備を設置・変更する場合は、特別教育とは別に、電気工事士法2条・3条の工事範囲と従事制限を確認します。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    (conversationContext.confirmedChoices?.includes("見るだけ") ||
      conversationContext.confirmedChoices?.includes("盤外から見る")) &&
    electricWorkDefinition >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `「${conversationContext.confirmedChoices?.includes("盤外から見る") ? "盤外から見る" : "見るだけ"}」を選び、閉じた盤の外から表示・異音・異臭等を非接触で確認するだけなら、その確認だけで一律の国家資格や電気取扱業務の特別教育が必要とは限りません。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      conditions: [
        `盤を開ける、測定器を当てる、配線を接続・取り外す、充電部へ触れる・近づく場合は「見るだけ」ではなく、各行為の資格・教育・感電防止措置を別に確認します。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    conversationContext.confirmedChoices?.includes("充電部に触れる") &&
    lowVoltageLiveWork >= 0 &&
    highVoltageLiveWork >= 0 &&
    extraHighVoltageLiveWork >= 0 &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    deEnergizedWork >= 0
  ) {
    return {
      conclusion: `「充電部に触れる」という条件は、充電したまま端子を締める作業や配線工事までを意味しません。ただし、充電中の電路を直接取り扱い感電のおそれがあるなら、低圧は安衛則346条、高圧は341条、特別高圧は344条の活線作業措置を確認します。${markers(lowVoltageLiveWork, highVoltageLiveWork, extraHighVoltageLiveWork)}`,
      conditions: [
        `まず電圧と、停電作業へ切り替えられるかを確認します。配線の接続・取り外しも行う場合だけ、電気工事士法上の電気工事への該当を追加で確認します。${markers(electricWorkDefinition, electricianRestriction, deEnergizedWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    /配線非接触|配線(?:は|を)?(?:触らない|外さない|つながない)/.test(
      normalized,
    ) &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `「配線は触らない」という情報は配線作業を除外する条件であり、「盤外から見るだけ」とまでは確定しません。残る主な分岐は、盤外からの目視、盤を開けた測定、ブレーカー操作です。${markers(electricSpecialEducationWork, electricWorkDefinition)}`,
      conditions: [
        `盤外から表示・異音・異臭を見るだけなら一律の国家資格が必要とは限りませんが、盤内で測定する場合は充電状態と電圧に応じた感電防止措置を確認します。${markers(electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork)}`,
        `ブレーカー操作は、低圧の閉鎖型か露出充電部付きか、高圧・特別高圧かで特別教育の対象範囲が変わります。${marker(electricSpecialEducationWork)}`,
      ],
    };
  }

  const wiringTargetChoice = conversationContext.confirmedChoices?.find(
    (choice) =>
      choice === "電線同士" ||
      choice === "機器端子" ||
      choice === "電圧が不明",
  );
  const wiringSelectedState =
    conversationContext.energizedState ??
    (/(?:100・200V|高圧設備)を停電して作業/.test(normalized)
      ? "de-energized"
      : /充電中に扱う/.test(normalized)
        ? "energized"
        : undefined);
  const wiringSelectedVoltage =
    conversationContext.voltageClass ??
    (/100・200Vを停電して作業/.test(normalized)
      ? "低圧"
      : /高圧設備を停電して作業/.test(normalized)
        ? "高圧"
        : undefined);
  const wiringSelectedVoltageLabel = /100・200Vを停電して作業/.test(normalized)
    ? "100・200Vの低圧"
    : /高圧設備を停電して作業/.test(normalized)
      ? "高圧設備"
      : wiringSelectedVoltage;
  const wiringTargetSourceAvailable =
    wiringTargetChoice === "電線同士"
      ? electricianRegulatedTasks >= 0
      : wiringTargetChoice === "機器端子"
        ? electricianMinorWork >= 0
        : false;
  const wiringLiveSources =
    wiringSelectedVoltage === "低圧"
      ? [lowVoltageLiveWork]
      : wiringSelectedVoltage === "高圧"
        ? [highVoltageLiveWork]
        : wiringSelectedVoltage === "特別高圧"
          ? [extraHighVoltageLiveWork]
          : [lowVoltageLiveWork, highVoltageLiveWork, extraHighVoltageLiveWork];
  const hasWiringLiveSources = wiringLiveSources.every((index) => index >= 0);
  if (
    electricWork &&
    (wiringTargetChoice === "電線同士" || wiringTargetChoice === "機器端子") &&
    wiringSelectedState &&
    wiringSelectedState !== "unknown" &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    wiringTargetSourceAvailable &&
    (wiringSelectedState === "de-energized"
      ? deEnergizedWork >= 0
      : electricSpecialEducationWork >= 0 && hasWiringLiveSources)
  ) {
    const stopped = wiringSelectedState === "de-energized";
    const targetRule =
      wiringTargetChoice === "電線同士"
        ? `電線同士の接続は、電気工事士法施行規則2条が軽微な作業から除外される作業として挙げており、電気工事に当たる場合は同法3条の資格者が行います。${markers(electricWorkDefinition, electricianRestriction, electricianRegulatedTasks)}`
        : `機器端子への接続は一律ではなく、電気工事に当たれば電気工事士法3条の従事制限を受ける一方、600V以下の機器端子へ電線をねじ止めする等の限定的な軽微工事は施行令1条の範囲を確認します。${markers(electricWorkDefinition, electricianRestriction, electricianMinorWork)}`;
    return {
      conclusion: stopped
        ? `${wiringTargetChoice}を${wiringSelectedVoltageLabel ?? "電圧確認済みの回路"}で停電して扱う場合も、接続方法に応じた電気工事士制度の判定と、安衛則339条の停電作業措置の両方が必要です。${markers(electricWorkDefinition, electricianRestriction, deEnergizedWork)}`
        : `${wiringTargetChoice}を充電中に扱う前提では、接続方法に応じた電気工事士制度に加え、電圧区分に対応する特別教育・活線作業措置を確認します。${wiringSelectedVoltage ? "" : "電圧がまだ不明なら、低圧は安衛則346条、高圧は341条、特別高圧は344条の分岐を先に確認します。"}${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork, ...wiringLiveSources)}`,
      conditions: [
        targetRule,
        stopped
          ? `開閉器の施錠・通電禁止表示または監視人の配置を行い、残留電荷の危険がある電路は放電します。開路前が高圧・特別高圧なら検電器による停電確認と短絡接地も確認します。${marker(deEnergizedWork)}`
          : `充電中のまま行う必要があるかを見直し、可能なら停電作業へ切り替えます。${markers(deEnergizedWork, electricSpecialEducationWork)}`,
      ],
    };
  }
  if (
    electricWork &&
    wiringTargetChoice === "電線同士" &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricianRegulatedTasks >= 0
  ) {
    return {
      conclusion: `電線同士を接続する作業は、電気工事士法上の電気工事に該当する可能性が高く、同法施行規則2条は「電線相互を接続する作業」を軽微な作業から除外される作業として挙げています。実際に同法上の電気工事に当たる場合は、電気工事士法3条の設備区分に応じた資格者が行います。${markers(electricWorkDefinition, electricianRestriction, electricianRegulatedTasks)}`,
      conditions: [
        `特別教育は電気工事士資格とは別制度です。充電中なら電圧区分に応じた教育・感電防止措置を確認し、停電できる場合も安衛則339条の停電作業措置を確認します。${markers(electricSpecialEducationWork, deEnergizedWork)}`,
      ],
    };
  }
  if (
    electricWork &&
    wiringTargetChoice === "機器端子" &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricianMinorWork >= 0
  ) {
    return {
      conclusion: `機器端子へ接続するという情報だけでは、電気工事士が必要かを一律に決められません。設備を設置・変更する電気工事に当たれば電気工事士法3条の従事制限を受けますが、600V以下で、電気機器の端子へ電線をねじ止めする工事など同法施行令1条の限定的な軽微工事に当たる場合は、同法2条の「電気工事」から除かれます。${markers(electricWorkDefinition, electricianRestriction, electricianMinorWork)}`,
      conditions: [
        `端子の種類、設備区分、接続方法と電圧を確認し、充電中なら特別教育・感電防止措置も別に確認します。${markers(electricSpecialEducationWork, deEnergizedWork)}`,
      ],
    };
  }
  if (
    electricWork &&
    wiringTargetChoice === "電圧が不明" &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `配線を接続する作業で電圧が不明なままでは、低圧・高圧等の教育区分や感電防止措置を確定できません。ただし、配線の接続が設備を設置・変更する電気工事に当たる可能性と、電気工事士法3条の従事制限を確認すべきことまでは分かります。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork)}`,
      conditions: [
        `作業を始めず、銘板・回路図等で電圧を確認します。停電作業へ切り替える場合は安衛則339条、高圧・特別高圧の充電電路を扱う場合は特別教育等の別条件があります。${markers(deEnergizedWork, electricSpecialEducationWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "live-work" ||
      /活線/.test(normalized)) &&
    electricSpecialEducationWork >= 0 &&
    highVoltageLiveWork >= 0 &&
    lowVoltageLiveWork >= 0
  ) {
    return {
      conclusion: `充電したまま端子を締める作業は、単なる目視点検ではありません。低圧なら安衛則346条、高圧なら同341条の活線作業として、電圧と充電状態に応じた絶縁用保護具・防具等の感電防止措置が必要です。電圧不明のまま作業可とは判断できません。${markers(lowVoltageLiveWork, highVoltageLiveWork)}`,
      conditions: [
        `低圧の特別教育対象は、低圧の充電電路の敷設・修理と、区画された配電盤室等で露出充電部を持つ開閉器の操作です。端子締付けが充電電路の修理に当たるかを実際の作業内容で確認します。${marker(electricSpecialEducationWork)}`,
        `高圧・特別高圧では、充電電路または支持物の敷設・点検・修理・操作が特別教育の対象です。停電できるか、充電中に行う必要があるかでも手順と要件が変わります。${markers(electricSpecialEducationWork, highVoltageLiveWork)}`,
        ...(electricWorkDefinition >= 0 && electricianRestriction >= 0
          ? [
              `端子や配線の接続を変更する場合は、電気工事士法上の電気工事に当たる可能性も別に確認します。${markers(electricWorkDefinition, electricianRestriction)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "wiring-connection" ||
      electricalAction === "wiring-removal" ||
      electricalAction === "repair" ||
      asksSpecialEducationForWiring) &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0
  ) {
    return {
      conclusion: `${asksSpecialEducationForWiring ? "特別教育を受けただけでは、電気工事士法上の配線工事を行えることにはなりません。" : ""}配線をつなぐ・外す作業は、対象設備と接続方法によって、設備を設置・変更する「電気工事」に該当する可能性があります。従事制限の本体は電気工事士法3条です。電線相互の接続などは、同条1項・2項の「保安上支障がないと認められる軽微な作業」から除外される作業として同法施行規則2条に列挙されており、その接続が同法上の電気工事に当たる場合は、設備区分に対応する免状等を持つ資格者が行います。${markers(electricWorkDefinition, electricianRestriction, electricianRegulatedTasks)}`,
      conditions: [
        ...(electricianMinorWork >= 0
          ? [
              `一方、600V以下のコードを所定の接続器へ接続する工事など、電気工事士法施行令1条が定める限定的な軽微工事は、同法2条の「電気工事」から除かれます。${markers(electricWorkDefinition, electricianMinorWork)}`,
            ]
          : []),
        `充電中の電路で行う場合は、電気工事士資格とは別に、電気取扱業務の特別教育や感電防止措置を検討します。${marker(electricSpecialEducationWork)}`,
        ...(deEnergizedWork >= 0
          ? [
              `停電作業では、開閉器の施錠・通電禁止表示または監視人の配置が必要で、残留電荷の危険がある電路は放電します。検電器による停電確認と短絡接地は、開路前が高圧・特別高圧だった電路に限る措置です。${marker(deEnergizedWork)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "start-of-work-inspection" &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `「作業開始前点検」「始業前点検」は資格名ではなく、作業を始める前に状態を確認する手順・時点です。低圧設備を盤外から非接触で目視するだけなら、その点検名だけで一律の国家資格が必要とは限りません。${markers(electricSpecialEducationWork, electricWorkDefinition)}`,
      conditions: [
        `盤を開けて充電中の部分へ測定器を当てる場合は低圧の活線・近接措置、高圧・特別高圧の点検では特別教育など、点検中の行為で条件が変わります。${markers(electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork)}`,
        ...(electricUseBeforeInspection >= 0
          ? [
              `安衛則352条の使用前点検も、対象器具と点検事項を定める規定であり、点検者に一律の資格名を付ける規定ではありません。${marker(electricUseBeforeInspection)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "breaker-operation" &&
    (conversationContext.confirmedChoices?.includes("高圧盤") ||
      conversationContext.voltageClass === "高圧") &&
    electricSpecialEducationWork >= 0 &&
    highVoltageSpecialEducation >= 0
  ) {
    return {
      conclusion: `高圧盤の開閉器を操作する業務は、高圧の充電電路の操作として電気取扱業務の特別教育の対象です。低圧の閉鎖型ブレーカーを前面から入切する場合と同じ扱いにはなりません。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
      conditions: [
        `停電作業のための操作なら、特別教育とは別に、安衛則339条の施錠・通電禁止表示等と、対象作業では作業指揮者の選任も確認します。${markers(deEnergizedWork, electricWorkController)}`,
      ],
    };
  }
  if (
    electricWork &&
    electricalAction === "breaker-operation" &&
    conversationContext.confirmedChoices?.includes("露出型の開閉器") &&
    electricSpecialEducationWork >= 0 &&
    lowVoltageSpecialEducation >= 0
  ) {
    return {
      conclusion: `${conversationContext.voltageClass === "低圧" ? "100・200Vの低圧を選んだため、低圧側の条件を先に確認します。" : ""}「露出型の開閉器」という呼び方だけでは充電部の状態を確定できません。安衛則36条4号が低圧で特別教育の対象にするのは、配電盤室・変電室等の区画された場所に設置された低圧電路のうち、充電部分が露出している開閉器の操作です。${markers(electricSpecialEducationWork, lowVoltageSpecialEducation)}`,
      conditions: [
        ...(conversationContext.voltageClass === "低圧"
          ? [
              `低圧であることは分かっています。次は、配電盤室・変電室等の区画場所か、操作時に充電部分が実際に露出しているかを確認します。${markers(electricSpecialEducationWork, lowVoltageSpecialEducation)}`,
            ]
          : [
              `高圧・特別高圧の開閉器操作なら別の高圧側区分です。銘板の電圧と、操作時に充電部分が実際に露出しているかを確認します。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
            ]),
      ],
    };
  }
  if (
    electricWork &&
    electricalAction === "breaker-operation" &&
    conversationContext.confirmedChoices?.includes("100・200Vの閉鎖型") &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `100・200Vの閉鎖型ブレーカーを、盤の前面ハンドルで通常どおり入切するだけなら、設備の設置・変更工事ではなく、低圧特別教育もその操作だけで一律に必要とは限りません。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      conditions: [
        `カバーを開ける、充電部が露出した開閉器を操作する、停電作業のために開閉する場合は別の条件を確認します。${markers(electricSpecialEducationWork, deEnergizedWork)}`,
      ],
    };
  }

  const testerKnownHighVoltage =
    conversationContext.voltageClass === "高圧" ||
    conversationContext.voltageClass === "特別高圧";
  const testerKnownLowVoltage = conversationContext.voltageClass === "低圧";
  const testerEnergizedSelected =
    conversationContext.energizedState === "energized";
  const testerLiveSources = testerKnownLowVoltage
    ? [lowVoltageLiveWork, lowVoltageProximityWork]
    : conversationContext.voltageClass === "特別高圧"
      ? [extraHighVoltageLiveWork, extraHighVoltageProximityWork]
      : conversationContext.voltageClass === "高圧"
        ? [highVoltageLiveWork, highVoltageProximityWork]
        : [
            lowVoltageLiveWork,
            lowVoltageProximityWork,
            highVoltageLiveWork,
            highVoltageProximityWork,
          ];
  const hasTesterEnergizedSources = testerLiveSources.every(
    (index) => index >= 0,
  );
  if (
    electricWork &&
    electricalAction === "tester-measurement" &&
    conversationContext.voltageClass &&
    (!conversationContext.energizedState ||
      conversationContext.energizedState === "unknown") &&
    electricSpecialEducationWork >= 0 &&
    hasTesterEnergizedSources
  ) {
    const voltage = conversationContext.voltageClass;
    const stoppedBranch =
      deEnergizedWork >= 0
        ? `停電済みなら安衛則339条の停電作業措置を先に確認します。${marker(deEnergizedWork)}`
        : "停電済みなら、充電中向けの措置ではなく停電作業の手順を先に確認します。";
    return {
      conclusion: `${voltage}設備でテスター測定する条件まで分かっています。充電中なら、充電電路を直接取り扱う作業か充電部への近接作業かに応じて、${voltage === "低圧" ? "安衛則346条・347条" : voltage === "高圧" ? "安衛則341条・342条" : "安衛則344条・345条"}の措置を確認します。${markers(...testerLiveSources)} ${stoppedBranch}`,
      conditions: [
        voltage === "低圧"
          ? `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、配電盤室・変電室等の区画場所にある露出充電部付き開閉器の操作です。低圧測定の全てが一律に対象という規定ではありません。充電電路を直接取り扱い感電の危険がある場合は346条の絶縁用保護具または活線作業用器具、近接して点検等を行い接触するおそれがある場合は347条の絶縁用防具を確認します。${markers(electricSpecialEducationWork, ...testerLiveSources)}`
          : `${voltage}の充電電路または支持物の点検は電気取扱業務の特別教育対象であり、測定時の充電状態に応じた作業措置とは別に確認します。${markers(electricSpecialEducationWork, ...testerLiveSources)}`,
      ],
    };
  }
  if (
    electricWork &&
    electricalAction === "tester-measurement" &&
    testerEnergizedSelected &&
    electricSpecialEducationWork >= 0 &&
    hasTesterEnergizedSources
  ) {
    return {
      conclusion: testerKnownHighVoltage
        ? `充電中の${conversationContext.voltageClass}設備でテスター測定する場合は、単なる目視ではなく、充電電路を直接取り扱うか、充電部へ近接するかに応じて${conversationContext.voltageClass}の活線・近接作業措置を確認します。${markers(electricSpecialEducationWork, ...testerLiveSources)}`
        : testerKnownLowVoltage
          ? `充電中の低圧設備でテスター測定する場合は、充電電路を直接取り扱い感電の危険があれば安衛則346条、電路・支持物の点検等で充電部へ接触するおそれがあれば347条の措置を確認します。${markers(...testerLiveSources)}`
          : `充電中の盤内でテスター測定する条件を選んだため、停電測定ではなく活線・近接側の安全措置を先に確認します。低圧は安衛則346条・347条、高圧は341条・342条で条件が分かれます。${markers(...testerLiveSources)}`,
      conditions: [
        `配線を傷付けず測定器をクリップ留め・巻き付けるだけなら電気工事士を要しない場合もありますが、それで感電防止措置や特別教育の確認が不要になるわけではありません。${markers(metiElectricianQa, electricSpecialEducationWork, ...testerLiveSources)}`,
      ],
    };
  }
  if (
    electricWork &&
    electricalAction === "tester-measurement" &&
    conversationContext.energizedState === "de-energized" &&
    deEnergizedWork >= 0
  ) {
    const knownHighVoltage =
      conversationContext.voltageClass === "高圧" ||
      conversationContext.voltageClass === "特別高圧";
    return {
      conclusion: `「停電済み」を選んだため、充電中の測定ではなく安衛則339条の停電作業措置を先に確認します。開閉器の施錠・通電禁止表示または監視人の配置を行い、残留電荷の危険がある電路は放電します。${marker(deEnergizedWork)}`,
      conditions: [
        knownHighVoltage
          ? `開路前が${conversationContext.voltageClass}だった電路では、検電器による停電確認と短絡接地も確認します。既知の電圧を低圧か高圧か再質問する必要はありません。${marker(deEnergizedWork)}`
          : `検電器による停電確認と短絡接地を同条1項3号が求めるのは、開路前が高圧・特別高圧だった電路です。低圧へ無条件に同号を当てはめません。${marker(deEnergizedWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "breaker-operation" &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `100・200Vなどの閉鎖型ブレーカーを盤の前面ハンドルで入切するだけなら、設備の設置・変更工事ではないため通常は電気工事士の作業ではなく、低圧特別教育もその操作だけで一律に必要とは限りません。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      conditions: [
        `配電盤室・変電室等の区画場所にある、充電部分が露出した低圧開閉器の操作は特別教育の対象です。${markers(electricSpecialEducationWork, lowVoltageSpecialEducation)}`,
        `高圧・特別高圧の充電電路の操作は特別教育の対象です。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
        ...(deEnergizedWork >= 0 && electricWorkController >= 0
          ? [
              `停電作業のために開閉する場合は、施錠・表示等の停電措置と、対象作業では作業の指揮者も関係します。${markers(deEnergizedWork, electricWorkController)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "tester-measurement" &&
    metiNonInvasiveMeasurementAttachment &&
    metiElectricianQa >= 0 &&
    lowVoltageLiveWork >= 0 &&
    lowVoltageProximityWork >= 0
  ) {
    return {
      conclusion: `屋内配線を傷付けず、電圧計・電流計等の測定器をクリップ留め又は巻き付ける方法で取り付けるだけなら、経済産業省の電気工事士Q&A Q10は、電気工事士が工事する必要はないとしています。自家用電気工作物構内の配電盤など短絡・感電の危険を伴う場所では、あらかじめ電気主任技術者の指示確認を行うことが望ましいとされています。${marker(metiElectricianQa)}`,
      conditions: [
        `配線を傷付ける、切断・接続する、電線管等へ収めるなど、Q10のクリップ留め・巻き付けの前提を外れる作業は別に判定します。${marker(metiElectricianQa)}`,
        `電気工事士が不要となる取付け方法でも、充電中の低圧電路を直接取り扱い感電の危険がある場合は安衛則346条、電路・支持物の点検等で低圧充電電路へ接触するおそれがある場合は347条の感電防止措置を別に確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork)}`,
        `充電中か停電済みか、周囲に露出充電部があるか、低圧か高圧・特別高圧かで安全措置と教育の要否は変わります。${markers(electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "insulation-measurement" &&
    deEnergizedWork >= 0 &&
    lowVoltageLiveWork >= 0
  ) {
    return {
      conclusion: `絶縁抵抗を測る作業は、盤外から見るだけの点検ではありません。停電して測定する場合は、安衛則339条により、開閉器の施錠・通電禁止表示または監視人の配置を行い、残留電荷による危険がある電路は確実に放電します。${marker(deEnergizedWork)}`,
      conditions: [
        `検電器による停電確認と短絡接地は、開路する前が高圧・特別高圧だった電路について必要です。低圧を含む全ての電路へ同号が一律に求める措置ではありません。${marker(deEnergizedWork)}`,
        `測定で周囲の低圧充電電路を直接取り扱い感電の危険がある場合は、安衛則346条の絶縁用保護具または活線作業用器具を確認します。低圧充電電路に近接して電路・支持物の点検等を行い、充電電路へ接触するおそれがある場合は、347条の絶縁用防具が原則です。${markers(lowVoltageLiveWork, lowVoltageProximityWork)}`,
        `100・200V等の低圧か、高圧・特別高圧か、測定時に対象と周辺が停電済みかで、必要な教育・手順が変わります。${markers(electricSpecialEducationWork, highVoltageLiveWork, lowVoltageLiveWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    electricalAction === "open-panel" &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `盤を開けること自体は、テスター測定や配線作業と同じ行為ではなく、それだけで電気工事士の要否は確定しません。ただし、充電中の盤を開けて充電部が露出する場合は、閉鎖状態より接触・近接の危険が増えるため、盤内で何をするかと充電状態を確認します。${markers(electricWorkDefinition, electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork)}`,
      conditions: [
        `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、区画場所にある露出充電部付き開閉器の操作です。盤を開けて見る行為の全てが一律に対象という規定ではありません。${marker(electricSpecialEducationWork)}`,
        `盤内で測定器を当てる、開閉器を操作する、充電電路を直接扱う、または電路・支持物の点検等で充電部へ接触するおそれがある場合は、それぞれの行為に対応する規定を確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "tester-measurement" ||
      electricalAction === "insulation-measurement") &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `${metiElectricianQa >= 0 ? `配線を傷付けず、測定器をクリップ留め又は巻き付けるだけなら、経済産業省の電気工事士Q&A Q10では電気工事士が工事する必要はありません。自家用電気工作物構内の配電盤など危険を伴う場所では、電気主任技術者の指示確認が望ましいとされています。${marker(metiElectricianQa)} ` : ""}盤を開けてテスターを当てる作業は「見るだけ」ではありません。充電中なら、測定で充電電路を直接取り扱うのか、電路・支持物の点検等を充電部に近接して行い接触のおそれがあるのかを、電圧区分ごとの規定に照らします。${markers(lowVoltageLiveWork, lowVoltageProximityWork, highVoltageLiveWork, highVoltageProximityWork)}`,
      conditions: [
        `低圧で充電電路を直接取り扱い感電の危険がある場合は、安衛則346条の絶縁用保護具または活線作業用器具が必要です。低圧充電電路に近接して電路・支持物の敷設・点検・修理等を行い、充電電路へ接触するおそれがある場合は、347条の絶縁用防具が原則で、絶縁用保護具を着用し他の身体部分が接触するおそれがない場合が例外です。${markers(lowVoltageLiveWork, lowVoltageProximityWork)}`,
        `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、区画された配電盤室等にある露出充電部付き開閉器の操作です。全ての低圧測定が一律に特別教育対象という規定ではありません。${marker(electricSpecialEducationWork)}`,
        `高圧・特別高圧では、点検を含む特別教育と活線・近接作業の規定が関係し、安衛則342条等には充電電路への接近距離に応じた措置があります。測定時が充電中か停電済みか、100・200Vか高圧設備かでも結論が変わります。${markers(deEnergizedWork, electricSpecialEducationWork, highVoltageLiveWork, highVoltageProximityWork, extraHighVoltageLiveWork, extraHighVoltageProximityWork)}`,
      ],
    };
  }

  const asksLowHighEducationComparison =
    /(?:低圧.*高圧.*教育|高圧.*低圧.*教育)/.test(normalized);
  const isHighOrExtraHighElectricalWork = Boolean(
    electricWork &&
      !asksLowHighEducationComparison &&
      (conversationContext.voltageClass === "高圧" ||
        conversationContext.voltageClass === "特別高圧" ||
        electricalAction === "high-voltage-facility-inspection"),
  );
  if (isHighOrExtraHighElectricalWork && electricSpecialEducationWork >= 0) {
    const liveRule =
      conversationContext.voltageClass === "特別高圧"
        ? extraHighVoltageLiveWork
        : highVoltageLiveWork;
    const proximityRule =
      conversationContext.voltageClass === "特別高圧"
        ? extraHighVoltageProximityWork
        : highVoltageProximityWork;
    return {
      conclusion: `高圧・特別高圧の充電電路またはその支持物を敷設・点検・修理・操作する業務は、電気取扱業務の特別教育の対象です。点検も明文で含まれます。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
      conditions: [
        `充電中の作業か近接作業かで、活線作業・活線近接作業の具体的な措置が分かれます。${markers(liveRule, proximityRule)}`,
        ...(chiefElectricalEngineer >= 0
          ? [
              `事業用電気工作物では電気主任技術者が保安監督をしますが、特別教育や個々の作業資格の代わりではありません。${markers(chiefElectricalEngineer, electricianRestriction, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
            ]
          : []),
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "live-work" ||
      electricalAction === "live-proximity-work") &&
    electricSpecialEducationWork >= 0
  ) {
    const lowVoltageConfirmed =
      conversationContext.voltageClass === "低圧" ||
      /(?:100|200|400|600)\s*(?:V|ボルト)?/i.test(normalized);
    if (electricalAction === "live-proximity-work" && lowVoltageConfirmed) {
      return {
        conclusion: `100Vは低圧です。安衛則347条は、低圧の充電電路に近接して電路・支持物の敷設・点検・修理・塗装等の電気工事を行い、作業者が充電電路へ接触することで感電するおそれがある場合に適用され、原則として充電電路へ絶縁用防具を装着します。${markers(electricSpecialEducationWork, lowVoltageProximityWork)}`,
        conditions: [
          `絶縁用保護具を着用し、保護具を着けた部分以外の身体が充電電路へ接触するおそれがない場合は、絶縁用防具の例外です。347条は低圧近接作業に一律の数値距離を定める規定ではありません。${marker(lowVoltageProximityWork)}`,
          `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、区画場所にある露出充電部付き開閉器の操作であり、低圧の全近接作業が一律対象ではありません。${marker(electricSpecialEducationWork)}`,
        ],
      };
    }
    if (electricalAction === "live-work" && lowVoltageConfirmed) {
      return {
        conclusion: `低圧の充電電路を直接取り扱い、感電の危険が生じるおそれがある場合は、安衛則346条により絶縁用保護具を着用するか、活線作業用器具を使用します。${marker(lowVoltageLiveWork)}`,
        conditions: [
          `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、区画場所にある露出充電部付き開閉器の操作です。${marker(electricSpecialEducationWork)}`,
        ],
      };
    }
    return {
      conclusion: `充電部を扱う、またはその近くで作業する場合は、盤外から見るだけの点検とは扱いが異なります。低圧で充電電路を直接扱う場合は安衛則346条、低圧充電電路に近接して電路・支持物の点検等を行い接触のおそれがある場合は347条の絶縁保護措置を確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork)}`,
      conditions: [
        `低圧特別教育の法定対象は、低圧充電電路の敷設・修理と、区画場所にある露出充電部付き開閉器の操作です。低圧の全測定・全近接作業を一律に特別教育対象とは断定できません。${marker(electricSpecialEducationWork)}`,
        `高圧・特別高圧なら、点検・操作を含め特別教育の対象範囲が広がり、活線近接作業では接近距離に応じた措置も関係します。${markers(electricSpecialEducationWork, highVoltageProximityWork)}`,
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
    asksLowHighEducationComparison &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `低圧と高圧・特別高圧では、電気取扱業務の特別教育が必要になる法定業務の範囲が違います。高圧・特別高圧の方が、点検や操作まで明文で対象に含む広い区分です。${marker(electricSpecialEducationWork)}`,
      conditions: [
        `低圧は、充電電路の敷設・修理と、配電盤室・変電室等の区画場所にある露出充電部付き開閉器の操作が特別教育の対象です。全ての低圧点検・測定が一律に対象という規定ではありません。${markers(electricSpecialEducationWork, lowVoltageSpecialEducation)}`,
        `高圧・特別高圧は、充電電路または支持物の敷設・点検・修理・操作が特別教育の対象です。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
        `教育時間も異なり、低圧は学科7時間以上・実技7時間以上、高圧・特別高圧は学科11時間以上・実技15時間以上が基本です。操作だけを行う場合は、それぞれ実技1時間以上の区分があります。${markers(lowVoltageSpecialEducation, highVoltageSpecialEducation)}`,
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "unknown" || !electricalAction) &&
    conversationContext.voltageClass === "低圧" &&
    (conversationContext.qualificationType === "special-education" ||
      /(?:資格|免許|教育|特別教育|低圧教育)/.test(normalized)) &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0 &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0
  ) {
    return {
      conclusion: `低圧と分かっているので、次は作業行為で判断します。低圧の特別教育対象は、充電電路の敷設・修理と、配電盤室・変電室等の区画場所にある露出充電部付き開閉器の操作です。低圧設備の全ての目視・点検・測定が一律対象という規定ではありません。${markers(electricSpecialEducationDuty, electricSpecialEducationWork)}`,
      conditions: [
        `配線を接続・取り外すなど設備を設置・変更する作業は、特別教育とは別に、電気工事士法上の電気工事と従事制限へ該当する可能性を確認します。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork)}`,
        `盤外から見る、閉鎖型ブレーカーを通常操作する、盤を開けて測定する、配線を扱う、のどれかで必要条件が変わります。${markers(electricSpecialEducationWork, electricianRestriction)}`,
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "unknown" || !electricalAction) &&
    (conversationContext.voltageClass === "高圧" ||
      conversationContext.voltageClass === "特別高圧") &&
    (conversationContext.qualificationType === "special-education" ||
      /(?:資格|免許|教育|特別教育|高圧教育)/.test(normalized)) &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `${conversationContext.voltageClass}と分かっているので、充電電路または支持物の敷設・点検・修理・操作は、安衛法59条3項・安衛則36条4号の特別教育対象です。教育は学科11時間以上・実技15時間以上が基本で、操作だけを行う場合は実技1時間以上の区分があります。${markers(electricSpecialEducationDuty, electricSpecialEducationWork, highVoltageSpecialEducation)}`,
      conditions: [
        `停電して行うか、充電中の電路を直接扱うか、充電部へ近接するかで、停電手順・活線作業・近接作業の措置が変わります。${markers(deEnergizedWork, highVoltageLiveWork, highVoltageProximityWork, extraHighVoltageLiveWork, extraHighVoltageProximityWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    (conversationContext.qualificationType === "special-education" ||
      /(?:特別教育|低圧教育|高圧教育)/.test(normalized)) &&
    electricSpecialEducationDuty >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `電気取扱業務の特別教育は、電気工事士免状とは別の制度です。事業者が労働者を危険な電気業務に就かせる前に行う安全教育で、国家資格の免状ではありません。${markers(electricSpecialEducationDuty, electricSpecialEducationWork, electricianRestriction)}`,
      conditions: [
        `高圧・特別高圧は、充電電路または支持物の敷設・点検・修理・操作が対象です。教育は学科11時間以上・実技15時間以上が基本で、操作だけなら実技1時間以上です。${markers(electricSpecialEducationWork, highVoltageSpecialEducation)}`,
        `低圧は、充電電路の敷設・修理、または区画された配電盤室等で露出充電部を持つ開閉器の操作が対象です。学科7時間以上・実技7時間以上が基本で、開閉器操作だけなら実技1時間以上です。${markers(electricSpecialEducationWork, lowVoltageSpecialEducation)}`,
        `盤外から見るだけや閉鎖型スイッチの通常操作まで一律対象ではありませんが、充電中の測定には安衛則346条・347条の保護措置が関係し、配線工事には別途電気工事士資格が必要になり得ます。${markers(electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork, electricWorkDefinition, electricianRestriction)}`,
      ],
    };
  }

  if (
    electricWork &&
    (electricalAction === "visual-inspection" ||
      electricalAction === "indicator-check" ||
      electricalAction === "noise-odor-check" ||
      electricalAction === "cleaning") &&
    electricSpecialEducationWork >= 0
  ) {
    const exteriorCleaning = electricalAction === "cleaning";
    return {
      conclusion: exteriorCleaning
        ? `閉じた低圧の電気盤の外側だけを清掃し、盤内・配線・充電部を扱わないなら、その清掃だけで一律の国家資格や電気取扱業務の特別教育が必要とは限りません。電気工事士法は設備の設置・変更工事、安衛則36条4号は一定の充電電路業務を対象にしているためです。${markers(electricWorkDefinition, electricSpecialEducationWork)}`
        : `低圧設備の盤外から、表示・異音・異臭・外観を非接触で確認するだけなら、その確認だけで一律の国家資格が必要とは限りません。電気工事士法は設備の設置・変更工事、安衛則36条4号は一定の充電電路業務を対象にしているためです。${markers(electricWorkDefinition, electricSpecialEducationWork)}`,
      conditions: [
        exteriorCleaning
          ? `盤を開けて内部を清掃する、水分・導電性の用具が盤内へ入る、配線や充電部へ近づく場合は「外側だけの清掃」ではなく、停電手順と感電防止措置を確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork, electricianRestriction)}`
          : `盤を開ける、測定器を当てる、配線を外す・つなぐ、充電部へ近づく場合は「見るだけ」ではなく、別の資格・教育・感電防止措置を確認します。${markers(lowVoltageLiveWork, lowVoltageProximityWork, electricianRestriction)}`,
        `高圧・特別高圧の充電電路等の点検は、目視を含む点検でも特別教育の対象になり得ます。${marker(electricSpecialEducationWork)}`,
      ],
    };
  }

  if (
    electricWork &&
    electricWorkDefinition >= 0 &&
    electricianRestriction >= 0 &&
    electricSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `低圧設備を盤の外から見て、表示・異音・異臭を確認するだけなら、その点検だけで一律の国家資格が必要とは限りません。一方、盤を開けて測定する、配線を外す・つなぐ、充電部やその近くで作業する場合は、電気工事士、電気取扱業務の特別教育、感電防止措置がそれぞれ関係します。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationWork, lowVoltageLiveWork, lowVoltageProximityWork)}`,
      conditions: [
        `高圧・特別高圧では、充電電路または支持物の敷設・点検・修理・操作が特別教育の対象です。低圧では、充電電路の敷設・修理と、区画場所にある露出充電部付き開閉器の操作が対象で、全ての低圧点検が一律対象ではありません。${marker(electricSpecialEducationWork)}`,
        `電気工事士は設備の設置・変更工事を行う資格、特別教育は危険業務へ就かせる事業者の安全教育で、別制度です。双方が必要になる場合もあります。${markers(electricWorkDefinition, electricianRestriction, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
        ...(chiefElectricalEngineer >= 0
          ? [
              `電気主任技術者は事業用電気工作物の保安監督をする制度で、個々の作業者の電気工事士資格や特別教育の代わりではありません。${markers(chiefElectricalEngineer, electricianRestriction, electricSpecialEducationDuty, electricSpecialEducationWork)}`,
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
  const genericRestrictedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" && /^第?61条$/.test(article.articleNum),
  );
  const restrictedWorkList = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" && /^第?20条$/.test(article.articleNum),
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
  const qualificationFrameworkLabels = [
    /作業主任者/.test(normalized),
    /特別教育/.test(normalized),
    /技能講習/.test(normalized),
  ].filter(Boolean).length;
  if (
    lacksWorkContext &&
    qualificationFrameworkLabels >= 2 &&
    workLeaderDuty >= 0 &&
    workLeaderListedWork >= 0 &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0 &&
    genericRestrictedWork >= 0 &&
    restrictedWorkList >= 0
  ) {
    return {
      conclusion: `3制度は役割が違います。作業主任者は指定作業で選任して現場を指揮等する者、特別教育は指定された危険・有害業務へ就かせる前に事業者が行う教育、技能講習は就業制限業務の作業資格や作業主任者の選任要件になる講習です。${markers(workLeaderDuty, workLeaderListedWork, genericEducationDuty, genericSpecialEducationWork, genericRestrictedWork, restrictedWorkList)}`,
      conditions: [
        `代表例は、作業主任者では一定の足場・酸欠・有機溶剤・石綿、特別教育では一定の電気・小型機械・足場等、技能講習では1トン以上のフォークリフト・玉掛けや10m以上の高所作業車です。${markers(workLeaderListedWork, genericSpecialEducationWork, restrictedWorkList)}`,
      ],
    };
  }
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
    hasGenericWorkSupervisorIntent(normalized) &&
    !/(?:有機溶剤|シンナー|石綿|アスベスト)/.test(normalized) &&
    !/(?:特別教育|技能講習).*(?:種類|違い)|(?:種類|違い).*(?:特別教育|技能講習)/.test(
      normalized,
    ) &&
    workLeaderDuty >= 0 &&
    workLeaderListedWork >= 0
  ) {
    return {
      conclusion: `作業主任者は全作業に共通する資格ではなく、安衛令6条で指定された作業について、免許・技能講習等の要件を満たす者から選任する制度です。代表例には、高さ5m以上の構造の足場の組立て・解体・変更、酸素欠乏危険場所での作業、一定の屋内作業場等での有機溶剤業務、石綿等を取り扱う作業があります。${markers(workLeaderDuty, workLeaderListedWork)}`,
      conditions: [
        `必要な免許・技能講習と職務は作業ごとに異なるため、実際の作業を安衛令6条の該当号と個別規則に照合します。${markers(workLeaderDuty, workLeaderListedWork)}`,
      ],
    };
  }
  if (
    /研削といし/.test(normalized) &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `研削といしの取替え、または取替え時の試運転の業務に労働者を就かせるときは、安衛則36条1号の特別教育が必要です。これは事業者が対象業務へ就かせる前に行う安全教育で、国家資格免状ではありません。${markers(genericEducationDuty, genericSpecialEducationWork)}`,
      conditions: [
        `同号が直接対象にするのは「研削といしの取替え又は取替え時の試運転」です。通常の研削作業だけか、取替え・試運転も行うかを分けて確認します。${marker(genericSpecialEducationWork)}`,
      ],
    };
  }
  if (
    lacksWorkContext &&
    hasGeneralSpecialEducationIntent(normalized) &&
    !/(?:有機溶剤|シンナー|石綿|アスベスト)/.test(normalized) &&
    !/(?:作業主任者|技能講習).*(?:種類|違い)|(?:種類|違い).*(?:作業主任者|技能講習)/.test(
      normalized,
    ) &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `特別教育は、安衛則36条に指定された危険・有害な業務に労働者を就かせるとき、その業務に就く前に事業者が行う教育です。代表例は、研削といしの取替え等、作業床10m未満の高所作業車の運転、足場の組立て・解体・変更、所定条件でフルハーネス型墜落制止用器具を使う作業です。${markers(genericEducationDuty, genericSpecialEducationWork)}`,
      conditions: [
        `同じ機械でも荷重・高さ等で技能講習や免許側へ変わるため、実際の作業が安衛則36条のどの対象号に当たるかを確認します。${marker(genericSpecialEducationWork)}`,
      ],
    };
  }
  if (
    lacksWorkContext &&
    /(?:作業開始前|始業前)点検/.test(normalized) &&
    /資格/.test(normalized) &&
    genericEducationDuty >= 0 &&
    genericRestrictedWork >= 0 &&
    workLeaderDuty >= 0
  ) {
    return {
      conclusion: `「作業開始前点検」「始業前点検」は、それ自体が一つの資格名ではなく、設備を使う前や作業を始める前に状態を確認する手順・時点を表します。点検する設備と、点検中に行う操作・測定・整備によって必要な資格や教育が変わります。${markers(genericEducationDuty, genericRestrictedWork, workLeaderDuty)}`,
      conditions: [
        `対象設備に適用される法令上の資格・教育と、実際の点検行為の範囲を照合して判断します。${markers(genericEducationDuty, genericRestrictedWork, workLeaderDuty)}`,
      ],
    };
  }
  const chemicalManagerDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?12条の5$/.test(article.articleNum) &&
      /リスクアセスメント対象物/.test(article.text),
  );
  if (hasChemicalManagerDomainSignal(normalized) && chemicalManagerDuty >= 0) {
    if (/確認済み選択肢:.*RA対象物を製造|RA対象物を製造/.test(normalized)) {
      return {
        conclusion: `RA対象物を製造する事業場では、事業場ごとに化学物質管理者を選任し、選任事由が発生した日から14日以内に、厚生労働大臣が定める講習の修了者または同等以上の能力を有する者から選任します。${marker(chemicalManagerDuty)}`,
        conditions: [
          `これは製造事業場の資格区分です。製造以外の取扱事業場では、所定事項を担当するために必要な能力があると認められる者も選任候補になります。${marker(chemicalManagerDuty)}`,
        ],
      };
    }
    if (/確認済み選択肢:.*RA対象物を取り扱う|RA対象物を取り扱う/.test(normalized)) {
      return {
        conclusion: `RA対象物を製造せず取り扱う事業場でも、事業場ごとに化学物質管理者を選任し、選任事由が発生した日から14日以内に選任します。製造事業場以外では、所定事項を担当するために必要な能力があると認められる者も選任できます。${marker(chemicalManagerDuty)}`,
        conditions: [
          `厚生労働大臣が定める講習の修了者または同等以上の能力を有する者も、選任候補です。${marker(chemicalManagerDuty)}`,
        ],
      };
    }
    if (/確認済み選択肢:.*譲渡・提供のみ|譲渡・提供のみ/.test(normalized)) {
      return {
        conclusion: `RA対象物を製造・取り扱わず、譲渡または提供だけを行う事業場も、事業場ごとに化学物質管理者の選任対象です。表示・SDS通知等と教育管理に係る技術的事項を管理させ、選任事由が発生した日から14日以内に選任します。${marker(chemicalManagerDuty)}`,
        conditions: [
          `その表示等と教育管理を他事業場で行う場合は、他事業場で選任した化学物質管理者に管理させるただし書があります。${marker(chemicalManagerDuty)}`,
        ],
      };
    }
    return {
      conclusion: `化学物質管理者は、リスクアセスメント対象物（RA対象物）を製造し、または取り扱う事業場ごとに選任が必要です。RA対象物を譲渡・提供するだけの事業場も別途対象になります。選任すべき事由が発生した日から14日以内に選任します。${marker(chemicalManagerDuty)}`,
      conditions: [
        `RA対象物の製造事業場では、厚生労働大臣が定める講習の修了者または同等以上の能力がある者から選任します。${marker(chemicalManagerDuty)}`,
        `製造事業場以外の取扱事業場では、その講習修了者等に加え、所定事項を担当するために必要な能力があると認められる者も選任できます。${marker(chemicalManagerDuty)}`,
      ],
    };
  }
  const scaffoldSupervisorSelection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?565条$/.test(article.articleNum) &&
      /足場の組立て等作業主任者技能講習/.test(article.text),
  );
  if (
    /足場/.test(normalized) &&
    /確認済み選択肢:.*作業者の特別教育|作業者の特別教育/.test(normalized) &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `足場の組立て・解体・変更に作業者として従事する場合は、地上または堅固な床上で行う補助作業を除き、その業務に就く前に特別教育が必要です。${markers(genericEducationDuty, genericSpecialEducationWork)}`,
      conditions: [
        `これは作業者本人への教育です。一定の足場で現場を指揮する作業主任者の技能講習・選任要件とは別制度です。${markers(genericSpecialEducationWork, workLeaderListedWork)}`,
      ],
    };
  }
  if (
    /足場/.test(normalized) &&
    /確認済み選択肢:.*足場の作業主任者|足場の作業主任者/.test(normalized) &&
    workLeaderListedWork >= 0 &&
    scaffoldSupervisorSelection >= 0
  ) {
    return {
      conclusion: `つり足場・張出し足場、または高さ5m以上の構造の足場の組立て・解体・変更では、足場の組立て等作業主任者技能講習を修了した者から作業主任者を選任します。${markers(workLeaderListedWork, scaffoldSupervisorSelection)}`,
      conditions: [
        `作業主任者の選任は、組立て等に従事する作業者本人への特別教育を置き換えるものではありません。${markers(workLeaderListedWork, genericSpecialEducationWork)}`,
      ],
    };
  }
  if (
    /足場/.test(normalized) &&
    hasWorkRequirementIntent(normalized) &&
    genericSpecialEducationWork >= 0 &&
    workLeaderListedWork >= 0 &&
    scaffoldSupervisorSelection >= 0
  ) {
    return {
      conclusion: `足場の組立て・解体・変更に従事する作業者には、地上または堅固な床上での補助作業を除き、特別教育が必要です。${marker(genericSpecialEducationWork)}`,
      conditions: [
        `つり足場・張出し足場、または高さ5m以上の構造の足場の組立て・解体・変更では、作業主任者も必要です。${marker(workLeaderListedWork)}`,
        `作業主任者は、足場の組立て等作業主任者技能講習を修了した者から選任します。${marker(scaffoldSupervisorSelection)}`,
      ],
    };
  }
  if (
    lacksWorkContext &&
    hasGeneralSkillTrainingIntent(normalized) &&
    !/(?:修了証|再交付|書替|有効期限|更新)/.test(normalized) &&
    genericRestrictedWork >= 0 &&
    restrictedWorkList >= 0
  ) {
    return {
      conclusion: `技能講習は、安衛令20条の就業制限業務などで作業者本人に求められる資格区分です。代表例は、作業床10m以上の高所作業車の運転、機体重量3t以上の車両系建設機械の運転、可燃性ガスと酸素を用いる金属の溶接・溶断等です。安衛法61条は対象業務を免許・技能講習修了等の資格者に限っています。${markers(genericRestrictedWork, restrictedWorkList)}`,
      conditions: [
        `クレーン等は種類と能力により免許・技能講習・特別教育へ分かれるため、機械の銘板・仕様と実作業を確認します。${markers(genericRestrictedWork, restrictedWorkList)}`,
      ],
    };
  }
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
      conclusion: `電気作業全般に一律の「作業主任者」が必要という制度ではありません。安衛法14条の作業主任者は安衛令6条で指定された作業ごとの制度です。${markers(workLeaderDuty, workLeaderListedWork)} 一方、電気作業では、安衛則350条が339条・341条1項・342条1項・344条1項・345条1項の作業を行うときに「作業の指揮者」を定めるよう求めています。${marker(electricalWorkController)}`,
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
  if (hasForkliftDomainSignal(normalized) && forkliftIntent.qualification) {
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
    hasSlingingDomainSignal(normalized) &&
    hasBroadWorkRequirementIntent(normalized) &&
    statedLoad === null &&
    sling >= 0 &&
    slingRule >= 0 &&
    slingSpecialEducation >= 0
  ) {
    return {
      conclusion: `玉掛けは、クレーン等のつり上げ荷重が1トン未満なら特別教育、1トン以上なら玉掛け技能講習の修了者等に限られます。${markers(sling, slingRule, slingSpecialEducation)}`,
      conditions: [
        `区分は実際の荷やつり荷重量ではなく、機械の構造・材料に応じて負荷できる最大荷重である「つり上げ荷重」で判定します。${markers(slingLoadDefinition, slingRule, slingSpecialEducation)}`,
        `1トンちょうどは玉掛け技能講習側です。${markers(sling, slingRule)}`,
      ],
    };
  }
  if (
    hasSlingingDomainSignal(normalized) &&
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
    hasSlingingDomainSignal(normalized) &&
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
  const mobileCraneRestrictedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" &&
      /^第?20条$/.test(article.articleNum) &&
      /一トン以上の移動式クレーン/.test(article.text),
  );
  const mobileCraneChoice =
    conversationContext.confirmedChoices?.includes("移動式クレーン") ||
    /^移動式クレーン$/.test(normalized);
  if (
    mobileCraneChoice &&
    statedLoad === null &&
    mobileCraneSpecialEducation >= 0 &&
    mobileCraneRestriction >= 0 &&
    mobileCraneRestrictedWork >= 0
  ) {
    return {
      conclusion: `機械の種類を移動式クレーンに絞ると、運転資格はつり上げ荷重5トン以上が移動式クレーン運転士免許、1トン以上5トン未満が小型移動式クレーン運転技能講習、1トン未満が特別教育です。${markers(mobileCraneSpecialEducation, mobileCraneRestriction, mobileCraneRestrictedWork)}`,
      conditions: [
        `1トンちょうどは技能講習・免許側、5トンちょうどは免許側です。道路上を走行させる運転は、クレーン則67条の特別教育対象から除かれます。${markers(mobileCraneSpecialEducation, mobileCraneRestriction, mobileCraneRestrictedWork)}`,
      ],
    };
  }
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

  const fixedCraneSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?36条$/.test(article.articleNum) &&
      /つり上げ荷重が五トン未満のクレーン/.test(article.text),
  );
  const fixedCraneQualification = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?22条$/.test(article.articleNum) &&
      /クレーン・デリック運転士免許/.test(article.text),
  );
  const craneRestrictedWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛令" &&
      /^第?20条$/.test(article.articleNum) &&
      /つり上げ荷重が五トン以上のクレーン/.test(article.text) &&
      /つり上げ荷重が一トン以上の移動式クレーン/.test(article.text),
  );
  const fixedCraneChoice =
    /確認済み選択肢:クレーン/.test(normalized) &&
    !/確認済み選択肢:移動式クレーン/.test(normalized);
  const floorOperatedCraneChoice =
    conversationContext.confirmedChoices?.includes("床上操作式") === true;
  if (
    fixedCraneChoice &&
    isDefinitelyBelow(statedLoad, 5) &&
    fixedCraneSpecialEducation >= 0 &&
    craneRestrictedWork >= 0 &&
    fixedCraneQualification >= 0
  ) {
    return {
      conclusion: `移動式でないクレーンで、つり上げ荷重5トン未満を運転する場合は特別教育が必要です。${marker(fixedCraneSpecialEducation)}`,
      conditions: [
        `5トンちょうどからは就業制限側です。床上操作式か、それ以外かで技能講習・免許の扱いを分けます。${markers(craneRestrictedWork, fixedCraneQualification)}`,
      ],
    };
  }
  if (
    fixedCraneChoice &&
    isDefinitelyAtLeast(statedLoad, 5) &&
    craneRestrictedWork >= 0 &&
    fixedCraneQualification >= 0
  ) {
    return {
      conclusion: floorOperatedCraneChoice
        ? `つり上げ荷重5トン以上の床上操作式クレーンは、床上操作式クレーン運転技能講習の修了者が運転できます。${markers(craneRestrictedWork, fixedCraneQualification)}`
        : `つり上げ荷重5トン以上の移動式でないクレーンは、原則としてクレーン・デリック運転士免許が必要です。床上操作式クレーンは、床上操作式クレーン運転技能講習の修了者も運転できます。${markers(craneRestrictedWork, fixedCraneQualification)}`,
      conditions: [
        `「床上操作式」は、床上で運転し、運転者が荷の移動とともに移動する方式です。単に床から操作する全てのクレーンを意味しません。${marker(fixedCraneQualification)}`,
      ],
    };
  }
  if (
    fixedCraneChoice &&
    floorOperatedCraneChoice &&
    statedLoad === null &&
    fixedCraneSpecialEducation >= 0 &&
    craneRestrictedWork >= 0 &&
    fixedCraneQualification >= 0
  ) {
    return {
      conclusion: `床上操作式クレーンでも、つり上げ荷重5トン未満は特別教育、5トン以上は床上操作式クレーン運転技能講習の修了者が運転できる区分です。${markers(fixedCraneSpecialEducation, craneRestrictedWork, fixedCraneQualification)}`,
      conditions: [
        `法令上の床上操作式は、床上で運転し、運転者が荷の移動とともに移動する方式です。${marker(fixedCraneQualification)}`,
      ],
    };
  }
  if (
    fixedCraneChoice &&
    safetyEducationDuty >= 0 &&
    fixedCraneSpecialEducation >= 0 &&
    restrictedWorkDuty >= 0 &&
    craneRestrictedWork >= 0 &&
    fixedCraneQualification >= 0
  ) {
    return {
      conclusion: `移動式でないクレーンの運転は、原則として、つり上げ荷重5トン未満が特別教育、5トン以上がクレーン・デリック運転士免許の区分です。床上操作式クレーンは、所定の技能講習修了者も運転できます。${markers(safetyEducationDuty, fixedCraneSpecialEducation, restrictedWorkDuty, craneRestrictedWork, fixedCraneQualification)}`,
      conditions: [
        `つり上げ荷重5トンちょうどは免許・技能講習等の就業制限側です。跨線テルハには別の扱いがあるため、機械の種類も確認します。${markers(craneRestrictedWork, fixedCraneQualification)}`,
      ],
    };
  }
  const derrickSpecialEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?107条$/.test(article.articleNum) &&
      /五トン未満のデリ/.test(article.text) &&
      /特別の教育/.test(article.text),
  );
  const derrickRestriction = articleIndex(
    articles,
    (article) =>
      article.lawShort === "クレーン則" &&
      /^第?108条$/.test(article.articleNum) &&
      /クレーン・デリック運転士免許/.test(article.text),
  );
  const derrickChoice =
    conversationContext.confirmedChoices?.includes("デリック") === true ||
    /^デリック$/.test(normalized);
  if (
    derrickChoice &&
    statedLoad === null &&
    derrickSpecialEducation >= 0 &&
    derrickRestriction >= 0 &&
    craneRestrictedWork >= 0
  ) {
    return {
      conclusion: `デリックの運転は、つり上げ荷重5トン未満が特別教育、5トン以上がクレーン・デリック運転士免許の区分です。${markers(derrickSpecialEducation, craneRestrictedWork, derrickRestriction)}`,
      conditions: [
        `5トンちょうどは免許が必要な就業制限側です。${markers(craneRestrictedWork, derrickRestriction)}`,
      ],
    };
  }
  if (
    derrickChoice &&
    isDefinitelyBelow(statedLoad, 5) &&
    derrickSpecialEducation >= 0 &&
    craneRestrictedWork >= 0 &&
    derrickRestriction >= 0
  ) {
    return {
      conclusion: `つり上げ荷重5トン未満のデリック運転には、クレーン則107条の特別教育が必要です。${marker(derrickSpecialEducation)}`,
      conditions: [
        `5トンちょうどからはクレーン・デリック運転士免許側です。${markers(craneRestrictedWork, derrickRestriction)}`,
      ],
    };
  }
  if (
    derrickChoice &&
    isDefinitelyAtLeast(statedLoad, 5) &&
    derrickSpecialEducation >= 0 &&
    craneRestrictedWork >= 0 &&
    derrickRestriction >= 0
  ) {
    return {
      conclusion: `つり上げ荷重5トン以上のデリック運転には、クレーン・デリック運転士免許が必要です。${markers(craneRestrictedWork, derrickRestriction)}`,
      conditions: [
        `5トン未満はクレーン則107条の特別教育側です。${markers(derrickSpecialEducation, derrickRestriction)}`,
      ],
    };
  }
  if (
    /クレーン/.test(normalized) &&
    !/玉掛/.test(normalized) &&
    (/(?:運転|操作)/.test(normalized) ||
      hasWorkRequirementIntent(normalized)) &&
    !/(?:点検|検査|更新|有効期限|再交付|何条|根拠)/.test(normalized) &&
    safetyEducationDuty >= 0 &&
    fixedCraneSpecialEducation >= 0 &&
    restrictedWorkDuty >= 0 &&
    craneRestrictedWork >= 0 &&
    fixedCraneQualification >= 0 &&
    mobileCraneSpecialEducation >= 0 &&
    mobileCraneRestriction >= 0
  ) {
    return {
      conclusion: `クレーン運転の資格は、クレーン・移動式クレーン・デリック等の種類と、機械のつり上げ荷重で、免許・技能講習・特別教育に分かれます。${markers(safetyEducationDuty, fixedCraneSpecialEducation, restrictedWorkDuty, craneRestrictedWork, fixedCraneQualification, mobileCraneSpecialEducation, mobileCraneRestriction)}`,
      conditions: [
        `移動式でないクレーンは、原則として5トン未満が特別教育、5トン以上がクレーン・デリック運転士免許で、床上操作式は技能講習修了者も運転できます。${markers(fixedCraneSpecialEducation, craneRestrictedWork, fixedCraneQualification)}`,
        `移動式クレーンは、1トン未満が特別教育、1トン以上5トン未満が小型移動式クレーン運転技能講習、5トン以上が移動式クレーン運転士免許です。${markers(craneRestrictedWork, mobileCraneSpecialEducation, mobileCraneRestriction)}`,
      ],
    };
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
  const sdsNotificationDuty = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛法" &&
      /^第?57条の2$/.test(article.articleNum),
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
  const organicSupervisorSelection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "有機則" &&
      /^第?19条$/.test(article.articleNum) &&
      /有機溶剤作業主任者技能講習/.test(article.text) &&
      /作業主任者を選任/.test(article.text),
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
  const selectedOrganicClass =
    conversationContext.confirmedChoices?.find((choice) =>
      ["第1種", "第2種", "第3種"].includes(choice),
    ) ?? normalized.match(/(?:確認済み選択肢:)?(第[123]種)/)?.[1];
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    (selectedOrganicClass === "第1種" || selectedOrganicClass === "第2種") &&
    !asksTemporaryOrganicWork &&
    !asksShortOrganicWork &&
    !organicTankInside &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0
  ) {
    return {
      conclusion: `${selectedOrganicClass}有機溶剤等を屋内作業場等で法定の有機溶剤業務に使う場合は、原則として発散源を密閉する設備、局所排気装置またはプッシュプル型換気装置が必要です。${markers(organicDefinitions, organicIndoorEquipment)}`,
      conditions: [
        `SDSの成分・含有率で${selectedOrganicClass}への該当を確認し、実際の作業が屋内作業場等の法定の有機溶剤業務に当たるかを照合します。${markers(sdsNotificationDuty, organicDefinitions)}`,
      ],
    };
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    selectedOrganicClass === "第3種" &&
    !organicTankInside &&
    !organicTankOutside &&
    !organicLocationUnknown &&
    !asksTemporaryOrganicWork &&
    !asksShortOrganicWork &&
    !organicSpray &&
    !organicNonSpray &&
    organicDefinitions >= 0 &&
    organicTankEquipment >= 0
  ) {
    return {
      conclusion: `第3種有機溶剤等は、タンク等の内部で法定の有機溶剤業務を行う場合に有機則6条の設備区分を確認します。吹付け以外は、密閉設備・局所排気装置・プッシュプル型換気装置・全体換気装置のいずれかが原則です。${markers(organicDefinitions, organicTankEquipment)}`,
      conditions: [
        `吹付け作業では全体換気装置だけを選べず、臨時・短時間作業には有機則8条・9条の条件付き例外があります。SDS上の区分、タンク等の内外、吹付けかを順に照合します。${markers(organicTankEquipment, organicTemporaryException, organicShortTimeException)}`,
      ],
    };
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    conversationContext.confirmedChoices?.includes("作業者の教育") &&
    organicSupervisorSelection >= 0 &&
    genericSpecialEducationWork >= 0
  ) {
    return {
      conclusion: `有機溶剤作業者全員に、有機溶剤作業主任者技能講習の修了を求める制度ではありません。その技能講習は、対象作業で選任する作業主任者の要件です。作業者本人の特別教育は、実際の作業が安衛則36条の別の危険・有害業務にも該当する場合に、その業務について必要です。${markers(organicSupervisorSelection, genericSpecialEducationWork)}`,
      conditions: [
        `作業者側の法定要件は、使用物質が有機溶剤等・有機溶剤含有物の定義に当たるか、塗装・洗浄・タンク内等の行為、屋内作業場等か、適用する換気設備を照合して確認します。${markers(organicDefinitions, organicIndoorEquipment)}`,
      ],
    };
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    conversationContext.confirmedChoices?.includes("有機溶剤作業主任者") &&
    organicSupervisorSelection >= 0 &&
    workLeaderListedWork >= 0
  ) {
    return {
      conclusion: `安衛令6条22号と有機則19条の対象作業では、有機溶剤作業主任者技能講習を修了した者から作業主任者を選任します。作業主任者は作業方法を決め、作業を指揮し、換気設備や保護具の使用状況等を管理する役割です。${markers(workLeaderListedWork, organicSupervisorSelection)}`,
      conditions: [
        `作業者全員が同じ技能講習を修了する制度ではなく、作業主任者の選任と作業者への必要な教育・措置を分けて確認します。${markers(organicSupervisorSelection, genericSpecialEducationWork)}`,
      ],
    };
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    conversationContext.confirmedChoices?.includes("換気・保護措置") &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0
  ) {
    return {
      conclusion: `換気・保護措置は、まずSDSで有機溶剤の種類と含有率を確認し、第一種・第二種を屋内作業場等で扱う場合は、原則として密閉設備、局所排気装置またはプッシュプル型換気装置を設けます。${markers(sdsNotificationDuty, organicDefinitions, organicIndoorEquipment)}`,
      conditions: [
        `第三種、タンク等の内部、吹付け、臨時・短時間作業では、全体換気や送気マスクを含む条件付きの別分岐があります。${markers(organicTankEquipment, organicTemporaryException, organicShortTimeException)}`,
      ],
    };
  }
  if (
    hasOrganicSolventDomainSignal(normalized) &&
    hasWorkRequirementIntent(normalized) &&
    organicSupervisorSelection >= 0 &&
    workLeaderListedWork >= 0 &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0 &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0
  ) {
    return {
      conclusion: `有機溶剤作業でまず確認する資格は作業主任者です。安衛令6条22号と有機則19条の対象作業では、有機溶剤作業主任者技能講習の修了者から作業主任者を選任します。作業者全員に同じ技能講習を求める制度ではありません。${markers(workLeaderListedWork, organicSupervisorSelection)}`,
      conditions: [
        `特別教育は別制度で、実際の作業が安衛則36条に列挙された危険・有害業務にも当たる場合に、その業務について必要です。${markers(genericEducationDuty, genericSpecialEducationWork)}`,
        `資格だけでなく、SDSで溶剤種別・含有率を確認し、屋内やタンク内では密閉・局所排気・プッシュプル等の設備を確認します。臨時・短時間の例外も場所、全体換気、送気マスク等の条件付きです。${markers(sdsNotificationDuty, organicDefinitions, organicIndoorEquipment, organicTemporaryException, organicShortTimeException)}`,
      ],
    };
  }
  if (hasTankEntrySafetyIntent(normalized)) {
    const tankOxygenMeasurement = articleIndex(
      articles,
      (article) =>
        article.lawShort === "酸欠則" && /^第?3条$/.test(article.articleNum),
    );
    const tankOxygenVentilation = articleIndex(
      articles,
      (article) =>
        article.lawShort === "酸欠則" && /^第?5条$/.test(article.articleNum),
    );
    const tankOxygenSupervisor = articleIndex(
      articles,
      (article) =>
        article.lawShort === "酸欠則" && /^第?11条$/.test(article.articleNum),
    );
    const tankOxygenEducation = articleIndex(
      articles,
      (article) =>
        article.lawShort === "酸欠則" && /^第?12条$/.test(article.articleNum),
    );
    const tankOxygenMonitor = articleIndex(
      articles,
      (article) =>
        article.lawShort === "酸欠則" && /^第?13条$/.test(article.articleNum),
    );
    if (
      tankOxygenMeasurement >= 0 &&
      tankOxygenVentilation >= 0 &&
      tankOxygenSupervisor >= 0 &&
      tankOxygenEducation >= 0 &&
      tankOxygenMonitor >= 0
    ) {
      return {
        conclusion: `タンク内へ入る作業は、タンクという名称だけで一つの資格に決まりません。まず酸素欠乏危険場所に当たるかを確認し、該当する場合は作業開始前の酸素濃度等の測定、換気、常時監視、作業者への特別教育、作業主任者の選任が主要条件です。${markers(tankOxygenMeasurement, tankOxygenVentilation, tankOxygenSupervisor, tankOxygenEducation, tankOxygenMonitor)}`,
        conditions: [
          ...(organicIndoorEquipment >= 0 && organicSupervisorSelection >= 0
            ? [
                `シンナー等の有機溶剤やその残留物がある場合は、有機則による密閉・局所排気・プッシュプル等の設備措置と、対象業務での有機溶剤作業主任者も別に確認します。${markers(organicIndoorEquipment, organicSupervisorSelection)}`,
              ]
            : []),
          `入槽前に、タンクの用途、直前の内容物・残留物、洗浄方法を特定し、酸欠と化学物質の両方を評価します。${markers(tankOxygenMeasurement, organicIndoorEquipment)}`,
        ],
      };
    }
  }
  if (
    /有機溶剤/.test(normalized) &&
    /(?:主な条件|必要な設備|設備要件|設備.*(?:必要|条件))/.test(normalized) &&
    sdsNotificationDuty >= 0 &&
    organicDefinitions >= 0 &&
    organicIndoorEquipment >= 0 &&
    organicTankEquipment >= 0
  ) {
    return {
      conclusion: `まずSDSの成分・含有率から、有機溶剤等が第一種・第二種・第三種のどれに当たるかを確認します。第一種・第二種を屋内作業場等で扱う場合は、原則として密閉設備、局所排気装置またはプッシュプル型換気装置が必要です。${markers(sdsNotificationDuty, organicDefinitions, organicIndoorEquipment)}`,
      conditions: [
        `第三種は、タンク等の内部で行う業務について、密閉設備・局所排気装置・プッシュプル型換気装置・全体換気装置の区分が定められています。${marker(organicTankEquipment)}`,
        `設備は、屋内か、タンク等の内部か外か、吹付けか、臨時・短時間作業かでも変わります。${markers(organicDefinitions, organicIndoorEquipment, organicTankEquipment)}`,
      ],
    };
  }
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
    organicDefinitions >= 0 &&
    organicClassThree &&
    organicTankEquipment >= 0
  ) {
    if (organicLocationUnknown) {
      return {
        conclusion: `第三種有機溶剤等で作業場所がまだ不明でも、主要な分岐までは回答できます。タンク等の内部なら有機則6条により、吹付け以外は密閉設備・局所排気装置・プッシュプル型換気装置・全体換気装置のいずれか、吹付けは全体換気装置を除く前三設備のいずれかを確認します。タンク等の内部以外の屋内なら、同条の設備義務は適用されません。${markers(organicDefinitions, organicTankEquipment)}`,
        conditions: [
          `SDSの成分・含有率で対象物を確認したうえで、容器・設備図面と実際の作業位置からタンク等の内部か、それ以外の屋内かを確認します。${markers(sdsNotificationDuty, organicDefinitions, organicTankEquipment)}`,
        ],
      };
    }
    if (organicTankOutside) {
      return {
        conclusion: `第三種有機溶剤等について、有機則6条の設備義務はタンク等の内部で行う業務が対象です。タンク等の内部以外の屋内という今回の条件には、同条の設備義務は適用されません。${marker(organicTankEquipment)}`,
        conditions: [
          `SDSの成分・含有率と、実際の作業方法を確認してください。${markers(sdsNotificationDuty, organicDefinitions)}`,
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
        `SDSの成分・含有率と作業方法を確認してください。${markers(sdsNotificationDuty, organicDefinitions)}`,
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
  const oxygenDeficiencyEducationListing = articleIndex(
    articles,
    (article) =>
      article.lawShort === "安衛則" &&
      /^第?36条$/.test(article.articleNum) &&
      /酸素欠乏危険(?:場所|作業)/.test(article.text),
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
  const broadOxygenQualification =
    hasOxygenDeficiencyDomainSignal(normalized) &&
    hasBroadWorkRequirementIntent(normalized);
  if (
    broadOxygenQualification &&
    genericEducationDuty >= 0 &&
    oxygenDeficiencyEducationListing >= 0 &&
    oxygenDeficiencyEducation >= 0 &&
    oxygenDeficiencySupervisor >= 0
  ) {
    return {
      conclusion: `酸素欠乏危険作業では、作業者本人への特別教育と、現場を管理する作業主任者の選任が別に必要です。対象となる労働者は業務へ就く前に特別教育を受け、第一種・第二種に応じた技能講習修了者から作業主任者を選任します。${markers(genericEducationDuty, oxygenDeficiencyEducationListing, oxygenDeficiencyEducation, oxygenDeficiencySupervisor)}`,
      conditions: [
        ...(oxygenDeficiencyMeasurement >= 0
          ? [
              `その日の作業開始前に酸素濃度を測定し、第二種では硫化水素濃度も測定します。${marker(oxygenDeficiencyMeasurement)}`,
            ]
          : []),
        ...(oxygenDeficiencyVentilation >= 0
          ? [
              `原則として換気し、酸素濃度を18%以上に保ちます。第二種では硫化水素濃度も100万分の10以下に保ちます。${marker(oxygenDeficiencyVentilation)}`,
            ]
          : []),
        ...(oxygenDeficiencyMonitor >= 0
          ? [
              `作業の状況を常時監視し、異常時に直ちに通報する者を置く等の措置も必要です。${marker(oxygenDeficiencyMonitor)}`,
            ]
          : []),
      ],
    };
  }
  if (
    /(?:酸欠|酸素欠乏)/.test(normalized) &&
    /(?:特別教育|教育)/.test(normalized) &&
    /作業主任者/.test(normalized) &&
    oxygenDeficiencyEducation >= 0 &&
    oxygenDeficiencySupervisor >= 0
  ) {
    return {
      conclusion: `酸素欠乏危険作業に係る業務へ労働者を就かせるときは、その労働者への特別教育が必要です。これとは別に、現場では酸素欠乏危険作業主任者を選任します。${markers(oxygenDeficiencyEducation, oxygenDeficiencySupervisor)}`,
      conditions: [
        `第一種は、酸素欠乏危険作業主任者技能講習または酸素欠乏・硫化水素危険作業主任者技能講習の修了者から選任します。${marker(oxygenDeficiencySupervisor)}`,
        `第二種は硫化水素も対象とするため、酸素欠乏・硫化水素危険作業主任者技能講習の修了者から選任します。${marker(oxygenDeficiencySupervisor)}`,
      ],
    };
  }
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
    hasHarnessDomainSignal(normalized) &&
    hasHarnessEducationContext(normalized) &&
    conversationContext.confirmedChoices?.includes("作業床あり") &&
    specialEducation >= 0 &&
    safetyEducationDuty >= 0
  ) {
    return {
      conclusion: `作業箇所に適切な作業床を設けられる場合は、その条件だけでは安衛則36条41号のフルハーネス特別教育対象にはなりません。同号は、高さ2m以上で作業床を設けることが困難な場所で、フルハーネス型を用いる作業を対象にしています。${markers(safetyEducationDuty, specialEducation)}`,
      conditions: [
        `作業床が実際に使用できる状態か、作業床の端・開口部で別の墜落防止措置が必要かは、作業場所ごとに確認します。${marker(specialEducation)}`,
      ],
    };
  }
  if (
    hasHarnessDomainSignal(normalized) &&
    hasHarnessEducationContext(normalized) &&
    conversationContext.confirmedChoices?.includes("作業床なし") &&
    specialEducation >= 0 &&
    safetyEducationDuty >= 0
  ) {
    return {
      conclusion: `作業床を設けることが困難で、高さ2m以上の場所においてフルハーネス型を用いて作業するなら、その作業に就く労働者には特別教育が必要です。${markers(safetyEducationDuty, specialEducation)}`,
      conditions: [
        `高さ2m未満の場合やロープ高所作業の場合は安衛則36条41号とは区分が異なるため、作業高さと作業方法を確認します。${marker(specialEducation)}`,
      ],
    };
  }
  if (
    hasHarnessDomainSignal(normalized) &&
    !hasHarnessEducationContext(normalized) &&
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
    hasHarnessEducationContext(normalized) &&
    specialEducation >= 0 &&
    safetyEducationDuty >= 0
  ) {
    return {
      conclusion: `フルハーネスについて一律の国家資格免状があるわけではありません。ただし、高さ2m以上で作業床を設けることが困難な場所において、フルハーネス型を用いる作業に就く労働者には特別教育が必要です。${markers(safetyEducationDuty, specialEducation)}`,
      conditions: [
        `ロープ高所作業は安衛則36条41号の対象から除かれ、同条40号の別区分です。${marker(specialEducation)}`,
        `高さだけでなく、作業床を設けることが困難かを確認します。${marker(specialEducation)}`,
      ],
    };
  }

  if (
    highLiftIntent.hasHighLiftContext &&
    !highLiftIntent.fallProtection
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
        conclusion: `高所作業車は、銘板・仕様上の作業床最高高さで判定します。2m以上10m未満の運転は特別教育が必要で、10m以上は高所作業車運転技能講習の修了者等に限られます。${markers(highLiftDefinition, specialEducation, highLiftDecree, restrictedWorkDuty)}`,
        conditions: [
          `作業床最高高さ10mちょうどは、技能講習側の就業制限対象です。${markers(highLiftDecree, restrictedWorkDuty)}`,
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
  const heatPreventionGuideline = articleIndex(
    articles,
    (article) =>
      article.lawShort === "熱中症ガイドライン" &&
      /^第?2・第?3$/.test(article.articleNum) &&
      /WBGT[\s\S]*休憩[\s\S]*暑熱順化[\s\S]*水分及び塩分/.test(
        article.text,
      ),
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
  const asbestosSupervisorSelection = articleIndex(
    articles,
    (article) =>
      article.lawShort === "石綿則" &&
      /^第?19条$/.test(article.articleNum) &&
      /石綿作業主任者技能講習/.test(article.text) &&
      /作業主任者を選任/.test(article.text),
  );
  const asbestosDismantlingWork = articleIndex(
    articles,
    (article) =>
      article.lawShort === "石綿則" &&
      /^第?4条$/.test(article.articleNum) &&
      /石綿使用建築物等解体等作業/.test(article.text),
  );
  const asbestosWorkerEducation = articleIndex(
    articles,
    (article) =>
      article.lawShort === "石綿則" &&
      /^第?27条$/.test(article.articleNum) &&
      /石綿使用建築物等解体等作業に係る業務/.test(article.text) &&
      /特別の教育/.test(article.text),
  );
  const asbestosSurveyTargetChoice = conversationContext.confirmedChoices?.find(
    (choice) => choice === "建築物" || choice === "工作物" || choice === "船舶",
  );
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    conversationContext.confirmedChoices?.includes("作業者の特別教育") &&
    asbestosDismantlingWork >= 0 &&
    asbestosWorkerEducation >= 0
  ) {
    return {
      conclusion: `石綿等が使用されている建築物・工作物・鋼製船舶の解体・改修等で行う「石綿使用建築物等解体等作業」に係る業務へ労働者を就かせるときは、その作業者に石綿則27条の特別教育が必要です。${markers(asbestosDismantlingWork, asbestosWorkerEducation)}`,
      conditions: [
        `教育科目は、石綿の有害性、使用状況、粉じん発散抑制措置、保護具の使用方法、その他ばく露防止に必要な事項です。${marker(asbestosWorkerEducation)}`,
        `これは解体・改修等の対象業務についての作業者教育で、石綿作業主任者や事前調査者の資格とは別です。${markers(asbestosWorkerEducation, asbestosSupervisorSelection, asbestosSurveyQualificationNotice)}`,
      ],
    };
  }
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    conversationContext.confirmedChoices?.includes("石綿作業主任者") &&
    workLeaderListedWork >= 0 &&
    asbestosSupervisorSelection >= 0
  ) {
    return {
      conclusion: `安衛令6条23号の石綿等を取り扱う作業では、石綿作業主任者技能講習を修了した者から作業主任者を選任します。${markers(workLeaderListedWork, asbestosSupervisorSelection)}`,
      conditions: [
        `作業主任者は作業者の指揮や保護具の使用状況等を管理する役割で、解体・改修等の作業者本人への特別教育を置き換えません。${markers(asbestosSupervisorSelection, asbestosWorkerEducation)}`,
      ],
    };
  }
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    hasWorkRequirementIntent(normalized) &&
    !asbestosSurveyTargetChoice &&
    !/(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(
      normalized,
    ) &&
    genericEducationDuty >= 0 &&
    genericSpecialEducationWork >= 0 &&
    workLeaderListedWork >= 0 &&
    asbestosSupervisorSelection >= 0 &&
    asbestosDismantlingWork >= 0 &&
    asbestosWorkerEducation >= 0 &&
    asbestosSurvey >= 0 &&
    asbestosSurveyQualificationNotice >= 0
  ) {
    return {
      conclusion: `石綿作業の資格・教育は役割で分かれます。石綿等が使用されている建築物・工作物・鋼製船舶の解体・改修等で行う「石綿使用建築物等解体等作業」に係る業務へ就く労働者には特別教育が必要で、安衛令6条23号の作業では石綿作業主任者技能講習の修了者から作業主任者を選任します。${markers(genericEducationDuty, genericSpecialEducationWork, asbestosDismantlingWork, asbestosWorkerEducation, workLeaderListedWork, asbestosSupervisorSelection)}`,
      conditions: [
        `解体・改修前の事前調査を行う人は別区分で、建築物・鋼製船舶・工作物に応じた石綿含有建材等の調査者要件を確認します。${markers(asbestosSurvey, asbestosSurveyQualificationNotice)}`,
        `作業者の特別教育、現場の作業主任者、事前調査者は相互に置き換わる資格ではありません。${markers(asbestosWorkerEducation, asbestosSupervisorSelection, asbestosSurveyQualificationNotice)}`,
      ],
    };
  }
  if (
    /(?:石綿|アスベスト)/.test(normalized) &&
    (/(?:事前調査|調査者|調査.*(?:誰|資格|できる|行える))/.test(normalized) ||
      Boolean(asbestosSurveyTargetChoice)) &&
    asbestosSurvey >= 0 &&
    asbestosSurveyQualificationNotice >= 0
  ) {
    const buildingTarget =
      asbestosSurveyTargetChoice === "建築物" ||
      /(?:建築物|一戸建て|共同住宅|住戸)/.test(normalized);
    const structureTarget =
      asbestosSurveyTargetChoice === "工作物" || /工作物/.test(normalized);
    const shipTarget =
      asbestosSurveyTargetChoice === "船舶" || /船舶/.test(normalized);
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
    hasHeatDomainSignal(normalized) &&
    /報告|連絡|体制|手順|義務|対応|対策|何をすべき|どうすれば/.test(
      normalized,
    ) &&
    heat >= 0
  ) {
    if (
      /(?:誰|どこ)(?:に|へ)?(?:報告|連絡)|(?:その)?(?:報告|連絡)(?:先|は).*?(?:誰|どこ)|(?:報告|連絡)先.*?(?:誰|どこ)/.test(
        normalized,
      ) ||
      /(?:報告|連絡).*(?:誰|どこ)(?:に|へ)?$/.test(normalized)
    ) {
      return {
        conclusion: `2025年6月1日施行の安衛則第612条の2は、報告先を労働基準監督署や特定の役職へ一律に指定していません。事業者が、熱中症の自覚症状や疑いを報告させる体制をあらかじめ整備し、作業従事者へ周知する必要があります。したがって、現場で誰へ報告するかは、その体制の中で具体的に定めて周知します。${marker(heat)}`,
        conditions: [
          `報告先の役職名や連絡手段は同条本文に定められていないため、事業場の手順・連絡網を確認します。${marker(heat)}`,
        ],
      };
    }
    const preventionAnswer =
      heatPreventionGuideline >= 0
        ? `予防と発症疑い時の対応を分けて準備します。予防では、WBGTを把握・評価し、値に応じて作業場所の暑熱を下げる、休止・休憩と作業時間を調整する、計画的に暑熱順化する、作業前後と作業中に水分・塩分を摂る、といった対策を組み合わせます。${marker(heatPreventionGuideline)} `
        : "";
    return {
      conclusion: `${preventionAnswer}2025年6月1日施行の安衛則612条の2により、熱中症のおそれがある作業では、症状の自覚や疑いを報告させる体制と、発症が疑われた人を作業から離脱させ、身体を冷却し、必要に応じて受診させる手順を整備・周知する必要があります。${marker(heat)}`,
      conditions: [
        `発症が疑われた場合に備え、作業場ごとに作業からの離脱、身体の冷却、必要に応じた受診等の措置内容と実施手順もあらかじめ定め、周知しなければなりません。${marker(heat)}`,
        ...(heatPreventionGuideline >= 0
          ? [
              `安衛則612条の2の法定義務は報告体制と悪化防止手順で、WBGT・休憩・暑熱順化等の予防管理は厚生労働省の2026年ガイドラインに基づく対策です。${markers(heat, heatPreventionGuideline)}`,
            ]
          : []),
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
  const maxLength = context.topicDomain === "electrical" ? 2_000 : 600;
  return answer.length <= maxLength
    ? answer
    : `${answer.slice(0, maxLength - 4).trimEnd()}…`;
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
