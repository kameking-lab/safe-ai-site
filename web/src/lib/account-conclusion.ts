import type { SafetyTone } from "@/lib/design/safety-tone";

/**
 * マイページ(/account)の結論カード用ロジック（柱0・1画面1メッセージ）。
 * 支払い要対応(赤) > 解約済み(黄) > フリー(青) > 利用中(緑) の優先順で1状態に絞る。
 */

export interface AccountConclusionInput {
  planName: string;
  status: string;
  /** 表示済みの期間終了日ラベル（未確定なら null） */
  periodEndLabel: string | null;
}

export interface AccountConclusion {
  tone: SafetyTone;
  title: string;
  description?: string;
}

export function computeAccountConclusion({
  planName,
  status,
  periodEndLabel,
}: AccountConclusionInput): AccountConclusion {
  if (status === "past_due") {
    return {
      tone: "danger",
      title: "支払い遅延",
      description:
        "登録済みのカードへの請求が失敗しています。「プラン管理」から支払い方法を更新してください。更新がない場合、サービスが停止されます。",
    };
  }
  if (status === "unpaid") {
    return {
      tone: "danger",
      title: "未払いあり",
      description: "請求が未払いです。「プラン管理」から対応してください。",
    };
  }
  if (status === "canceled") {
    return {
      tone: "warning",
      title: "解約済み",
      description: periodEndLabel
        ? `${periodEndLabel}まで現在の機能をご利用いただけます。その後フリープランに移行します。`
        : "請求期間の終了後、フリープランに移行します。",
    };
  }
  if (planName === "free") {
    return {
      tone: "info",
      title: "フリープラン",
      description: "有料プランで機能を拡張できます。",
    };
  }
  return {
    tone: "safe",
    title: "利用中",
    description: periodEndLabel ? `次回更新日：${periodEndLabel}` : undefined,
  };
}
