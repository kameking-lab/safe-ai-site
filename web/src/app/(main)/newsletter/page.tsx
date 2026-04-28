import type { Metadata } from "next";
import { Mail, Shield, Bell, TrendingUp, Heart } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { NewsletterForm } from "./newsletter-form";

const _title = "週間安全情報メルマガ登録";
const _desc =
  "毎週月曜日に最新の労働安全通達・事故事例・法改正情報をお届け。研究プロジェクトの応援者として登録して、現場の安全づくりに役立てましょう。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

const BENEFITS = [
  {
    icon: Bell,
    color: "blue",
    title: "最新通達・通知",
    desc: "厚労省の労働安全衛生通達を週3件ピックアップ。見逃しゼロに。",
  },
  {
    icon: Shield,
    color: "red",
    title: "注目の事故事例",
    desc: "実際に起きた労働災害事例を毎週1件。再発防止の参考に。",
  },
  {
    icon: TrendingUp,
    color: "emerald",
    title: "法改正情報",
    desc: "労働安全衛生法・関連法令の改正スケジュールをいち早くお知らせ。",
  },
  {
    icon: Heart,
    color: "purple",
    title: "安全活動 事例共有",
    desc: "現場からの安全活動・ヒヤリハット事例を毎週3件。",
  },
] as const;

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
  emerald: "bg-emerald-50 text-emerald-600",
  purple: "bg-purple-50 text-purple-600",
} as const;

export default function NewsletterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Mail className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          週間安全情報メルマガ
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-6">
          研究プロジェクトの応援者として登録して、<br className="hidden sm:block" />
          現場の安全に役立つ情報を毎週受け取りましょう。
        </p>
      </div>

      {/* メリット */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorMap[b.color]}`}>
              <b.icon className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{b.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 leading-5">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 登録フォーム */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">無料で登録する</h2>
          <p className="mt-1 text-xs text-slate-500">
            毎週月曜日 9:00 配信。スパムなし。いつでも配信停止できます。
          </p>
        </div>
        <NewsletterForm />
      </div>

      {/* 信頼バッジ */}
      <p className="mt-6 text-center text-xs text-slate-400 leading-6">
        個人情報は配信目的のみに使用し、第三者には提供しません。
        配信停止はメール内のリンク1クリック。
        <br />
        ANZEN AI ─ 現場の安全を、AIで変える。
      </p>
    </div>
  );
}
