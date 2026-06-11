import type { SafetyTone } from "@/lib/design/safety-tone";

/**
 * 記録キット各画面の「いまの状態」結論（柱0・ビジュアルファースト）。
 *
 * 各ツール画面の最上部に置く ConclusionCard の中身を、保存データの件数から
 * 決める純関数群。色の文法は safety-tone.ts のルールに従う:
 *   赤 = 停止級（期日超過・使用不可・重大未対策）
 *   黄 = 要対応（未是正・対応中・今月未開催）
 *   緑 = 良好（対応すべきものが無い）
 *   青 = 指示・案内（記入途中・まだ記録が無い画面の導き）
 *
 * UI から分離してここでテスト固定する（record-conclusions.test.ts）。
 */

export type RecordConclusion = {
  tone: SafetyTone;
  /** デカ数字。省略時はトーンのアイコンが主役 */
  value?: number;
  unit?: string;
  /** 漢字2〜6文字の体言止め */
  title: string;
  /** 1行だけの補足 */
  description?: string;
  /** 次にやること（同一画面内アンカー or 他ツールへの動線） */
  action?: { href: string; label: string };
};

/** 安全パトロール: 全巡視を横断した未是正・期日超過で判定 */
export function patrolConclusion(openCount: number, overdueCount: number): RecordConclusion {
  if (overdueCount > 0) {
    return {
      tone: "danger",
      value: overdueCount,
      unit: "件",
      title: "期日超過",
      description: "是正期日を過ぎた未是正の指摘があります。担当へ催促してください。",
      action: { href: "#open-findings", label: "指摘を見る" },
    };
  }
  if (openCount > 0) {
    return {
      tone: "warning",
      value: openCount,
      unit: "件",
      title: "未是正",
      description: "全巡視を横断した未是正の指摘です。是正したら「是正済み」にして再保存を。",
      action: { href: "#open-findings", label: "指摘を見る" },
    };
  }
  return {
    tone: "safe",
    title: "未是正なし",
    description: "保存済みの巡視に未是正の指摘はありません。",
  };
}

/** ヒヤリハット: 重大×未対策 → 未対策 → 報告ゼロ → 全件対策済 の順で判定 */
export function nearMissConclusion(
  totalCount: number,
  openCount: number,
  openHighCount: number,
): RecordConclusion {
  if (openHighCount > 0) {
    return {
      tone: "danger",
      value: openHighCount,
      unit: "件",
      title: "重大未対策",
      description: "重大の可能性があるヒヤリハットが未対策です。優先して対策してください。",
      action: { href: "#nearmiss-list", label: "未対策を見る" },
    };
  }
  if (openCount > 0) {
    return {
      tone: "warning",
      value: openCount,
      unit: "件",
      title: "対応中",
      description: "未対策のヒヤリハットがあります。対策したら「対策済」に。",
      action: { href: "#nearmiss-list", label: "未対策を見る" },
    };
  }
  if (totalCount === 0) {
    return {
      tone: "info",
      title: "報告なし",
      description: "報告を集めるほど事故は減ります。下のフォームから1件目をどうぞ。",
    };
  }
  return {
    tone: "safe",
    title: "全件対策済",
    description: "未対策のヒヤリハットはありません。",
  };
}

/** 作業開始前点検: 保存済みのうち「使用不可」が1台でもあれば停止級 */
export function inspectionConclusion(savedCount: number, unusableCount: number): RecordConclusion {
  if (unusableCount > 0) {
    return {
      tone: "danger",
      value: unusableCount,
      unit: "件",
      title: "使用不可",
      description: "使用不可の機械があります。是正・修理が済むまで使用させないでください。",
      action: { href: "#saved-inspections", label: "対象を確認" },
    };
  }
  if (savedCount === 0) {
    return {
      tone: "info",
      title: "今日の点検から",
      description: "建設機械・クレーン・電動工具などの始業前点検を機種別の標準項目で記録できます。",
    };
  }
  return {
    tone: "safe",
    title: "使用不可なし",
    description: "保存済みの点検に使用不可の機械はありません。",
  };
}

/** 安全衛生委員会: 当月の開催実績で判定（毎月1回以上・安衛則23条） */
export function committeeConclusion(heldThisMonth: boolean): RecordConclusion {
  if (heldThisMonth) {
    return {
      tone: "safe",
      title: "今月開催済",
      description: "議事概要の労働者への周知と3年間の保存を忘れずに。",
    };
  }
  return {
    tone: "warning",
    title: "今月未開催",
    description: "毎月1回以上の開催が必要です（安衛則23条）。「前回をベースに新規」が最短です。",
  };
}

/** 受入教育の記入のこり数: 氏名＋未チェック項目＋実施者/本人の確認チェック */
export function countInductionRemaining(input: {
  workerName: string;
  items: { checked: boolean }[];
  confirmedWorker: boolean;
  confirmedEducator: boolean;
}): number {
  return (
    (input.workerName.trim() === "" ? 1 : 0) +
    input.items.filter((i) => !i.checked).length +
    (input.confirmedEducator ? 0 : 1) +
    (input.confirmedWorker ? 0 : 1)
  );
}

/** 受入教育: KY用紙と同じ「記入のこりN → 完了」の文法 */
export function inductionConclusion(remaining: number): RecordConclusion {
  if (remaining > 0) {
    return {
      tone: "info",
      value: remaining,
      unit: "項目",
      title: "記入のこり",
      description: "氏名・教育項目・実施者と本人の確認が揃うと完了です。",
    };
  }
  return {
    tone: "safe",
    title: "記入完了",
    description: "「この端末に保存」で記録に残してください（印刷は保存後に）。",
  };
}

/** 月次レポート: 当月の要対応合計（未是正＋対応中＋使用不可）と委員会開催で判定 */
export function monthlyConclusion(input: {
  hasAny: boolean;
  patrolOpen: number;
  nearMissOpen: number;
  inspectionUnusable: number;
  committeeHeld: boolean;
}): RecordConclusion {
  if (!input.hasAny) {
    return {
      tone: "neutral",
      title: "記録なし",
      description: "各ツールで記録を保存すると、この月の実績を自動集計します。",
    };
  }
  const attention = input.patrolOpen + input.nearMissOpen + input.inspectionUnusable;
  if (attention > 0) {
    return {
      tone: input.inspectionUnusable > 0 ? "danger" : "warning",
      value: attention,
      unit: "件",
      title: "要対応",
      description:
        input.inspectionUnusable > 0
          ? "使用不可の機械を含む要対応があります。各ツールで是正状況を更新してください。"
          : "未是正・対応中の項目があります。月内の是正を。",
    };
  }
  if (!input.committeeHeld) {
    return {
      tone: "warning",
      title: "委員会未開催",
      description: "当月の安全衛生委員会が未開催です（毎月1回以上・安衛則23条）。",
      action: { href: "/site-records/committee", label: "議事録を作る" },
    };
  }
  return {
    tone: "safe",
    title: "当月良好",
    description: "未是正・対応中・使用不可はありません。委員会も開催済みです。",
  };
}
