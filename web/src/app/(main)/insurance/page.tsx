import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "賠償責任保険加入状況",
  description: "ANZEN AIの賠償責任保険・データ漏洩保険の加入状況。現状と加入予定を正直に公開します。",
  alternates: { canonical: "/insurance" },
  openGraph: {
    title: "賠償責任保険加入状況｜ANZEN AI",
    description: "ANZEN AIの賠償責任保険・データ漏洩保険の加入状況。現状と加入予定を正直に公開します。",
  },
};

export default function InsurancePage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">賠償責任保険加入状況</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月26日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ANZEN AIでは、利用者・取引先への万が一の被害に備えるため、賠償責任保険への加入を計画しています。
            現状と予定を正直に開示します。
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">【現状】未加入</p>
          <p className="mt-2 text-sm leading-7 text-amber-800">
            2026年4月現在、業務賠償責任保険・データ漏洩保険には未加入です。
            独立準備フェーズのため、加入手続きは法人化・独立後のフェーズ1で実施予定です。
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">加入予定の保険</h2>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                予定
              </span>
              <span className="text-sm font-semibold text-blue-900">
                業務上の賠償責任保険（ITコンサルタント向け）
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                対象：コンサルティング業務・ITサービス提供に起因する第三者への損害賠償
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                補償例：誤った助言・システム障害による業務損失など
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                加入目標：独立後3ヶ月以内
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                予定
              </span>
              <span className="text-sm font-semibold text-blue-900">
                情報漏洩・サイバーリスク保険
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                対象：個人情報漏洩・サイバー攻撃に起因する損害賠償および事後対応費用
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                補償例：漏洩通知費用、調査費用、被害者への賠償など
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                加入目標：独立後3ヶ月以内
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">加入完了後の情報開示</h2>
          <p className="text-sm leading-7 text-slate-600">
            保険加入後は、以下の情報を本ページに追記します。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">保険会社名・商品名</li>
            <li className="list-disc">補償内容の概要（保険金額・補償範囲）</li>
            <li className="list-disc">加入日・証書番号（個人情報に該当する項目を除く）</li>
            <li className="list-disc">保険証書の写し（一部）の提供可否</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">現在の免責事項</h2>
          <p className="text-sm leading-7 text-slate-600">
            保険加入前の現時点では、
            <a className="underline hover:text-emerald-700" href="/terms">
              利用規約
            </a>
            に定める免責規定が適用されます。
            保険未加入の状態でサービスを利用されることに同意のうえご利用ください。
            ご不安な場合は、保険加入後の利用開始をお勧めします。
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">お問い合わせ</h2>
          <p className="text-sm leading-7 text-slate-600">
            保険内容に関するご質問・契約書等での保険証書の提出要請については、
            <a className="underline hover:text-emerald-700" href="/contact">
              お問い合わせフォーム
            </a>
            よりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
