import { CalendarDays } from "lucide-react";
import { accidentCasesMock } from "@/data/mock/accident-cases";
import { computeWeekdayDistribution, AXIS_AVAILABILITY } from "@/lib/accidents/axis-analysis";

/**
 * P3-2 多軸分析（曜日別＋軸の集計可否の明示）。
 * 曜日別は発生日から導出可能な実データを集計。時間帯・経験年数は本サイト事例DBに構造化データが
 * 無いため集計せず「公式統計参照」と明示（創作回避）。
 */
export function AxisAnalysisSection() {
  const wd = computeWeekdayDistribution(accidentCasesMock);
  const max = Math.max(1, ...wd.buckets.map((b) => b.count));

  return (
    <section className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5 space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <CalendarDays className="h-5 w-5 text-teal-600" aria-hidden="true" />
        多軸分析（曜日別・時間帯・経験年数）
      </h2>

      {/* 曜日別（実データ集計） */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-900">曜日別 事例分布（サンプル {wd.total}件）</p>
        <ul className="mt-2 space-y-1">
          {wd.buckets.map((b) => (
            <li key={b.index} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-slate-600">{b.label}</span>
              <span className="h-3 rounded bg-teal-400" style={{ width: `${(b.count / max) * 70 + 2}%` }} aria-hidden />
              <span className="font-mono text-slate-700">{b.count}件</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-slate-400">※ 本サイト事例DB（サンプル）の発生日から集計。確定統計は公式データを参照。</p>
      </div>

      {/* 軸の集計可否（創作回避の明示） */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-900">分析軸の対応状況</p>
        <ul className="mt-2 space-y-1.5">
          {AXIS_AVAILABILITY.map((a) => (
            <li key={a.key} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${a.available ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
                {a.available ? "集計可" : "未集計"}
              </span>
              <span className="flex-1">
                <span className="font-semibold text-slate-800">{a.label}</span>
                <span className="ml-1 text-slate-500">{a.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">
          時間帯・経験年数の確定統計は{" "}
          <a href="https://anzeninfo.mhlw.go.jp/anzen_pgm/SHISYO_FND.html" target="_blank" rel="noreferrer" className="text-teal-700 underline hover:no-underline">
            厚労省 死傷災害データベース
          </a>{" "}
          や e-Stat（上記「e-Stat公式統計表」）でご確認いただけます。
        </p>
      </div>
    </section>
  );
}
