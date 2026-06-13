/**
 * KY用紙の「いまの状態」判定（柱0・ビジュアルファースト）。
 *
 * /ky/paper 最上部の結論カード用に、承認フローと記入の進み具合から
 * 「3秒で分かる1メッセージ」（トーン・短ラベル・デカ数字・次にやること）を返す純粋関数。
 * 色の文法は safety-tone.ts に従う:
 *   黄 = 要対応（差し戻し＝直して再提出が必要）
 *   青 = 案内・進行中（記入のこり・元請の確認待ち）
 *   緑 = 完了（記入完了・承認済み）
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import type { SafetyTone } from "@/lib/design/safety-tone";
import { DEFAULT_APPROVAL } from "@/lib/ky/approval";

export type KyPaperMissingItem = {
  key: "work" | "hazard" | "reduction" | "goal" | "participants";
  /** 漢字短ラベル（チップ表示用） */
  label: string;
  /** 用紙内の該当セクションへのアンカー */
  anchor: string;
};

export type KyPaperStatus = {
  kind: "rejected" | "submitted" | "approved" | "incomplete" | "complete";
  tone: SafetyTone;
  /** 体言止めの短ラベル */
  title: string;
  /** デカ数字（記入のこり項目数）。incomplete のときだけ */
  remaining?: number;
  /** 未記入の項目（incomplete のとき。先頭が「次にやること」） */
  missing: KyPaperMissingItem[];
  /** 次にやること（結論カードの action） */
  action: { href: string; label: string } | null;
};

const ESSENTIALS: readonly KyPaperMissingItem[] = [
  { key: "work", label: "作業内容", anchor: "#ky-work" },
  { key: "hazard", label: "危険のポイント", anchor: "#ky-risks" },
  { key: "reduction", label: "対策", anchor: "#ky-risks" },
  { key: "goal", label: "行動目標", anchor: "#ky-goal" },
  { key: "participants", label: "参加者", anchor: "#ky-members" },
];

function isFilled(record: KyInstructionRecordState, key: KyPaperMissingItem["key"]): boolean {
  switch (key) {
    case "work":
      return record.workRows.some((r) => r.workDetail.trim() !== "");
    case "hazard":
      return record.riskRows.some((r) => r.hazard.trim() !== "");
    case "reduction":
      // 危険が書かれた行に対策が付いているか（危険ゼロのうちは対策を求めない）
      return record.riskRows.some((r) => r.hazard.trim() !== "" && r.reduction.trim() !== "");
    case "goal":
      return record.teamGoal.trim() !== "";
    case "participants":
      return record.participants.some((p) => p.name.trim() !== "");
  }
}

/**
 * 柱C-9・A2: 記入のステップ進行（基本情報→危険→対策→確認）。
 * 用紙ファースト（完成用紙を最初に見せる）設計は不変のまま、用紙の上に
 * 「いま何段目／のこり何項目」を一目で示す進行ナビ用の純粋関数。
 * 各段の done/remaining は computeKyPaperStatus と同じ isFilled で判定するため、
 * 全段の remaining 合計＝結論カードの「記入のこりN」と必ず一致する（整合保証）。
 */
export type KyPaperStepKey = "basic" | "hazard" | "reduction" | "confirm";

export type KyPaperStep = {
  key: KyPaperStepKey;
  /** 段ラベル（体言止め・2〜4文字） */
  label: string;
  /** その段に属する必須項目のうち未記入の数 */
  remaining: number;
  /** その段がすべて記入済みか */
  done: boolean;
  /** 進行上の現在地（先頭の未完了段だけ true） */
  current: boolean;
  /** タップ先（未記入があれば最初の未記入欄、無ければ段の先頭セクション） */
  anchor: string;
};

const STEP_DEFS: readonly { key: KyPaperStepKey; label: string; items: KyPaperMissingItem["key"][] }[] = [
  { key: "basic", label: "基本情報", items: ["work"] },
  { key: "hazard", label: "危険", items: ["hazard"] },
  { key: "reduction", label: "対策", items: ["reduction"] },
  { key: "confirm", label: "確認", items: ["goal", "participants"] },
];

function anchorOf(key: KyPaperMissingItem["key"]): string {
  return ESSENTIALS.find((e) => e.key === key)!.anchor;
}

/** 記入の4段（基本情報→危険→対策→確認）それぞれの進み具合を返す。 */
export function computeKyPaperSteps(record: KyInstructionRecordState): KyPaperStep[] {
  let currentAssigned = false;
  return STEP_DEFS.map((def) => {
    const unfilled = def.items.filter((k) => !isFilled(record, k));
    const done = unfilled.length === 0;
    const current = !done && !currentAssigned;
    if (current) currentAssigned = true;
    return {
      key: def.key,
      label: def.label,
      remaining: unfilled.length,
      done,
      current,
      anchor: anchorOf(unfilled[0] ?? def.items[0]),
    };
  });
}

/** KY用紙の現在状態を結論カード1メッセージに要約する。 */
export function computeKyPaperStatus(record: KyInstructionRecordState): KyPaperStatus {
  const approval = record.approval ?? DEFAULT_APPROVAL;

  if (approval.status === "rejected") {
    return {
      kind: "rejected",
      tone: "warning",
      title: "差し戻し",
      missing: [],
      action: { href: "#ky-approval", label: "コメントを確認して修正" },
    };
  }
  if (approval.status === "submitted") {
    return {
      kind: "submitted",
      tone: "info",
      title: "元請の確認待ち",
      missing: [],
      action: { href: "#ky-approval", label: "承認状況を見る" },
    };
  }
  if (approval.status === "approved") {
    return {
      kind: "approved",
      tone: "safe",
      title: "承認済み",
      missing: [],
      action: { href: "/ky/morning", label: "朝礼サイネージへ" },
    };
  }

  const missing = ESSENTIALS.filter((item) => !isFilled(record, item.key));
  if (missing.length === 0) {
    return {
      kind: "complete",
      tone: "safe",
      title: "記入完了",
      missing: [],
      action: { href: "/ky/morning", label: "朝礼サイネージへ" },
    };
  }
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
