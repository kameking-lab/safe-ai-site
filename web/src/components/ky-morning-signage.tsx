"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { cloudGetSignageSession } from "@/lib/ky/storage-adapter";

const COUNTDOWN_SEC = 10;

export function KyMorningSignage() {
  const [record, setRecord] = useState<KyInstructionRecordState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remoteCode, setRemoteCode] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");

  // 初回: URLの ?code= があれば別端末共有モード（クラウド取得）。無ければ端末内 ky-record。
  useEffect(() => {
    let code: string | null = null;
    try {
      code = new URLSearchParams(window.location.search).get("code");
    } catch {
      code = null;
    }
    if (code && /^\d{6}$/.test(code)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteCode(code);
      return;
    }
    try {
      const saved = localStorage.getItem("ky-record");
      if (saved) {
        setRecord(normalizeKyInstructionRecord(JSON.parse(saved) as unknown));
      }
    } catch {
      /* 端末内データ無し */
    }
  }, []);

  // 別端末共有モード: コードでクラウドから取得し、約8秒ごとに自動更新（ポーリング）。
  useEffect(() => {
    if (!remoteCode) return;
    let cancelled = false;
    const load = async () => {
      const r = await cloudGetSignageSession(remoteCode);
      if (cancelled) return;
      if (r) {
        setRecord(r);
        setRemoteError(null);
      } else {
        setRemoteError("共有コードのKYが見つからないか、有効期限が切れています。");
      }
    };
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [remoteCode]);

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
            <p className="text-2xl font-bold">
              {remoteCode ? (remoteError ?? "共有KYを読み込み中…") : "KYデータが見つかりません"}
            </p>
            <p className="mt-2 text-base text-white/70">
              {remoteCode ? (
                "発行された6桁コードをご確認ください。作成端末で「別端末で共有」した直後に有効になります。"
              ) : (
                <>
                  先に <Link href="/ky/paper" className="underline">/ky/paper</Link> でKY用紙を作成・保存するか、
                  別端末で発行した6桁コードを入力してください。
                </>
              )}
            </p>
            {/* 別端末から6桁コードで開く入力フォーム */}
            <form
              className="mx-auto mt-6 flex max-w-xs items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (/^\d{6}$/.test(codeInput)) {
                  window.location.href = `/ky/morning?code=${codeInput}`;
                }
              }}
            >
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6桁の共有コード"
                aria-label="共有コード"
                className="w-44 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-center text-lg tracking-widest text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={!/^\d{6}$/.test(codeInput)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-40"
              >
                表示
              </button>
            </form>
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

            {/* 本日の行動目標・指差呼称（4Rの締め。全面再設計で追加） */}
            {(record.teamGoal || record.pointingCall) && (
              <section className="mt-6 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-2xl sm:p-8">
                {record.teamGoal && (
                  <div>
                    <p className="text-lg font-bold text-emerald-700 sm:text-xl">本日の行動目標</p>
                    <p className="mt-2 text-3xl font-bold leading-snug sm:text-5xl">{record.teamGoal}</p>
                  </div>
                )}
                {record.pointingCall && (
                  <div className={record.teamGoal ? "mt-4 border-t border-slate-200 pt-4" : ""}>
                    <p className="text-lg font-bold text-amber-700 sm:text-xl">指差呼称</p>
                    <p className="mt-2 text-3xl font-bold leading-snug text-amber-900 sm:text-5xl">{record.pointingCall}</p>
                  </div>
                )}
              </section>
            )}

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
          {remoteCode
            ? `※ 共有コード ${remoteCode} のKYを表示中（約8秒ごとに自動更新）。`
            : "※ この端末で保存したKY記録を表示しています。別端末で映すには、KY用紙の「別端末で共有」から6桁コードを発行してください。"}
        </p>
      </div>
    </main>
  );
}
