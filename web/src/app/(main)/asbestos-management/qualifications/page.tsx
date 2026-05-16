import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ASBESTOS_QUALIFICATIONS } from "@/data/asbestos-rules";

const _title = "必要資格一覧｜石綿（アスベスト）対応支援";
const _desc =
  "石綿作業主任者・石綿取扱作業従事者特別教育・建築物石綿含有建材調査者・石綿分析者の取得要件と必要場面を整理。R5.10 以降の建築物石綿含有建材調査者制度に対応。";

const TYPE_LABEL: Record<string, string> = {
  "chief-supervisor": "作業主任者",
  "special-education": "特別教育",
  investigator: "事前調査資格",
  analyst: "分析資格",
};

const TYPE_BADGE: Record<string, string> = {
  "chief-supervisor": "bg-emerald-100 text-emerald-800",
  "special-education": "bg-sky-100 text-sky-800",
  investigator: "bg-amber-100 text-amber-800",
  analyst: "bg-violet-100 text-violet-800",
};

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/asbestos-management/qualifications" },
  openGraph: { title: _title, description: _desc, type: "website", locale: "ja_JP" },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="石綿対応の必要資格"
        description={_desc}
        path="/asbestos-management/qualifications"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "石綿対応支援", url: "https://www.anzen-ai-portal.jp/asbestos-management" },
          {
            name: "必要資格一覧",
            url: "https://www.anzen-ai-portal.jp/asbestos-management/qualifications",
          },
        ]}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
            Asbestos Qualifications
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            必要資格一覧
          </h1>
          <p className="mt-3 text-sm text-slate-700">
            石綿対応に関わる4つの主要資格を、必要場面・取得方法・根拠条文付きで整理しました。特別教育・技能講習DBへの動線もあわせて掲載しています。
          </p>
        </header>

        <ul className="space-y-4">
          {ASBESTOS_QUALIFICATIONS.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">{q.name}</h2>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[q.type]}`}>
                  {TYPE_LABEL[q.type]}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    必要となる場面
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{q.requiredWhen}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    取得方法
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{q.howToObtain}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  根拠条文
                </p>
                <ul className="mt-2 space-y-2 text-xs text-slate-700">
                  {q.lawReferences.map((lr, idx) => (
                    <li
                      key={`${lr.name}-${idx}`}
                      className="rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <p className="font-semibold text-slate-900">{lr.name}</p>
                      {lr.articles && lr.articles.length > 0 && (
                        <p className="text-slate-600">{lr.articles.join("・")}</p>
                      )}
                      <p className="mt-1 text-slate-700">{lr.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-8 rounded-xl border border-emerald-200 bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">関連ページ</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>
              <Link href="/education-certification" className="text-emerald-700 hover:underline">
                特別教育・技能講習DB
              </Link>
              ：石綿作業主任者技能講習・特別教育の根拠条文と関連資格の比較。
            </li>
            <li>
              <Link href="/education-certification/finder" className="text-emerald-700 hover:underline">
                資格判定ツール
              </Link>
              ：業種・作業から必要資格を自動判定。
            </li>
            <li>
              <Link href="/health-checkup-scheduler" className="text-emerald-700 hover:underline">
                健康診断スケジューラ
              </Link>
              ：石綿健康診断（雇入れ時・6 ヶ月以内ごと）の年間計画作成。
            </li>
          </ul>
        </section>
      </PageContainer>
    </div>
  );
}
