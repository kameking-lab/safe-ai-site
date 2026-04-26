"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  FileText,
  Scale,
  BookOpen,
  Megaphone,
  ShieldCheck,
  Filter,
  X,
} from "lucide-react";
import type { MhlwNotice } from "@/data/mhlw-notices";
import type { MhlwLeaflet } from "@/data/mhlw-leaflets";

type Tab = "通達" | "告示" | "指針" | "リーフレット";

const TABS: { id: Tab; icon: typeof FileText; activeCls: string }[] = [
  {
    id: "通達",
    icon: FileText,
    activeCls: "border-blue-600 bg-blue-50 text-blue-900",
  },
  {
    id: "告示",
    icon: Scale,
    activeCls: "border-amber-600 bg-amber-50 text-amber-900",
  },
  {
    id: "指針",
    icon: ShieldCheck,
    activeCls: "border-emerald-600 bg-emerald-50 text-emerald-900",
  },
  {
    id: "リーフレット",
    icon: Megaphone,
    activeCls: "border-rose-600 bg-rose-50 text-rose-900",
  },
];

const NOTICE_CATEGORY_LABELS: Record<string, string> = {
  general: "一般",
  chemicals: "化学物質",
  "heat-stroke": "熱中症",
  asbestos: "石綿",
  "mental-health": "メンタルヘルス",
  "health-checkup": "健康診断",
  construction: "建設業",
  forestry: "林業",
  dust: "粉じん・じん肺",
  radiation: "電離放射線",
  "noise-vibration": "騒音・振動",
  smoking: "受動喫煙",
  "foreign-workers": "外国人労働者",
  "aged-workers": "高年齢労働者",
  freelance: "フリーランス・一人親方",
  "infectious-disease": "感染症",
  training: "教育",
  "risk-assessment": "リスクアセスメント",
  machinery: "機械災害",
};

const LEAFLET_CATEGORY_LABELS: Record<string, string> = {
  general: "安全衛生（横断）",
  safety: "安全関係",
  "occupational-health": "労働衛生",
  chemicals: "化学物質",
  licenses: "免許等",
  other: "その他",
};

const TARGET_LABELS: Record<string, string> = {
  general: "一般",
  employer: "事業者向け",
  worker: "労働者向け",
  "foreign-worker": "外国人労働者向け",
  medical: "医療従事者向け",
};

const BINDING_LABELS: Record<string, { label: string; cls: string }> = {
  binding: {
    label: "拘束力あり（告示）",
    cls: "bg-amber-100 text-amber-900 border-amber-300",
  },
  indirect: {
    label: "間接拘束（通達・行政解釈）",
    cls: "bg-blue-100 text-blue-900 border-blue-300",
  },
  reference: {
    label: "参考（指針・ガイドライン）",
    cls: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
};

function normalize(v: string) {
  return v.toLowerCase().replace(/\s+/g, "");
}

export function ResourcesClient({
  notices,
  leaflets,
}: {
  notices: MhlwNotice[];
  leaflets: MhlwLeaflet[];
}) {
  const [tab, setTab] = useState<Tab>("通達");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [binding, setBinding] = useState("");
  const [year, setYear] = useState("");

  const noticesByType = useMemo(() => {
    return {
      通達: notices.filter((n) => n.docType === "通達"),
      告示: notices.filter((n) => n.docType === "告示"),
      指針: notices.filter((n) => n.docType === "指針"),
    } as Record<"通達" | "告示" | "指針", MhlwNotice[]>;
  }, [notices]);

  const counts = {
    通達: noticesByType.通達.length,
    告示: noticesByType.告示.length,
    指針: noticesByType.指針.length,
    リーフレット: leaflets.length,
  };

  const noticeYears = useMemo(() => {
    const ys = new Set<string>();
    for (const n of notices) {
      if (n.issuedDate) ys.add(n.issuedDate.slice(0, 4));
    }
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [notices]);

  const leafletYears = useMemo(() => {
    const ys = new Set<string>();
    for (const l of leaflets) {
      if (l.publishedDate) ys.add(l.publishedDate.slice(0, 4));
    }
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [leaflets]);

  const filteredNotices = useMemo(() => {
    if (tab === "リーフレット") return [];
    const base = noticesByType[tab as "通達" | "告示" | "指針"];
    const n = normalize(query);
    return base.filter((row) => {
      if (category && row.category !== category) return false;
      if (binding && row.bindingLevel !== binding) return false;
      if (year) {
        if (!row.issuedDate || !row.issuedDate.startsWith(year)) return false;
      }
      if (n) {
        const hay = [
          row.title,
          row.noticeNumber || "",
          row.issuer || "",
          row.lawRef || "",
          row.era || "",
        ]
          .map(normalize)
          .join(" ");
        if (!hay.includes(n)) return false;
      }
      return true;
    });
  }, [tab, noticesByType, query, category, binding, year]);

  const filteredLeaflets = useMemo(() => {
    if (tab !== "リーフレット") return [];
    const n = normalize(query);
    return leaflets.filter((l) => {
      if (category && l.category !== category) return false;
      if (year) {
        if (!l.publishedDate || !l.publishedDate.startsWith(year)) return false;
      }
      if (n) {
        const hay = [
          l.title,
          l.subCategory || "",
          l.categoryLabel,
          l.target,
          ...l.languages,
        ]
          .map(normalize)
          .join(" ");
        if (!hay.includes(n)) return false;
      }
      return true;
    });
  }, [tab, leaflets, query, category, year]);

  const categoryOptions =
    tab === "リーフレット" ? LEAFLET_CATEGORY_LABELS : NOTICE_CATEGORY_LABELS;

  function resetFilters() {
    setQuery("");
    setCategory("");
    setBinding("");
    setYear("");
  }

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(({ id, icon: Icon, activeCls }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(id);
                setCategory("");
                setBinding("");
              }}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition ${
                active ? activeCls : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {id}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                {counts[id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-700">
              キーワード検索
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例: 熱中症 / 化学物質 / 基発0220"
                className="block w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-700">
              カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">すべて</option>
              {Object.entries(categoryOptions).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {tab !== "リーフレット" && (
            <div className="min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-700">
                法的拘束力
              </label>
              <select
                value={binding}
                onChange={(e) => setBinding(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">すべて</option>
                <option value="binding">告示（拘束力あり）</option>
                <option value="indirect">通達（行政解釈）</option>
                <option value="reference">指針（参考）</option>
              </select>
            </div>
          )}

          <div className="min-w-[120px]">
            <label className="block text-xs font-semibold text-slate-700">
              年度
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">すべて</option>
              {(tab === "リーフレット" ? leafletYears : noticeYears).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            条件クリア
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          {tab === "リーフレット"
            ? `${filteredLeaflets.length} / ${leaflets.length} 件`
            : `${filteredNotices.length} / ${counts[tab]} 件`}
        </div>
      </div>

      {/* List */}
      {tab === "リーフレット" ? (
        <LeafletList items={filteredLeaflets} />
      ) : (
        <NoticeList items={filteredNotices} />
      )}
    </div>
  );
}

function NoticeList({ items }: { items: MhlwNotice[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        条件に一致するエントリがありません。
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 200).map((n) => {
        const binding = BINDING_LABELS[n.bindingLevel];
        const cat = NOTICE_CATEGORY_LABELS[n.category] || n.category;
        return (
          <li
            key={n.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              {n.noticeNumber && (
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-mono font-bold text-blue-900">
                  {n.noticeNumber}
                </span>
              )}
              {n.issuedDateRaw && (
                <span className="text-xs text-slate-500">{n.issuedDateRaw}</span>
              )}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${binding.cls}`}
              >
                {binding.label}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {cat}
              </span>
            </div>
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">
              {n.title}
            </h3>
            {(n.issuer || n.lawRef) && (
              <p className="mt-1 text-xs text-slate-600">
                {n.issuer && <span>発出機関: {n.issuer}</span>}
                {n.issuer && n.lawRef && <span>　/　</span>}
                {n.lawRef && <span>根拠法: {n.lawRef}</span>}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <a
                href={n.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                原文（安全衛生情報センター）
              </a>
              <a
                href={n.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <BookOpen className="h-3.5 w-3.5" />
                目次に戻る
              </a>
            </div>
          </li>
        );
      })}
      {items.length > 200 && (
        <p className="px-2 py-3 text-center text-xs text-slate-500">
          ※ 上位200件を表示しています。条件を絞ってください。
        </p>
      )}
    </ul>
  );
}

function LeafletList({ items }: { items: MhlwLeaflet[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        条件に一致するエントリがありません。
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 200).map((l) => {
        const cat = LEAFLET_CATEGORY_LABELS[l.category] || l.category;
        const target = TARGET_LABELS[l.target] || l.target;
        const link = l.pdfUrl || l.detailUrl;
        return (
          <li
            key={l.id}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">
                {cat}
              </span>
              {l.subCategory && (
                <span className="text-xs text-slate-500">{l.subCategory}</span>
              )}
              {l.publishedDateRaw && (
                <span className="text-xs text-slate-500">{l.publishedDateRaw}</span>
              )}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {target}
              </span>
              {l.pageCount != null && (
                <span className="text-[10px] text-slate-500">{l.pageCount}頁</span>
              )}
              {l.pdfUrl ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-800">
                  PDF
                </span>
              ) : (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                  HTML
                </span>
              )}
            </div>
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">
              {l.title}
            </h3>
            {link && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {l.pdfUrl ? "PDFを開く（厚労省）" : "詳細を開く（厚労省）"}
                </a>
                <a
                  href={l.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  一覧
                </a>
              </div>
            )}
          </li>
        );
      })}
      {items.length > 200 && (
        <p className="px-2 py-3 text-center text-xs text-slate-500">
          ※ 上位200件を表示しています。条件を絞ってください。
        </p>
      )}
    </ul>
  );
}
