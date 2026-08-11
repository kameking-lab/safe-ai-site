import { ExternalLink, FileText, Sparkles } from "lucide-react";
import {
  getPublishedMarketplaceUrl,
  WORK_SUPPORT_SERVICES,
} from "@/config/work-support";

export function WorkSupportSection() {
  return (
    <section
      id="work-support"
      aria-labelledby="work-support-title"
      className="mt-10 scroll-mt-24 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-50"
    >
      <p className="text-sm font-black tracking-wide text-emerald-800 dark:text-emerald-300">
        OPTIONAL PAID SUPPORT
      </p>
      <h2 id="work-support-title" className="mt-2 text-2xl font-black">
        業務改善・資料制作のご相談
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-slate-950">
          <Sparkles className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-2 font-black">安全AIポータルの無料機能</h3>
          <p className="mt-1 text-sm leading-6">
            法令検索、事故・通達情報、KY支援、計算ツールなどは、購入を条件にせずサイト上で利用できます。
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-slate-950">
          <FileText className="h-6 w-6 text-sky-700" aria-hidden="true" />
          <h3 className="mt-2 font-black">有料の受託サービス</h3>
          <p className="mt-1 text-sm leading-6">
            購入者の資料や業務に合わせる制作・説明は、無料機能とは別の任意サービスです。取引は公開済みサービスのプラットフォーム内で完結します。
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {WORK_SUPPORT_SERVICES.map((service) => {
          const href = getPublishedMarketplaceUrl(service.marketplaceUrl);
          return (
            <li
              key={service.id}
              className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-slate-950"
            >
              <h3 className="font-black">{service.title}</h3>
              <p className="mt-1 text-sm leading-6">{service.summary}</p>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
                >
                  ココナラの公開サービスを確認
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                  公開サービスのURL確定後に案内します
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm font-bold leading-6">
        個人メール、電話、SNSへの誘導は行いません。AI回答や制作物は、法的判断、現場承認、行政受理を保証しません。
      </p>
    </section>
  );
}
