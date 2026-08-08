// Badges for legal document authority, freshness, and revision status.
// Used in the MHLW primary source DB (resources page) to address
// concerns about administrative document credibility.

import type { MhlwNoticeBindingLevel } from "@/data/mhlw-notices";

// ── 文書種別バッジ（効力は個別確認） ─────────────────────────────
// "law" extends the data-layer type to cover statutes cited by notices
export type BindingLevel = "law" | MhlwNoticeBindingLevel;

const BINDING_CONFIG: Record<
  BindingLevel,
  { label: string; cls: string; title: string }
> = {
  law: {
    label: "法令",
    cls: "bg-red-100 text-red-900 border-red-300",
    title: "法律・政令・省令等。現行条文と対象を個別確認",
  },
  binding: {
    label: "告示",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
    title: "告示。根拠法令、委任、対象、効力を個別確認",
  },
  indirect: {
    label: "通達",
    cls: "bg-blue-100 text-blue-900 border-blue-300",
    title: "通達。行政内部の解釈・運用資料で、事業者への義務を自動判定しない",
  },
  reference: {
    label: "参考",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    title: "指針・ガイドライン等。根拠法令と位置付けを個別確認",
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
    label: "発出2年以内",
    cls: "bg-emerald-100 text-emerald-900 border-emerald-300",
    title: "発出日が直近2年以内。現行性・改廃・内容確認済みを意味しません",
  },
  verified: {
    label: "発出5年以内",
    cls: "bg-sky-100 text-sky-900 border-sky-300",
    title: "発出日が5年以内。一次資料確認済み・現行有効を意味しません",
  },
  needsCheck: {
    label: "要確認",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
    title: "5年以上前または発出日不明。一次資料で現行性を確認してください",
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
  // 内部互換名 verified は残すが、UIでは日付範囲としてのみ表示する。
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
    cls: "bg-slate-100 text-slate-600 border-slate-300",
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
          <span className="font-medium text-slate-600">文書種別：</span>
          <BindingBadge level="law" />
          <BindingBadge level="binding" />
          <BindingBadge level="indirect" />
          <BindingBadge level="reference" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">発出日の目安：</span>
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
