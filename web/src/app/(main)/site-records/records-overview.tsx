"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, CheckCircle2, ClipboardList, UserPlus, CalendarDays } from "lucide-react";
import { getPatrolList } from "@/lib/site-records/patrol-store";
import { getNearMissReports, openCount as nearMissOpen } from "@/lib/site-records/nearmiss-store";
import { getInspectionList } from "@/lib/site-records/inspection-store";
import { getCommitteeList } from "@/lib/site-records/committee-store";
import { getInductionList } from "@/lib/site-records/induction-store";
import { DailyActionsPanel } from "./daily-actions-panel";

type Overview = {
  patrolOpen: number;
  nearMissOpen: number;
  inspectionUnusable: number;
  committeeThisMonth: boolean;
  inductionThisMonth: number;
  hasAny: boolean;
};

function compute(): Overview {
  const ym = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const patrol = getPatrolList();
  const inspections = getInspectionList();
  const committees = getCommitteeList();
  const inductions = getInductionList();
  const nearmiss = getNearMissReports();
  return {
    patrolOpen: patrol.reduce((sum, s) => sum + (s.openCount || 0), 0),
    nearMissOpen: nearMissOpen(nearmiss),
    inspectionUnusable: inspections.filter((s) => !s.usable).length,
    committeeThisMonth: committees.some((c) => c.date.startsWith(ym)),
    inductionThisMonth: inductions.filter((i) => i.date.startsWith(ym)).length,
    hasAny:
      patrol.length + inspections.length + committees.length + inductions.length + nearmiss.length > 0,
  };
}

export function RecordsOverview() {
  const [ov, setOv] = useState<Overview | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorageは描画後にのみ参照可（SSRハイドレーション差異回避）
    setOv(compute());
  }, []);

  // 未マウント（SSR/初回）は何も出さない＝レイアウトのちらつき回避。
  if (!ov) return null;

  // 記録がまだ1件も無い＝初見。17ツールの壁の前に「まず何から」を示す。
  if (!ov.hasAny) return <FirstVisitGuide />;

  const tiles: { label: string; value: string; href: string; alert: boolean }[] = [
    { label: "未是正の指摘（パトロール）", value: `${ov.patrolOpen} 件`, href: "/site-records/patrol", alert: ov.patrolOpen > 0 },
    { label: "対応中のヒヤリハット", value: `${ov.nearMissOpen} 件`, href: "/site-records/near-miss", alert: ov.nearMissOpen > 0 },
    { label: "使用不可の機械（点検）", value: `${ov.inspectionUnusable} 件`, href: "/site-records/inspection", alert: ov.inspectionUnusable > 0 },
    { label: "今月の安全衛生委員会", value: ov.committeeThisMonth ? "開催済" : "未開催", href: "/site-records/committee", alert: !ov.committeeThisMonth },
  ];

  return (
    <>
    <DailyActionsPanel />
    <section className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="mb-2 text-sm font-bold text-slate-700">この端末の記録の状況（今日・今月）</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-xl border bg-white p-3 transition hover:shadow-sm ${
              t.alert ? "border-rose-300" : "border-emerald-200"
            }`}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              {t.alert ? (
                <AlertOctagon className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              )}
              {t.label}
            </span>
            <span className={`mt-1 block text-lg font-bold ${t.alert ? "text-rose-700" : "text-emerald-700"}`}>{t.value}</span>
          </Link>
        ))}
      </div>
      {ov.inductionThisMonth > 0 && (
        <p className="mt-2 text-[11px] text-slate-500">今月の新規入場者 受入教育: {ov.inductionThisMonth} 件記録済み</p>
      )}
    </section>
    </>
  );
}

// 初見（記録ゼロ）の安全担当に「まず何から手をつけるか」を3ステップで提示。
// 1件でも記録が貯まれば上の状況サマリーに自動で切り替わる。
const FIRST_STEPS: {
  step: string;
  when: string;
  title: string;
  desc: string;
  href: string;
  icon: typeof ClipboardList;
}[] = [
  {
    step: "1",
    when: "今日から毎日",
    title: "KY用紙（危険予知）",
    desc: "全現場・全業種で毎日行う基本。AI提案・音声入力で1枚すぐ作れます。",
    href: "/ky/paper",
    icon: ClipboardList,
  },
  {
    step: "2",
    when: "人が入る初日",
    title: "新規入場者 受入教育 記録",
    desc: "安衛法59条の義務。チェックして実施記録を残せます。",
    href: "/site-records/induction",
    icon: UserPlus,
  },
  {
    step: "3",
    when: "今月の予定を把握",
    title: "年間 安全衛生カレンダー",
    desc: "委員会・健診など「今月やること」を一覧。各ツールへ進めます。",
    href: "/site-records/calendar",
    icon: CalendarDays,
  },
];

function FirstVisitGuide() {
  return (
    <section className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h2 className="text-sm font-bold text-emerald-900">はじめての方へ — まずこの3つから</h2>
      <p className="mt-1 text-xs leading-5 text-emerald-800/80">
        記録はすべてこの端末に保存（登録不要）。下にツールが並びますが、迷ったらここから始めてください。
      </p>
      <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {FIRST_STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex h-full flex-col rounded-xl border border-emerald-200 bg-white p-3 transition hover:border-emerald-400 hover:shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {s.step}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">{s.when}</span>
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {s.title}
                </span>
                <span className="mt-1 text-xs leading-5 text-slate-600">{s.desc}</span>
                <span className="mt-2 text-xs font-semibold text-emerald-700 group-hover:underline">開く →</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
