import { AccidentTypePictogram } from "@/components/accidents/accident-type-pictogram";
import { ACCIDENT_TYPE_SHORT } from "@/lib/accidents/accident-pictogram-map";
import { accidentTypeHref, type AccidentTypeCount } from "@/lib/accidents/accident-visual";

/**
 * 事故の型グリッド（柱0・アイコンファーストのナビ）。
 * 「自分の現場の事故」へ読まずに3秒で到達するための入口:
 * 型ピクトグラム＋件数デカ数字のタイルをタップ→一覧の型絞り込み結果へ直行。
 * 件数降順（多い型＝現場で多い危険が先頭）。
 *
 * <a>（フル遷移）なのは QuickAccidentSearch と同じ理由 —
 * tab=list と acc_type は HomeScreen がマウント時に復元するため。
 */

type AccidentTypeGridProps = {
  counts: AccidentTypeCount[];
};

export function AccidentTypeGrid({ counts }: AccidentTypeGridProps) {
  if (counts.length === 0) return null;
  return (
    <section aria-label="事故の型から探す" data-testid="accident-type-grid" className="mt-3">
      <h2 className="text-sm font-bold text-slate-900">事故の型から探す</h2>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {counts.map(({ type, count }) => (
          <a
            key={type}
            href={accidentTypeHref(type)}
            className="flex min-h-[44px] flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm transition hover:border-amber-400 hover:bg-amber-50"
          >
            <AccidentTypePictogram type={type} size="md" />
            <span className="text-[11px] font-bold leading-tight text-slate-800">
              {ACCIDENT_TYPE_SHORT[type]}
            </span>
            <span className="text-lg font-bold leading-none text-slate-900">
              {count.toLocaleString("ja-JP")}
              <span className="ml-0.5 text-[10px] font-semibold text-slate-500">件</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
