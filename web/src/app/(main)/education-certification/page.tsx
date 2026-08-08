import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpen, HardHat, Users, Award } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { ogImageUrl } from "@/lib/og-url";
import { getCertsByType, CERT_TYPE_LABELS, CERT_TYPE_COLORS } from "@/lib/education-cert-engine";
import type { EducationCert } from "@/types/education-cert";
import { UsageNotesLink } from "@/components/usage-notes-link";

const TITLE = "特別教育・技能講習の候補検索｜適用条件を公式資料で確認";
const DESCRIPTION =
  "作業条件から特別教育、技能講習、作業主任者、免許の候補と講習時間を確認できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education-certification" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

/** 資格区分ごとのピクトグラム（言葉でなくアイコンで3区分＋免許を見分ける） */
const CERT_TYPE_ICON: Record<EducationCert["certType"], LucideIcon> = {
  special_education: HardHat,
  skill_training: BookOpen,
  job_chief: Users,
  license: Award,
};

/** セクションへ飛ぶアンカーID（カウントタイルのタップ先） */
const CERT_TYPE_ANCHOR: Record<EducationCert["certType"], string> = {
  special_education: "sec-special",
  skill_training: "sec-skill",
  job_chief: "sec-chief",
  license: "sec-license",
};

/** デカ数字＋区分ピクトグラムのカウントタイル（タップで該当セクションへ・44px以上） */
function CertCountTile({ certs, type }: { certs: EducationCert[]; type: EducationCert["certType"] }) {
  const colors = CERT_TYPE_COLORS[type];
  const label = CERT_TYPE_LABELS[type];
  const Icon = CERT_TYPE_ICON[type];
  return (
    <a
      href={`#${CERT_TYPE_ANCHOR[type]}`}
      className={`flex min-h-[44px] flex-col rounded-xl border-2 p-4 transition hover:opacity-90 ${colors.badge}`}
    >
      <Icon className="h-7 w-7" aria-hidden />
      <p className="mt-2 text-4xl font-bold leading-none tracking-tight">
        {certs.length}
        <span className="ml-1 text-base font-bold">種</span>
      </p>
      <p className="mt-1 text-sm font-bold leading-tight">{label}</p>
    </a>
  );
}

function CertCard({ cert }: { cert: EducationCert }) {
  const colors = CERT_TYPE_COLORS[cert.certType];
  const label = CERT_TYPE_LABELS[cert.certType];
  const Icon = CERT_TYPE_ICON[cert.certType];
  return (
    <div className={`rounded-lg border bg-white p-3 shadow-sm border-l-4 ${colors.border} dark:bg-slate-800`}>
      <div className="flex flex-wrap items-start gap-2">
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </span>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cert.name}</p>
      </div>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{cert.relatedLaw}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium">講習時間:</span> {cert.duration}
      </p>
      {cert.primarySources?.slice(0, 1).map((source) => (
        <a
          key={`${cert.id}-${source.url}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300"
        >
          公式原文
        </a>
      ))}
    </div>
  );
}

function CertSection({
  type,
  certs,
  note,
}: {
  type: EducationCert["certType"];
  certs: EducationCert[];
  note?: string;
}) {
  const Icon = CERT_TYPE_ICON[type];
  const colors = CERT_TYPE_COLORS[type];
  return (
    <section id={CERT_TYPE_ANCHOR[type]} className="mb-8 scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${colors.header}`} aria-hidden />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {CERT_TYPE_LABELS[type]} — {certs.length}種
        </h2>
      </div>
      {note && <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {certs.map((cert) => (
          <CertCard key={cert.id} cert={cert} />
        ))}
      </div>
    </section>
  );
}

export default function EducationCertificationPage() {
  const specialEd = getCertsByType("special_education");
  const skillTr = getCertsByType("skill_training");
  const jobChief = getCertsByType("job_chief");
  const licenses = getCertsByType("license");
  const total = specialEd.length + skillTr.length + jobChief.length + licenses.length;

  return (
    <>
      <PageJsonLd
        name="特別教育・技能講習の候補検索"
        description={DESCRIPTION}
        path="/education-certification"
        keywords={["特別教育 候補検索", "技能講習 確認", "フルハーネス 特別教育", "作業主任者 適用条件", "資格 公式資料"]}
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">作業から資格を確認</h1>
              <span data-status-badge className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-950">{total}種</span>
            </div>
            <p data-page-description className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">作業条件から特別教育・技能講習・免許の候補を絞ります。</p>
            <Link href="/education-certification/finder" prefetch={false} data-primary-action="true" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">資格候補を確認する</Link>
          </header>

          {/* 区分ピクトグラムから各一覧へ直接移動する。 */}
          <details className="mb-8 mt-5 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">制度別一覧</summary>
            <section id="certification-types" aria-label="資格区分別の収録数" className="grid scroll-mt-24 grid-cols-2 gap-3 border-t border-slate-200 py-3 sm:grid-cols-4 sm:gap-4">
              <CertCountTile certs={specialEd} type="special_education" />
              <CertCountTile certs={skillTr} type="skill_training" />
              <CertCountTile certs={jobChief} type="job_chief" />
              <CertCountTile certs={licenses} type="license" />
            </section>
            <div className="border-t border-slate-200 pt-5">
              <CertSection type="special_education" certs={specialEd} />
              <CertSection type="skill_training" certs={skillTr} />
              <CertSection type="job_chief" certs={jobChief} />
              <CertSection
                type="license"
                certs={licenses}
                note="国家試験合格または都道府県労働局長による交付が必要。技能講習修了では代替できない就業制限業務の最上位資格。"
              />
            </div>
            {/* 制度差と公式確認先は一覧を開いた人だけが必要時に読む。 */}
            <CollapsibleDetail
              summary="制度の違いと公式確認"
              className="mb-4"
            >
              <ul className="space-y-1.5">
                <li><strong>特別教育</strong>（安衛法第59条第3項・安衛則第36条）: 対象業務と実施内容を現行条文で確認します。</li>
                <li><strong>技能講習（就業制限）</strong>（安衛法第61条・安衛令第20条）: 修了者または免許取得者のみが従事できる業務（就業制限）。</li>
                <li><strong>職長教育</strong>（安衛法第60条・安衛則第40条）: 製造業等で新たに職長等となる者への義務教育。</li>
                <li><strong>免許・就業制限</strong>（安衛法第61条・安衛令第20条）: 業務、能力、方式ごとの区分を現行条文と公式案内で確認します。</li>
              </ul>
              <nav aria-label="関連情報" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-3">
                <Link href="/law-search" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline underline-offset-4">
                  条文検索
                </Link>
                <Link href="/chatbot" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline underline-offset-4">
                  安衛法AI
                </Link>
              </nav>
            </CollapsibleDetail>
          </details>
          <UsageNotesLink className="mb-6 inline-flex min-h-11 items-center text-blue-700" />
        </div>
      </div>
    </>
  );
}
