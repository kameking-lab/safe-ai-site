"use client";

import { useEffect,useMemo, useState } from "react";
import { useNativeQuery } from '@/lib/use-native-query';
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type {
  ExamAnswerMode,
  ExamDateKind,
  ExamGroupId,
  ExamGroupInfo,
} from "@/lib/exam-library-model";

/** 一覧表示に必要な最小限の情報（問題本文は含めない） */
export interface ExamCatalogItem {
  id: string;
  group: ExamGroupId;
  subject: string;
  label: string;
  /** YYYY-MM または YYYY-MM-DD */
  date: string;
  dateText: string;
  dateKind: ExamDateKind;
  answerMode: ExamAnswerMode;
  href: string;
  pdfUrl: string;
  /** 問題データを表示できる回だけ数値。未取込は null */
  questionCount: number | null;
  scoredCount: number | null;
}

interface ExamCatalogBrowserProps {
  groups: readonly ExamGroupInfo[];
  items: readonly ExamCatalogItem[];
  initialGroup: ExamGroupId;
  initialSubject: string | null;
}

const ALL_SUBJECTS = "";

function syncUrl(group: ExamGroupId, subject: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("group", group);
  if (subject) url.searchParams.set("subject", subject);
  else url.searchParams.delete("subject");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

function scoringBadge(item: ExamCatalogItem): string {
  if (item.questionCount === null) return "問題データ未掲載";
  if (item.answerMode === "reference" && item.scoredCount === 0) return "自己確認（自動採点なし）";
  if (item.scoredCount === 0) return "公式正答未登録（採点なし）";
  if (item.scoredCount === item.questionCount) return `公式正答で採点 ${item.scoredCount}問`;
  return `公式正答で採点 ${item.scoredCount}問／${item.questionCount}問`;
}

const chipBase =
  "inline-flex min-h-11 items-center justify-center rounded-xl border-2 px-4 py-2 text-sm font-black leading-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 motion-reduce:transition-none forced-colors:border-[ButtonText]";
const chipOn =
  "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]";
const chipOff =
  "border-slate-300 bg-white text-slate-900 hover:border-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]";

export function ExamCatalogBrowser({
  groups,
  items,
  initialGroup,
  initialSubject,
}: ExamCatalogBrowserProps) {
  const [group, setGroup] = useState<ExamGroupId>(initialGroup);
  const [subject, setSubject] = useState<string>(initialSubject ?? ALL_SUBJECTS);
  const nativeQuery=useNativeQuery();
  useEffect(()=>{if(!nativeQuery)return;const requested=nativeQuery.get('group');const nextGroup=groups.find(g=>g.id===requested)?.id;if(!nextGroup)return;setGroup(nextGroup);const nextSubject=nativeQuery.get('subject')??'';setSubject(items.some(i=>i.group===nextGroup&&i.subject===nextSubject)?nextSubject:ALL_SUBJECTS);},[nativeQuery,groups,items]);

  const subjects = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (item.group === group && !seen.includes(item.subject)) seen.push(item.subject);
    }
    return seen;
  }, [group, items]);

  const visibleBySubject = useMemo(() => {
    const grouped = new Map<string, ExamCatalogItem[]>();
    for (const item of items) {
      if (item.group !== group) continue;
      if (subject && item.subject !== subject) continue;
      grouped.set(item.subject, [...(grouped.get(item.subject) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [group, items, subject]);

  const activeGroup = groups.find((candidate) => candidate.id === group) ?? groups[0];

  return (
    <div className="grid gap-6">
      <section aria-labelledby="exam-step-group">
        <h2 id="exam-step-group" className="text-lg font-black text-slate-950 dark:text-white">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-sm text-white dark:bg-white dark:text-slate-950 forced-colors:border forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]" aria-hidden="true">1</span>
          試験を選ぶ
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {groups.map((candidate) => {
            const count = items.filter((item) => item.group === candidate.id).length;
            const selected = candidate.id === group;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setGroup(candidate.id);
                  setSubject(ALL_SUBJECTS);
                  syncUrl(candidate.id, ALL_SUBJECTS);
                }}
                className={`flex min-h-20 flex-col items-start rounded-2xl border-2 p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 forced-colors:border-[ButtonText] ${
                  selected ? chipOn : chipOff
                }`}
              >
                <span className="text-base font-black leading-6">{candidate.shortTitle}</span>
                <span className={`mt-1 text-xs font-bold ${selected ? "opacity-90" : "text-slate-600 dark:text-slate-300"}`}>
                  {count}回分
                </span>
              </button>
            );
          })}
        </div>
        {activeGroup ? (
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {activeGroup.description}
            <strong className="ml-1 font-black">{activeGroup.dateNote}</strong>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="exam-step-subject">
        <h2 id="exam-step-subject" className="text-lg font-black text-slate-950 dark:text-white">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-sm text-white dark:bg-white dark:text-slate-950 forced-colors:border forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]" aria-hidden="true">2</span>
          {group === "lckohyo" ? "資格を選ぶ" : "科目を選ぶ"}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[ALL_SUBJECTS, ...subjects].map((candidate) => {
            const selected = candidate === subject;
            return (
              <button
                key={candidate || "all"}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSubject(candidate);
                  syncUrl(group, candidate);
                }}
                className={`${chipBase} ${selected ? chipOn : chipOff}`}
              >
                {candidate || "すべて"}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="exam-step-date">
        <h2 id="exam-step-date" className="text-lg font-black text-slate-950 dark:text-white">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-sm text-white dark:bg-white dark:text-slate-950 forced-colors:border forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]" aria-hidden="true">3</span>
          回を選ぶ
        </h2>
        <p className="sr-only" aria-live="polite">
          {visibleBySubject.reduce((total, [, list]) => total + list.length, 0)}回分を表示しています。
        </p>
        <div className="mt-3 grid gap-5">
          {visibleBySubject.map(([subjectName, list]) => (
            <div key={subjectName}>
              <h3 className="text-base font-black text-slate-950 dark:text-white">{subjectName}</h3>
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {list.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-w-0 flex-col rounded-2xl border-2 border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-950 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
                  >
                    <p className="text-base font-black leading-6 text-slate-950 dark:text-white">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      <time dateTime={item.date}>{item.dateText}</time>
                      {item.dateKind === "publication" ? "（試験実施日ではありません）" : null}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                      {item.questionCount !== null ? (
                        <li className="rounded-full border border-slate-400 px-2 py-1">
                          {item.questionCount}問
                        </li>
                      ) : null}
                      <li className="rounded-full border border-slate-400 px-2 py-1">
                        {scoringBadge(item)}
                      </li>
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.questionCount !== null ? (
                        <Link
                          href={item.href}
                          prefetch={false}
                          aria-label={`${item.subject} ${item.label}の問題演習を始める`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
                        >
                          演習する
                          <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </Link>
                      ) : null}
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-sky-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
                      >
                        公式PDF
                        <span className="sr-only">（{item.subject} {item.label}、新しいタブで開きます）</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
