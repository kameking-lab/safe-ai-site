/**
 * 安全工程打合せ書の「いまの状態」判定（柱0・ビジュアルファースト）。
 *
 * /safety-diary 最上部の結論カード用に、記入の進み具合から
 * 「3秒で分かる1メッセージ」（トーン・短ラベル・デカ数字・次にやること）を返す純粋関数。
 * KY用紙の computeKyPaperStatus（paper-status.ts）と同じ文法で揃える。
 * 色の文法は safety-tone.ts に従う:
 *   青 = 案内・進行中（記入のこり／記入は済んだが未保存）
 *   緑 = 完了して保存一覧に保存済み（毎日書く職長が「今日の分はもう保存した」と一目で分かる）
 *
 * 承認・印刷は document-state.ts で本文revisionに結び付けて扱う。この関数は混同を避けるため、
 * 「記入の充足」と「保存一覧に保存済みか」の2軸だけを返す。
 * saved 判定は呼び出し側がセッション内で厳密に行う（store の savedAt は自動保存・翌日複製でも
 * 更新されるため保存済みの根拠に使えない）。
 */
import type {
  MeetingContractorRow,
  MeetingRecord,
} from "@/lib/meeting/schema";
import type { SafetyTone } from "@/lib/design/safety-tone";
import { validateMeetingForApproval } from "@/lib/meeting/readiness";

export type MeetingPaperMissingKey =
  | "site"
  | "company"
  | "disaster"
  | "instruction"
  | "conditions";
export type MeetingContractorRequiredKey =
  | "companyName"
  | "workContent"
  | "predictedDisasters"
  | "safetyInstructions";

export type MeetingContractorRowStatus = {
  rowId: string;
  rowNumber: number;
  active: boolean;
  complete: boolean;
  missing: MeetingContractorRequiredKey[];
};

export type MeetingPaperMissingItem = {
  key: MeetingPaperMissingKey;
  /** 漢字短ラベル（チップ表示用） */
  label: string;
  /** 用紙内の該当セクションへのアンカー */
  anchor: string;
};

export type MeetingPaperStatus = {
  kind: "incomplete" | "complete" | "saved";
  tone: SafetyTone;
  /** 体言止めの短ラベル */
  title: string;
  /** デカ数字（記入のこり項目数）。incomplete のときだけ */
  remaining?: number;
  /** 未記入の項目（incomplete のとき。先頭が「次にやること」） */
  missing: MeetingPaperMissingItem[];
  /** 各社行ごとの充足状態。色ではなく missing の項目名でも判別できる。 */
  rows: MeetingContractorRowStatus[];
  /** active 行のうち、必須セルが1つ以上欠ける行数。 */
  incompleteRowCount: number;
  /** active 行で欠けている必須セル数。active 行がない場合は4。 */
  remainingCells: number;
  /** 次にやること（結論カードの action） */
  action: { href: string; label: string };
};

const ESSENTIALS: readonly MeetingPaperMissingItem[] = [
  { key: "site", label: "作業所名", anchor: "#mtg-header" },
  { key: "company", label: "協力会社・作業", anchor: "#mtg-companies" },
  { key: "disaster", label: "予想災害", anchor: "#mtg-companies" },
  { key: "instruction", label: "指示事項", anchor: "#mtg-companies" },
];

function hasText(value: string): boolean {
  return value.trim() !== "";
}

/**
 * 入力途中の行だけを active とみなす。既定の空行や誤って追加した完全な空行は、
 * 別の完成行を不完全にしない。会社名以外から入力を始めた行も取りこぼさない。
 */
export function isActiveMeetingContractorRow(row: MeetingContractorRow): boolean {
  return (
    hasText(row.companyName) ||
    hasText(row.workContent) ||
    hasText(row.machines) ||
    row.qualifications.some(hasText) ||
    hasText(row.plannedCount) ||
    row.predictedDisasters.some(hasText) ||
    hasText(row.safetyInstructions) ||
    hasText(row.responsibleName) ||
    hasText(row.actualCount) ||
    hasText(row.appendNote)
  );
}

export function evaluateMeetingContractorRows(
  contractors: readonly MeetingContractorRow[],
): MeetingContractorRowStatus[] {
  return contractors.map((row, index) => {
    const active = isActiveMeetingContractorRow(row);
    const missing: MeetingContractorRequiredKey[] = active
      ? [
          ...(!hasText(row.companyName)
            ? (["companyName"] as const)
            : []),
          ...(!hasText(row.workContent)
            ? (["workContent"] as const)
            : []),
          ...(row.predictedDisasters.some(hasText)
            ? []
            : (["predictedDisasters"] as const)),
          ...(!hasText(row.safetyInstructions)
            ? (["safetyInstructions"] as const)
            : []),
        ]
      : [];
    return {
      rowId: row.id,
      rowNumber: index + 1,
      active,
      complete: active && missing.length === 0,
      missing,
    };
  });
}

function isFilled(
  record: MeetingRecord,
  rows: readonly MeetingContractorRowStatus[],
  key: MeetingPaperMissingKey,
): boolean {
  const activeRows = rows.filter((row) => row.active);
  switch (key) {
    case "site":
      return record.siteName.trim() !== "";
    case "company":
      // 1社以上がactiveで、activeな全行に会社名と作業内容がある。
      return (
        activeRows.length > 0 &&
        activeRows.every(
          (row) =>
            !row.missing.includes("companyName") &&
            !row.missing.includes("workContent"),
        )
      );
    case "disaster":
      return (
        activeRows.length > 0 &&
        activeRows.every(
          (row) => !row.missing.includes("predictedDisasters"),
        )
      );
    case "instruction":
      return (
        activeRows.length > 0 &&
        activeRows.every(
          (row) => !row.missing.includes("safetyInstructions"),
        )
      );
  }
  return false;
}

/**
 * 打合せ書の現在状態を結論カード1メッセージに要約する。
 * @param opts.saved いま画面の内容が保存一覧に保存済みか（呼び出し側がセッション内で厳密判定）。
 */
export function computeMeetingPaperStatus(
  record: MeetingRecord,
  opts?: { saved?: boolean }
): MeetingPaperStatus {
  const rows = evaluateMeetingContractorRows(record.contractors);
  const activeRows = rows.filter((row) => row.active);
  const incompleteRowCount = activeRows.filter((row) => !row.complete).length;
  const remainingCells =
    activeRows.length === 0
      ? 4
      : activeRows.reduce((count, row) => count + row.missing.length, 0);
  const missing: MeetingPaperMissingItem[] = ESSENTIALS.filter(
    (item) => !isFilled(record, rows, item.key),
  );
  const additionalReadinessIssues = validateMeetingForApproval(record).filter(
    (issue) =>
      issue.code !== "site" &&
      issue.code !== "contractor" &&
      issue.code !== "hazard-control",
  );
  if (additionalReadinessIssues.length > 0) {
    missing.push({
      key: "conditions",
      label: "未確認条件",
      anchor: "#mtg-coordination",
    });
  }
  if (missing.length > 0) {
    const next = missing[0];
    return {
      kind: "incomplete",
      tone: "info",
      title: "記入のこり",
      remaining: missing.length,
      missing,
      rows,
      incompleteRowCount,
      remainingCells,
      action: { href: next.anchor, label: `${next.label}を記入` },
    };
  }
  // 必須4項目が揃った後は「保存一覧に保存済みか」で結論を分ける。
  // 緑=保存済み（もう安心） / 青=記入は済んだがまだ未保存（次は保存）。
  if (opts?.saved) {
    return {
      kind: "saved",
      tone: "safe",
      title: "保存済み",
      missing: [],
      rows,
      incompleteRowCount,
      remainingCells,
      action: { href: "/safety-diary/list", label: "保存一覧で確認" },
    };
  }
  return {
    kind: "complete",
    tone: "info",
    title: "記入完了・未保存",
    missing: [],
    rows,
    incompleteRowCount,
    remainingCells,
    action: { href: "#mtg-actions", label: "保存する" },
  };
}
