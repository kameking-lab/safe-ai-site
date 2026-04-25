import type { Metadata } from "next";
import Link from "next/link";
import { LmsPanel } from "@/components/lms-panel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "多拠点 学習管理システム（LMS）β";
const _desc =
  "複数拠点・部署の安全教育を一元管理。受講進捗・グループ管理・修了証発行・業種別レポートをまとめて確認できます。2026年秋β公開予定、現在ウェイティングリスト先行受付中。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

export default function LmsPage() {
  return (
    <>
      {/* βウェイティングリスト — 2026年秋公開予定 */}
      <div className="mx-auto mt-4 max-w-5xl px-4">
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-700">
              LMS β — 2026年秋公開予定
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              ウェイティングリスト受付中（先行招待・初期費用無料）
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              ビジネスプラン契約者またはβ協力企業を優先招待します。本ページの画面は現状モックで、製品仕様の参考表示です。
            </p>
            <ul className="mt-2 grid gap-1 text-[11px] leading-5 text-slate-600 sm:grid-cols-2">
              <li>✓ 多拠点・部署の進捗一元管理</li>
              <li>✓ 修了証PDF自動発行</li>
              <li>✓ SCORM／動画教材取込（予定）</li>
              <li>✓ 安衛法60条・59条対応</li>
            </ul>
          </div>
          <Link
            href="/contact?category=lms-waitlist"
            className="mt-4 inline-flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-violet-700 sm:mt-0"
          >
            β先行登録 →
          </Link>
        </div>
      </div>
      <LmsPanel />
    </>
  );
}
