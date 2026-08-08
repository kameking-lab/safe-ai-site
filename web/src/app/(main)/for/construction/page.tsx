import type { Metadata } from "next";
import {
  RoleActionPortal,
  type RoleAction,
} from "@/components/role-action-portal";

const TITLE = "職長・現場代理人向け安全行動入口";
const DESCRIPTION =
  "職長・現場代理人が、今日の気象確認、KY、安全工程打合せ書、事故検索、資格確認を現場条件付きで始める入口。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for/construction" },
};

const ACTIONS: readonly RoleAction[] = [
  {
    href: "/risk?work=construction",
    label: "今日の安全を確認",
    description:
      "地域、絶対日時、警報、予報、取得時刻を確認し、取得不能時は公式情報へ戻ります。",
    priority: "primary",
  },
  {
    href: "/ky/paper?industry=construction",
    label: "作業条件からKYを作る",
    description:
      "作業、場所、人数、設備、重機、同時作業、変更点、緊急時条件を確認します。",
  },
  {
    href: "/safety-diary?industry=construction",
    label: "安全工程打合せ書を作る",
    description:
      "協力会社ごとの作業と危険を入力し、未承認・承認後変更を印刷前に止めます。",
  },
  {
    href: "/accident-news",
    label: "重大災害情報を確認",
    description:
      "公表事実・匿名・出典区分を確認し、KYへ反映する場合は現場条件を人が照合します。",
  },
  {
    href: "/education-certification/finder?industry=construction",
    label: "資格・教育の必要条件を整理",
    description:
      "高さ、作業床、機械、能力、荷重、作業者の立場等が不足すれば判定を保留します。",
  },
  {
    href: "/signage?industry=construction",
    label: "朝礼サイネージを開く",
    description:
      "取得時刻とデータ状態を確認し、表示障害時は公式警報と現場連絡へ切り替えます。",
  },
];

export default function ForConstructionPage() {
  return (
    <RoleActionPortal
      roleLabel="職長・現場代理人・元請安全担当向け"
      heading="今日の条件を確認し、KYと工程打合せへ。"
      introduction="一般的な注意事項を並べず、地域、作業、設備、同時作業、変更点など今日の条件を正規機能へ引き継ぎます。"
      actions={ACTIONS}
    />
  );
}
