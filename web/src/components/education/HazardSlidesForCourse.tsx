import Link from "next/link";
import { Presentation } from "lucide-react";
import { HazardGlyphBadge } from "@/components/accidents/accident-type-pictogram";
import type { EducationContext } from "@/data/education-context";
import {
  ACCIDENT_TYPE_TO_HAZARD_SLUG,
  getHazardType,
  type HazardTypeSlug,
} from "@/lib/accidents/type-normalization";

/**
 * 教育コース詳細ページ向け「この教育に関係する型別スライド」カード。
 * education-context の accidentMatch.types（事例DB union）を正規化辞書で
 * スラッグ解決し、型別教育スライドへの深リンクにする（診断書06 §3.3）。
 * types 未設定のコースはハブへの1リンクのみ表示。
 */
export function HazardSlidesForCourse({ context }: { context: EducationContext }) {
  const slugs: HazardTypeSlug[] = [
    ...new Set((context.accidentMatch.types ?? []).map((t) => ACCIDENT_TYPE_TO_HAZARD_SLUG[t])),
  ];

  return (
    <section aria-label="災害の型別 教育スライド" className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Presentation aria-hidden="true" className="h-5 w-5 text-amber-600" />
        この教育で使える型別スライド
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        統計→原因→対策→クイズの6枚構成。投影（16:9）とA4横印刷に対応し、実データから自動生成されます。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {slugs.map((slug) => {
          const t = getHazardType(slug);
          return (
            <Link
              key={slug}
              href={`/education/hazard-slides/${slug}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:border-amber-500"
            >
              <HazardGlyphBadge glyph={t.glyph} label={t.label} size="sm" />
              {t.short}
            </Link>
          );
        })}
        <Link
          href="/education/hazard-slides"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-slate-400"
        >
          全21型を見る →
        </Link>
      </div>
    </section>
  );
}
