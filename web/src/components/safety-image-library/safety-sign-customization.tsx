import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Settings2 } from "lucide-react";

const SERVICES = [
  "独自の文言・配色・サイズ",
  "会社ロゴ・帳票への組込み",
  "多言語・数値テンプレート",
  "施工計画書・KYとの連携",
  "画像・PDF帳票の一括生成",
] as const;

export function SafetySignCustomization() {
  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-7 dark:border-sky-900 dark:bg-sky-950" aria-labelledby="safety-sign-custom-heading">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-black text-sky-800 dark:text-sky-200">法人向けカスタマイズ</p>
          <h2 id="safety-sign-custom-heading" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            御社の看板・帳票に合わせて作ります
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="対応内容">
            {SERVICES.map((service) => (
              <li key={service} className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-sky-800 dark:bg-slate-900 dark:text-slate-200">
                {service}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/services/automation#consultation" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 text-sm font-black text-white hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300">
            <Settings2 className="h-4 w-4" aria-hidden="true" />看板をカスタマイズ
          </Link>
          <Link href="/services/automation#consultation" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-700 bg-white px-4 text-sm font-black text-sky-900 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-slate-950 dark:text-sky-100">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />帳票・業務自動化を相談<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
