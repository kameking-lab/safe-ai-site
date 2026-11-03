"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OfficialAreaCombobox } from "@/components/official-area-combobox";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import type { OfficialAreaCandidate } from "@/lib/area/official-area-resolver";
import { createApiWeatherRiskService } from "@/lib/services/weather-risk-service";
import type { SiteRiskWeather } from "@/lib/types/domain";
import { formatJmaWarning } from "@/lib/jma/warning-label";
import { MORNING_WORKS, buildMorningKyHandoff, getInitialMorningWorkId, isMorningWeatherCurrent, type MorningCase } from "@/lib/morning-briefing";

const linkClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-emerald-400";

export function MorningBriefing({ cases }: { cases: Record<string, MorningCase | null> }) {
  const [area, setArea] = useState<OfficialAreaCandidate | null>(null);
  const [workId, setWorkId] = useState(() => getInitialMorningWorkId(cases));
  const [checked, setChecked] = useState<number[]>([]);
  const [weather, setWeather] = useState<{ areaId: string; data: SiteRiskWeather | null; state: "ready" | "error" } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const work = MORNING_WORKS.find((item) => item.id === workId) ?? MORNING_WORKS[4];
  const example = cases[work.id];

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!area) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    const service = createApiWeatherRiskService((input, init) => fetch(input, { ...init, signal: controller.signal }));
    service.getTodaySiteRisk({ areaId: area.id }).then((result) => {
      if (cancelled) return;
      setNow(Date.now());
      setWeather({ areaId: area.id, data: result.ok ? result.data : null, state: result.ok ? "ready" : "error" });
    }).catch(() => {
      if (!cancelled) setWeather({ areaId: area.id, data: null, state: "error" });
    }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [area, refresh]);

  const currentWeather = weather?.areaId === area?.id ? weather : null;
  const data = currentWeather?.data;
  const fresh = !!data && now !== null && isMorningWeatherCurrent(data, now);
  const official = data?.officialWarning;
  const officialTime = Date.parse(official?.fetchedAt ?? "");
  const officialFresh = fresh && official?.status === "live" && now !== null && Number.isFinite(officialTime) && now - officialTime >= -300_000 && now - officialTime <= 900_000;
  const riskHref = area ? `/risk?area=${encodeURIComponent(area.id)}` : "/risk";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-slate-950 print:max-w-none print:p-0" data-morning-briefing>
      <header>
        <p className="text-sm font-bold text-emerald-800">朝礼の準備からKYまで</p>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">朝礼3分セット</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">地域と作業を選び、注意 → 事例 → 指差し確認の順で共有します。3分は進行の目安です。</p>
      </header>

      <section aria-label="朝礼の条件" className="mt-5 grid gap-4 rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:grid-cols-2 print:hidden">
        <OfficialAreaCombobox id="morning-area" label="現場の地域" selectedAreaId={area?.id ?? null} onSelect={(candidate) => { setArea(candidate); setChecked([]); }} helpText="選択した地域の警報・予報を確認します。" />
        <label className="text-sm font-bold">今日の作業
          <select value={workId} onChange={(event) => { setWorkId(event.target.value); setChecked([]); }} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-400 bg-white px-3">
            {MORNING_WORKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </section>
      <p className="my-4 text-sm font-bold">{area?.label ?? "地域未選択"} ／ {work.label}{now ? ` ／ ${new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }).format(new Date(now))}` : ""}</p>

      <div className="grid gap-4 lg:grid-cols-3 print:grid-cols-1">
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 print:break-inside-avoid" aria-labelledby="morning-attention">
          <p className="text-xs font-bold text-amber-900">01 ／ 60秒</p>
          <h2 id="morning-attention" className="mt-1 text-xl font-black">今日の注意</h2>
          <p className="mt-3 font-bold leading-7">{work.attention}</p>
          <div className="mt-4 border-t border-amber-300 pt-3 text-sm leading-6" role="status">
            {!area ? <p>地域を選ぶと気象情報を取得します。</p> : !currentWeather ? <p>地域の気象情報を取得しています…</p> : !fresh ? <p className="font-bold">最新の気象を確認できません。地域の警報・予報を確認してから共有してください。</p> : <>
              <p className="font-bold">補助予報：{data?.overview}</p>
              <p>予想最高気温 {data?.temperatureCelsius}℃ ／ 風速 {data?.windSpeedMs}m/s</p>
              <p className="mt-2 font-bold">気象庁：{officialFresh ? official?.warnings.length ? official.warnings.map(formatJmaWarning).join("、") : "取得範囲で警報・注意報の発表なし" : "最新の警報を確認できません"}</p>
              <p className="mt-2 text-xs">補助予報：Open-Meteo ／ 取得 {data?.forecastFetchedAt ? new Date(data.forecastFetchedAt).toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo" }) : "未確認"}</p>
              <p className="text-xs">{area?.scopeLabel}。現場実測と責任者の中止基準も確認してください。</p>
            </>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <Link href={riskHref} className={linkClass}>地域の警報・予報</Link>
            {area && <button type="button" className={linkClass} onClick={() => { setWeather(null); setRefresh((value) => value + 1); }}>再取得</button>}
          </div>
          <a className="mt-2 inline-flex min-h-11 items-center text-xs font-bold underline" href="https://www.jma.go.jp/bosai/warning/" target="_blank" rel="noopener noreferrer">気象庁の原情報</a>
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-5 print:break-inside-avoid" aria-labelledby="morning-case">
          <p className="text-xs font-bold text-rose-800">02 ／ 60秒</p>
          <h2 id="morning-case" className="mt-1 text-xl font-black">事例から考える</h2>
          {example ? <>
            <p className="mt-3 text-xs font-bold text-slate-600">厚生労働省の公開事例（過去の事例）</p>
            <h3 className="mt-2 font-black leading-6">{example.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">{example.source?.site}{example.source?.caseId ? ` No.${example.source.caseId}` : ""} ／ {example.occurredOn === "発生日非公表" ? "発生日：非公表" : `発生日：${example.occurredOn}`}</p>
            <p className="mt-2 text-sm leading-6">{example.summary}</p>
            {example.source?.url && <p className="mt-2 hidden break-all text-xs print:block">出典：{example.source.url}</p>}
            <div className="mt-3 flex flex-wrap gap-2 print:hidden">
              <Link href={`/accidents/${encodeURIComponent(example.id)}`} className={linkClass}>原因・対策を読む</Link>
              {example.source?.url && <a href={example.source.url} target="_blank" rel="noopener noreferrer" className={linkClass}>出典</a>}
            </div>
          </> : <p className="mt-3 text-sm leading-6">この作業に対応する確認済み個票をまだ表示できません。事故DBから現場に近い事例を選んでください。</p>}
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold">「同じことが起きる場所は、今日の現場のどこですか？」</p>
          <Link href={`/accidents?acc_type=${encodeURIComponent(work.type)}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline print:hidden">関連事例を探す</Link>
        </section>

        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 print:break-inside-avoid" aria-labelledby="morning-checks">
          <p className="text-xs font-bold text-emerald-800">03 ／ 60秒</p>
          <h2 id="morning-checks" className="mt-1 text-xl font-black">3つの指差し確認</h2>
          <ul className="mt-3 space-y-2">
            {work.checks.map((check, index) => <li key={`${work.id}-${index}`}><label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-bold leading-6">
              <input type="checkbox" checked={checked.includes(index)} onChange={(event) => setChecked((items) => event.target.checked ? [...items, index] : items.filter((item) => item !== index))} className="mt-1 h-5 w-5 shrink-0 accent-emerald-800" />{check}
            </label></li>)}
          </ul>
          <p className="mt-3 text-sm font-bold" role="status">{checked.length} / 3 項目を確認</p>
          <p className="mt-2 text-xs leading-5">確認状況はこの画面だけに保持します。未確認の項目は担当者と対応を決め、KY用紙に記録してください。</p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl bg-slate-950 p-5 text-white print:hidden" aria-label="朝礼の内容を使う">
        <h2 className="text-lg font-black">確認した内容を、今日のKYへ</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <KyHandoffLink className={linkClass} handoff={buildMorningKyHandoff(work, example, area?.id)}>この内容でKY用紙を作る</KyHandoffLink>
          <button type="button" onClick={() => window.print()} className={linkClass}>朝礼セットを印刷・PDF保存</button>
          <Link href="/signage" className={linkClass}>サイネージを開く</Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-300">KY用紙では引き継いだ下書きを確認・編集できます。サイネージの地域は表示先で選択してください。</p>
      </section>
      <noscript><p className="mt-4">地域選択・チェック・引き継ぎにはJavaScriptが必要です。<a href="/risk" className="underline">今日の安全</a>、<a href="/ky/paper" className="underline">KY用紙</a>からも利用できます。</p></noscript>
    </div>
  );
}
