import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { GraduationCap, BookOpen, ChevronRight, HardHat, Users, Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { CrossToolLinks } from "@/components/cross-tool-links";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { ogImageUrl } from "@/lib/og-url";
import { getCertsByType, CERT_TYPE_LABELS, CERT_TYPE_COLORS } from "@/lib/education-cert-engine";
import type { EducationCert } from "@/types/education-cert";

const TITLE = "特別教育・技能講習データベース｜業務別必要資格を自動判定";
const DESCRIPTION =
  "特別教育 60種類 一覧＆技能講習 40種データベース — フルハーネス・足場・低圧電気など安衛則第36条の特別教育と安衛法第76条の技能講習を業種・作業から即時判定。作業主任者 選任 種類・根拠条文・講習時間付き。";

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
        <span className="font-medium">時間:</span> {cert.duration}
      </p>
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
        name="特別教育・技能講習データベース"
        description={DESCRIPTION}
        path="/education-certification"
        keywords={["特別教育 60種類 一覧", "技能講習 40種 データベース", "フルハーネス 義務化 特別教育", "作業主任者 選任 種類", "安衛則第36条 特別教育"]}
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <PageHeader
          title="特別教育・技能講習データベース"
          description="安衛則第36条・安衛法第76条に基づく全種目。業種・作業から必要資格を判定。"
          icon={GraduationCap}
          iconColor="blue"
          badge="主要法令に対応"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* 結論カード: いまの状態（収録数）＋次にやること（判定ツール） */}
          <ConclusionCard
            tone="info"
            value={total}
            unit="種"
            title="必要資格データベース"
            description="業種・作業を選ぶと必要な特別教育・技能講習・職長教育を自動判定。"
            action={{ href: "/education-certification/finder", label: "資格を判定" }}
            className="mb-6"
          />

          {/* デカ数字＋区分ピクトグラムのカウントタイル（タップで各一覧へ） */}
          <section aria-label="資格区分別の収録数" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <CertCountTile certs={specialEd} type="special_education" />
            <CertCountTile certs={skillTr} type="skill_training" />
            <CertCountTile certs={jobChief} type="job_chief" />
            <CertCountTile certs={licenses} type="license" />
          </section>

          {/* 法的根拠（文字ダイエット: 折りたたみへ格納・内容は不変＝法令正確性は不可侵） */}
          <CollapsibleDetail summary="法的根拠について（特別教育・技能講習・職長教育・免許の違い）" className="mb-8">
            <ul className="space-y-1.5">
              <li><strong>特別教育</strong>（安衛法第59条第3項・安衛則第36条）: 危険有害業務に従事させる前に事業者が実施義務。修了証発行。</li>
              <li><strong>技能講習（就業制限）</strong>（安衛法第61条・安衛令第20条）: 修了者または免許取得者のみが従事できる業務（就業制限）。</li>
              <li><strong>職長教育</strong>（安衛法第60条・安衛則第40条）: 製造業等で新たに職長等となる者への義務教育。</li>
              <li><strong>免許（国家試験）</strong>（安衛法第61条・安衛令第20条）: 国家試験合格が必要な最上位資格。技能講習修了では代替不可の業務（5t以上クレーン・潜水士等）。</li>
              <li className="mt-2 font-semibold">本データは参考情報です。最新情報は各都道府県労働局・厚生労働省で必ずご確認ください。</li>
            </ul>
          </CollapsibleDetail>

          {/* 区分別 一覧（ピクトグラム＋3色区分） */}
          <CertSection type="special_education" certs={specialEd} />
          <CertSection type="skill_training" certs={skillTr} />
          <CertSection type="job_chief" certs={jobChief} />
          <CertSection
            type="license"
            certs={licenses}
            note="国家試験合格または都道府県労働局長による交付が必要。技能講習修了では代替できない就業制限業務の最上位資格。"
          />

          {/* Link to related pages */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">関連ページ</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { href: "/education", label: "Eラーニング・法定教育コース" },
                { href: "/law-search", label: "条文検索（安衛法・安衛則）" },
                { href: "/chatbot", label: "安衛法AIチャット" },
                { href: "/education-certification/finder", label: "業務別資格判定ツール" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                >
                  {l.label}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <CrossToolLinks exclude="education-certification" />
    </>
  );
}
