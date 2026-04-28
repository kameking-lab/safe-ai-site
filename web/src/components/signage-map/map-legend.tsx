import { LEVEL_COLOR } from "@/lib/jma/jma-data";

export function MapLegend() {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
      <h3 className="text-sm font-bold text-slate-100">凡例</h3>
      <ul className="mt-2 space-y-1.5 text-[11px] text-slate-200">
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.advisory }} />
          注意報
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.warning }} />
          警報
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.special }} />
          特別警報
        </li>
        <li className="flex items-center gap-2">
          <span>☀️ ☁️ 🌧️ ❄️</span>
          天気アイコン（ズーム連動）
        </li>
        <li className="flex items-center gap-2">
          <span>📍</span>
          ピン（最大10件）
        </li>
      </ul>
    </section>
  );
}
