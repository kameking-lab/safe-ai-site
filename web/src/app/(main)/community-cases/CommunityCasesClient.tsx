"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  UGC_CATEGORY_LABELS,
  type UgcCategory,
  type UgcIndustry,
  type UgcSubmission,
} from "@/lib/ugc-types";
import { clientListSubmissions } from "@/lib/ugc-store";

const ALL = "all" as const;

const CATEGORY_BADGE: Record<UgcCategory, string> = {
  hiyari: "bg-rose-50 text-rose-700 border-rose-200",
  question: "bg-sky-50 text-sky-700 border-sky-200",
  tips: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

type Props = {
  initial: UgcSubmission[];
  industries: readonly { value: UgcIndustry; label: string }[];
};

export function CommunityCasesClient({ initial, industries }: Props) {
  const [items, setItems] = useState<UgcSubmission[]>(initial);
  const [industryFilter, setIndustryFilter] = useState<UgcIndustry | typeof ALL>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<UgcCategory | typeof ALL>(ALL);

  // クライアントの localStorage 投稿もマージ
  useEffect(() => {
    const local = clientListSubmissions().filter((s) => s.status !== "rejected");
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

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (industryFilter !== ALL && s.industry !== industryFilter) return false;
      if (categoryFilter !== ALL && s.category !== categoryFilter) return false;
      // 公開可能なもののみ（pending は管理画面のみ）
      return s.status === "approved" || s.status === "pending";
    });
  }, [items, industryFilter, categoryFilter]);

  return (
    <>
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500">フィルタ</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={industryFilter === ALL}
              onClick={() => setIndustryFilter(ALL)}
            >
              全業種
            </FilterChip>
            {industries.map((opt) => (
              <FilterChip
                key={opt.value}
                active={industryFilter === opt.value}
                onClick={() => setIndustryFilter(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip
            active={categoryFilter === ALL}
            onClick={() => setCategoryFilter(ALL)}
          >
            全カテゴリ
          </FilterChip>
          {(Object.keys(UGC_CATEGORY_LABELS) as UgcCategory[]).map((c) => (
            <FilterChip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            >
              {UGC_CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          条件に一致する事例はありません。
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => {
            const industryLabel =
              industries.find((i) => i.value === s.industry)?.label ?? s.industry;
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <Link href={`/community-cases/${s.id}`} className="block">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${CATEGORY_BADGE[s.category]}`}
                    >
                      #{UGC_CATEGORY_LABELS[s.category]}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                      {industryLabel}
                    </span>
                    {s.status === "pending" && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                        審査中
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                    {s.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{s.body}</p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{s.authorAlias}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      詳細 <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
      }`}
    >
      {children}
    </button>
  );
}
