"use client";

import Image from 'next/image';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, ExternalLink, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Mascot } from '@/components/mascot';
import { generateAmazonAffiliateUrl, generateRakutenSearchUrl } from '@/lib/affiliate-url';
import { trackEvent } from '@/components/Analytics';
import { CATEGORIES, TASKS, CONDITIONS, PPE_WORK_IMAGES, PPE_WORK_LABELS, getPpeQuestions, getPpeResult, normalizePpeAnswers } from '@/lib/ppe-guided-selection';

const EVENT = 'ppe-selection-change';
function subscribe(listener: () => void) {
 window.addEventListener('popstate', listener); window.addEventListener(EVENT, listener);
 return () => { window.removeEventListener('popstate', listener); window.removeEventListener(EVENT, listener); };
}
function readSnapshot() {
 const saved = window.history.state?.ppeSelection;
 return JSON.stringify(normalizePpeAnswers(saved));
}
function navigate(answers: string[]) {
 window.history.pushState({ ...window.history.state, ppeSelection: answers }, '', window.location.href);
 window.dispatchEvent(new Event(EVENT));
}

export function SafetyGoodsWizard({ initialCategory, onReturnToDirectory }: { initialCategory?: string; onReturnToDirectory?: () => void }) {
 const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => '[]');
 const saved: string[] = JSON.parse(snapshot);
 const answers = initialCategory && saved[0] !== initialCategory ? [initialCategory] : saved;
 const category = CATEGORIES.find(item => item.id === answers[0]);
 const task = category && TASKS[category.id]?.find(item => item.id === answers[1]);
 const questions = category ? getPpeQuestions(category.id) : [];
 const finished = Boolean(task && (answers.length >= questions.length + 3 || answers.at(-1) === 'result'));
 const result = task && finished ? getPpeResult(answers.filter(value => value !== 'result')) : null;
 const index = Math.max(0, answers.length - 3);
 const question = task && answers.length >= 3 ? questions[index] : null;
 const options = !category ? CATEGORIES : !task ? TASKS[category.id] : answers.length < 3 ? [...CONDITIONS[category.id], { id: 'unknown', label: '分からない・未確認', detail: '確認方法を結果で見られます' }] : [
  { id: 'confirmed', label: question?.id === 'emergency' ? '通常作業・救助用途ではない' : question?.id === 'supplied' ? '担当者と照合・ろ過式を検討可能' : '記録・資料で確認した', detail: question?.id === 'mixture' ? '混在の有無と必要機能を照合済み' : '必要な条件を担当者・資料と照合済み' },
  { id: 'unknown', label: '分からない・未確認', detail: '推測せず、確認事項を残す' },
  { id: 'unsafe', label: question?.id === 'emergency' ? '緊急・救助で使う' : question?.id === 'supplied' ? '給気式が必要・検討中' : '条件を満たせない', detail: '通常の商品候補を保留する' },
 ];
 const heading = useRef<HTMLHeadingElement>(null);
 const previous = useRef(snapshot);
 useEffect(() => {
  if (previous.current === snapshot) return;
  previous.current = snapshot;
  heading.current?.focus({ preventScroll: true });
  heading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
 }, [snapshot]);
 const title = !category ? '何の作業・危険に備えますか？' : !task ? 'どんな作業ですか？' : answers.length < 3 ? '現場の条件は？' : question?.title ?? '確認結果';
 const reset = () => { if (initialCategory) onReturnToDirectory?.(); navigate([]); };
 const back = () => { if (answers.length <= 1) { reset(); return; } navigate(answers.slice(0, -1)); };
 return (
  <section id="goods-guided-selection" tabIndex={-1} aria-labelledby="goods-wizard-title" className="scroll-mt-24 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
   <div className="flex items-center justify-between gap-3 bg-emerald-900 px-4 py-4 text-white sm:px-6">
    <div><p className="text-xs font-bold text-emerald-100">作業 → 条件 → 確認結果</p><h2 id="goods-wizard-title" className="mt-1 text-xl font-black sm:text-2xl">絵から選んで、ひとつずつ確認</h2><p className="mt-1 text-sm text-emerald-50">分からない項目は、そのまま進めて大丈夫。</p></div>
    <Mascot variant="ppe-check" size="lg" alt="" className="hidden shrink-0 sm:block" />
   </div>
   <div className="p-4 sm:p-6">
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600" aria-label="選択した作業">
     <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-900">{category ? PPE_WORK_LABELS[category.id] : '作業を選ぶ'}</span>
     {task && <><ArrowRight className="h-3 w-3" aria-hidden="true" /><span>{task.label}</span></>}
     {task && !result && <span className="ml-auto">条件 {Math.min(answers.length - 1, questions.length + 1)} / {questions.length + 1}</span>}
    </div>
    {!result ? <>
     <h3 ref={heading} tabIndex={-1} className="scroll-mt-24 text-lg font-black text-slate-950 focus:outline-none">{title}</h3>
     {question && <p className="mt-2 text-sm leading-6 text-slate-700">{question.detail}</p>}
     {question?.prohibition && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">{question.prohibition}</p>}
     <div className={category ? 'mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3'}>
      {options?.map(option => <button key={option.id} type="button" onClick={() => navigate([...answers, option.id])} className="group flex min-h-24 flex-col rounded-2xl border-2 border-slate-200 bg-white p-3 text-left hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:p-4">
       {!category && <span className="relative mb-2 block h-24 w-full sm:h-28"><Image src={PPE_WORK_IMAGES[option.id]} alt="" fill sizes="(max-width: 640px) 150px, 240px" className="object-contain" /></span>}
       <span className="text-sm font-black leading-6 text-slate-950 sm:text-base">{!category ? PPE_WORK_LABELS[option.id] : option.label}</span>
       {category && !question && <span className="mt-1 text-xs leading-5 text-slate-600">{option.detail}</span>}
       {question && <span className="mt-1 text-xs leading-5 text-slate-600">{option.detail}</span>}
      </button>)}
     </div>
     {question && <details className="mt-3 rounded-xl border border-slate-200 p-3"><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><CircleHelp className="h-4 w-4" aria-hidden="true" />確認方法を見る</summary><p className="mt-2 text-sm leading-7 text-slate-700">{question.check}</p></details>}
     {task && <button type="button" onClick={() => navigate([...answers, 'result'])} className="mt-3 min-h-11 text-sm font-semibold text-emerald-800 underline">未確認のまま確認事項を見る</button>}
    </> : <div aria-live="polite">
     <p className={result.blocked ? 'inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-bold text-amber-950' : 'inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-950'}>{result.blocked ? <TriangleAlert className="h-4 w-4" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}{result.blocked ? '選定を保留・確認が必要' : '条件の整理が完了・適合の確認は別途必要'}</p>
     <h3 ref={heading} tabIndex={-1} className="mt-3 scroll-mt-24 text-xl font-black text-slate-950 focus:outline-none">{result.title}</h3>
     <p className="mt-2 text-sm leading-6 text-slate-700">これは保護具の種類と確認事項の整理です。製品の適合や作業の安全を証明しません。</p>
     {result.prohibition && <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950">{result.prohibition}</p>}
     {result.blocked && <div className="mt-4 rounded-xl border border-amber-200 p-4"><h4 className="font-black text-slate-950">選べない理由・次に確認すること</h4><ul className="mt-2 space-y-2">{result.missing.map((check, i) => <li key={i} className="text-sm leading-6 text-slate-800">・{check}</li>)}</ul><p role="status" className="mt-3 text-sm font-bold text-amber-950">不足条件が確認できるまで、商品候補は表示しません。</p></div>}
     <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h4 className="font-black text-slate-950">必要な規格・適合条件</h4><ul className="mt-2 space-y-2">{result.importantConditions.map(check => <li key={check} className="text-sm leading-6 text-slate-800">・{check}</li>)}</ul></div>
     <details className="mt-3 rounded-xl border border-slate-200 p-4"><summary className="min-h-11 cursor-pointer font-black text-slate-950">詳しい確認方法・選定根拠を見る</summary><ul className="mt-3 space-y-2">{result.checks.map((check, i) => <li key={i} className="flex gap-2 text-sm leading-6 text-slate-800"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{check}</li>)}</ul></details>
     <details className="mt-3 rounded-xl border border-slate-200 p-4"><summary className="min-h-11 cursor-pointer text-sm font-bold text-slate-800">回答を確認する・変更する</summary><div className="mt-2 grid gap-2">{[{ title: '現場条件', label: result.condition?.label ?? '未回答', position: 2 }, ...result.questions.map((q, i) => ({ title: q.title, label: answers[i + 3] === 'confirmed' ? '確認した' : answers[i + 3] === 'unsafe' ? '条件を満たせない・専門検討' : '分からない・未回答', position: i + 3 }))].map(row => <button key={row.position} type="button" onClick={() => navigate(answers.slice(0, row.position))} className="min-h-12 rounded-lg bg-slate-50 p-3 text-left text-sm text-slate-800"><span className="font-bold">{row.title}</span><span className="mt-1 block text-xs">{row.label}・変更する</span></button>)}</div></details>
     <a href={result.officialHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-700 px-4 text-sm font-bold text-emerald-900">{result.officialLabel}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="sr-only">（新しいタブで開く）</span></a>
     {result.category.id === 'fall' && <a href="https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1" target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline">器具の規格を確認<span className="sr-only">（新しいタブで開く）</span></a>}
     {result.category.id === 'chemical' && <a href="https://www.mhlw.go.jp/content/11300000/001670143.pdf" target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline">第3版選定マニュアル<span className="sr-only">（PDFを新しいタブで開く）</span></a>}
     {!result.blocked && result.query && <details className="mt-4 rounded-xl border border-slate-200 p-4"><summary className="min-h-11 cursor-pointer text-sm font-bold text-slate-800">種類に近い商品を一般検索する</summary><p className="mt-2 text-xs leading-6 text-slate-600">検索は規格適合の確認や当サイトの推薦ではありません。最新の製品仕様をメーカー資料で照合してください。</p><div className="mt-3 flex flex-wrap gap-2">{(['amazon', 'rakuten'] as const).map(platform => <a key={platform} href={platform === 'amazon' ? generateAmazonAffiliateUrl(result.query!) : generateRakutenSearchUrl(result.query!)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackEvent('affiliate_click', { platform, product_id: 'wizard-' + result.categoryId, product_name: result.title, page_location: 'goods_selection_wizard' })} className="inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white">{platform === 'amazon' ? 'Amazon' : '楽天'}で一般検索<span className="sr-only">（新しいタブで開く）</span></a>)}</div></details>}
     {result.blocked && <a href="/contact/automation-email?subject=ppe-selection" className="mt-3 inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white">選定を相談する</a>}
    </div>}
    {category && <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-3"><button type="button" onClick={back} className="inline-flex min-h-12 items-center gap-2 text-sm font-bold text-emerald-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" />ひとつ戻る</button><button type="button" onClick={reset} className="inline-flex min-h-12 items-center gap-2 text-sm font-bold text-slate-700"><RotateCcw className="h-4 w-4" aria-hidden="true" />作業を選び直す</button></div>}
    {onReturnToDirectory && <button type="button" onClick={onReturnToDirectory} className="mt-2 min-h-11 text-sm font-bold text-slate-700 underline">用品一覧に戻る</button>}
   </div>
  </section>
 );
}
