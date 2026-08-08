/**
 * P1-1: e-Gov 法令API v2 からの法改正「構造データ」自動取込ETL（news-deep-audit 2026-05-28）
 *
 * 取得するのは事実（形式）データのみ:
 *   法令名 / 法令番号 / 改正法令名 / 公布日 / 施行日 / 施行予定日 / 施行状況 / 更新日時 / e-Gov URL
 * 内容の解釈・要約は一切行わない（誤読＝信用毀損の回避。社長確定要件#3）。
 *
 * 設計（月次速報ETLパターン踏襲）:
 * - 形式検証: 法令名＋公布日(YYYY-MM-DD)が取れない法令はスキップし skipped に計上（未確認明記）
 * - 推測値禁止: 欠損は空のまま。日付の創作はしない
 * - fail-closed: 取得成功率が最低基準を下回る試行は非0終了し、既存snapshotを一切変更しない
 * - 時刻分離: lastAttemptAt（開始）と lastSuccessAt（品質基準を満たした完了）を分ける
 * - 原子的更新: 同一ディレクトリの一時ファイルを書き切ってからrenameし、途中書込みを公開しない
 * - 出典明示: 政府標準利用規約2.0（商用可・出典明示）。各レコードに e-Gov URL を付与
 * - APIキー不要（新規env追加なし）
 *
 * 実行: npx tsx scripts/etl/egov-revisions-fetch.ts
 * 出力: web/src/data/law-revisions/egov-revisions.json
 */

import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://laws.e-gov.go.jp/api/2/laws";
const OUT_PATH = join(process.cwd(), "src/data/law-revisions/egov-revisions.json");

/**
 * 20本の中核法令のうち最低80%を有効な構造データとして取得できた場合だけsnapshotを更新する。
 * 一時的な数件の欠落は skipped として可視化しつつ、全面・高率障害による空/大幅欠落を拒否する。
 */
export const MINIMUM_SUCCESS_RATE = 0.8;

// 労働安全衛生の中核法令（law_id は e-Gov で実在性を確認済）。すべて厚生労働省所管。
export const TARGET_LAWS: { lawId: string; lawShort: string }[] = [
  { lawId: "347AC0000000057", lawShort: "安衛法" },
  { lawId: "347CO0000000318", lawShort: "安衛令" },
  { lawId: "347M50002000032", lawShort: "安衛則" },
  { lawId: "322AC0000000049", lawShort: "労基法" },
  { lawId: "322M40000100023", lawShort: "労基則" },
  { lawId: "335AC0000000030", lawShort: "じん肺法" },
  { lawId: "350AC0000000028", lawShort: "作環測法" },
  { lawId: "347M50002000034", lawShort: "クレーン則" },
  { lawId: "347M50002000036", lawShort: "有機則" },
  { lawId: "347M50002000039", lawShort: "特化則" },
  { lawId: "354M50002000018", lawShort: "粉じん則" },
  { lawId: "417M60000100021", lawShort: "石綿則" },
  { lawId: "347M50002000042", lawShort: "酸欠則" },
  { lawId: "347M50002000041", lawShort: "電離則" },
  { lawId: "347M50002000033", lawShort: "ボイラー則" },
  { lawId: "347M50002000037", lawShort: "鉛則" },
  { lawId: "347M50002000040", lawShort: "高圧則" },
  { lawId: "347M50002000035", lawShort: "ゴンドラ則" },
  { lawId: "347M50002000043", lawShort: "事務所則" },
  { lawId: "347M50002000038", lawShort: "四アルキル鉛則" },
];

// P2-1: 法令→影響業種タグ（保守的。一般法令＝全業種のためタグ無し＝UIで「全業種」表示）。
// 業種の関連付けのみで、条文内容の解釈はしない。
const INDUSTRY_TAGS_BY_LAW: Record<string, string[]> = {
  特化則: ["chemical", "manufacturing"],
  有機則: ["chemical", "manufacturing"],
  粉じん則: ["construction", "manufacturing"],
  石綿則: ["construction"],
  鉛則: ["chemical", "manufacturing"],
  四アルキル鉛則: ["chemical"],
  電離則: ["healthcare", "manufacturing"],
  酸欠則: ["construction", "manufacturing"],
  作環測法: ["chemical", "manufacturing"],
  じん肺法: ["construction", "manufacturing"],
  クレーン則: ["construction", "manufacturing"],
  ボイラー則: ["manufacturing"],
  ゴンドラ則: ["construction"],
  高圧則: ["construction"],
  // 安衛法/安衛令/安衛則/労基法/労基則/事務所則 は全業種に関わるためタグ無し（UIで「全業種」）。
};

export type LawRevisionRecord = {
  id: string;
  title: string;
  publishedAt: string;
  revisionNumber: string;
  kind: "law" | "ordinance" | "notice" | "guideline" | "other";
  category: string;
  issuer: string;
  summary: string;
  source: { url: string; label: string };
  official_notice_number: string;
  publication_date: string;
  enforcement_date: string;
  enforcement_status?: "enforced" | "upcoming" | "undetermined";
  source_url: string;
  industry_tags?: string[];
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;
function validYmd(s: unknown): s is string {
  return typeof s === "string" && YMD.test(s);
}

function kindFromLawType(lawType: string): LawRevisionRecord["kind"] {
  if (lawType === "Act") return "law";
  if (lawType === "CabinetOrder" || lawType === "MinisterialOrdinance") return "ordinance";
  return "other";
}
function categoryFromLawType(lawType: string): string {
  if (lawType === "Act") return "法律";
  if (lawType === "CabinetOrder") return "政令";
  if (lawType === "MinisterialOrdinance") return "省令";
  return "その他";
}
function normalizeStatus(raw: unknown): LawRevisionRecord["enforcement_status"] | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "currentenforced") return "enforced";
  if (v === "unenforced") return "upcoming";
  return undefined;
}

export async function fetchLawFromEgov(
  lawId: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API_BASE}?law_id=${encodeURIComponent(lawId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { laws?: Array<Record<string, unknown>> };
  return json.laws?.[0] ?? null;
}

export function buildRecord(
  lawShort: string,
  law: Record<string, unknown>,
): LawRevisionRecord | null {
  const lawInfo = (law.law_info ?? {}) as Record<string, unknown>;
  const rev = (law.revision_info ?? {}) as Record<string, unknown>;
  const lawId = String(lawInfo.law_id ?? "");
  const lawTitle = typeof rev.law_title === "string" ? rev.law_title : "";
  const lawType = typeof rev.law_type === "string" ? rev.law_type : "";
  const promulgate = rev.amendment_promulgate_date;
  // 形式検証: 法令ID・法令名・改正公布日が揃わなければ採用しない（未確認）
  if (!lawId || !lawTitle || !validYmd(promulgate)) return null;

  const enforcement = validYmd(rev.amendment_enforcement_date)
    ? (rev.amendment_enforcement_date as string)
    : validYmd(rev.amendment_scheduled_enforcement_date)
      ? (rev.amendment_scheduled_enforcement_date as string)
      : "";
  const amendmentTitle = typeof rev.amendment_law_title === "string" ? rev.amendment_law_title : "";
  const amendmentNum = typeof rev.amendment_law_num === "string" ? rev.amendment_law_num : "";
  const enfComment = typeof rev.amendment_enforcement_comment === "string" ? rev.amendment_enforcement_comment : "";
  const status = normalizeStatus(rev.current_revision_status);
  const egovUrl = `https://laws.e-gov.go.jp/law/${lawId}`;

  // 事実のみのサマリ（解釈なし・公式誘導付き）
  const enfText = enforcement
    ? `施行${status === "upcoming" ? "予定" : "日"} ${enforcement}`
    : enfComment
      ? `施行時期: ${enfComment}`
      : "施行日未確認";
  const summary =
    `${lawShort}の最新改正（出典: e-Gov法令検索の構造データ）。` +
    (amendmentTitle ? `改正法令「${amendmentTitle}」。` : "") +
    `公布 ${promulgate as string}、${enfText}。改正内容の詳細はe-Govの原文で必ずご確認ください。`;

  return {
    id: `lr-egov-${lawId}-${(enforcement || (promulgate as string)).replace(/-/g, "")}`,
    title: amendmentTitle ? `${lawTitle}（${amendmentTitle}）` : `${lawTitle}（最新改正）`,
    publishedAt: promulgate as string,
    revisionNumber: amendmentNum,
    kind: kindFromLawType(lawType),
    category: categoryFromLawType(lawType),
    issuer: "厚生労働省",
    summary,
    source: { url: egovUrl, label: `e-Gov ${lawTitle}` },
    official_notice_number: "",
    publication_date: promulgate as string,
    enforcement_date: enforcement,
    ...(status ? { enforcement_status: status } : {}),
    source_url: egovUrl,
    ...(INDUSTRY_TAGS_BY_LAW[lawShort] ? { industry_tags: INDUSTRY_TAGS_BY_LAW[lawShort] } : {}),
  };
}

export type EgovRevisionSnapshot = {
  /** 後方互換用。品質基準を満たした取得完了時刻と同じ値。 */
  fetchedAt: string;
  /** このsnapshotを生成した取得試行の開始時刻。拒否された試行はsnapshotへ書かない。 */
  lastAttemptAt: string;
  /** 最低成功率を満たし、全レコードの検証を終えた時刻。 */
  lastSuccessAt: string;
  source: string;
  total: number;
  skipped: number;
  skippedLaws: string[];
  successRate: number;
  minimumSuccessRate: number;
  revisions: LawRevisionRecord[];
};

export type EgovRevisionRunOptions = {
  outputPath?: string;
  targets?: ReadonlyArray<{ lawId: string; lawShort: string }>;
  minimumSuccessRate?: number;
  fetchLaw?: (lawId: string) => Promise<Record<string, unknown> | null>;
  now?: () => Date;
  delayMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
  logger?: Pick<Console, "log" | "error">;
};

export type EgovRevisionRunResult = {
  outputPath: string;
  lastAttemptAt: string;
  lastSuccessAt: string;
  total: number;
  failed: number;
  successRate: number;
};

type FailedLaw = {
  lawId: string;
  lawShort: string;
  reason: "fetch-failed" | "invalid-structure" | "exception";
};

export class EgovRevisionQualityError extends Error {
  readonly code = "EGOV_REVISION_MINIMUM_SUCCESS_RATE";

  constructor(
    readonly lastAttemptAt: string,
    readonly succeeded: number,
    readonly targetCount: number,
    readonly minimumSuccessRate: number,
    readonly failedLaws: ReadonlyArray<FailedLaw>,
  ) {
    const successRate = targetCount === 0 ? 0 : succeeded / targetCount;
    super(
      `e-Gov取得成功率が最低基準未満です (${succeeded}/${targetCount}, ` +
        `${(successRate * 100).toFixed(1)}% < ${(minimumSuccessRate * 100).toFixed(1)}%)`,
    );
    this.name = "EgovRevisionQualityError";
  }
}

/**
 * 出力先と同じディレクトリに排他的な一時ファイルを作成し、書込み完了後にrenameする。
 * 失敗時は一時ファイルだけを除去し、既存snapshotへ触れない。
 */
export function writeUtf8Atomic(outputPath: string, contents: string): void {
  const outputDirectory = dirname(outputPath);
  mkdirSync(outputDirectory, { recursive: true });
  const temporaryPath = join(
    outputDirectory,
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let temporaryExists = false;

  try {
    writeFileSync(temporaryPath, contents, { encoding: "utf-8", flag: "wx" });
    temporaryExists = true;
    renameSync(temporaryPath, outputPath);
    temporaryExists = false;
  } finally {
    if (temporaryExists && existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

function assertMinimumSuccessRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    throw new RangeError("minimumSuccessRate must be greater than 0 and at most 1");
  }
}

export async function runEgovRevisionFetch(
  options: EgovRevisionRunOptions = {},
): Promise<EgovRevisionRunResult> {
  const outputPath = options.outputPath ?? OUT_PATH;
  const targets = options.targets ?? TARGET_LAWS;
  const minimumSuccessRate = options.minimumSuccessRate ?? MINIMUM_SUCCESS_RATE;
  const fetchLaw = options.fetchLaw ?? fetchLawFromEgov;
  const now = options.now ?? (() => new Date());
  const delayMs = options.delayMs ?? 200;
  const wait = options.wait ?? ((milliseconds) => new Promise((done) => setTimeout(done, milliseconds)));
  const logger = options.logger ?? console;
  const lastAttemptAt = now().toISOString();

  assertMinimumSuccessRate(minimumSuccessRate);
  if (targets.length === 0) {
    throw new EgovRevisionQualityError(
      lastAttemptAt,
      0,
      0,
      minimumSuccessRate,
      [],
    );
  }

  const records: LawRevisionRecord[] = [];
  const failedLaws: FailedLaw[] = [];

  for (const [index, { lawId, lawShort }] of targets.entries()) {
    try {
      const law = await fetchLaw(lawId);
      if (!law) {
        failedLaws.push({ lawId, lawShort, reason: "fetch-failed" });
      } else {
        const record = buildRecord(lawShort, law);
        if (record) records.push(record);
        else failedLaws.push({ lawId, lawShort, reason: "invalid-structure" });
      }
    } catch {
      failedLaws.push({ lawId, lawShort, reason: "exception" });
    }

    // 公的APIへの配慮で軽くウェイト（最後の対象の後は待たない）。
    if (delayMs > 0 && index < targets.length - 1) {
      await wait(delayMs);
    }
  }

  const successRate = records.length / targets.length;
  if (records.length === 0 || successRate < minimumSuccessRate) {
    // ここでは出力ディレクトリ作成も書込みも行わない。既存snapshotをバイト単位で保持する。
    throw new EgovRevisionQualityError(
      lastAttemptAt,
      records.length,
      targets.length,
      minimumSuccessRate,
      failedLaws,
    );
  }

  records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const lastSuccessAt = now().toISOString();
  const payload: EgovRevisionSnapshot = {
    fetchedAt: lastSuccessAt,
    lastAttemptAt,
    lastSuccessAt,
    source: "e-Gov 法令API v2（政府標準利用規約2.0・出典明示）",
    total: records.length,
    skipped: failedLaws.length,
    skippedLaws: failedLaws.map(({ lawShort }) => lawShort),
    successRate: Number(successRate.toFixed(4)),
    minimumSuccessRate,
    revisions: records,
  };
  writeUtf8Atomic(outputPath, JSON.stringify(payload, null, 2) + "\n");
  logger.log(
    `[egov-revisions] wrote ${records.length} revisions ` +
      `(skipped ${failedLaws.length}${failedLaws.length ? ": " + failedLaws.map(({ lawShort }) => lawShort).join(",") : ""}, ` +
      `successRate=${(successRate * 100).toFixed(1)}%, lastSuccessAt=${lastSuccessAt})`,
  );

  return {
    outputPath,
    lastAttemptAt,
    lastSuccessAt,
    total: records.length,
    failed: failedLaws.length,
    successRate,
  };
}

export async function runCli(
  options: EgovRevisionRunOptions = {},
): Promise<number> {
  const logger = options.logger ?? console;
  try {
    await runEgovRevisionFetch({ ...options, logger });
    return 0;
  } catch (error) {
    if (error instanceof EgovRevisionQualityError) {
      const failures = error.failedLaws
        .map(({ lawShort, reason }) => `${lawShort}:${reason}`)
        .join(",");
      logger.error(
        `[egov-revisions] rejected attempt ` +
          `(lastAttemptAt=${error.lastAttemptAt}, succeeded=${error.succeeded}/${error.targetCount}, ` +
          `minimum=${(error.minimumSuccessRate * 100).toFixed(1)}%, failed=${failures || "none"}); ` +
          "existing snapshot preserved",
      );
    } else {
      logger.error(
        `[egov-revisions] fatal: ${error instanceof Error ? error.message : "unknown error"}; ` +
          "existing snapshot preserved",
      );
    }
    return 1;
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  void runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
