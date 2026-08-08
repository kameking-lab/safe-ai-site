import { ArrowRight, Workflow } from "lucide-react";
import { AutomationConsultCta } from "@/components/automation/automation-consult-cta";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";

const CONSULTATION_AREAS = [
  "業務自動化",
  "安全衛生業務の効率化",
  "AI活用相談",
  "講習・研修",
  "講習会資料",
  "マニュアル・手順書",
] as const;

export function HomeAutomationService({
  availability,
}: {
  availability: AutomationConsultAvailability;
}) {
  return (
    <section
      id="home-automation"
      aria-labelledby="home-automation-heading"
      className="scroll-mt-24 border-y border-semantic-ai bg-brand-secondary-solid px-4 py-7 text-white forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
      data-home-section="automation-consult"
    >
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black tracking-wide text-cyan-200 forced-colors:text-[CanvasText]">
            <Workflow className="h-4 w-4" aria-hidden="true" />
            自動化相談
          </p>
          <h2
            id="home-automation-heading"
            aria-label="安全管理や定型業務の自動化をご相談ください"
            className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl forced-colors:text-[CanvasText]"
          >
            定型作業・講習・資料づくりを相談
          </h2>
          <ul
            className="mt-3 flex flex-wrap gap-2 text-[11px] font-black"
            aria-label="相談できる業務"
          >
            {CONSULTATION_AREAS.map((area) => (
              <li
                key={area}
                className="rounded-full border border-white/35 bg-white/10 px-2.5 py-1.5"
              >
                {area}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/10 p-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <p className="rounded-xl bg-slate-950/70 p-3 text-sm font-black">
              初回30分無料
            </p>
            <p className="rounded-xl bg-slate-950/70 p-3 text-sm font-black">
              税込33,000円から
            </p>
          </div>
          <p
            role="status"
            className={`mt-3 rounded-xl border-2 px-3 py-2 text-sm font-black ${
              availability.accepting
                ? "border-semantic-success text-white"
                : "border-brand-accent text-white"
            }`}
          >
            現在の受付状態：{availability.label}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <AutomationConsultCta
              position="home_pricing"
              href="/services/automation#pricing"
              className="border border-white/60 bg-white/10 px-3 text-white hover:bg-white/20"
            >
              料金を見る
            </AutomationConsultCta>
            <AutomationConsultCta
              position="home_examples"
              href="/automation-examples"
              className="border border-white/60 bg-white/10 px-3 text-white hover:bg-white/20"
            >
              自動化例を見る
            </AutomationConsultCta>
            <AutomationConsultCta
              position="home_primary"
              href={
                availability.contactMode === "mail_client"
                  ? "/contact/automation-email"
                  : "/services/automation#consult-form"
              }
              className="col-span-2 bg-semantic-ai-solid px-3 text-white hover:bg-semantic-ai-solid-hover sm:col-span-1"
            >
              {availability.contactMode === "mail_client"
                ? "メールで相談する"
                : availability.accepting
                  ? "無料相談を始める"
                  : "料金と例を見る"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </AutomationConsultCta>
          </div>
          {!availability.accepting ? (
            <p className="mt-2 text-xs leading-5 text-slate-200">
              現在は相談受付を停止しています。料金と必要資料は確認できます。
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
