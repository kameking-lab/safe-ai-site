// Badges for legal document authority, freshness, and revision status.
// Used in the MHLW primary source DB (resources page) to address
// concerns about administrative document credibility.

import type { MhlwNoticeBindingLevel } from "@/data/mhlw-notices";

// ── 法的拘束力バッジ ─────────────────────────────────────────────
// "law" extends the data-layer type to cover statutes cited by notices
export type BindingLevel = "law" | MhlwNoticeBindingLevel;

const BINDING_CONFIG: Record<
  BindingLevel,
  { label: string; cls: string; title: string }
> = {
  law: {
    label: "法令",
    cls: "bg-red-100 text-red-900 border-red-300",
    title: "法令（最高法規）",
  },
  binding: {
    label: "告示",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
    title: "告示（法的拘束力あり）",
  },
  indirect: {
    label: "通達",
    cls: "bg-blue-100 text-blue-900 border-blue-300",
    title: "通達（行政解釈・間接拘束）",
  },
  reference: {
    label: "参考",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    title: "参考（指針・ガイドライン）",
  },
};

export function BindingBadge({ level }: { level: BindingLevel }) {
  const cfg = BINDING_CONFIG[level] ?? BINDING_CONFIG.reference;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}
      title={cfg.title}
    >
      {cfg.label}
    </span>
  );
}

// ── 鮮度バッジ ────────────────────────────────────────────────────
export type FreshnessLevel = "latest" | "verified" | "needsCheck" | "broken";

const FRESHNESS_CONFIG: Record<
  FreshnessLevel,
  { label: string; cls: string; title: string }
> = {
  latest: {
    label: "最新",
    cls: "bg-emerald-100 text-emerald-900 border-emerald-300",
    title: "直近2年以内の発出（最新）",
  },
  verified: {
    label: "確認済",
    cls: "bg-sky-100 text-sky-900 border-sky-300",
    title: "一次ソースで存在確認済み",
  },
  needsCheck: {
    label: "要確認",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
    title: "5年以上前の発出。一次ソースで最新性を確認してください",
  },
  broken: {
    label: "リンク切れ",
    cls: "bg-red-100 text-red-900 border-red-300",
    title: "ソースURLが応答なし（check-source-urls.mjs で検出）",
  },
};

export function FreshnessBadge({ level }: { level: FreshnessLevel }) {
  const cfg = FRESHNESS_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}
      title={cfg.title}
    >
      {cfg.label}
    </span>
  );
}

/** Derive freshness from an ISO date string like "2024-03-01". */
export function freshnessFromDate(issuedDate: string | null): FreshnessLevel {
  if (!issuedDate) return "needsCheck";
  const year = parseInt(issuedDate.slice(0, 4), 10);
  if (Number.isNaN(year)) return "needsCheck";
  // 2024+ = within 2 years of 2026
  if (year >= 2024) return "latest";
  // 2020-2023 = recent enough to treat as verified
  if (year >= 2020) return "verified";
  return "needsCheck";
}

// ── 改廃ステータスバッジ ──────────────────────────────────────────
export type RevisionStatus = "current" | "revised" | "abolished";

const REVISION_CONFIG: Record<
  RevisionStatus,
  { label: string; cls: string; title: string }
> = {
  current: {
    label: "現行",
    cls: "bg-emerald-100 text-emerald-900 border-emerald-300",
    title: "現行有効",
  },
  revised: {
    label: "改正済",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
    title: "改正済み。最新版を確認してください",
  },
  abolished: {
    label: "廃止",
    cls: "bg-slate-100 text-slate-500 border-slate-300",
    title: "廃止・失効",
  },
};

export function RevisionBadge({ status }: { status: RevisionStatus }) {
  const cfg = REVISION_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}
      title={cfg.title}
    >
      {cfg.label}
    </span>
  );
}

// ── 凡例コンポーネント（ページ上部の説明用） ──────────────────────
export function LegalDocBadgeLegend() {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
      <p className="mb-2 font-semibold text-slate-800">バッジ凡例</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">法的拘束力：</span>
          <BindingBadge level="law" />
          <BindingBadge level="binding" />
          <BindingBadge level="indirect" />
          <BindingBadge level="reference" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">鮮度：</span>
          <FreshnessBadge level="latest" />
          <FreshnessBadge level="verified" />
          <FreshnessBadge level="needsCheck" />
          <FreshnessBadge level="broken" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">改廃：</span>
          <RevisionBadge status="current" />
          <RevisionBadge status="revised" />
          <RevisionBadge status="abolished" />
        </div>
      </div>
    </div>
  );
}
