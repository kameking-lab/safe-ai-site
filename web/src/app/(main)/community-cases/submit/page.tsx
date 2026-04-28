import type { Metadata } from "next";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = {
  title: "現場の声を投稿する｜ANZEN AI",
  description:
    "ヒヤリハット・現場の質問・Tipsを匿名で投稿できます。AI監査と労働安全コンサルタントの確認を経て公開されます。",
  alternates: { canonical: "/community-cases/submit" },
  robots: { index: false, follow: false },
};

export default function CommunityCasesSubmitPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          UGC投稿フォーム
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          現場の声を共有する
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ヒヤリハット・現場の質問・現場で見つけた小さなTipsを匿名で投稿できます。
          AI監査と労働安全コンサルタントの監修を経て公開されます。
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">投稿前にご確認ください</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
          <li>個人名・会社名・住所・連絡先などの個人情報は記載しないでください（自動マスキングしますが完全ではありません）</li>
          <li>誹謗中傷・特定企業の批判・スパムは公開されません</li>
          <li>投稿は匿名ハンドル（例：匿名のコアラ#3421）で公開されます</li>
        </ul>
      </div>

      <SubmitForm />
    </main>
  );
}
