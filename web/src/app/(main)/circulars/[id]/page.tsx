import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ExternalLink, FileText, Share2 } from "lucide-react";
import { RelatedContent, type RelatedContentGroup } from "@/components/RelatedContent";
import { ArticleFeedback } from "@/components/ArticleFeedback";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import type { MhlwNotice } from "@/data/mhlw-notices";
import {
  isNoticeIndividuallyVerified,
  publicMhlwNotices,
} from "@/data/public-mhlw-notices";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT } from "@/data/source-snapshots/mhlw-heat-notice-0520-6";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { relatedFromNotice } from "@/lib/related-content";
import { ogImageUrl } from "@/lib/og-url";
import type { AccidentCase } from "@/lib/types/domain";
import { isIndexableAccident } from "@/lib/seo/index-quality";
import type { EvidenceRecord, InformationKind } from "@/lib/evidence/types";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

function findNotice(id: string): MhlwNotice | undefined {
  return publicMhlwNotices.find((n) => n.id === id);
}

function noticeIdentity(notice: MhlwNotice): string {
  return [
    notice.title.trim(),
    notice.noticeNumber?.trim() ?? "",
    (notice.issuedDateRaw ?? notice.issuedDate ?? "").trim(),
  ].join("\u0000");
}

function sameIdentityGroup(notice: MhlwNotice): MhlwNotice[] {
  const identity = noticeIdentity(notice);
  return publicMhlwNotices.filter((candidate) => noticeIdentity(candidate) === identity);
}

// generateStaticParams にないID（隔離対象を含む）を動的生成させない。
export const dynamicParams = false;

export function generateStaticParams() {
  return publicMhlwNotices.map((n) => ({ id: n.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) notFound();
  const identity = [notice.noticeNumber, notice.issuedDateRaw ?? notice.issuedDate]
    .filter(Boolean)
    .join("・");
  const identityGroup = sameIdentityGroup(notice);
  const sourceOrdinal = identityGroup.findIndex((candidate) => candidate.id === notice.id) + 1;
  const sourceDiscriminator =
    identityGroup.length > 1 ? `｜公開資料${sourceOrdinal}` : "";
  const title = `${notice.title}${identity ? `｜${identity}` : ""}${sourceDiscriminator}｜安全衛生関連文書`;
  const description = `${notice.noticeNumber ?? ""} ${notice.issuer ?? ""} ${
    notice.issuedDateRaw ?? notice.issuedDate ?? ""
  }。${identityGroup.length > 1 ? `同一標題で収録した公開資料${sourceOrdinal}/${identityGroup.length}。` : ""}本通達の概要、一次資料リンク、適用上の注意、関連事故事例、推奨保護具をまとめて確認できます。`.trim();
  return {
    title,
    description,
    robots: isNoticeIndividuallyVerified(notice)
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: `/circulars/${id}` },
    openGraph: {
      title: `${title}`,
      description,
      images: [{ url: ogImageUrl(notice.title, notice.noticeNumber ?? "厚労省通達"), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(notice.title)] },
  };
}

function noticeLegalPosition(notice: MhlwNotice): string {
  if (notice.docType === "告示") {
    return "告示。法令の委任に基づく場合等があるため、根拠法令、対象、告示本文を個別に確認してください。";
  }
  if (notice.docType === "通達") {
    return "行政機関内部の解釈・運用を示す通達。国民・事業者への義務は自動判定せず、根拠法令・告示・個別事実を確認してください。";
  }
  return "指針。根拠法令、対象範囲、遵守義務の有無を本文で個別に確認してください。";
}

function noticeInformationKind(notice: MhlwNotice): InformationKind {
  if (notice.docType === "告示") return "notification";
  if (notice.docType === "通達") return "circular";
  return "guidance";
}

function noticeEvidence(notice: MhlwNotice): EvidenceRecord {
  if (
    notice.id === "mhlw-notice-0014" &&
    isNoticeIndividuallyVerified(notice)
  ) {
    return {
      id: `${notice.id}-evidence`,
      informationKind: "circular",
      primarySources: [
        {
          registryId: "mhlw-heat-notice-0520-6",
          title: "厚生労働省 掲載ページ",
          publisher: "厚生労働省",
          documentNumber: notice.noticeNumber,
          url: notice.sourceUrl,
          role: "公式PDFへの掲載入口",
        },
        {
          registryId: "mhlw-heat-notice-0520-6",
          title: "基発0520第6号 公式PDF",
          publisher: "厚生労働省",
          documentNumber: notice.noticeNumber,
          url: notice.pdfUrl ?? notice.detailUrl,
          role: `${MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.locator}の該当抜粋まで照合`,
        },
      ],
      secondarySources: [],
      legalPosition:
        "安衛則第612条の2の施行・運用に関する通達。条文本文とは分けて確認します。",
      asOf: `${notice.issuedDate}発出。文書同一性と該当抜粋を2026-08-02に照合`,
      promulgatedAt: null,
      effectiveAt: null,
      retrievedAt: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.retrievedAt,
      humanReviewedAt: null,
      dataVersion: "2026-08-02 一次資料照合",
      scope:
        "文書番号、発出日、発出者、題名、32頁、PDF bytes、SHA-256、PDF 2ページの該当抜粋",
      exclusions: [
        "個別現場への法的適用判断",
        "通達全文をあらゆる主張の根拠にすること",
        "専門家・法務による監修",
      ],
      aiGenerated: false,
      humanReviewRequired: true,
      freshness: "unknown",
      verification: "primarySourceMatched",
      supersededBy: null,
      corrections: [],
    };
  }

  return {
    id: `${notice.id}-evidence`,
    informationKind: noticeInformationKind(notice),
    primarySources: [],
    secondarySources: [
      {
        registryId: "jaish-law-search",
        title: "安全衛生情報センター収録ページ",
        publisher: "中央労働災害防止協会",
        documentNumber: notice.noticeNumber,
        url: notice.detailUrl,
        role: "二次的な文書掲載ページ。厚生労働省の個別原文との一致確認は未記録です。",
      },
    ],
    legalPosition: noticeLegalPosition(notice),
    asOf: notice.issuedDate
      ? `${notice.issuedDate}発出。現在の有効性・後継文書は未確認`
      : null,
    promulgatedAt: null,
    effectiveAt: null,
    retrievedAt: null,
    humanReviewedAt: null,
    dataVersion: "mhlw-notices dataset / individual review pending",
    scope: "標題、文書番号、発出者、発出日、二次掲載URLの案内",
    exclusions: [
      "現行有効性の確定",
      "事業者への法的義務の自動判定",
      "厚生労働省個別原文との本文一致保証",
    ],
    aiGenerated: false,
    humanReviewRequired: true,
    freshness: "unknown",
    verification: "unverified",
    supersededBy: null,
    corrections: [],
  };
}

function pickRelatedAccidents(notice: MhlwNotice, all: AccidentCase[]): AccidentCase[] {
  const keyword = notice.category;
  const titleTokens = notice.title.match(/[一-龥]{2,}/g) ?? [];
  const matches = all.filter((c) => {
    if (!isIndexableAccident(c)) return false;
    const haystack = `${c.title} ${c.summary} ${c.workCategory} ${c.type}`;
    if (haystack.includes(keyword)) return true;
    return titleTokens.some((t) => haystack.includes(t));
  });
  return matches.slice(0, 3);
}

export default async function CircularDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) notFound();

  const url = `${SITE_BASE}/circulars/${notice.id}`;
  const identityGroup = sameIdentityGroup(notice);
  const sourceOrdinal = identityGroup.findIndex((candidate) => candidate.id === notice.id) + 1;
  const noticeIndex = publicMhlwNotices.findIndex((candidate) => candidate.id === notice.id);
  const previousNotice = noticeIndex > 0 ? publicMhlwNotices[noticeIndex - 1] : null;
  const nextNotice =
    noticeIndex >= 0 && noticeIndex < publicMhlwNotices.length - 1
      ? publicMhlwNotices[noticeIndex + 1]
      : null;

  const relatedAccidents = pickRelatedAccidents(notice, getAccidentCasesDataset());
  const individuallyVerified = isNoticeIndividuallyVerified(notice);
  // 共通スコアリング: 関連通達・追加事故・追加保護具を内部リンク強化として表示
  const linked = relatedFromNotice(notice, { limit: 6 });
  const relatedGroups: RelatedContentGroup[] = [
    {
      heading: "関連する他の通達・告示",
      description: "同カテゴリ・同キーワードの公開文書。法的位置付けは各本文で個別に確認してください。",
      accent: "sky",
      moreHref: "/circulars",
      moreLabel: "通達一覧",
      items: linked.notices,
    },
    {
      heading: "関連する事故事例（追加）",
      accent: "amber",
      moreHref: "/accidents",
      moreLabel: "事故DB",
      items: linked.accidents,
    },
  ];

  const description = individuallyVerified
    ? `厚生労働省の一次資料と個別照合した${notice.docType}「${notice.title}」（${notice.noticeNumber ?? ""}）。${notice.issuer ?? ""}・${notice.issuedDateRaw ?? notice.issuedDate ?? ""}。`
    : `二次索引に収録した${notice.docType}「${notice.title}」（${notice.noticeNumber ?? ""}）。${
        notice.issuer ?? ""
      }・${notice.issuedDateRaw ?? notice.issuedDate ?? ""}という登録情報は、個別原文との一致確認待ちです。`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link
          href="/circulars"
          className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          通達一覧
        </Link>
        <span>/</span>
        <span className="text-slate-700 line-clamp-1">{notice.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-950">
            {individuallyVerified ? "一次資料照合済み" : "法的位置付け: 個別確認"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">
            {notice.docType}
          </span>
          {notice.noticeNumber ? (
            <span className="text-[11px] text-slate-500">{notice.noticeNumber}</span>
          ) : null}
          {identityGroup.length > 1 ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800">
              同一標題の公開資料 {sourceOrdinal}/{identityGroup.length}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {notice.title}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
          {notice.issuer ? (
            <div>
              <dt className="inline font-bold text-slate-700">発出者: </dt>
              <dd className="inline">{notice.issuer}</dd>
            </div>
          ) : null}
          {notice.issuedDateRaw || notice.issuedDate ? (
            <div>
              <dt className="inline font-bold text-slate-700">発出日: </dt>
              <dd className="inline">{notice.issuedDateRaw ?? notice.issuedDate}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-bold text-slate-700">個別照合記録: </dt>
            <dd className="inline">
              {individuallyVerified
                ? "2026-08-02 独立一次資料照合"
                : "データ未収録（閲覧日を検証日として表示しません）"}
            </dd>
          </div>
          <div>
            <dt className="inline font-bold text-slate-700">カテゴリ: </dt>
            <dd className="inline">{notice.category}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-slate-700">個別監修状態: </dt>
            <dd className="inline">
              {individuallyVerified
                ? "専門・法務監修は未実施"
                : "未確認（確認者・確認日・本文確認は未収録）"}
            </dd>
          </div>
        </dl>
      </header>

      <EvidenceCard evidence={noticeEvidence(notice)} />

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900"><FileText className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />収録情報の概要</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {description}
          {individuallyVerified
            ? "該当抜粋は安衛則第612条の2の条文本文とは分けて確認できます。"
            : "詳細な本文、文書種別、現行性はリンク先と厚生労働省の一次資料でご確認ください。"}
        </p>
        {!individuallyVerified ? (
          <p className="mt-3 text-xs leading-5 text-slate-600">
            文書番号、標題、発出日をリンク先の一次資料で照合してから実務判断に使用してください。
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={notice.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <FileText className="h-3.5 w-3.5" /> 公式掲載ページ
            <ExternalLink className="h-3 w-3" />
          </a>
          {notice.pdfUrl ? (
            <a
              href={notice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              PDF
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          {notice.sourceUrl !== notice.detailUrl ? (
            <a
              href={notice.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              通達一覧（出典）
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </section>

      {/* シェア */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Share2 className="h-4 w-4" /> このページをシェア
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              notice.title
            )}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            X (Twitter) で共有
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Facebookで共有
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(notice.title)}&body=${encodeURIComponent(url)}`}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            メールで送る
          </a>
        </div>
      </section>

      {/* 関連事故事例 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />関連する事故事例</h2>
        {relatedAccidents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">該当事例は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {relatedAccidents.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {c.workCategory}
                  </span>
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    {c.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                  {c.summary}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/accidents"
          className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
        >
          事故DBを開く →
        </Link>
      </section>

      <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-sm font-bold text-amber-950">
          この通達だけでは保護具の商品を選定できません
        </h2>
        <p className="mt-2 text-xs leading-6 text-amber-950">
          通達の主題との語句一致は、規格、作業方法、濃度、機械条件、サイズへの適合を証明しません。
          リスクアセスメント、製品仕様、必要に応じてSDS・取扱説明書を確認し、工学的対策を先に検討してください。
        </p>
      </section>

      <RelatedContent
        title="さらに深掘り — 通達・事故"
        groups={relatedGroups}
      />

      <ArticleFeedback articleSlug={`circulars/${notice.id}`} />

      <nav aria-label="通達詳細の前後移動" className="mt-6 grid gap-2 sm:grid-cols-2">
        {previousNotice ? (
          <Link
            href={`/circulars/${previousNotice.id}`}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-emerald-300"
          >
            <span className="block text-[11px] text-slate-500">前の公開通達</span>
            <span className="line-clamp-2 font-semibold text-slate-800">{previousNotice.title}</span>
          </Link>
        ) : <span />}
        {nextNotice ? (
          <Link
            href={`/circulars/${nextNotice.id}`}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm hover:border-emerald-300"
          >
            <span className="block text-[11px] text-slate-500">次の公開通達</span>
            <span className="line-clamp-2 font-semibold text-slate-800">{nextNotice.title}</span>
          </Link>
        ) : null}
      </nav>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-600">
        <p>
          ※ 本ページは厚生労働省・労働基準局通達等の公開情報をもとに、安全AIポータル
          が一覧化したものです。法的判断・実務適用は必ず本文（出典元）と所管省庁の最新公表内容をご確認ください。
        </p>
        <p className="mt-1">
          個別照合完了日: <strong>{individuallyVerified ? "2026-08-02" : "未記録"}</strong>
          {individuallyVerified ? "（専門・法務監修は未実施）" : "（ページ閲覧日を検証日として扱いません）"}
        </p>
      </footer>
    </div>
  );
}
