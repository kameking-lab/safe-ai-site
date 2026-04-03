"use client";

import Link from "next/link";

type PortalQuickLinksProps = {
  onJumpToRisk: () => void;
  onJumpToWeather: () => void;
  onJumpToAccident: () => void;
  onJumpToLaws: () => void;
  onJumpToKy: () => void;
  onJumpToLearning: () => void;
  onJumpToNotification: () => void;
};

export function PortalQuickLinks({
  onJumpToRisk,
  onJumpToWeather,
  onJumpToAccident,
  onJumpToLaws,
  onJumpToKy,
  onJumpToLearning,
  onJumpToNotification,
}: PortalQuickLinksProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">安全AIポータル</h2>
      <p className="mt-1 text-xs text-slate-600">現場でよく使う入口をまとめています。朝礼・常時表示・個人確認に使えます。</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white" href="/signage">
          サイネージ
        </Link>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToRisk} type="button">今日の現場リスク</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToWeather} type="button">警報注意報</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToAccident} type="button">事故DB</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToLaws} type="button">法改正</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToKy} type="button">KY用紙</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToLearning} type="button">Eラーニング</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800" onClick={onJumpToNotification} type="button">通知/配信</button>
      </div>
    </section>
  );
}
