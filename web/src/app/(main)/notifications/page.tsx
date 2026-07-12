import type { Metadata } from "next";
import { Bell, CheckCircle, Mail, Rss } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/layout";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubscribeForm } from "./subscribe-form";
import { NotificationSettingsPanel } from "./notification-settings";
import { PushSubscribePanel } from "./push-subscribe-panel";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "安全情報 通知センター・配信設定";
const _desc =
  "気象警報・労働安全衛生法改正・重大災害情報のサイト内通知センター（ベル）、画面表示中のOS通知、メール配信、RSS購読の設定。重要な安全情報を見逃さない。";

export const metadata: Metadata = {
  alternates: { canonical: "/notifications" },
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

/** RSS/購読フィード一覧（実在ルートのみ。買い切りツールでの購読の逃げ道） */
const FEEDS = [
  { href: "/feed/news.xml", label: "新着すべて（法改正・通達・重大災害・速報）" },
  { href: "/feed/law-revisions.xml", label: "法改正のみ" },
  { href: "/feed/weather-alerts.xml", label: "気象警報（警報・特別警報の発表中都道府県）" },
  { href: "/feed/serious-cases.xml", label: "重大災害事例" },
] as const;

export default function NotificationsPage() {
  return (
    <PageContainer width="wide" paddingY="tight">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description={_desc} path="/notifications" />
      <PageHeader
        title="通知センター・配信設定"
        description="気象警報・法改正・重大災害情報の通知とメール配信・RSS購読の設定"
        icon={Bell}
        iconColor="blue"
      />

      <div className="mt-4">
        <ConclusionCard
          tone="safe"
          value={5}
          unit="経路"
          title="通知を受け取る方法 提供中"
          description="ヘッダーのベル（通知センター）／閉じている端末にも届くプッシュ通知（Web Push）／画面表示中のOS通知／メール配信／RSS購読の5経路。"
          icon={Bell}
        >
          <StatusBadge tone="safe" size="sm">ベル=全ページ常設</StatusBadge>
          <StatusBadge tone="safe" size="sm">プッシュ=閉端末にも到達</StatusBadge>
          <StatusBadge tone="neutral" size="sm">既読はこの端末内のみ</StatusBadge>
        </ConclusionCard>
      </div>

      {/* 閉端末プッシュ通知（Web Push）購読 */}
      <div className="mt-6">
        <PushSubscribePanel />
      </div>

      {/* OS通知（画面表示中）設定 */}
      <div className="mt-6">
        <NotificationSettingsPanel />
      </div>

      {/* 気象警報メール登録フォーム */}
      <div className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800">気象警報メール通知を登録する</h2>
        </div>
        <p className="mb-4 text-xs text-slate-600 leading-5">
          大雨・暴風・高温注意情報などの気象警報が発令された際に、現場担当者へメールでお知らせします。
          登録は無料です。
        </p>
        <SubscribeForm />
      </div>

      {/* RSS購読（自分のツールで受ける逃げ道） */}
      <div className="mt-6 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Rss className="h-5 w-5 text-orange-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800">RSSで購読する（Slack・Teams・RSSリーダー向け）</h2>
        </div>
        <p className="mb-3 text-xs leading-5 text-slate-600">
          お使いのツール（SlackのRSSアプリ・Teams・Feedly等）にURLを登録すると、法改正や警報の新着が
          そちらに届きます。アカウント登録は不要です。
        </p>
        <ul className="space-y-1.5">
          {FEEDS.map((f) => (
            <li key={f.href}>
              <a
                href={f.href}
                className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-orange-700 underline decoration-orange-300 hover:text-orange-900"
              >
                <Rss className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {f.label}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{f.href}</code>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* 提供状況（正直な区別） */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">提供状況</h2>
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">提供中</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">今すぐ使えます</span>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                "サイト内通知センター（ヘッダーのベル）: 気象警報・法改正・重大災害事例・事故速報を集約、既読管理つき",
                "閉じている端末にも届くプッシュ通知（Web Push）: 上の購読ボタンで有効化。ブラウザを閉じていても警報級の気象警報が届く",
                "画面表示中のOS通知: サイネージ・常時表示端末で警報級の新着をポップアップ（上の設定でON）",
                "気象警報のメール配信（登録フォーム）",
                "RSS購読フィード（法改正・警報・重大災害・新着すべて）",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">今後の拡張予定</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">設計済み</span>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                "気象警報に続く法改正・KY承認のプッシュ配信",
                "現場エリア別のきめ細かい配信ルール",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              プッシュ通知の第1弾は気象警報です。法改正・KY承認への拡張は送信APIの拡張ポイントとして設計済みです。
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
