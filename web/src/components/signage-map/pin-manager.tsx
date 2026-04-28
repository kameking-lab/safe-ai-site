"use client";

import { useState } from "react";
import type { SignagePin } from "./signage-map-leaflet";

type Props = {
  pins: SignagePin[];
  pendingCoords: { lat: number; lng: number } | null;
  onClearPending: () => void;
  onAdd: (input: { label: string; lat: number; lng: number; email: string | null }) => Promise<void> | void;
  onDelete: (id: string) => void;
  onFocus: (pin: SignagePin) => void;
  limit?: number;
};

export function PinManager({
  pins,
  pendingCoords,
  onClearPending,
  onAdd,
  onDelete,
  onFocus,
  limit = 10,
}: Props) {
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reachedLimit = pins.length >= limit;
  const canSubmit = !!pendingCoords && !!label.trim() && !reachedLimit && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingCoords || !label.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        label: label.trim(),
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        email: email.trim() || null,
      });
      setLabel("");
      setEmail("");
      onClearPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ピンの保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100">ピン管理（{pins.length}/{limit}）</h3>
      </div>

      <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
        <p className="text-[10px] text-slate-400">
          地図を <span className="font-bold text-slate-200">右クリック / 長押し</span> すると、その地点が候補になります。
        </p>
        {pendingCoords ? (
          <p className="rounded bg-emerald-950/60 px-2 py-1 text-[10px] text-emerald-200">
            候補: {pendingCoords.lat.toFixed(4)}, {pendingCoords.lng.toFixed(4)}
            <button
              type="button"
              className="ml-2 text-emerald-300 underline"
              onClick={onClearPending}
            >
              クリア
            </button>
          </p>
        ) : (
          <p className="rounded bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400">候補地点が未選択です。</p>
        )}
        <label className="block text-[11px] text-slate-300">
          ラベル
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="例: 第二現場"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
            disabled={!pendingCoords || submitting}
          />
        </label>
        <label className="block text-[11px] text-slate-300">
          通知メール（任意）
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="warn@example.jp"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
            disabled={submitting}
          />
        </label>
        {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
        {reachedLimit ? (
          <p className="text-[11px] text-amber-300">ピン上限（{limit}件）に達しました。</p>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {submitting ? "保存中…" : "ピンを追加"}
        </button>
      </form>

      <ul className="space-y-2">
        {pins.length === 0 ? (
          <li className="rounded border border-dashed border-slate-700 px-3 py-4 text-center text-[11px] text-slate-500">
            ピンはまだありません
          </li>
        ) : null}
        {pins.map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-2 rounded border border-slate-700 bg-slate-950/40 p-2"
          >
            <button
              type="button"
              onClick={() => onFocus(p)}
              className="flex-1 text-left"
            >
              <p className="text-xs font-semibold text-slate-100">{p.label}</p>
              <p className="text-[10px] text-slate-400">
                {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
              </p>
              {p.email ? <p className="text-[10px] text-emerald-300">📧 {p.email}</p> : null}
            </button>
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              className="rounded border border-rose-500/50 bg-rose-950/60 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/60"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
