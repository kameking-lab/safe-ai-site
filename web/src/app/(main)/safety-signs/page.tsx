import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, AlertCircle, Building2, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SAFETY_SIGNS,
  SIGN_CATEGORIES,
  SIGN_COUNT_BY_CATEGORY,
  SIGN_TOTAL_COUNT,
  getSignsByCategory,
} from "@/data/safety-signs";
import { INDUSTRIES } from "@/data/safety-signs/industry-usage";
import { SafetySignSvg } from "@/components/safety-sign-svg";

const TITLE =
  "安全衛生標識データベース｜JIS Z 9101準拠・110標識・業種別使用ガイド";
const DESC =
  "労働現場で使われる安全衛生標識をJIS Z 9101／9103／9104に基づき110点収録。禁止・警告・指示・安全状態・防火の5カテゴリで分類し、業種別の必須／推奨セット、設置位置ガイド、根拠法令を一覧化したリファレンスです。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/safety-signs" },
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
    images: [{ url: ogImageUrl(TITLE, DESC), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
    images: [ogImageUrl(TITLE, DESC)],
  },
};

const ACCENT_BG: Record<string, string> = {
  red: "border-red-200 bg-red-50/40 hover:border-red-400",
  amber: "border-amber-200 bg-amber-50/40 hover:border-amber-400",
  blue: "border-blue-200 bg-blue-50/40 hover:border-blue-400",
  emerald: "border-emerald-200 bg-emerald-50/40 hover:border-emerald-400",
};

const ACCENT_TEXT: Record<string, string> = {
  red: "text-red-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
  emerald: "text-emerald-700",
};

const STANDARDS = [
  {
    label: "JIS Z 9101 — 安全色及び安全標識（産業現場）",
    href: "https://www.jisc.go.jp/",
    note: "本データベースの分類・形状・配色の基準。",
  },
  {
    label: "JIS Z 9103 — 安全色（一般的事項）",
    href: "https://www.jisc.go.jp/",
    note: "赤・黄・青・緑の正式色票と用途。",
  },
  {
    label: "JIS Z 9104 — 安全標識（一般的事項）",
    href: "https://www.jisc.go.jp/",
    note: "標識の形状・寸法・視認距離。",
  },
  {
    label: "ISO 7010 — Graphical symbols / safety signs",
    href: "https://www.iso.org/standard/72424.html",
    note: "国際的に整合する図記号コードを併記。",
  },
];

export default function SafetySignsHubPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd name={TITLE} description={DESC} path="/safety-signs" />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "DataCatalog",
          name: TITLE,
          description: DESC,
          url: "https://www.anzen-ai-portal.jp/safety-signs",
          dataset: SIGN_CATEGORIES.map((c) => ({
            "@type": "Dataset",
            name: `${c.label}（${SIGN_COUNT_BY_CATEGORY[c.id]}件）`,
            description: c.description,
            url: `https://www.anzen-ai-portal.jp/safety-signs/category/${c.id}`,
          })),
        }}
      />
      <PageHeader
        title="安全衛生標識データベース"
        description="JIS Z 9101準拠の110標識・業種別使用ガイド・設置位置のリファレンス"
        icon={ShieldCheck}
        iconColor="emerald"
      />

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="text-sm leading-6 text-emerald-900">
            <p className="font-semibold">本ページの位置付け</p>
            <p className="mt-1">
              本ページは <strong className="font-semibold">JIS Z 9101 / 9103 / 9104</strong> および
              ISO 7010 を参照した、現場運用向けの標識リファレンスです。
              掲載するピクトグラムは独自に作図したもので、JIS規格や ISO 7010 の図形そのものを転載していません。
              実際に標識を発注・掲示する際は、JIS 規格本体と最新の法令・通達を確認してください。
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              収録件数：合計 {SIGN_TOTAL_COUNT} 件 ／ 業種別ガイド：{INDUSTRIES.length} 業種
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">標識カテゴリ（JIS Z 9101 5分類）</h2>
        <p className="mt-1 text-xs text-slate-500">
          カラー・形状で意味を瞬時に伝えるのがJIS標識の設計思想。クリックで各カテゴリの一覧を開けます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SIGN_CATEGORIES.map((c) => {
            const sample = getSignsByCategory(c.id)[0];
            return (
              <Link
                key={c.id}
                href={`/safety-signs/category/${c.id}`}
                className={`group flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition ${ACCENT_BG[c.accent]}`}
              >
                {sample ? (
                  <SafetySignSvg sign={sample} size={72} className="shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {c.label}
                    <span className="ml-2 text-xs font-semibold text-slate-500">
                      {SIGN_COUNT_BY_CATEGORY[c.id]}件
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{c.shapeNote}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{c.description}</p>
                  <p className={`mt-2 text-xs font-semibold group-hover:underline ${ACCENT_TEXT[c.accent]}`}>
                    {c.labelEn} 一覧を開く →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          業種別使用ガイド（8業種）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          現場に必要な標識セットを業種別に整理しています。法定の必須セットと運用上の推奨セットを区別して掲載。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.id}
              href={`/safety-signs/industry/${ind.id}`}
              className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <p className="text-lg" aria-hidden="true">
                {ind.icon}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">{ind.label}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{ind.labelEn}</p>
              <p className="mt-1 text-[10px] text-slate-600">{ind.themes.join(" / ")}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">設置位置の原則（JIS Z 9104）</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm leading-6 text-slate-800 sm:grid-cols-2">
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">①視認距離に応じた大きさ</strong>
            ：JIS Z 9104では視認距離 5m で1辺 200mm 以上、25m で 1000mm 以上を目安とします。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">②取付高さは目線中心</strong>
            ：床上 1.5〜1.8m を基本とし、車両動線では2m以上、避難誘導では天井下端が適切です。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">③連続性と視野角</strong>
            ：通路では概ね 15〜20m ごと、視野角は 60°以内に収まる位置に再掲示します。
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-3">
            <strong className="font-semibold text-slate-900">④照明と反射</strong>
            ：100ルクス以上の照度下で視認できること。屋外は反射材または内照式が望ましい。
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">参考規格・出典</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {STANDARDS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
              >
                {s.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <span className="ml-2 text-slate-600">— {s.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900">関連機能</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          <li>
            <Link
              href="/signage"
              className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline hover:text-emerald-800"
            >
              サイネージ表示 →
            </Link>
            <span className="ml-1 text-slate-600">
              — 朝礼や掲示板向けの安全表示。標識データベースと組み合わせて運用できます。
            </span>
          </li>
          <li>
            <Link
              href="/ky"
              className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline hover:text-emerald-800"
            >
              KY簡易作成 →
            </Link>
            <span className="ml-1 text-slate-600">
              — 危険予知活動票に該当する標識を引用できる連携を計画中。
            </span>
          </li>
          <li>
            <Link
              href="/industries/construction"
              className="inline-flex min-h-[44px] items-center font-semibold text-emerald-700 underline hover:text-emerald-800"
            >
              建設業のリスク・対策 →
            </Link>
            <span className="ml-1 text-slate-600">— 業種別ハブから個別の標識セットへ遷移できます。</span>
          </li>
        </ul>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは JIS / ISO 規格と現場運用ガイドを統合したリファレンスです。
        <strong className="text-slate-600">標識の最終仕様は JIS 規格と現場条件に基づき発注者責任で確認してください。</strong>
      </p>

      <p className="sr-only" aria-hidden="true">
        収録標識識別子: {SAFETY_SIGNS.map((s) => s.id).join(", ")}
      </p>
    </PageContainer>
  );
}
