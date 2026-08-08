import Link from "next/link";
import { Presentation, Workflow } from "lucide-react";
import {
  type AutomationCtaPosition,
} from "@/components/automation/automation-consult-cta";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

type AutomationServicePromoProps = {
  position: AutomationCtaPosition;
  availability: AutomationConsultAvailability;
  title?: string;
  description?: string;
  cta?: string;
  href?: string;
};

export function AutomationServicePromo({
  position,
  availability,
  title = "この業務の効率化・自動化も相談できます",
  description = "小さな定型作業から、集計・通知・帳票・社内教育まで。初回30分無料で内容と料金目安を整理します。",
  cta = "現場業務の効率化を相談する",
  href,
}: AutomationServicePromoProps) {
  const effectiveDescription = availability.accepting
    ? description
    : `${availability.label}。個人情報は入力せず、料金・モデルケース・必要資料をご確認ください。受付再開後の初回30分相談は無料です。`;
  const effectiveTitle = availability.accepting
    ? title
    : "料金・対応範囲と現在の受付状況を確認できます";
  const effectiveCta = availability.accepting
    ? cta
    : "料金・受付状況を見る";
  const effectiveHref = availability.accepting
    ? (href ?? "/services/automation#consult-form")
    : "/services/automation";
  return (
    <aside
      aria-label="業務自動化・講習・資料作成の相談"
      className="mx-auto my-8 max-w-7xl px-4"
    >
      <div className="rounded-2xl border border-sky-300 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/40 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-800 text-white">
            {position === "education" ? (
              <Presentation className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Workflow className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-sky-950 dark:text-sky-100">{effectiveTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-sky-900 dark:text-sky-200">{effectiveDescription}</p>
          </div>
        </div>
        <Link
          href={effectiveHref}
          prefetch={false}
          data-automation-cta-position={position}
          className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-sky-800 px-5 py-3 text-center text-sm font-bold text-white hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 sm:mt-0"
        >
          {effectiveCta}
        </Link>
      </div>
    </aside>
  );
}
