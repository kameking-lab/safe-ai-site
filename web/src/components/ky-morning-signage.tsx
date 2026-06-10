"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFitToScreen } from "@/lib/signage/use-fit-to-screen";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { cloudGetSignageSession } from "@/lib/ky/storage-adapter";
import { useWakeLock } from "@/lib/signage/use-wake-lock";
import {
  SIGNAGE_LANGS,
  SIGNAGE_LANG_LABELS,
  signageLabels,
  type SignageLang,
} from "@/lib/signage/signage-labels";
import { readStoredSignageLang, storeSignageLang } from "@/lib/signage/signage-prefs";
import { SignageAccidentEducation } from "@/components/accidents/signage-accident-education";
import { evalScore, riskGrade } from "@/lib/ky/pulldown-options";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";

const COUNTDOWN_SEC = 10;

export function KyMorningSignage() {
  const [record, setRecord] = useState<KyInstructionRecordState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remoteCode, setRemoteCode] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  // Phase C: 表示言語（既定 ja、localStorage 保持）と全画面状態。
  const [lang, setLang] = useState<SignageLang>("ja");
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 1画面フィット（signage-responsive-audit P0）: 表示系デバイス（横向き or 幅≥768）で
  // コンテンツを viewport に縮尺フィットさせる。スマホ縦は可読性優先で自然スクロール。
  const [fitEnabled, setFitEnabled] = useState(false);
  const [twoCol, setTwoCol] = useState(false);
  const [printing, setPrinting] = useState(false);

  const L = signageLabels(lang);

  // 画面サイズ/向きから fit と 2カラム を判定。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const landscape = w > h;
      setFitEnabled(landscape || w >= 768);
      // 横長で幅が十分あれば2カラム化（縦の総高を圧縮しフィット倍率を上げる）。縦長は単一カラム。
      setTwoCol(landscape && w >= 768);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // 印刷中はフィット縮尺を無効化（A4へ通常フロー出力）。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const fitActive = fitEnabled && !printing;
  const { outerRef, contentRef, scale } = useFitToScreen({
    enabled: fitActive,
    deps: [record, lang, twoCol],
  });

  // Phase C P0-2: サイネージ表示中（record あり）は画面スリープを抑止。
  useWakeLock(record !== null);

  // 初回: 保存済み言語を復元。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(readStoredSignageLang());
  }, []);

  // Phase C P1-1: 全画面状態を fullscreenchange に同期。
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onLangChange = useCallback((next: SignageLang) => {
    setLang(next);
    storeSignageLang(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.();
      } else {
        void document.documentElement.requestFullscreen?.();
      }
    } catch {
      /* 非対応・拒否時は無視 */
    }
  }, []);

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

  // 柱0: 「Top3」をラベルどおり評価値（可能性×重大性）の高い順にする。
  // 同点は用紙の記入順を保つ（sort は安定）。色はリスク区分→JIS安全色トークン。
  const topRisks = useMemo(() => {
    if (!record) return [];
    return record.riskRows
      .filter((r) => r.hazard)
      .map((row) => {
        const score = evalScore(row.likelihood, row.severity);
        const grade = riskGrade(score).grade;
        const tone: SafetyTone = grade === "high" ? "danger" : grade === "medium" ? "warning" : "neutral";
        return { row, score, tone };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [record]);

  const mainWork = record?.workRows.find((r) => r.workDetail) ?? null;
  const dateStr = record
    ? lang === "ja"
      ? `${record.workDateYear || ""}年${record.workDateMonth || ""}月${record.workDateDay || ""}日（${record.weather || "—"}）`
      : `${record.workDateYear || ""}-${record.workDateMonth || ""}-${record.workDateDay || ""} · ${record.weather || "—"}`
    : "";

  return (
    <main className={`${fitActive && record ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"} bg-slate-900 text-white print:h-auto print:overflow-visible print:bg-white print:text-slate-900`}>
      <div className={`mx-auto flex w-full max-w-[2200px] flex-col px-[clamp(1rem,3vw,4rem)] py-[clamp(0.75rem,2vw,2rem)] ${fitActive && record ? "h-full max-h-full" : "min-h-[100dvh]"}`}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-sm font-bold tracking-widest text-emerald-300">{L.signageTitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Phase C P1-4: 表示言語トグル */}
            <label className="flex items-center gap-1 text-xs text-white/70">
              <span aria-hidden>🌐</span>
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value as SignageLang)}
                aria-label="表示言語 / Display language"
                className="min-h-[44px] rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold text-white"
              >
                {SIGNAGE_LANGS.map((l) => (
                  <option key={l} value={l} className="text-slate-900">
                    {SIGNAGE_LANG_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
            {/* Phase C P1-1: 全画面トグル */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              {isFullscreen ? `🗕 ${L.exitFullscreen}` : `⛶ ${L.fullscreen}`}
            </button>
            {/* Phase C P1-7: 印刷（掲示板貼り出し用） */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              🖨 {L.print}
            </button>
            <Link
              href="/ky/paper"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              {L.backToEdit}
            </Link>
          </div>
        </header>

        {!record ? (
          <div className="mt-20 rounded-2xl bg-white/10 p-8 text-center print:bg-white">
            <p className="text-2xl font-bold">
              {remoteCode ? (remoteError ?? "共有KYを読み込み中…") : L.noData}
            </p>
            {remoteCode ? (
              <p className="mt-2 text-base text-white/70 print:text-slate-600">
                発行された6桁コードをご確認ください。作成端末で「別端末で共有」した直後に有効になります。
              </p>
            ) : (
              /* 柱0: 段落を読ませず、次にやることをデカいボタンで提示 */
              <Link
                href="/ky/paper"
                className="mx-auto mt-6 flex min-h-[44px] max-w-md items-center justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-xl font-bold text-white shadow-lg hover:bg-emerald-400 print:hidden"
              >
                ✎ この端末でKY用紙を作る
              </Link>
            )}
            {/* 別端末から6桁コードで開く入力フォーム */}
            <form
              className="mx-auto mt-6 flex max-w-xs items-center gap-2 print:hidden"
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
          <div
            ref={outerRef}
            className={`${fitActive ? "relative min-h-0 flex-1 overflow-hidden" : "mt-2"} print:overflow-visible`}
          >
            <div
              ref={contentRef}
              style={
                fitActive
                  ? { transform: `scale(${scale})`, transformOrigin: "top center", width: "100%" }
                  : undefined
              }
              className="w-full print:!transform-none"
            >
              <div className="font-bold leading-tight text-[clamp(1.5rem,3.2vw,3.5rem)]">
                {dateStr}
              </div>

              <div className={`mt-3 ${twoCol ? "grid grid-cols-2 items-start gap-4" : "flex flex-col gap-4"}`}>
                {/* 左カラム: 本日の主な作業 + リスクTop3 */}
                <div className="flex min-w-0 flex-col gap-4">
                  <section className="rounded-3xl bg-white/95 p-4 text-slate-900 shadow-2xl sm:p-6 print:shadow-none print:border print:border-slate-300">
                    <p className="font-bold text-emerald-700 text-[clamp(1.1rem,1.8vw,2rem)]">{L.mainWork}</p>
                    <p className="mt-2 font-bold leading-tight text-[clamp(1.8rem,5vw,6rem)]">
                      {mainWork?.workDetail || L.notEntered}
                    </p>
                    {mainWork?.workPlace && (
                      <p className="mt-2 text-slate-600 text-[clamp(1.1rem,2.2vw,2.5rem)]">
                        {L.workPlace}: {mainWork.workPlace}
                      </p>
                    )}
                  </section>

                  <section className="rounded-3xl bg-white/95 p-4 text-slate-900 shadow-2xl sm:p-6 print:shadow-none print:border print:border-slate-300">
                    <p className="font-bold text-rose-700 text-[clamp(1.1rem,1.8vw,2rem)]">{L.riskTop3}</p>
                    {topRisks.length === 0 ? (
                      <p className="mt-3 text-slate-500 text-[clamp(1.2rem,2.5vw,2.5rem)]">{L.notEntered}</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {topRisks.map(({ row, score, tone }, i) => (
                          <li
                            key={i}
                            className={`rounded-2xl border-l-8 p-3 ${SAFETY_TONE[tone].leftBar} ${SAFETY_TONE[tone].soft}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                              <p className="min-w-0 font-bold leading-snug text-[clamp(1.4rem,3.6vw,4.5rem)]">
                                {i + 1}. {row.hazard}
                              </p>
                              {/* 評価値チップ: 危険の重さを読まずに色とデカ数字で伝える */}
                              <span
                                className={`shrink-0 rounded-xl px-3 py-1 font-bold tabular-nums ${SAFETY_TONE[tone].solid} text-[clamp(1rem,1.8vw,2.2rem)]`}
                              >
                                {L.riskScore} {score}
                              </span>
                            </div>
                            {row.reduction && (
                              <p className="mt-1 text-emerald-800 text-[clamp(1.1rem,2.6vw,3rem)]">
                                → {L.countermeasure}: {row.reduction}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                {/* 右カラム: 行動目標・指差呼称 + 本日の安全啓発 + 唱和 */}
                <div className="flex min-w-0 flex-col gap-4">
                  {(record.teamGoal || record.pointingCall) && (
                    <section className="rounded-3xl bg-white/95 p-4 text-slate-900 shadow-2xl sm:p-6 print:shadow-none print:border print:border-slate-300">
                      {record.teamGoal && (
                        <div>
                          <p className="font-bold text-emerald-700 text-[clamp(1.1rem,1.8vw,2rem)]">{L.teamGoal}</p>
                          <p className="mt-2 font-bold leading-snug text-[clamp(1.8rem,4.5vw,5.5rem)]">{record.teamGoal}</p>
                        </div>
                      )}
                      {record.pointingCall && (
                        <div className={record.teamGoal ? "mt-4 border-t border-slate-200 pt-4" : ""}>
                          <p className="font-bold text-amber-700 text-[clamp(1.1rem,1.8vw,2rem)]">{L.pointingCall}</p>
                          <p className="mt-2 font-bold leading-snug text-amber-900 text-[clamp(1.8rem,4.5vw,5.5rem)]">{record.pointingCall}</p>
                        </div>
                      )}
                    </section>
                  )}

                  {/* P2-2: 本日の安全啓発（過去の労災事例・日替わり・6言語見出し） */}
                  <SignageAccidentEducation lang={lang} />

                  {/* 唱和カウントダウン */}
                  <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-emerald-700/30 p-4 sm:p-6 print:hidden">
                    <div>
                      <p className="text-base font-bold uppercase tracking-widest text-emerald-200">
                        {L.chantCountdown}
                      </p>
                      {countdown === null ? (
                        <p className="mt-1 text-base text-emerald-100">{L.chantReady}</p>
                      ) : countdown > 0 ? (
                        <p className="mt-1 font-extrabold tabular-nums text-white text-[clamp(4rem,10vw,12rem)]">
                          {countdown}
                        </p>
                      ) : (
                        <p className="mt-1 font-extrabold text-emerald-200 text-[clamp(2.5rem,6vw,7rem)]">
                          🚨 {L.chantGo}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCountdown(COUNTDOWN_SEC)}
                        className="rounded-2xl bg-emerald-500 px-6 py-4 text-2xl font-bold text-white shadow-lg hover:bg-emerald-400"
                      >
                        ▶ {L.chantStart}（{COUNTDOWN_SEC}秒）
                      </button>
                      {countdown !== null && (
                        <button
                          type="button"
                          onClick={() => setCountdown(null)}
                          className="rounded-2xl border-2 border-white/40 px-6 py-4 text-2xl font-bold text-white hover:bg-white/10"
                        >
                          {L.chantStop}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <p className="pt-4 text-center text-xs text-white/50 print:hidden">
                {remoteCode
                  ? `※ 共有コード ${remoteCode} のKYを表示中（約8秒ごとに自動更新）。`
                  : "※ この端末で保存したKY記録を表示しています。別端末で映すには、KY用紙の「別端末で共有」から6桁コードを発行してください。"}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
