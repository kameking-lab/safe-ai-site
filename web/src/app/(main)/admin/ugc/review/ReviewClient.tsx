"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  UGC_CATEGORY_LABELS,
  UGC_INDUSTRY_OPTIONS,
  type UgcSubmission,
} from "@/lib/ugc-types";
import { clientListSubmissions, clientUpdateStatus } from "@/lib/ugc-store";

type Props = { seed: UgcSubmission[] };

export function ReviewClient({ seed }: Props) {
  const [items, setItems] = useState<UgcSubmission[]>(seed);

  useEffect(() => {
    const local = clientListSubmissions();
    if (local.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems((prev) => {
      const map = new Map<string, UgcSubmission>();
      for (const s of [...local, ...prev]) {
        if (!map.has(s.id)) map.set(s.id, s);
      }
      return Array.from(map.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
    });
  }, []);

  const summary = useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0, needsReview: 0 };
    for (const s of items) {
      if (s.status === "pending") out.pending += 1;
      if (s.status === "approved") out.approved += 1;
      if (s.status === "rejected") out.rejected += 1;
      if (s.audit.recommendation === "needs_review") out.needsReview += 1;
    }
    return out;
  }, [items]);

  function updateStatus(id: string, status: UgcSubmission["status"]) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    clientUpdateStatus(id, status);
  }

  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="承認済み" value={summary.approved} color="emerald" />
        <StatCard label="保留中" value={summary.pending} color="amber" />
        <StatCard label="差戻し" value={summary.rejected} color="rose" />
        <StatCard label="要確認" value={summary.needsReview} color="sky" />
      </section>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          投稿はまだありません。
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((s) => (
            <ReviewItem key={s.id} item={s} onUpdate={updateStatus} />
          ))}
        </ul>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "rose" | "sky";
}) {
  const map = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 ${map[color]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ReviewItem({
  item,
  onUpdate,
}: {
  item: UgcSubmission;
  onUpdate: (id: string, status: UgcSubmission["status"]) => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  const statusBadge =
    item.status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : item.status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const recBadge =
    item.audit.recommendation === "auto_approve"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : item.audit.recommendation === "auto_reject"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  const industryLabel =
    UGC_INDUSTRY_OPTIONS.find((i) => i.value === item.industry)?.label ?? item.industry;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full border px-2 py-0.5 font-bold ${statusBadge}`}>
          {item.status === "approved"
            ? "承認済み"
            : item.status === "rejected"
              ? "差戻し"
              : "保留中"}
        </span>
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${recBadge}`}>
          AI推奨: {item.audit.recommendation === "auto_approve"
            ? "自動承認"
            : item.audit.recommendation === "auto_reject"
              ? "自動差戻し"
              : "要レビュー"}{" "}
          (スコア {item.audit.recommendScore})
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
          #{UGC_CATEGORY_LABELS[item.category]}・{industryLabel}
        </span>
        <span className="text-slate-400">{item.authorAlias}</span>
        <time className="text-slate-400">
          {new Date(item.createdAt).toLocaleString("ja-JP")}
        </time>
      </div>

      <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold text-slate-500">公開本文（マスキング後）</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            {item.body}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <Eye className="h-3 w-3" /> {showOriginal ? "原文を隠す" : "原文を表示"}
          </button>
          {showOriginal && (
            <p className="mt-1 whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
              {item.bodyOriginal}
            </p>
          )}
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <summary className="cursor-pointer font-semibold">
          AI監査詳細（{item.audit.reasons.length}件）
        </summary>
        <dl className="mt-2 space-y-1.5">
          <Detail label="NGワード">
            {item.audit.ngWords.length === 0 ? "なし" : item.audit.ngWords.join(", ")}
          </Detail>
          <Detail label="スパムスコア">{item.audit.spamScore}</Detail>
          <Detail label="個人情報検出">
            {item.audit.piiDetected.length === 0 ? "なし" : item.audit.piiDetected.join(", ")}
          </Detail>
          <Detail label="判定理由">
            <ul className="list-disc pl-5">
              {item.audit.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Detail>
        </dl>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onUpdate(item.id, "approved")}
          disabled={item.status === "approved"}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> 公開する
        </button>
        <button
          type="button"
          onClick={() => onUpdate(item.id, "rejected")}
          disabled={item.status === "rejected"}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40"
        >
          <XCircle className="h-3.5 w-3.5" /> 差戻し
        </button>
        <button
          type="button"
          onClick={() => onUpdate(item.id, "pending")}
          disabled={item.status === "pending"}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          保留に戻す
        </button>
      </div>
    </li>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-700">{children}</dd>
    </div>
  );
}
