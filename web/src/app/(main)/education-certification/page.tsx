import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Search, BookOpen, AlertCircle, ChevronRight, Scale, Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { CrossToolLinks } from "@/components/cross-tool-links";
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

function CertCountBadge({ certs, type }: { certs: EducationCert[]; type: EducationCert["certType"] }) {
  const colors = CERT_TYPE_COLORS[type];
  const label = CERT_TYPE_LABELS[type];
  return (
    <div className={`rounded-xl border p-4 ${colors.badge}`}>
      <p className="text-2xl font-bold">{certs.length}<span className="ml-1 text-sm font-normal">種</span></p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
    </div>
  );
}

function CertCard({ cert }: { cert: EducationCert }) {
  const colors = CERT_TYPE_COLORS[cert.certType];
  const label = CERT_TYPE_LABELS[cert.certType];
  return (
    <div className={`rounded-lg border bg-white p-3 shadow-sm border-l-4 ${colors.border} dark:bg-slate-800`}>
      <div className="flex flex-wrap items-start gap-2">
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
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

export default function EducationCertificationPage() {
  const specialEd = getCertsByType("special_education");
  const skillTr = getCertsByType("skill_training");
  const jobChief = getCertsByType("job_chief");
  const licenses = getCertsByType("license");

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
          {/* Stats row */}
          <section aria-label="資格種別カウント" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <CertCountBadge certs={specialEd} type="special_education" />
            <CertCountBadge certs={skillTr} type="skill_training" />
            <CertCountBadge certs={jobChief} type="job_chief" />
            <CertCountBadge certs={licenses} type="license" />
          </section>

          {/* CTA: Finder */}
          <section className="mb-8 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">業務別資格判定</p>
                <h2 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
                  業種・作業を選んで<br className="sm:hidden" />必要資格を一覧表示
                </h2>
                <p className="mt-1.5 text-sm opacity-90">
                  根拠条文・講習時間・関連資格を自動判定。特別教育・技能講習・職長教育を網羅。
                </p>
              </div>
              <Link
                href="/education-certification/finder"
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow transition hover:bg-blue-50"
              >
                <Search className="h-4 w-4" aria-hidden />
                資格判定ツールを使う
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          {/* Legal overview */}
          <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">法的根拠について</h3>
                <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                  <li><strong>特別教育</strong>（安衛法第59条第3項・安衛則第36条）: 危険有害業務に従事させる前に事業者が実施義務。修了証発行。</li>
                  <li><strong>技能講習（就業制限）</strong>（安衛法第61条・安衛令第20条）: 修了者または免許取得者のみが従事できる業務（就業制限）。</li>
                  <li><strong>職長教育</strong>（安衛法第60条・安衛則第40条）: 製造業等で新たに職長等となる者への義務教育。</li>
                  <li><strong>免許（国家試験）</strong>（安衛法第61条・安衛令第20条）: 国家試験合格が必要な最上位資格。技能講習修了では代替不可の業務（5t以上クレーン・潜水士等）。</li>
                  <li className="mt-2 font-semibold">本データは参考情報です。最新情報は各都道府県労働局・厚生労働省で必ずご確認ください。</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Special education list */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-600" aria-hidden />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                特別教育（安衛則第36条）— {specialEd.length}種
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {specialEd.map((cert) => (
                <CertCard key={cert.id} cert={cert} />
              ))}
            </div>
          </section>

          {/* Skill training list */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" aria-hidden />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                技能講習（就業制限業務）— {skillTr.length}種
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {skillTr.map((cert) => (
                <CertCard key={cert.id} cert={cert} />
              ))}
            </div>
          </section>

          {/* Job chief list */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" aria-hidden />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                職長教育・管理者研修 — {jobChief.length}種
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {jobChief.map((cert) => (
                <CertCard key={cert.id} cert={cert} />
              ))}
            </div>
          </section>

          {/* License list */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" aria-hidden />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                免許（国家試験）— {licenses.length}種
              </h2>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              国家試験合格または都道府県労働局長による交付が必要。技能講習修了では代替できない就業制限業務の最上位資格。
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {licenses.map((cert) => (
                <CertCard key={cert.id} cert={cert} />
              ))}
            </div>
          </section>

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
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                >
                  {l.label}
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
