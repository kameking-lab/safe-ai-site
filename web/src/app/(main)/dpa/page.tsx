import type { Metadata } from "next";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { PageContainer } from "@/components/layout";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "データ処理契約（DPA）",
  description: "安全AIポータルのデータ処理契約（DPA）。サブプロセッサー一覧、DPA締結の流れをご案内します。",
  alternates: { canonical: "/dpa" },
  // Per-page noindex: individual operator scope — standard DPA template will be issued after incorporation.
  // Audit reference: harsh-third-party-2026-05-16 G-002.
  robots: { index: false, follow: true },
  openGraph: withSiteOpenGraph("/dpa", {
    title: "データ処理契約（DPA）",
    description: "安全AIポータルのデータ処理契約（DPA）。サブプロセッサー一覧、DPA締結の流れをご案内します。",
  }),
};

export default function DpaPage() {
  return (
    <PageContainer width="narrow" className="space-y-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="データ処理契約（DPA）" description="安全AIポータルのデータ処理契約（DPA）。サブプロセッサー一覧、DPA締結の流れをご案内します。" path="/dpa" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">データ処理契約（DPA）</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年5月17日</p>
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              【ご案内】本ページは個人事業者運営フェーズの参考情報です
            </p>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              標準化されたDPAテンプレートの提供および法人向け業務委託契約の正式締結は、
              法人化（予定: 2026年中）完了後に対応する方針です。それまでは個別案件に応じた個別契約での対応となり、
              企業のコンプライアンス要件（標準DPA・サブプロセッサー監査権など）を完全に満たせない場合があります。
              重要案件においては、必要に応じて社内法務・外部弁護士のレビューをご検討ください。
            </p>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            安全AIポータルでは、個人情報保護法・GDPRなどの要件に基づき、
            業務委託先として当方のサービスを利用する法人・団体からのDPA締結要請に個別対応しています。
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. DPAとは</h2>
          <p className="text-sm leading-7 text-slate-600">
            DPA（Data Processing Agreement：データ処理契約）とは、個人データの処理を委託する際に
            委託者（お客様）と受託者（当方）が取り交わす契約です。
            GDPR第28条や日本の個人情報保護法に基づく安全管理措置の確認が主な目的です。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. DPA締結の対応状況</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">【現状】個別対応中</p>
            <p className="mt-2 text-sm leading-7 text-blue-800">
              標準DPAテンプレートについては個別にご案内しています。
              DPAが必要な場合は、
              <a className="underline hover:text-blue-900" href="/contact">
                お問い合わせフォーム
              </a>
              よりご連絡ください。個別に対応します。
            </p>
            <p className="mt-2 text-sm font-semibold text-blue-900">
              対応SLA：お問い合わせから5営業日以内に初回回答
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">3. サブプロセッサー一覧</h2>
          <p className="text-sm leading-7 text-slate-600">
            当方がデータ処理を委託している主要な外部事業者（サブプロセッサー）は以下のとおりです。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-700">
                  <th className="pb-2 pr-4">事業者</th>
                  <th className="pb-2 pr-4">処理内容</th>
                  <th className="pb-2 pr-4">所在地</th>
                  <th className="pb-2">認証</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Vercel Inc.</td>
                  <td className="py-2 pr-4">ホスティング・CDN・ログ</td>
                  <td className="py-2 pr-4">米国</td>
                  <td className="py-2">SOC2 Type2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Neon (Vercel Postgres)</td>
                  <td className="py-2 pr-4">データベース</td>
                  <td className="py-2 pr-4">米国（Singapore）</td>
                  <td className="py-2">SOC2 Type2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Google LLC</td>
                  <td className="py-2 pr-4">OAuth認証・Gemini API</td>
                  <td className="py-2 pr-4">米国</td>
                  <td className="py-2">ISO27001, SOC2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Stripe, Inc.</td>
                  <td className="py-2 pr-4">決済処理</td>
                  <td className="py-2 pr-4">米国</td>
                  <td className="py-2">PCI DSS Level 1</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-slate-700">Resend, Inc.</td>
                  <td className="py-2 pr-4">メール送信</td>
                  <td className="py-2 pr-4">米国</td>
                  <td className="py-2">SOC2 Type2</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            ※ サブプロセッサーの変更は本ページを更新することで通知します。重要な変更はサービス内でもお知らせします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. プライバシーポリシーとの関係</h2>
          <p className="text-sm leading-7 text-slate-600">
            本ページは
            <a className="underline hover:text-emerald-700" href="/privacy">
              プライバシーポリシー
            </a>
            と併せてお読みください。
            プライバシーポリシーは一般ユーザー向けの個人情報取扱方針を定め、
            本ページは法人・団体との業務委託関係における処理体制を補足するものです。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. データの越境移転</h2>
          <p className="text-sm leading-7 text-slate-600">
            サブプロセッサーは主に米国に所在します。米国への越境移転については、
            各事業者のDPA・SCCs（標準契約条項）または適切性認定に基づき取り扱われます。
            GDPRが適用される場合は別途ご相談ください。
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">DPAのご要請</h2>
          <p className="text-sm leading-7 text-slate-600">
            DPAの締結を希望される場合は、
            <a className="underline hover:text-emerald-700" href="/contact">
              お問い合わせフォーム
            </a>
            より「DPA締結希望」とご記入のうえご連絡ください。
            <br />
            <span className="font-semibold text-slate-700">対応SLA</span>
            ：お問い合わせから5営業日以内に初回回答。
          </p>
        </section>
    </PageContainer>
  );
}
