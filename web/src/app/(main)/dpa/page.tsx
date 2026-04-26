import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "データ処理契約（DPA）",
  description: "ANZEN AIのデータ処理契約（DPA）。サブプロセッサー一覧、DPA締結の流れをご案内します。",
  alternates: { canonical: "/dpa" },
  openGraph: {
    title: "データ処理契約（DPA）｜ANZEN AI",
    description: "ANZEN AIのデータ処理契約（DPA）。サブプロセッサー一覧、DPA締結の流れをご案内します。",
  },
};

export default function DpaPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">データ処理契約（DPA）</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月26日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ANZEN AIでは、個人情報保護法・GDPRなどの要件に基づき、
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
              標準DPAテンプレートは現在準備中です（独立後3ヶ月以内に整備予定）。
              現時点でDPAが必要な場合は、
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
      </div>
    </div>
  );
}
