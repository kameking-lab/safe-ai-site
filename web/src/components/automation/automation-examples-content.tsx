import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleOff,
  Database,
  FlaskConical,
  Settings2,
} from "lucide-react";
import {
  getAutomationSamples,
  getFeaturePortfolioLabels,
} from "@/config/feature-portfolio";
import { MascotGuide } from "@/components/mascot-guide";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

/**
 * Safety Labs 集約ページの本文。
 *
 * サンプルと正式な主力機能を混同させないため、ポートフォリオの Tier 3 だけを表示し、
 * 利用可否・不足する外部設定・データの扱いを各カードで同じ順序に固定する。
 */
export function AutomationExamplesContent() {
  const samples = getAutomationSamples();
  const availability = getAutomationConsultAvailability();
  const mailAvailable = availability.contactMode === "mail_client";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="portal-surface-emphasis grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:items-center">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="portal-status portal-status-sample min-h-7 gap-1.5 px-3 py-1">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Safety Labs
          </span>
          <span className="portal-status px-3 py-1">
            自動化サンプル
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-brand-secondary dark:text-white sm:text-4xl">
          安全業務の自動化サンプル
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-portal-muted">
          サイト内で試せる業務改善の例です。正式な主力機能や導入済みシステムではありません。
          できることと制限を確認してからお試しください。
        </p>
      </header>
      <MascotGuide
        variant="automation"
        title="自動化で変えられる流れを見つけよう"
        message="試せる範囲と本番導入の違いを、先に確認できます。"
      />
      </div>

      <section className="mt-8" aria-labelledby="automation-sample-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-semantic-ai">
              {samples.length}件のモデルケース
            </p>
            <h2
              id="automation-sample-list-heading"
              className="mt-1 text-xl font-black text-brand-secondary dark:text-white sm:text-2xl"
            >
              試せるサンプル
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-portal-muted">
            本番利用には、自社ルール・認証・権限・保存先などの個別設計が必要になる場合があります。
          </p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2" role="list">
          {samples.map((feature) => {
            const sample = feature.automationSample;
            if (!sample) return null;
            const labels = getFeaturePortfolioLabels(feature);

            return (
              <article
                key={feature.id}
                role="listitem"
                className="portal-surface flex min-w-0 flex-col p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="portal-status portal-status-sample">
                    {sample.maturityLabel}
                  </span>
                  <span className="portal-status">
                    {labels.status}
                  </span>
                  <span className="sr-only">
                    {labels.tier}、{labels.role}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-black text-brand-secondary dark:text-white">
                  {feature.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-portal-muted">
                  {feature.userValue}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <section aria-label={`${feature.label}でできること`}>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-semantic-success">
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      できること
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-portal-muted">
                      {sample.canDo.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true">・</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section aria-label={`${feature.label}でできないこと`}>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-semantic-danger">
                      <CircleOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                      できないこと
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-portal-muted">
                      {sample.cannotDo.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden="true">・</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="mt-5 space-y-3 border-t border-portal-border pt-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Settings2
                      className="mt-0.5 h-4 w-4 shrink-0 text-portal-muted"
                      aria-hidden="true"
                    />
                    <div>
                      <h4 className="font-bold text-brand-secondary dark:text-white">
                        必要な外部設定
                      </h4>
                      <ul className="mt-1 space-y-1 leading-6 text-portal-muted">
                        {sample.requiredSettings.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Database
                      className="mt-0.5 h-4 w-4 shrink-0 text-portal-muted"
                      aria-hidden="true"
                    />
                    <div>
                      <h4 className="font-bold text-brand-secondary dark:text-white">
                        データの扱い
                      </h4>
                      <p className="mt-1 leading-6 text-portal-muted">
                        {sample.dataHandling}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    href={feature.route}
                    className="portal-button-secondary min-h-11 border-semantic-ai text-semantic-ai focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-semantic-ai/25"
                  >
                    {sample.maturityLabel}を試す
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside
        aria-labelledby="automation-consult-status-heading"
        className="portal-surface-emphasis mt-10 border-l-4 border-l-semantic-ai p-5 sm:p-7"
      >
        <p className="text-xs font-bold tracking-wide text-semantic-ai">
          自社向けの調整
        </p>
        <h2
          id="automation-consult-status-heading"
          className="mt-1 text-xl font-black text-brand-secondary dark:text-white"
        >
          {availability.label}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-portal-muted">
          {mailAvailable
            ? "Webフォームへ個人情報を入力せず、お使いのメールアプリから相談できます。対応範囲と料金目安も確認できます。"
            : "現在は個人情報を入力する相談フォームを表示していません。対応範囲と料金目安は確認できます。"}
        </p>
        <Link
          href={mailAvailable ? "/contact/automation-email" : "/services/automation"}
          className="portal-button-ai mt-4 min-h-11 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-semantic-ai/25"
        >
          {mailAvailable ? "メールで相談する" : "自動化例・料金を見る"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

export default AutomationExamplesContent;
