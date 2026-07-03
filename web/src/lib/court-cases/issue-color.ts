import type { CourtCaseIssue } from "@/data/court-cases";

/**
 * 判例DBの争点タグ配色（柱0）。一覧(court-cases-browser.tsx)と詳細([id]/page.tsx)で
 * 同じ争点は同じ色にする＝一箇所に集約し二重定義によるドリフトを防ぐ。
 * 16分類全てを明示（Record<CourtCaseIssue, ...>で欠落があればビルド時に型エラー）。
 */
export const ISSUE_COLOR: Record<CourtCaseIssue, string> = {
  安全配慮義務: "bg-emerald-100 text-emerald-800 border-emerald-200",
  過失相殺: "bg-amber-100 text-amber-800 border-amber-200",
  "元請・下請責任": "bg-sky-100 text-sky-800 border-sky-200",
  "派遣・請負先責任": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "役員・個人責任": "bg-orange-100 text-orange-800 border-orange-200",
  刑事責任: "bg-red-200 text-red-900 border-red-300",
  "国・行政責任": "bg-violet-100 text-violet-800 border-violet-200",
  業務起因性: "bg-teal-100 text-teal-800 border-teal-200",
  労働者性: "bg-rose-100 text-rose-800 border-rose-200",
  "解雇・雇止め": "bg-red-100 text-red-800 border-red-200",
  "労働時間・割増賃金": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "配転・出向": "bg-lime-100 text-lime-800 border-lime-200",
  懲戒: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "就業規則・労働条件": "bg-blue-100 text-blue-800 border-blue-200",
  "賃金・退職金": "bg-amber-200 text-amber-950 border-amber-400",
  "男女・雇用差別": "bg-pink-100 text-pink-800 border-pink-200",
};
