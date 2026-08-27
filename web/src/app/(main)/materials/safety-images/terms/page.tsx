import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  SAFETY_IMAGE_LIBRARY_PATH,
  SAFETY_IMAGE_LIBRARY_RIGHTS_PATH,
} from "@/data/safety-image-library";

const DESCRIPTION =
  "準備中の安全看板ライブラリで、公開後の画像を施工計画書・報告書・教育資料・現場掲示に利用するための条件です。";

export const metadata: Metadata = {
  title: "安全画像の利用条件｜安全AIポータル",
  description: DESCRIPTION,
  alternates: { canonical: SAFETY_IMAGE_LIBRARY_RIGHTS_PATH },
  robots: { index: false, follow: true },
};

export default function SafetyImageTermsPage() {
  return (
    <div className="pb-16">
      <PageJsonLd
        name="安全画像の利用条件"
        description={DESCRIPTION}
        path={SAFETY_IMAGE_LIBRARY_RIGHTS_PATH}
      />
      <header className="border-b border-emerald-100 bg-emerald-50 px-4 py-8 sm:px-6 dark:border-emerald-950 dark:bg-emerald-950">
        <div className="mx-auto max-w-4xl">
          <Link
            href={SAFETY_IMAGE_LIBRARY_PATH}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            安全画像倉庫へ
          </Link>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl dark:text-white">
            安全画像の利用条件
          </h1>
          <p className="mt-3 text-lg font-black text-emerald-900 dark:text-emerald-100">
            安全AIポータル作成／商用利用可／加工可
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          現在は安全看板ライブラリを準備中です。以下は公開後の画像に適用する利用条件です。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConditionCard
            icon={<BadgeCheck className="h-6 w-6" aria-hidden="true" />}
            title="利用できるもの"
          >
            施工計画書、報告書、教育資料、朝礼資料、現場掲示などへ利用できます。会社の業務や受注案件での商用利用も可能です。
          </ConditionCard>
          <ConditionCard
            icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
            title="変更できるもの"
          >
            文字、言語、色、サイズ、配置の変更、トリミング、他の資料への組み込みができます。ブランド表示なしも選択できます。
          </ConditionCard>
          <ConditionCard
            icon={<CircleAlert className="h-6 w-6" aria-hidden="true" />}
            title="素材としての再配布"
          >
            画像素材そのものの販売、素材集としての再配布、ダウンロードサイトへの転載はできません。完成した施工計画書や掲示物の共有は可能です。
          </ConditionCard>
          <ConditionCard
            icon={<CircleAlert className="h-6 w-6" aria-hidden="true" />}
            title="安全・法令の確認"
          >
            画像は安全教育と資料作成を支援するものです。現場条件に応じた安全判断と、法令上必要な正式標識への適合は各現場で確認してください。
          </ConditionCard>
        </div>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">
            権利の扱い
          </h2>
          <p className="mt-3">
            公開後に提供する画像は安全AIポータルのために新規生成・制作し、クリーンマスター、文字レイヤー、ブランドレイヤーを分離して管理します。「著作権放棄」または「パブリックドメイン」としては提供しません。
          </p>
          <p className="mt-3">
            判断に迷う再利用や大量配布については、サイトのお問い合わせ窓口から利用方法をご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}

function ConditionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
        {icon}
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>
      <p className="mt-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
        {children}
      </p>
    </section>
  );
}
