import type { Metadata } from "next";
import {
  RoleActionPortal,
  type RoleAction,
} from "@/components/role-action-portal";

const TITLE = "専門家向け安全衛生リサーチ入口";
const DESCRIPTION =
  "法令・通達・事故・化学物質を出典区分付きで確認し、公式一次資料へ到達するための専門家向け入口。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for/consultant" },
};

const ACTIONS: readonly RoleAction[] = [
  {
    href: "/law-search",
    label: "法令・条文を検索",
    description:
      "法令名、条番号、現場語から候補を探し、e-Gov等の一次資料で適用を確認します。",
    priority: "primary",
  },
  {
    href: "/circulars",
    label: "通達・告示を探す",
    description:
      "公開確認済みの収録範囲から検索し、文書番号と公式URLを照合します。",
  },
  {
    href: "/law-search?q=安全配慮義務",
    label: "安全配慮義務の一次資料を探す",
    description:
      "サイト内索引から関連条文へ進み、判断前にe-Govの正本と専門家へ確認します。",
  },
  {
    href: "/accident-news",
    label: "出典区分付き重大災害情報",
    description:
      "公表事実、報道由来、AI要約等の区分を確認し、転用前に一次資料と適用条件を照合します。",
  },
  {
    href: "/chemical-database",
    label: "化学物質・SDSの下調べ",
    description:
      "CAS番号等で候補を絞り、最新SDSと公式ツールで条件を再確認します。",
  },
  {
    href: "/services/automation",
    label: "顧問先業務の自動化相談",
    description:
      "資料作成、集計、帳票、教育運用を、機密情報を送らない前提から整理します。",
  },
];

export default function ForConsultantPage() {
  return (
    <RoleActionPortal
      roleLabel="労働安全衛生の専門家・支援者向け"
      heading="原典へ戻れる下調べを、短い導線で。"
      introduction="検索結果やAI要約を結論にせず、文書番号、施行日、適用条件、出典区分を確認してから顧問先支援へ使うための入口です。"
      actions={ACTIONS}
    />
  );
}
