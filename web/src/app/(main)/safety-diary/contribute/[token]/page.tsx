import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "共有入力は再検証中です",
  description:
    "安全工程打合せ書の外部共有入力は、濫用防止と保存整合性の再検証中です。",
  robots: { index: false, follow: false },
};

export default function QuarantinedContributionPage() {
  return (
    <PageContainer width="prose">
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
        共有入力は現在利用できません
      </h1>
      <p className="mt-4 leading-7 text-slate-700 dark:text-slate-200">
        共有レート制限、履歴保存、競合更新、濫用対応の再検証が完了するまで、外部リンクからの入力を停止しています。
        発行元へ連絡し、端末内の安全工程打合せ書で内容を確認してください。
      </p>
      <Link
        href="/safety-diary"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-5 font-bold text-white"
      >
        安全工程打合せ書へ戻る
      </Link>
    </PageContainer>
  );
}
