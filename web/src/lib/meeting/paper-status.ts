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
 * 注: 打合せ書には承認フローが無い（協力会社の分散入力→元請集約はあるが提出/承認の状態は持たない）ため、
 * KY用紙のような submitted/approved/rejected は扱わない。代わりに「記入の充足」と
 * 「保存一覧に保存済みか」の2軸で、下書き(青)／保存済み(緑)を3秒で読めるようにする。
 * saved 判定は呼び出し側がセッション内で厳密に行う（store の savedAt は自動保存・翌日複製でも
 * 更新されるため保存済みの根拠に使えない）。
 */
import type { MeetingRecord } from "@/lib/meeting/schema";
import type { SafetyTone } from "@/lib/design/safety-tone";

export type MeetingPaperMissingKey = "site" | "company" | "disaster" | "instruction";

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
  /** 次にやること（結論カードの action） */
  action: { href: string; label: string };
};

const ESSENTIALS: readonly MeetingPaperMissingItem[] = [
  { key: "site", label: "作業所名", anchor: "#mtg-header" },
  { key: "company", label: "協力会社・作業", anchor: "#mtg-companies" },
  { key: "disaster", label: "予想災害", anchor: "#mtg-companies" },
  { key: "instruction", label: "指示事項", anchor: "#mtg-companies" },
];

function isFilled(record: MeetingRecord, key: MeetingPaperMissingKey): boolean {
  switch (key) {
    case "site":
      return record.siteName.trim() !== "";
    case "company":
      // 1社以上が会社名と作業内容の両方を持つ
      return record.contractors.some(
        (c) => c.companyName.trim() !== "" && c.workContent.trim() !== ""
      );
    case "disaster":
      return record.contractors.some((c) =>
        c.predictedDisasters.some((d) => d.trim() !== "")
      );
    case "instruction":
      return record.contractors.some((c) => c.safetyInstructions.trim() !== "");
  }
}

/**
 * 打合せ書の現在状態を結論カード1メッセージに要約する。
 * @param opts.saved いま画面の内容が保存一覧に保存済みか（呼び出し側がセッション内で厳密判定）。
 */
export function computeMeetingPaperStatus(
  record: MeetingRecord,
  opts?: { saved?: boolean }
): MeetingPaperStatus {
  const missing = ESSENTIALS.filter((item) => !isFilled(record, item.key));
  if (missing.length > 0) {
    const next = missing[0];
    return {
      kind: "incomplete",
      tone: "info",
      title: "記入のこり",
      remaining: missing.length,
      missing,
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
      action: { href: "/safety-diary/list", label: "保存一覧で確認" },
    };
  }
  return {
    kind: "complete",
    tone: "info",
    title: "記入完了・未保存",
    missing: [],
    action: { href: "#mtg-actions", label: "保存する" },
  };
}
