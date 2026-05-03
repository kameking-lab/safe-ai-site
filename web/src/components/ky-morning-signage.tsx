"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";

const COUNTDOWN_SEC = 10;

export function KyMorningSignage() {
  const [record, setRecord] = useState<KyInstructionRecordState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ky-record");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecord(normalizeKyInstructionRecord(parsed));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // 唱和タイミング: ビープ風シンセ音
      try {
        const Ctx =
          (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.7);
        }
      } catch {}
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const topRisks = useMemo(() => {
    if (!record) return [];
    return record.riskRows.filter((r) => r.hazard).slice(0, 3);
  }, [record]);

  const mainWork = record?.workRows.find((r) => r.workDetail) ?? null;
  const dateStr = record
    ? `${record.workDateYear || ""}年${record.workDateMonth || ""}月${record.workDateDay || ""}日（${record.weather || "—"}）`
    : "";

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-widest text-emerald-300">
            KY 朝礼サイネージ表示
          </p>
          <Link
            href="/ky"
            className="rounded-lg border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            ← KY編集に戻る
          </Link>
        </header>

        {!record ? (
          <div className="mt-20 rounded-2xl bg-white/10 p-8 text-center">
            <p className="text-2xl font-bold">KYデータが見つかりません</p>
            <p className="mt-2 text-base text-white/70">
              先に <Link href="/ky" className="underline">/ky</Link> でKY用紙を作成・保存してください。
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
              {dateStr}
            </div>

            <section className="mt-6 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-2xl sm:p-8">
              <p className="text-lg font-bold text-emerald-700 sm:text-xl">本日の主な作業</p>
              <p className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
                {mainWork?.workDetail || "（未入力）"}
              </p>
              {mainWork?.workPlace && (
                <p className="mt-2 text-xl text-slate-600 sm:text-2xl">{mainWork.workPlace}</p>
              )}
            </section>

            <section className="mt-6 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-2xl sm:p-8">
              <p className="text-lg font-bold text-rose-700 sm:text-xl">本日のリスクTop3</p>
              {topRisks.length === 0 ? (
                <p className="mt-3 text-2xl text-slate-500">未入力です</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {topRisks.map((r, i) => (
                    <li key={i} className="rounded-2xl border-l-8 border-rose-500 bg-rose-50 p-4">
                      <p className="text-2xl font-bold leading-snug sm:text-4xl">
                        {i + 1}. {r.hazard}
                      </p>
                      {r.reduction && (
                        <p className="mt-2 text-xl text-emerald-800 sm:text-3xl">
                          → 対策: {r.reduction}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 唱和カウントダウン */}
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-emerald-700/30 p-6">
              <div>
                <p className="text-base font-bold uppercase tracking-widest text-emerald-200">
                  唱和カウントダウン
                </p>
                {countdown === null ? (
                  <p className="mt-1 text-base text-emerald-100">
                    準備ができたら下のボタンで開始してください。
                  </p>
                ) : countdown > 0 ? (
                  <p className="mt-1 text-7xl font-extrabold tabular-nums text-white sm:text-8xl">
                    {countdown}
                  </p>
                ) : (
                  <p className="mt-1 text-5xl font-extrabold text-emerald-200">
                    🚨 唱和！本日もご安全に！
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCountdown(COUNTDOWN_SEC)}
                  className="rounded-2xl bg-emerald-500 px-6 py-4 text-2xl font-bold text-white shadow-lg hover:bg-emerald-400"
                >
                  ▶ 開始（{COUNTDOWN_SEC}秒）
                </button>
                {countdown !== null && (
                  <button
                    type="button"
                    onClick={() => setCountdown(null)}
                    className="rounded-2xl border-2 border-white/40 px-6 py-4 text-2xl font-bold text-white hover:bg-white/10"
                  >
                    停止
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        <p className="mt-auto pt-6 text-center text-xs text-white/50">
          ※ /ky で保存したKY記録（端末内）を表示しています。投影前に最新化してください。
        </p>
      </div>
    </main>
  );
}
