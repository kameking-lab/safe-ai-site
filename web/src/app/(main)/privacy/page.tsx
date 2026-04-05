import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "安全AIサイトのプライバシーポリシー。個人情報の取り扱いについて説明しています。",
};

export default function PrivacyPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">プライバシーポリシー</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月1日</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. 基本方針</h2>
          <p className="text-sm leading-7 text-slate-600">
            安全AIサイト（以下「本サービス」）は、利用者のプライバシーを尊重し、個人情報の保護に努めます。
            本ポリシーは、本サービスにおける個人情報の取り扱いについて説明します。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. 収集する情報</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは現在、ユーザー登録を必要としないため、氏名・メールアドレス等の個人情報を収集しません。
            ただし、以下の情報を自動的に収集する場合があります。
          </p>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">アクセスログ（IPアドレス、ブラウザ種別、アクセス日時）</li>
            <li className="list-disc">Cookie・ローカルストレージ（地点設定・表示設定の保存に使用）</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. 情報の利用目的</h2>
          <ul className="ml-4 space-y-1 text-sm text-slate-600">
            <li className="list-disc">サービスの提供・運営・改善のため</li>
            <li className="list-disc">不正アクセスの防止・セキュリティ確保のため</li>
            <li className="list-disc">サービス利用状況の統計分析のため</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. 第三者提供</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、法令に基づく場合を除き、収集した情報を第三者に提供しません。
            ただし、Amazon・楽天等のアフィリエイトリンクをクリックした場合、
            各サービスのプライバシーポリシーが適用されます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">5. Cookie・ローカルストレージ</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、利用者の利便性向上のためローカルストレージを使用し、
            地点設定・表示設定を端末内に保存します。ブラウザの設定により無効にすることができますが、
            一部機能が制限される場合があります。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">6. セキュリティ</h2>
          <p className="text-sm leading-7 text-slate-600">
            本サービスは、収集した情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を実施します。
            通信はHTTPS（SSL/TLS）により暗号化されています。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">7. ポリシーの変更</h2>
          <p className="text-sm leading-7 text-slate-600">
            本ポリシーは、必要に応じて変更することがあります。
            変更後のポリシーは、本ページに掲載した時点で効力を生じます。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">8. お問い合わせ</h2>
          <p className="text-sm leading-7 text-slate-600">
            プライバシーに関するお問い合わせは、本サービスの運営者までご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
