"use client";

import { useState } from "react";
import type { SdsProduct } from "@/lib/sds-fetcher";
import type {
  AmountLevel,
  ComponentRaResult,
  RaResult,
  RiskLevel,
  Ventilation,
} from "@/lib/ra-engine";

type RaApiResponse = {
  ra: RaResult;
  source: "internal-db" | "nite-chrip";
  plan: "free" | "standard" | "pro";
  monthlyLimit: number | null;
  used: number;
  historySaved: boolean;
  disclaimer: string;
};

type SearchHit = SdsProduct;

const VENTILATION_OPTIONS: { value: Ventilation; label: string }[] = [
  { value: "local", label: "局所排気あり" },
  { value: "general", label: "全体換気のみ" },
  { value: "none", label: "換気なし" },
];

const AMOUNT_OPTIONS: { value: AmountLevel; label: string }[] = [
  { value: "small", label: "少量（<1L/日）" },
  { value: "medium", label: "中量（1〜10L/日）" },
  { value: "large", label: "大量（>10L/日）" },
];

const LEVEL_BADGE: Record<RiskLevel, string> = {
  I: "bg-emerald-100 text-emerald-800 border-emerald-300",
  II: "bg-amber-100 text-amber-800 border-amber-300",
  III: "bg-orange-100 text-orange-800 border-orange-300",
  IV: "bg-rose-100 text-rose-800 border-rose-300",
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  I: "I 管理継続",
  II: "II 要注意",
  III: "III 要改善",
  IV: "IV 直ちに改善",
};

export function ProductSearchPanel() {
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [ventilation, setVentilation] = useState<Ventilation>("general");
  const [amount, setAmount] = useState<AmountLevel>("medium");
  const [durationHours, setDurationHours] = useState<number>(2);

  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchSource, setSearchSource] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [raResult, setRaResult] = useState<RaApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setSearchHits([]);
    setRaResult(null);
    if (!productName.trim()) {
      setError("製品名を入力してください。");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch("/api/sds/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, manufacturer: manufacturer || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "検索に失敗しました。");
        return;
      }
      setSearchHits(json.hits ?? []);
      setSearchSource(json.source ?? "");
      if ((json.hits ?? []).length === 0) {
        setError("該当する製品が見つかりませんでした（β：主要10製品のみ収録）。");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  }

  async function handleRunRa(productId: string, name: string) {
    setError(null);
    setRaResult(null);
    setRunning(true);
    try {
      const res = await fetch("/api/ra/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productName: name,
          manufacturer: manufacturer || undefined,
          ventilation,
          amount,
          durationHours,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "RA 実行に失敗しました。");
        return;
      }
      setRaResult(json as RaApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "RA 実行に失敗しました。");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
            SDS製品検索＋自動リスクアセスメント
          </h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            β機能
          </span>
        </div>
        <p className="text-sm text-slate-600">
          製品名・メーカー名から含有化学物質を検索し、作業条件を入力すると CREATE-SIMPLE 簡略版による
          リスクレベル判定（I〜IV）と対策を自動表示します。
        </p>
        <p className="text-xs text-slate-500">
          出典: SDS 内蔵 DB（主要10製品）／ 厚労省「化学物質リスクアセスメント支援ツール CREATE-SIMPLE」簡略実装。
          最終判断は事業者責任のもと公式 SDS と CREATE-SIMPLE 公式版・労働衛生コンサルタントの判断によること。
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">1. 製品検索</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">製品名／型番</span>
            <input
              type="search"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="例: KURE 5-56、ラッカーシンナー"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">メーカー名（任意）</span>
            <input
              type="search"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="例: 呉工業"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {searching ? "検索中…" : "SDS DB を検索"}
        </button>

        {searchHits.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              {searchHits.length}件ヒット（出典: {searchSource === "nite-chrip" ? "NITE-CHRIP" : "内蔵DB"}）
            </p>
            <ul className="space-y-2">
              {searchHits.map((hit) => (
                <li
                  key={hit.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{hit.productName}</p>
                    <p className="text-xs text-slate-500">
                      {hit.manufacturer}・{hit.category}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">用途: {hit.use}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      含有成分:{" "}
                      {hit.components
                        .map((c) => `${c.name}（${c.contentLabel ?? `${c.contentPct}%`}）`)
                        .join(" / ")}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      SDS 改訂日: {hit.sdsRevised}
                      {hit.sdsUrl && (
                        <>
                          {" / "}
                          <a
                            href={hit.sdsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-emerald-700"
                          >
                            公式SDS
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunRa(hit.id, hit.productName)}
                    disabled={running}
                    className="self-start whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {running ? "RA 実行中…" : "この製品で RA 実行"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">2. 作業条件</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">換気条件</span>
            <select
              value={ventilation}
              onChange={(e) => setVentilation(e.target.value as Ventilation)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {VENTILATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">取扱量</span>
            <select
              value={amount}
              onChange={(e) => setAmount(e.target.value as AmountLevel)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {AMOUNT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">作業時間（時間/日）</span>
            <input
              type="number"
              min={0.1}
              max={24}
              step={0.1}
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {raResult && <RaResultView data={raResult} />}
    </div>
  );
}

function RaResultView({ data }: { data: RaApiResponse }) {
  const { ra } = data;
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">3. リスクアセスメント結果</h2>
          <p className="text-xs text-slate-500">
            対象製品: <strong>{ra.product.productName}</strong>（{ra.product.manufacturer}）
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-bold ${LEVEL_BADGE[ra.overallLevel]}`}
        >
          全体: {LEVEL_LABEL[ra.overallLevel]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-3">
        <p>換気: <strong>{ra.inputSummary.ventilation}</strong></p>
        <p>取扱量: <strong>{ra.inputSummary.amount}</strong></p>
        <p>作業時間: <strong>{ra.inputSummary.durationHours}h/日</strong></p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">成分</th>
              <th className="px-3 py-2 text-left">CAS</th>
              <th className="px-3 py-2 text-right">含有率</th>
              <th className="px-3 py-2 text-left">8h 基準値</th>
              <th className="px-3 py-2 text-right">ばく露指数</th>
              <th className="px-3 py-2 text-left">レベル</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ra.components.map((c: ComponentRaResult) => (
              <tr key={c.cas}>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2 text-slate-500">{c.cas}</td>
                <td className="px-3 py-2 text-right">{c.contentPct}%</td>
                <td className="px-3 py-2 text-slate-600">{c.limit8h ?? "—"}</td>
                <td className="px-3 py-2 text-right">×{c.exposureRatio}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${LEVEL_BADGE[c.level]}`}
                  >
                    {LEVEL_LABEL[c.level]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">推奨対策</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {ra.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <footer className="space-y-1 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <p>
          プラン: <strong>{data.plan.toUpperCase()}</strong>
          {data.monthlyLimit !== null
            ? `（今月 ${data.used}/${data.monthlyLimit} 回利用）`
            : "（無制限）"}
          {data.historySaved && "・履歴保存済み"}
        </p>
        <p>{data.disclaimer}</p>
      </footer>
    </section>
  );
}
