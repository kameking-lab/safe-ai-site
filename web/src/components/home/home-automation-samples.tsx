import Link from "next/link";
import { ArrowRight, FlaskConical, Settings2 } from "lucide-react";
import { getAutomationSamples } from "@/config/feature-portfolio";

export function HomeAutomationSamples() {
  const samples = getAutomationSamples().slice(0, 3);
  return (
    <section
      id="home-labs"
      aria-labelledby="home-automation-samples"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 py-7"
      data-home-section="safety-labs"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,.62fr)_minmax(0,1.38fr)] lg:items-center">
        <header>
          <span className="portal-status inline-flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            自動化サンプル
          </span>
          <h2
            id="home-automation-samples"
            className="mt-2 text-2xl font-black text-brand-secondary dark:text-white"
          >
            安全業務の自動化サンプル
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-portal-muted">
            業務別の例から試せます。
          </p>
          <Link href="/automation-examples" className="portal-button-secondary mt-3">
            サンプルをすべて見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-bold text-portal-muted sm:hidden">
            全3件。横にスクロールできます。
          </p>
          <ul
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0"
            aria-label="自動化の代表サンプル3件"
          >
          {samples.map((feature) => (
            <li
              key={feature.id}
              data-feature-tier="3"
              data-feature-role="automation-sample"
              className="portal-surface flex min-w-[78%] snap-start flex-col p-3 sm:min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="portal-status">
                  {feature.automationSample?.maturityLabel ?? "サンプル"}
                </span>
                <Settings2 className="h-4 w-4 text-semantic-ai" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-black text-brand-secondary dark:text-white">
                {feature.label}
              </h3>
              <p className="mt-1 line-clamp-2 flex-1 text-xs leading-5 text-portal-muted">
                {feature.userValue}
              </p>
              <Link
                href={feature.route}
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-black text-brand-primary underline underline-offset-4"
              >
                試して確認
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
