import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { SITE_URL, withSiteAlternates } from "@/lib/seo-metadata";
import { JsonLd } from "@/components/json-ld";

const PATH = "/training/safety-seminars/terms";
const TITLE = "安全研修ライブラリの利用条件・注意事項";
const DESCRIPTION =
  "安全研修ライブラリの無料利用、編集、社内配布、法定教育との区別、出典表示に関する条件です。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withSiteAlternates(PATH),
  robots: { index: false, follow: true },
};

export default function SafetySeminarTermsPage() {
  return (
    <PageContainer width="prose">
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
          inLanguage: "ja",
          isPartOf: { "@type": "WebSite", url: SITE_URL },
        }}
      />
      <nav aria-label="パンくず" className="text-sm text-slate-600 dark:text-slate-300">
        <Link href="/" className="underline underline-offset-4">ホーム</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/training/safety-seminars" className="underline underline-offset-4">安全研修ライブラリ</Link>
        <span aria-hidden="true"> / </span>
        <span>利用条件・注意事項</span>
      </nav>

      <h1 className="mt-6 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
        安全研修ライブラリの利用条件・注意事項
      </h1>
      <p className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 font-bold leading-7 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50">
        この教材は社内安全研修用です。法定の特別教育等を代替するものではありません。
      </p>

      <div className="mt-8 space-y-8 text-slate-700 dark:text-slate-200">
        <section aria-labelledby="terms-free">
          <h2 id="terms-free" className="text-2xl font-black text-slate-950 dark:text-white">無料でできること</h2>
          <p className="mt-3 leading-7">
            社内安全研修、朝礼、協力会社教育、現場教育、自社資料への組込みに、無料で利用・編集・社内配布できます。編集した場合は、変更箇所と自社の責任範囲が分かるようにしてください。
          </p>
        </section>
        <section aria-labelledby="terms-sources">
          <h2 id="terms-sources" className="text-2xl font-black text-slate-950 dark:text-white">出典と更新確認</h2>
          <p className="mt-3 leading-7">
            数値、法令、技術的判断の根拠脚注は原則として残してください。法令・統計は基準日後に改正・訂正されることがあります。実施前にリンク先の現行資料と、自社の作業条件・器具の取扱説明書を確認してください。
          </p>
        </section>
        <section aria-labelledby="terms-prohibited">
          <h2 id="terms-prohibited" className="text-2xl font-black text-slate-950 dark:text-white">禁止・事前相談が必要な利用</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
            <li>教材そのものを販売すること</li>
            <li>画像・図表・文章を素材集として再配布すること</li>
            <li>出典を削除し、公的機関の認定教材であるかのように表示すること</li>
            <li>法定教育の修了証発行へ無断転用すること</li>
          </ul>
        </section>
        <section aria-labelledby="terms-boundary">
          <h2 id="terms-boundary" className="text-2xl font-black text-slate-950 dark:text-white">安全上・法令上の境界</h2>
          <p className="mt-3 leading-7">
            教材は一般的な情報提供であり、個別現場の作業計画、リスクアセスメント、器具選定、救助計画、監督者の判断を代替しません。法定の特別教育、技能講習、職長教育等は、対象業務、時間、実技、講師、記録などの要件を別途確認し、適切な実施主体で行ってください。
          </p>
        </section>
      </div>
      <Link
        href="/training/safety-seminars/fall-prevention"
        className="mt-10 inline-flex min-h-11 items-center rounded-xl bg-teal-800 px-5 py-3 font-black text-white hover:bg-teal-900"
      >
        公開教材へ戻る
      </Link>
    </PageContainer>
  );
}
