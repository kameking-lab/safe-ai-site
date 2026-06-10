/**
 * KY転記支援（柱1是正）: 記入済みKYを元請指定のExcel様式・帳票へ「貼り付け」で移すための出力。
 * 現状は印刷のみでデータの持ち出し手段が無く「結局手で転記し直す＝紙の方が速い」の正体の一部だった。
 * - 項目別コピー: 元請様式のセル配置は会社ごとに違うため、項目単位でクリップボードへ。
 * - 危険と対策の表TSV: Excelの表へ複数セル一括貼り付け（見出しなし＝相手様式を汚さない）。
 * - 全体CSV: Excelでそのまま開ける控え・集計用。
 * すべて純関数。印刷・保存・承認フローには触れない。
 */
import type { KyInstructionRecordState, KyInstructionRiskRow } from "@/lib/types/operations";
import { evalScore, riskGrade } from "@/lib/ky/pulldown-options";

export type KyTranscribeField = {
  key: string;
  label: string;
  value: string;
};

/** 古い保存レコードは行内フィールドが欠けていることがあるため、常に文字列に落とす。 */
function s(v: string | undefined | null): string {
  return (v ?? "").trim();
}

function formatWorkDate(record: KyInstructionRecordState): string {
  const y = s(record.workDateYear);
  const m = s(record.workDateMonth);
  const d = s(record.workDateDay);
  if (!y && !m && !d) return "";
  return `${y || "　"}年${m || "　"}月${d || "　"}日`;
}

function formatWeather(record: KyInstructionRecordState): string {
  const temp = s(record.temperature) ? `${s(record.temperature)}℃` : "";
  return [s(record.weather), temp].filter(Boolean).join(" ");
}

function workDetails(record: KyInstructionRecordState): string {
  return record.workRows
    .map((r) => s(r.workDetail))
    .filter(Boolean)
    .join("\n");
}

/** 記入のある危険行のみ（印刷シートと同じ判定）。 */
function filledRisks(record: KyInstructionRecordState): KyInstructionRiskRow[] {
  return record.riskRows.filter((r) => s(r.hazard) || s(r.reduction));
}

function riskNo(r: KyInstructionRiskRow, i: number): string {
  return s(r.targetLabel) || String(i + 1);
}

function numberedLines(record: KyInstructionRecordState, pick: (r: KyInstructionRiskRow) => string): string {
  const risks = filledRisks(record);
  const lines = risks
    .map((r, i) => ({ no: riskNo(r, i), text: s(pick(r)) }))
    .filter((l) => l.text);
  // 1件だけなら番号を付けない（相手様式のセルにそのまま入れられる）
  if (lines.length <= 1) return lines[0]?.text ?? "";
  return lines.map((l) => `${l.no} ${l.text}`).join("\n");
}

function participantsLine(record: KyInstructionRecordState): string {
  return record.participants
    .filter((p) => s(p.name))
    .map((p) => s(p.name) + (s(p.qualNo) ? `（${s(p.qualNo)}）` : ""))
    .join("、");
}

/**
 * 項目別コピー用の一覧。ラベルは印刷シート（全建協様式寄せ）と同一表記。
 * 未記入項目も value="" で返す（UI側で「未記入」表示・コピー不可にする）。
 */
export function buildTranscribeFields(record: KyInstructionRecordState): KyTranscribeField[] {
  return [
    { key: "workDate", label: "作業日", value: formatWorkDate(record) },
    { key: "siteName", label: "現場名", value: s(record.siteName) },
    { key: "projectName", label: "工事名・工区", value: s(record.projectName) },
    { key: "foremanName", label: "職長（リーダー）", value: s(record.foremanName) },
    { key: "primeName", label: "元請会社", value: s(record.coop1Name) },
    { key: "weather", label: "天気・気温", value: formatWeather(record) },
    { key: "workDetail", label: "本日の作業内容", value: workDetails(record) },
    { key: "hazards", label: "危険のポイント（1R）", value: numberedLines(record, (r) => r.hazard) },
    { key: "reductions", label: "対策（3R）", value: numberedLines(record, (r) => r.reduction) },
    { key: "teamGoal", label: "チーム行動目標", value: s(record.teamGoal) },
    { key: "priorityItems", label: "重点実施項目", value: s(record.priorityItems) },
    { key: "pointingCall", label: "指差呼称（ヨシ！）", value: s(record.pointingCall) },
    { key: "participants", label: "参加者", value: participantsLine(record) },
  ];
}

/** TSVのセル値。タブ・改行は相手の表の行/列を壊すため「 / 」に畳む。 */
function tsvCell(v: string | number): string {
  return String(v).replace(/\t/g, " ").replace(/\r?\n/g, " / ");
}

/**
 * 評価値セル。riskGrade のフルラベル（例「大（すぐ対策）」）をそのまま使うと
 * 「9（大（すぐ対策））」と入れ子括弧になり、元請様式に貼った後で削る手間が出る。
 * 転記用は「9（大）」まで縮める。
 */
function scoreCell(likelihood: number, severity: number): string {
  const score = evalScore(likelihood, severity);
  const short = riskGrade(score).label.split("（")[0];
  return `${score}（${short}）`;
}

/**
 * 危険と対策の表をタブ区切りで（Excelへ複数セル一括貼り付け用）。
 * 列: No, 危険のポイント, 可能性, 重大性, 評価値, 対策。
 * 見出し行は付けない＝元請様式の既存見出しの下にそのまま貼れる。
 */
export function riskRowsToTsv(record: KyInstructionRecordState): string {
  return filledRisks(record)
    .map((r, i) =>
      [riskNo(r, i), s(r.hazard), r.likelihood, r.severity, scoreCell(r.likelihood, r.severity), s(r.reduction)]
        .map(tsvCell)
        .join("\t"),
    )
    .join("\r\n");
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const RISK_CSV_HEADER = ["No", "危険のポイント（1R）", "可能性", "重大性", "評価値", "対策（3R）"];

/**
 * KY1件の全体CSV（Excelでそのまま開ける控え・集計用）。
 * 前半=「項目,値」の縦持ち、空行を挟んで後半=危険と対策の表。
 */
export function kyRecordToCsv(record: KyInstructionRecordState): string {
  const fields = buildTranscribeFields(record).filter((f) => f.key !== "hazards" && f.key !== "reductions");
  const head = [["項目", "値"].join(","), ...fields.map((f) => [f.label, f.value].map(csvCell).join(","))];
  const riskRows = filledRisks(record).map((r, i) =>
    [riskNo(r, i), s(r.hazard), r.likelihood, r.severity, scoreCell(r.likelihood, r.severity), s(r.reduction)]
      .map(csvCell)
      .join(","),
  );
  return [...head, "", RISK_CSV_HEADER.join(","), ...riskRows].join("\r\n");
}

/** CSVファイル名。作業日が入っていれば ky-YYYY-MM-DD.csv、無ければ ky-record.csv。 */
export function kyCsvFileName(record: KyInstructionRecordState): string {
  const y = s(record.workDateYear);
  const m = s(record.workDateMonth);
  const d = s(record.workDateDay);
  if (y && m && d) return `ky-${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}.csv`;
  return "ky-record.csv";
}
