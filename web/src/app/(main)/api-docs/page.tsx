import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API ドキュメント・ロードマップ",
  description: "ANZEN AIのAPI公開ロードマップ。現状の内部API構成と、REST API・Webhook・SSO/SCIMの段階的な外部公開計画を案内します。",
  alternates: { canonical: "/api-docs" },
  openGraph: {
    title: "API ドキュメント・ロードマップ｜ANZEN AI",
    description: "ANZEN AIのAPI公開ロードマップ。現状の内部API構成と、REST API・Webhook・SSO/SCIMの段階的な外部公開計画を案内します。",
  },
};

export default function ApiDocsPage() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">API ドキュメント・ロードマップ</h1>
          <p className="mt-2 text-sm text-slate-500">最終更新日: 2026年4月26日</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            現在のANZEN AIは内部APIのみ使用しています。
            外部向けAPIは段階的に公開予定です。現状と計画を正直に公開します。
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">現状</h2>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">内部API（非公開）のみ</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              現在のAPIはすべてNext.js App Routerの内部Route Handler（/api/*）として実装されており、
              外部からの直接アクセスはできません。
              外部向け公式APIは現時点では提供していません。
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-base font-bold text-slate-900">公開ロードマップ</h2>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Phase 1
              </span>
              <span className="text-sm font-semibold text-blue-900">REST API β（独立後3ヶ月）</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                資料検索 API（法令DB・事故DB・化学物質DB）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                RAG問い合わせ API（安衛法チャットボット）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                APIキー認証（Bearer token）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                OpenAPI 3.1仕様書の公開
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                レートリミット: 100 req/分（β版）
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-400 px-2.5 py-0.5 text-xs font-bold text-white">
                Phase 2
              </span>
              <span className="text-sm font-semibold text-slate-700">Webhook（独立後6ヶ月）</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                法改正DB更新通知 Webhook
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                事故DB追加通知 Webhook
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                気象警報連携
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                HMAC署名検証
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-400 px-2.5 py-0.5 text-xs font-bold text-white">
                Phase 3
              </span>
              <span className="text-sm font-semibold text-slate-700">
                エンタープライズ連携（独立後12ヶ月）
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                SCIM 2.0（ユーザープロビジョニング）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                SAML SSO（企業IdPとの連携）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                監査ログAPI
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">OpenAPI仕様の予告</h2>
          <p className="text-sm leading-7 text-slate-600">
            Phase 1リリース時には、OpenAPI 3.1形式の仕様書を
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
              /api-docs/openapi.yaml
            </code>
            で公開する予定です。Swagger UIによるインタラクティブなドキュメントも合わせて提供します。
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-bold text-slate-900">早期アクセス</h2>
          <p className="text-sm leading-7 text-slate-600">
            API β版の早期アクセスをご希望の方は、
            <a className="underline hover:text-emerald-700" href="/contact">
              お問い合わせフォーム
            </a>
            より「APIアーリーアクセス希望」とご記入のうえご連絡ください。
            利用ユースケースをお聞かせいただいた方を優先的にご案内します。
          </p>
        </section>
      </div>
    </div>
  );
}
