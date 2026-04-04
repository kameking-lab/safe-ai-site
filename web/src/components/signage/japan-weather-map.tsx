"use client";

import type { JapanRegionId, MapAlertLevel } from "@/data/mock/japan-weather-map-mock";
import { japanRegionMeta } from "@/data/mock/japan-weather-map-mock";

function hatchClass(level: MapAlertLevel) {
  if (level === "warning") {
    return "bg-[repeating-linear-gradient(135deg,rgba(248,113,113,0.35)_0,rgba(248,113,113,0.35)_8px,transparent_8px,transparent_16px)] border-rose-500/90";
  }
  if (level === "advisory") {
    return "bg-[repeating-linear-gradient(135deg,rgba(250,204,21,0.3)_0,rgba(250,204,21,0.3)_8px,transparent_8px,transparent_16px)] border-amber-400/90";
  }
  return "bg-slate-800/40 border-slate-600/60";
}

type JapanWeatherMapProps = {
  levels: Record<JapanRegionId, MapAlertLevel>;
  modeLabel: string;
};

/** 略図: 8地域グリッドで日本地図イメージ。気象庁ハッチング表現のたたき台。 */
export function JapanWeatherMap({ levels, modeLabel }: JapanWeatherMapProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-600 bg-slate-950 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">日本域 警報・注意報（{modeLabel}）</p>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-6 rounded border border-rose-400 bg-[repeating-linear-gradient(135deg,rgba(248,113,113,0.4)_0,rgba(248,113,113,0.4)_4px,transparent_4px,transparent_8px)]" />
            警報
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-6 rounded border border-amber-400 bg-[repeating-linear-gradient(135deg,rgba(250,204,21,0.35)_0,rgba(250,204,21,0.35)_4px,transparent_4px,transparent_8px)]" />
            注意報
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-6 rounded border border-slate-500 bg-slate-800/50" />
            なし
          </span>
        </div>
      </div>
      <div className="relative mx-auto aspect-[4/5] max-h-[min(72vh,640px)] w-full max-w-xl">
        <div className="absolute inset-0 rounded-[40%] border border-slate-700/80 bg-slate-900/80 shadow-inner" aria-hidden />
        <div className="absolute inset-[8%] grid grid-cols-3 grid-rows-4 gap-2">
          <RegionCell id="hokkaido" label="北海道" className="col-span-3" level={levels.hokkaido} />
          <RegionCell id="tohoku" label="東北" level={levels.tohoku} />
          <RegionCell id="kanto" label="関東" level={levels.kanto} />
          <RegionCell id="chubu" label="中部" level={levels.chubu} />
          <RegionCell id="kinki" label="近畿" level={levels.kinki} />
          <RegionCell id="chugoku" label="中国" level={levels.chugoku} />
          <RegionCell id="shikoku" label="四国" level={levels.shikoku} />
          <RegionCell id="kyushu" label="九州・沖縄" className="col-span-3" level={levels.kyushu} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        ※ 表示はモックです。本番は気象庁の注意報・警報エリアに合わせてポリゴン描画へ差し替え予定（外部API本接続は別タスク）。
      </p>
    </div>
  );
}

function RegionCell({
  id,
  label,
  level,
  className,
}: {
  id: JapanRegionId;
  label: string;
  level: MapAlertLevel;
  className?: string;
}) {
  const meta = japanRegionMeta.find((r) => r.id === id);
  return (
    <div
      className={`flex min-h-[72px] flex-col items-center justify-center rounded-xl border-2 p-2 text-center text-xs font-bold text-slate-50 shadow-sm ${hatchClass(level)} ${className ?? ""}`}
      title={`${meta?.label ?? label}: ${level}`}
    >
      {label}
    </div>
  );
}
