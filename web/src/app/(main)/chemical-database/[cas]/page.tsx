import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FlaskConical,
  ShieldAlert,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  CONCENTRATION_LIMITS,
  findByCas,
  normalizeCas,
} from "@/lib/mhlw-chemicals";
import { RegulationTagsSection } from "@/components/regulation-tags-section";
import { RegulationSummarySection } from "@/components/chemical/regulation-summary-section";
import { RegulationTagBadgeList } from "@/components/regulation-tag-badge";
import { CONSTRUCTION_PRIORITY_CAS_SET } from "@/lib/regulation-tag-labels";
import { OshaRegulationsSection } from "@/components/chemical/osha-regulations-section";

type Params = Promise<{ cas: string }>;

export const revalidate = 2592000;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { cas: rawCas } = await params;
  const cas = decodeURIComponent(rawCas);
  const entry = CONCENTRATION_LIMITS.substances[normalizeCas(cas)];
  if (!entry) {
    return { title: "化学物質が見つかりません" };
  }
  const name = entry.name ?? `CAS ${cas}`;
  return {
    title: `${name} (CAS ${cas}) | 化学物質データベース | 安全AI`,
    description: `${name} の濃度基準値・GHS 区分・関連法令 (化管法/PRTR・化審法・毒劇法等) を出典付きで確認できます。`,
    alternates: { canonical: `/chemical-database/${cas}` },
  };
}

export default async function ChemicalDetailPage({
  params,
}: {
  params: Params;
}) {
  const { cas: rawCas } = await params;
  const cas = normalizeCas(decodeURIComponent(rawCas));
  const entry = CONCENTRATION_LIMITS.substances[cas];
  if (!entry) notFound();

  const merged = findByCas(cas);
  const name = entry.name ?? merged?.primaryName ?? `CAS ${cas}`;
  const isPriority = CONSTRUCTION_PRIORITY_CAS_SET.has(cas);

  return (
    <PageContainer width="full">
      <Breadcrumb
        items={[
          { name: "化学物質データベース", href: "/chemical-database" },
          { name },
        ]}
      />
      <div className="mt-4 space-y-6">
        <header className="space-y-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-7 h-7 text-amber-600" aria-hidden="true" />
              {name}
            </h1>
            {isPriority && (
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-xs font-medium">
                建設業頻出
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            CAS 番号: <span className="font-mono">{cas}</span>
            {entry.nameEn ? ` / ${entry.nameEn}` : null}
          </p>
          {entry.regulationTags && entry.regulationTags.length > 0 && (
            <div className="pt-1">
              <RegulationTagBadgeList tags={entry.regulationTags} maxVisible={9} size="sm" />
            </div>
          )}
        </header>

        {/* P0-2/P1-2/P1-6/P2-3: 全法律ワンストップ・サマリー（該当法律＋土壌＋物性型要確認＋特殊健診）を最上部に。 */}
        <RegulationSummarySection cas={cas} regulationTags={entry.regulationTags} />

        <ConcentrationLimitsBlock entry={entry} />

        {entry.niteGhsClassifications && (
          <NiteGhsBlock classifications={entry.niteGhsClassifications} />
        )}

        {/* P0-009 (usability-audit-day2): 安衛法 特別則 (特化則/有機則/酸欠則/
            粉じん則/石綿則) を CAS から自動引き当てて表示。製造業/建設業の
            最頻 22 物質に該当する場合のみセクション表示。 */}
        <OshaRegulationsSection cas={cas} />

        <RegulationTagsSection entry={entry} variant="page" />

        <CrossLinksBlock cas={cas} name={name} />
      </div>
    </PageContainer>
  );
}

function ConcentrationLimitsBlock({
  entry,
}: {
  entry: NonNullable<(typeof CONCENTRATION_LIMITS.substances)[string]>;
}) {
  const has =
    entry.twa || entry.stel || entry.ceiling || entry.carcinogenicity?.iarc;
  if (!has) return null;
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-3">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        濃度基準値・発がん性分類
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {entry.twa && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              八時間時間加重平均 (TWA)
            </dt>
            <dd className="font-medium">
              {entry.twa.value} {entry.twa.unit}
              {entry.twa.source && (
                <span className="ml-2 text-xs text-slate-500">
                  出典: {entry.twa.source}
                </span>
              )}
            </dd>
          </div>
        )}
        {entry.stel && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              短時間ばく露限界値 (STEL)
            </dt>
            <dd className="font-medium">
              {entry.stel.value} {entry.stel.unit}
              {entry.stel.source && (
                <span className="ml-2 text-xs text-slate-500">
                  出典: {entry.stel.source}
                </span>
              )}
            </dd>
          </div>
        )}
        {entry.ceiling && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              天井値 (Ceiling)
            </dt>
            <dd className="font-medium">
              {entry.ceiling.value} {entry.ceiling.unit}
            </dd>
          </div>
        )}
        {entry.carcinogenicity?.iarc && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              IARC 発がん性分類
            </dt>
            <dd className="font-medium">
              Group {entry.carcinogenicity.iarc}
              {entry.carcinogenicity.monograph && (
                <span className="ml-2 text-xs text-slate-500">
                  ({entry.carcinogenicity.monograph})
                </span>
              )}
            </dd>
          </div>
        )}
        {entry.carcinogenicity?.ghsClass && (
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              GHS 発がん性区分 (NITE)
            </dt>
            <dd className="font-medium">{entry.carcinogenicity.ghsClass}</dd>
          </div>
        )}
      </dl>
      {entry.mhlwSdsUrl && (
        <a
          href={entry.mhlwSdsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 underline hover:no-underline"
        >
          厚労省 SDS (PDF) を開く
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

function NiteGhsBlock({
  classifications,
}: {
  classifications: NonNullable<
    (typeof CONCENTRATION_LIMITS.substances)[string]["niteGhsClassifications"]
  >;
}) {
  const labels: Record<string, string> = {
    carcinogen: "発がん性",
    mutagen: "生殖細胞変異原性",
    reproTox: "生殖毒性",
    skinSens: "皮膚感作性",
    respSens: "呼吸器感作性",
    skinCorrIrr: "皮膚腐食性/刺激性",
    eyeDamageIrr: "眼に対する重篤な損傷性/眼刺激性",
    stotSingle: "特定標的臓器毒性 (単回)",
    stotRepeat: "特定標的臓器毒性 (反復)",
    aspiration: "誤えん有害性",
  };
  const items = Object.entries(classifications).filter(([, v]) => v);
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/40 p-6 space-y-3">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-sky-700" aria-hidden="true" />
        政府版 GHS 主要有害性区分 (NITE)
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-sky-200/50 pb-1">
            <dt className="text-slate-600 dark:text-slate-400">{labels[k] ?? k}</dt>
            <dd className="font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CrossLinksBlock({ cas, name }: { cas: string; name: string }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          この物質でリスクアセスメントを開始
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {name} を選択した状態で /chemical-ra に遷移します。
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/chemical-ra?cas=${encodeURIComponent(cas)}`}
          className="inline-flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-sm font-medium"
        >
          RAを開始
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <Link
          href="/chemical-database"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          一覧に戻る
        </Link>
      </div>
    </section>
  );
}
