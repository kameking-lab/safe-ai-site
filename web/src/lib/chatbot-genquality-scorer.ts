/**
 * チャットボット生成品質の機械採点器（診断04 §2.1 の ○/△/× 判定の機械化）。
 *
 * 入力は /api/chatbot の最終レスポンス（answer＋構造化出典＋scopeWarnings）。
 * 検索evalと異なり「最終回答が結論として正しいか」を測るため、
 * (1) 結論キーフレーズ（mustInclude: AND of OR）
 * (2) 誤結論パターン（mustExclude: 1つでも該当で誤答）
 * (3) 根拠条文（gold条文のいずれかを引用しているか）
 * (4) 高リスク主張の一次資料・引用箇所・支持関係
 * (5) 範囲外対応（範囲外質問への誠実なno-hit／範囲内正答への偽の範囲外警告）
 * (6) 書式事故（プロンプトのプレースホルダ漏出）
 * の6チェックを行い、verdict（correct=○ / partial=△ / incorrect=×）へ写像する。
 *
 * 純関数のみ（fetchなし・fsなし）: CIのユニットテストからも、実機プローブ
 * （chatbot-genquality-live.test.ts）からも同一ロジックで採点するための分離。
 */

import { isLawShortEquivalent } from "@/lib/rag/synonyms";
import { getLawMetadata } from "@/data/laws";
import type {
  ClaimSourceRequirement,
  GenQualityCase,
  GoldCitation,
} from "@/lib/chatbot-genquality.fixture";
import {
  GEN_QUALITY_SOURCE_RECORDS,
  findGenQualitySourceRecord,
  type GenQualitySourceRecord,
} from "@/lib/chatbot-genquality-source-records";

export type GenQualityEvidenceCitation = {
  sourceId?: string;
  documentNumber?: string;
  url?: string;
  locator?: string;
  excerpt?: string;
  sourceClass?: "primary" | "secondary";
};

/** /api/chatbot レスポンスのうち採点に使う構造的サブセット */
export type GenQualityResponse = {
  answer: string;
  confidence?: string;
  confidenceScore?: number;
  source_type?: string;
  sources?: Array<{
    law?: string;
    article?: string;
    text?: string;
    snippet?: string;
    fullText?: string;
    url?: string;
    verificationStatus?: string;
    sourceKind?: string;
    sourceFetchedAt?: string;
    humanReviewStatus?: string;
  }>;
  citations?: Array<{ lawShort?: string; articleNum?: string }>;
  attachedNotices?: Array<{
    id?: string;
    title?: string;
    noticeNumber?: string | null;
    detailUrl?: string;
    source?: string;
  }>;
  /**
   * Claim-level evidence used by deterministic/offline evaluation.
   * Identity and quoted text are still checked against the independent record;
   * response-provided status is never trusted.
   */
  evidenceCitations?: GenQualityEvidenceCitation[];
  scopeWarnings?: string[];
};

export type CheckStatus = "pass" | "partial" | "fail" | "n/a";

export type GenQualityVerdict = "correct" | "partial" | "incorrect";

/** 診断04 §3 の失敗パターン分類に対応するラベル */
export type FailureKind =
  | "conclusion-missing" // 結論キーフレーズ欠落（§3(i)(iv): 引けない・答えない）
  | "conclusion-wrong" // 誤結論パターン検出（§3(ii): 根拠・結論の誤り）
  | "citation-missing" // gold条文の引用なし（§3(ii)(iii)）
  | "unsupported-claim" // 主張に対応する一次資料・引用箇所がない
  | "indirect-source" // 一次資料を要求する主張に二次掲載だけを引用
  | "superseded-source" // 失効・後継ありの資料を現行根拠として引用
  | "source-gap" // URLのみで、一次本文・locator・hashを独立確認できない
  | "false-scope-warning" // 正答への偽の範囲外警告（§3(v)）
  | "out-of-scope-mishandled" // 範囲外質問への不適切対応（§3(iv)）
  | "placeholder-leak"; // プレースホルダ漏出（§3(ii) 書式事故）

export type GenQualityScore = {
  id: string;
  verdict: GenQualityVerdict;
  checks: {
    conclusion: CheckStatus;
    forbidden: CheckStatus;
    citation: CheckStatus;
    support: CheckStatus;
    scope: CheckStatus;
    placeholder: CheckStatus;
  };
  failureKinds: FailureKind[];
  /** 人間可読の失敗理由（docs/レポート用） */
  failures: string[];
};

const PLACEHOLDER_LEAK_RE = /YYYY|第XX条/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 「第44条」が「第44条の2」「第440条」を誤マッチしないための条番号regex */
function articleNumPattern(articleNum: string): RegExp {
  return new RegExp(`${escapeRegExp(articleNum)}(?![の0-9０-９])`);
}

/** gold条文の法令名バリアント（略称＋正式名） */
function lawNameVariants(lawShort: string): string[] {
  const meta = getLawMetadata(lawShort);
  const names = [lawShort];
  if (meta?.fullName && meta.fullName !== lawShort) names.push(meta.fullName);
  return names;
}

/** 回答（構造化出典・sources・本文テキスト）がgold条文を引用しているか */
export function citesGoldArticle(resp: GenQualityResponse, gold: GoldCitation): boolean {
  const artRe = articleNumPattern(gold.articleNum);

  // 1) 構造化出典（最も信頼できる判定源）
  for (const c of resp.citations ?? []) {
    if (!c.lawShort || !c.articleNum) continue;
    if (!artRe.test(c.articleNum)) continue;
    if (c.lawShort === gold.lawShort || isLawShortEquivalent(c.lawShort, gold.lawShort)) {
      return true;
    }
  }

  // 2) sources（law: "労働安全衛生規則（安衛則）" / article: "第44条「定期健康診断」"）
  const names = lawNameVariants(gold.lawShort);
  for (const s of resp.sources ?? []) {
    if (!s.law || !s.article) continue;
    if (!artRe.test(s.article)) continue;
    if (names.some((n) => s.law!.includes(n))) return true;
  }

  // 3) 本文テキスト（「安衛則第44条」「労働安全衛生規則 第44条」の隣接表記）
  for (const n of names) {
    const adjacent = new RegExp(
      `${escapeRegExp(n)}[\\s（(]{0,12}[^。]{0,10}?${escapeRegExp(gold.articleNum)}(?![の0-9０-９])`
    );
    if (adjacent.test(resp.answer)) return true;
  }
  return false;
}

/** 範囲内質問の正答に付いた「偽の範囲外警告」（診断04 §3(v)）を検出 */
export function hasFalseScopeWarning(tc: GenQualityCase, resp: GenQualityResponse): boolean {
  if (tc.expectOutOfScope) return false;
  const goldNames = tc.goldCitations.flatMap((g) => lawNameVariants(g.lawShort));
  const candidates = [
    ...(resp.scopeWarnings ?? []),
    // 回答末尾に追記される「⚠️ 注記：…範囲外…」も対象
    ...resp.answer.split("\n").filter((line) => line.includes("範囲外")),
  ];
  return candidates.some(
    (w) => w.includes("範囲外") && goldNames.some((n) => w.includes(n))
  );
}

/** 範囲外質問への対応が誠実か（条文の断定引用なし・確信度が高くない） */
function outOfScopeHandled(resp: GenQualityResponse): boolean {
  const hasCitations = (resp.citations ?? []).length > 0;
  const confidentTone = resp.confidence === "high";
  return !hasCitations && !confidentTone;
}

function normalizeEvidenceText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "");
}

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function collectEvidenceCitations(
  resp: GenQualityResponse,
): GenQualityEvidenceCitation[] {
  const fromSources: GenQualityEvidenceCitation[] = (resp.sources ?? []).map(
    (source) => ({
      url: source.url,
      locator: source.article,
      excerpt: source.fullText ?? source.text ?? source.snippet,
      sourceClass: "primary",
    }),
  );
  const fromNotices: GenQualityEvidenceCitation[] = (
    resp.attachedNotices ?? []
  ).map((notice) => ({
    sourceId: notice.id,
    documentNumber: notice.noticeNumber ?? undefined,
    url: notice.detailUrl,
    sourceClass: "secondary",
  }));
  return [...(resp.evidenceCitations ?? []), ...fromSources, ...fromNotices];
}

function hasLawReference(
  resp: GenQualityResponse,
  record: GenQualitySourceRecord,
): boolean {
  return record.lawRef
    ? citesGoldArticle(resp, {
        lawShort: record.lawRef.lawShort,
        articleNum: record.lawRef.articleNum,
      })
    : false;
}

function identityMatches(
  citation: GenQualityEvidenceCitation,
  record: GenQualitySourceRecord,
): boolean {
  return (
    citation.sourceId === record.id ||
    (citation.documentNumber !== undefined &&
      citation.documentNumber === record.documentNumber) ||
    (normalizeUrl(citation.url) !== null &&
      normalizeUrl(citation.url) === normalizeUrl(record.url))
  );
}

type ClaimSupportEvaluation = {
  status: CheckStatus;
  failureKinds: Array<
    Extract<
      FailureKind,
      | "unsupported-claim"
      | "indirect-source"
      | "superseded-source"
      | "source-gap"
    >
  >;
  failures: string[];
};

/**
 * Claim-to-source support is intentionally separate from the legacy
 * gold-article mention check. A document name alone does not pass: the source
 * record must be an independently stored current primary record, and the
 * response must expose its official URL, locator and supporting excerpt.
 */
export function evaluateClaimSourceSupport(
  requirements: readonly ClaimSourceRequirement[] | undefined,
  resp: GenQualityResponse,
  sourceRecords: readonly GenQualitySourceRecord[] = GEN_QUALITY_SOURCE_RECORDS,
): ClaimSupportEvaluation {
  if (!requirements || requirements.length === 0) {
    return { status: "n/a", failureKinds: [], failures: [] };
  }

  const citations = collectEvidenceCitations(resp);
  const failureKinds: ClaimSupportEvaluation["failureKinds"] = [];
  const failures: string[] = [];

  const addFailure = (
    kind: ClaimSupportEvaluation["failureKinds"][number],
    message: string,
  ) => {
    if (!failureKinds.includes(kind)) failureKinds.push(kind);
    failures.push(message);
  };

  for (const requirement of requirements) {
    const record = findGenQualitySourceRecord(
      requirement.sourceId,
      sourceRecords,
    );
    if (!record) {
      addFailure(
        "source-gap",
        `${requirement.label}: 独立一次資料recordがありません（${requirement.sourceId}）`,
      );
      continue;
    }
    if (record.status === "superseded" || record.successorSourceId) {
      addFailure(
        "superseded-source",
        `${requirement.label}: 失効・後継資料ありのsourceを現行根拠にできません（${record.documentNumber}）`,
      );
      continue;
    }
    if (record.sourceClass !== "primary") {
      addFailure(
        "indirect-source",
        `${requirement.label}: 一次資料ではなく二次掲載recordです（${record.documentNumber}）`,
      );
      continue;
    }
    if (
      record.status === "source-gap" ||
      record.status === "url-confirmed-content-review-pending" ||
      record.status === "quarantined" ||
      !record.locator ||
      !record.excerpt ||
      !record.hash
    ) {
      addFailure(
        "source-gap",
        `${requirement.label}: URL・文書番号は確認済みですが、一次本文・引用箇所・hashの独立確認が未完了です（${record.documentNumber}）`,
      );
      continue;
    }

    const recordText = normalizeEvidenceText(record.excerpt);
    const missingFromRecord = requirement.sourceMustContain.filter(
      (fragment) =>
        !recordText.includes(normalizeEvidenceText(fragment)),
    );
    if (missingFromRecord.length > 0) {
      addFailure(
        "unsupported-claim",
        `${requirement.label}: 独立一次資料recordが必須事実を支持しません [${missingFromRecord.join("・")}]`,
      );
      continue;
    }

    const matching = citations.filter((citation) =>
      identityMatches(citation, record),
    );
    if (matching.length === 0) {
      const indirect = citations.some(
        (citation) =>
          citation.documentNumber === record.documentNumber &&
          normalizeUrl(citation.url) !== normalizeUrl(record.url),
      );
      if (indirect) {
        addFailure(
          "indirect-source",
          `${requirement.label}: 文書番号は一致しますが公式一次URLではありません（${record.documentNumber}）`,
        );
      } else {
        addFailure(
          "unsupported-claim",
          `${requirement.label}: 主張に対応する一次資料引用がありません（${record.documentNumber}）`,
        );
      }
      continue;
    }

    const officialMatching = matching.filter(
      (citation) =>
        normalizeUrl(citation.url) === normalizeUrl(record.url) &&
        citation.sourceClass !== "secondary",
    );
    if (officialMatching.length === 0) {
      addFailure(
        "indirect-source",
        `${requirement.label}: 文書番号・IDは一致しますが公式一次URLの引用ではありません（${record.documentNumber}）`,
      );
      continue;
    }

    const supported = officialMatching.some((citation) => {
      if (!citation.locator || !citation.excerpt) return false;
      if (
        !normalizeEvidenceText(citation.locator).includes(
          normalizeEvidenceText(record.locator!),
        )
      ) {
        return false;
      }
      const citedText = normalizeEvidenceText(citation.excerpt);
      if (!recordText.includes(citedText) && !citedText.includes(recordText)) {
        return false;
      }
      return requirement.sourceMustContain.every((fragment) =>
        citedText.includes(normalizeEvidenceText(fragment)),
      );
    });

    if (!supported) {
      addFailure(
        "unsupported-claim",
        `${requirement.label}: 公式URLは一致しますが、引用箇所・引用文が主張を支持しません（${record.documentNumber} ${record.locator}）`,
      );
    }

    // A bare law/article mention never upgrades an incomplete evidence card,
    // but retaining this check makes the separation explicit in diagnostics.
    if (record.lawRef && !hasLawReference(resp, record)) {
      addFailure(
        "unsupported-claim",
        `${requirement.label}: 構造化された法令・条番号の引用がありません（${record.lawRef.lawShort}${record.lawRef.articleNum}）`,
      );
    }
  }

  return {
    status: failures.length === 0 ? "pass" : "fail",
    failureKinds,
    failures,
  };
}

export function scoreGenQuality(
  tc: GenQualityCase,
  resp: GenQualityResponse,
  sourceRecords: readonly GenQualitySourceRecord[] = GEN_QUALITY_SOURCE_RECORDS,
): GenQualityScore {
  const failures: string[] = [];
  const failureKinds: FailureKind[] = [];

  // (1) 結論キーフレーズ（AND of OR）
  let conclusion: CheckStatus = "n/a";
  if (tc.mustInclude.length > 0) {
    const satisfied = tc.mustInclude.filter((group) =>
      group.some((phrase) => resp.answer.includes(phrase))
    ).length;
    conclusion =
      satisfied === tc.mustInclude.length ? "pass" : satisfied === 0 ? "fail" : "partial";
    if (conclusion !== "pass") {
      const missing = tc.mustInclude
        .filter((group) => !group.some((p) => resp.answer.includes(p)))
        .map((g) => g[0]);
      failures.push(`結論キーフレーズ欠落: ${missing.join("・")}`);
      failureKinds.push("conclusion-missing");
    }
  }

  // (2) 誤結論パターン
  let forbidden: CheckStatus = "n/a";
  if (tc.mustExclude && tc.mustExclude.length > 0) {
    const hit = tc.mustExclude.find((src) => new RegExp(src).test(resp.answer));
    forbidden = hit ? "fail" : "pass";
    if (hit) {
      failures.push(`誤結論パターン検出: /${hit}/`);
      failureKinds.push("conclusion-wrong");
    }
  }

  // (3) 根拠条文
  let citation: CheckStatus = "n/a";
  if (tc.goldCitations.length > 0) {
    citation = tc.goldCitations.some((g) => citesGoldArticle(resp, g)) ? "pass" : "fail";
    if (citation === "fail") {
      failures.push(
        `gold条文の引用なし（期待: ${tc.goldCitations
          .map((g) => `${g.lawShort}${g.articleNum}`)
          .join(" / ")}）`
      );
      failureKinds.push("citation-missing");
    }
  }

  // (4) 主張ごとの一次資料・引用箇所・支持関係
  const supportEvaluation = evaluateClaimSourceSupport(
    tc.sourceRequirements,
    resp,
    sourceRecords,
  );
  const support = supportEvaluation.status;
  failures.push(...supportEvaluation.failures);
  for (const kind of supportEvaluation.failureKinds) {
    if (!failureKinds.includes(kind)) failureKinds.push(kind);
  }

  // (5) 範囲外対応
  let scope: CheckStatus;
  if (tc.expectOutOfScope) {
    scope = outOfScopeHandled(resp) ? "pass" : "fail";
    if (scope === "fail") {
      failures.push("範囲外質問に条文引用つき/高確信で回答（誠実なno-hit対応でない）");
      failureKinds.push("out-of-scope-mishandled");
    }
  } else {
    scope = hasFalseScopeWarning(tc, resp) ? "fail" : "pass";
    if (scope === "fail") {
      failures.push("正答対象の法令に偽の「提供データ範囲外」警告（信頼毀損）");
      failureKinds.push("false-scope-warning");
    }
  }

  // (6) プレースホルダ漏出
  const placeholder: CheckStatus = PLACEHOLDER_LEAK_RE.test(resp.answer) ? "fail" : "pass";
  if (placeholder === "fail") {
    failures.push("SYSTEM_PROMPTプレースホルダ（YYYY/第XX条等）の漏出");
    failureKinds.push("placeholder-leak");
  }

  // verdict への写像（診断04の ○/△/× と同型）
  let verdict: GenQualityVerdict;
  const unsafeSourceFailure = failureKinds.some((kind) =>
    (
      [
        "unsupported-claim",
        "indirect-source",
        "superseded-source",
      ] as FailureKind[]
    ).includes(kind),
  );
  if (
    forbidden === "fail" ||
    (tc.expectOutOfScope && scope === "fail") ||
    unsafeSourceFailure
  ) {
    verdict = "incorrect"; // 明確な誤結論・範囲外への誤対応 = ×
  } else if (!tc.expectOutOfScope && conclusion === "fail") {
    verdict = "incorrect"; // 答えるべき結論に全く到達していない = ×（Q6/Q12型）
  } else if (
    conclusion === "partial" ||
    citation === "fail" ||
    support === "fail" ||
    scope === "fail" ||
    placeholder === "fail"
  ) {
    verdict = "partial"; // 根拠は正しいが結論不完全・信頼毀損・書式事故 = △
  } else {
    verdict = "correct";
  }

  return {
    id: tc.id,
    verdict,
    checks: { conclusion, forbidden, citation, support, scope, placeholder },
    failureKinds,
    failures,
  };
}

export type GenQualitySummary = {
  total: number;
  scorable: number;
  correct: number;
  partial: number;
  incorrect: number;
  /** 完全正答率（correct / scorable）= 診断04の「完全正答12/20=60%」に対応 */
  strictAccuracy: number;
  /** 概ね有用率（correct+partial / scorable）= 診断04の「85%」に対応 */
  usefulRate: number;
  outOfScope: { total: number; handled: number };
  failureKindCounts: Record<FailureKind, number>;
};

export function summarizeScores(
  cases: GenQualityCase[],
  scores: GenQualityScore[]
): GenQualitySummary {
  const byId = new Map(scores.map((s) => [s.id, s]));
  const scorable = cases.filter((c) => !c.expectOutOfScope);
  const oos = cases.filter((c) => c.expectOutOfScope);

  const verdictOf = (c: GenQualityCase) => byId.get(c.id)?.verdict;
  const correct = scorable.filter((c) => verdictOf(c) === "correct").length;
  const partial = scorable.filter((c) => verdictOf(c) === "partial").length;
  const incorrect = scorable.filter((c) => verdictOf(c) === "incorrect").length;
  const handled = oos.filter((c) => verdictOf(c) === "correct").length;

  const failureKindCounts = {
    "conclusion-missing": 0,
    "conclusion-wrong": 0,
    "citation-missing": 0,
    "unsupported-claim": 0,
    "indirect-source": 0,
    "superseded-source": 0,
    "source-gap": 0,
    "false-scope-warning": 0,
    "out-of-scope-mishandled": 0,
    "placeholder-leak": 0,
  } as Record<FailureKind, number>;
  for (const s of scores) {
    for (const k of s.failureKinds) failureKindCounts[k] += 1;
  }

  return {
    total: cases.length,
    scorable: scorable.length,
    correct,
    partial,
    incorrect,
    strictAccuracy: scorable.length === 0 ? 0 : correct / scorable.length,
    usefulRate: scorable.length === 0 ? 0 : (correct + partial) / scorable.length,
    outOfScope: { total: oos.length, handled },
    failureKindCounts,
  };
}
