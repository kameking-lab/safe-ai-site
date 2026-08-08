import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  AlertTriangle,
  FileText,
  RotateCcw,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { AccidentActionBar } from "@/components/accidents/action-bar";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import {
  ACCIDENT_PROVENANCE_INFO,
  resolveAccidentProvenance,
  resolveAccidentSource,
} from "@/lib/accident-source";
import { ogImageUrl } from "@/lib/og-url";
import type { AccidentCase } from "@/lib/types/domain";
import { PageContainer } from "@/components/layout/page-container";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { AccidentTypePictogram } from "@/components/accidents/accident-type-pictogram";
import { StatusBadge } from "@/components/ui/status-badge";
import { SEVERITY_VISUAL } from "@/lib/accidents/accident-visual";
import { isIndexableAccident } from "@/lib/seo/index-quality";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import type { EvidenceRecord } from "@/lib/evidence/types";
import { getVisualKyScenariosByAccidentId } from "@/data/visual-ky";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

// Only manually verified MHLW records are reachable. Keep this request-bound so
// quarantined IDs fail closed without a static nonce/not-found conflict.
export const dynamic = "force-dynamic";

function findAccident(id: string): AccidentCase | undefined {
  return getAccidentCasesDataset().find((c) => c.id === id);
}

/**
 * 詳細本文・metadata・JSON-LD・CTAが同じ公開境界を通るようにする。
 * ID形式だけでは公開せず、個票を一次資料と照合済みのMHLW事例だけを返す。
 */
function findPublicAccident(id: string): AccidentCase {
  const accident = findAccident(id);
  if (!accident || resolveAccidentProvenance(accident) !== "mhlw") {
    notFound();
  }
  return accident;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const accident = findPublicAccident(id);
  const title = `${accident.title}｜事故事例詳細`;
  const description = `${accident.workCategory} ${accident.severity}「${accident.title}」（${accident.occurredOn}）の事故概要・原因・再発防止策と関連する保護具・KY起票・関連法令を確認できます。`;
  return {
    title,
    description,
    alternates: { canonical: `/accidents/${id}` },
    robots: isIndexableAccident(accident)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${title}`,
      description,
      images: [{ url: ogImageUrl(accident.title, accident.type), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(accident.title)] },
  };
}

function pickSimilarAccidents(target: AccidentCase, all: AccidentCase[], limit = 3): AccidentCase[] {
  return all
    .filter(
      (c) =>
        c.id !== target.id &&
        c.type === target.type &&
        c.workCategory === target.workCategory &&
        isIndexableAccident(c),
    )
    .slice(0, limit);
}

function buildAccidentEvidence(
  accident: AccidentCase,
  source: ReturnType<typeof resolveAccidentSource>,
): EvidenceRecord {
  const provenance = resolveAccidentProvenance(accident);
  const sourceEntry = source?.url
    ? {
        registryId: provenance === "mhlw" ? "mhlw-anzeninfo" : undefined,
        title: source.site,
        publisher: provenance === "mhlw" ? "厚生労働省" : undefined,
        documentNumber: source.caseId ?? null,
        url: source.url,
        role:
          provenance === "mhlw"
            ? "個別公表事例への参照URL。内容は公式ページで再確認してください。"
            : "編集再構成に用いた公開資料。表示内容は原資料そのものではありません。",
      }
    : null;
  const isModel = provenance === "synthetic" || provenance === "preliminary";

  return {
    id: `accident-${accident.id}`,
    informationKind:
      provenance === "mhlw"
        ? "officialAccident"
        : provenance === "curated"
          ? "curatedAccident"
          : "syntheticCase",
    primarySources:
      provenance === "mhlw" && sourceEntry ? [sourceEntry] : [],
    secondarySources:
      provenance === "curated" && sourceEntry ? [sourceEntry] : [],
    legalPosition:
      provenance === "mhlw"
        ? "公表された事故情報。法令本文・行政処分・裁判判断そのものではありません。"
        : isModel
          ? "教育検討用の架空・集計ベースモデル。法令判断や実在事故の根拠には使えません。"
          : "公開情報をもとにしたサイト編集事例。原資料と同一の個票ではありません。",
    asOf: accident.occurredOn || null,
    promulgatedAt: null,
    effectiveAt: null,
    retrievedAt: null,
    humanReviewedAt: null,
    dataVersion: "accident-cases-2026-07-24",
    scope: `${accident.workCategory}における${accident.type}の学習・再発防止検討`,
    exclusions: [
      "個別事業場の法令適合性の確定",
      "関係者・事業者の責任認定",
      "現場確認なしでのKY・教育資料への確定転記",
    ],
    aiGenerated: false,
    humanReviewRequired: true,
    freshness: isModel ? "quarantined" : "unknown",
    verification:
      isModel
        ? "quarantined"
        : sourceEntry
          ? "sourceLocated"
          : "unverified",
    supersededBy: null,
    corrections:
      accident.id === "synthetic-heat-2026-001"
        ? [
            {
              correctedAt: "2026-07-24",
              summary:
                "公式個別事故に見える識別子と未検証の法的断定を廃止し、架空モデルとして隔離表示しました。",
              previousState:
                "mhlw-2026-001 の識別子で、集計資料からは確認できない個別日付・法的義務を含む表示",
              affectedArea: "事故詳細、検索、KY候補、AI根拠、sitemap",
            },
          ]
        : [],
  };
}

export default async function AccidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accident = findPublicAccident(id);
  const provenance = resolveAccidentProvenance(accident);
  const source = resolveAccidentSource(accident);
  const provenanceInfo = ACCIDENT_PROVENANCE_INFO[provenance];
  const evidence = buildAccidentEvidence(accident, source);
  const url = `${SITE_BASE}/accidents/${accident.id}`;
  const similar = pickSimilarAccidents(accident, getAccidentCasesDataset());
  const relatedVisualKy = getVisualKyScenariosByAccidentId(accident.id)[0];

  return (
    <PageContainer width="prose">
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "ホーム", url: SITE_BASE },
            { name: "事故データベース", url: `${SITE_BASE}/accidents` },
            { name: accident.title, url },
          ]),
        ]}
      />

      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link
          href="/accidents"
          className="inline-flex min-h-[44px] items-center gap-1 hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          事故データベース
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-slate-700">{accident.title}</span>
      </nav>

      <header className="mb-6">
        {/* 柱0: 型ピクトグラムを主役に、3秒で「何の事故か・どれだけ重いか」が分かるヘッダー */}
        <div className="flex items-center gap-3">
          <AccidentTypePictogram type={accident.type} size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-slate-900">{accident.type}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge
                tone={SEVERITY_VISUAL[accident.severity].tone}
                variant={SEVERITY_VISUAL[accident.severity].variant}
              >
                {accident.severity}
              </StatusBadge>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                {provenanceInfo.label}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
            {accident.title}
          </h1>
          {/* P2-4: 事故事例のお気に入り（ブックマーク） */}
          <FavoriteButton
            kind="accident"
            id={accident.id}
            title={accident.title}
            subtitle={`${accident.workCategory}／${accident.type}／${accident.severity}`}
            href={`/accidents/${accident.id}`}
            variant="normal"
          />
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <dt className="font-bold text-slate-700">発生日:</dt>
            <dd>{accident.occurredOn}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <dt className="font-bold text-slate-700">業種:</dt>
            <dd>{accident.industry_detail ?? accident.workCategory}</dd>
          </div>
        </dl>
      </header>

      {/* 事故概要 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900"><FileText className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />事故概要</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">{accident.summary}</p>
      </section>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-800">
          出典と記録
        </summary>
        <div className="mt-3">
          <EvidenceCard evidence={evidence} />
        </div>
      </details>

      {/* 原因 */}
      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          主な原因
        </h2>
        <ul className="mt-2 space-y-1.5">
          {accident.mainCauses.map((cause, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
              <span className="mt-0.5 shrink-0 text-amber-600">▶</span>
              {cause}
            </li>
          ))}
        </ul>
      </section>

      {/* 再発防止策 */}
      <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-emerald-900">
          <ShieldCheck className="h-4 w-4" />
          再発防止策
        </h2>
        <ul className="mt-2 space-y-1.5">
          {accident.preventionPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
              <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* 固定アクションバー（PCはinline、モバイルはsticky） */}
      <section className="mt-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-bold text-slate-900">次に行うこと</h2>
          <AccidentActionBar accident={accident} variant="inline" />
          <Link
            href={
              relatedVisualKy
                ? `/training/visual-ky/${relatedVisualKy.slug}`
                : "/training/visual-ky"
            }
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-950 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          >
            {relatedVisualKy
              ? "この事故に近いKYTを学ぶ"
              : "事故類型からビジュアルKYTを選ぶ"}
          </Link>
        </div>
      </section>

      {/* 類似事例 */}
      {similar.length > 0 && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900"><RotateCcw className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />類似する事故事例</h2>
          <ul className="mt-3 space-y-2">
            {similar.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-rose-100 py-0.5 pl-0.5 pr-1.5 text-[10px] font-bold text-rose-800">
                    <AccidentTypePictogram type={c.type} size="sm" />
                    {c.type}
                  </span>
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                    {c.workCategory}
                  </span>
                  <span className="text-[10px] text-slate-500">{c.occurredOn}</span>
                </div>
                <Link
                  href={`/accidents/${c.id}`}
                  className="mt-1 flex min-h-[44px] items-center text-xs font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                >
                  {c.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">{c.summary}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/accidents"
            className="mt-3 inline-flex min-h-[44px] items-center px-2 text-xs font-bold text-emerald-700 hover:underline"
          >
            事故DBに戻る →
          </Link>
        </section>
      )}

      {/* モバイル用sticky action bar */}
      <AccidentActionBar accident={accident} variant="sticky" />

    </PageContainer>
  );
}
