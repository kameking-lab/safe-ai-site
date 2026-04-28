"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SITE_STATS, SITE_STATS_META, type SiteStatKey } from "@/data/site-stats";
import { PersonaEntry } from "@/components/PersonaEntry";
import { PAID_MODE } from "@/lib/paid-mode";

const STATS: { key: SiteStatKey; value: string; label: string; hint: string }[] = [
  { key: "accidentDbCount", value: SITE_STATS.accidentDbCount, label: "厚労省 事故DB収録件数", hint: "全件検索対応" },
  { key: "fatalDisastersR5", value: SITE_STATS.fatalDisastersR5, label: "死亡労災（R5・建設業）", hint: "厚労省統計" },
  { key: "lawArticleCount", value: SITE_STATS.lawArticleCount, label: "法令条文データ", hint: "RAG検索で即照合" },
  { key: "specialEdKinds", value: SITE_STATS.specialEdKinds, label: "特別教育 対応種別", hint: "過去問クイズ付" },
];

// 主役5機能（戦略V2準拠: KY / AIチャット / 化学物質RA / 事故DB / ダイジェスト）
// 二軍機能（法改正・Eラーニング・リスク予測）はフッター・⌘K検索・サブナビから到達。
const CAPABILITIES = [
  {
    emoji: "📝",
    label: "KY用紙（危険予知）",
    desc: "紙を廃止。シンプル／詳細モード、音声入力、PDF出力対応。",
    href: "/ky",
  },
  {
    emoji: "💬",
    label: "安衛法AIチャット",
    desc: "「これって違反？」の疑問を即解決。条文根拠付きで回答。",
    href: "/chatbot",
  },
  {
    emoji: "⚗️",
    label: "化学物質リスクアセスメント",
    desc: "640物質+のRA。CREATE-SIMPLE/コントロール・バンディング自動判定。",
    href: "/chemical-ra",
  },
  {
    emoji: "🗂",
    label: "事故データベース",
    desc: "厚労省データを横断検索。業種・原因別に傾向を把握。",
    href: "/accidents",
  },
  {
    emoji: "📰",
    label: "朝のダイジェスト",
    desc: "通達アラート・事故事例・法改正カレンダーを業種別に毎日配信。",
    href: "/#section-home",
  },
] as const;

const STRENGTH_ITEMS = [
  {
    title: "労働安全コンサルタント（登録番号260022・土木）が直接担当",
    desc: "大手ゼネコンで大型土木インフラ施工管理を担当した実務経験。机上論ではなく、現場で回る仕組みを設計します。",
  },
  {
    title: "Claude Code を活用した短納期開発",
    desc: "本サイト自体が Claude Code 製（要件定義から初版2週間目安）。社内ツール・教材・Chatbotを短納期で構築。",
  },
  {
    title: "コンサル × 実装力をワンストップで提供",
    desc: "労働安全の現場知識と Next.js 実装力を1人で両立。Excel代行・システム会社では難しい『現場で実際に使える仕組み』を一気通貫で提供。",
  },
];

export function HomeValueHero() {
  return (
    <div className="space-y-6" aria-label="ホームの価値案内">
      {/* 研究プロジェクト・無料公開バナー（ヒーロー直下のSticky） */}
      {!PAID_MODE && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-4 py-3 shadow-sm"
          role="note"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="text-xs font-bold text-emerald-900 sm:text-sm">
              研究プロジェクト 無料公開中
              <span className="ml-2 hidden font-normal text-emerald-800 sm:inline">
                — 個人運営の労働安全 × AI/DX 実証ポータル
              </span>
            </p>
          </div>
          <Link
            href="/about"
            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
          >
            詳しく
          </Link>
        </div>
      )}

      {/* メインヒーロー */}
      <div className="rounded-2xl border border-[#155a38] bg-gradient-to-br from-[#1a7a4c] via-[#166640] to-[#0f4d2e] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
                ANZEN AI — 労働安全コンサルタント（登録番号260022）監修
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
              現場の安全を、<br className="sm:hidden" />
              AIで変える。
            </h2>
            <p className="mt-3 text-sm leading-6 text-green-100 sm:text-base">
              建設・製造・介護・林業・運輸の現場向け。
              朝礼KY・法改正・事故DB・Eラーニングを1つのポータルに集約した
              <strong className="text-white">労働安全 × AI・DX の研究・実証プロジェクト</strong>
              として、すべての機能を無料で公開しています。
            </p>

            {/* 統計バッジ — 出典・取得日をtitle属性で開示 */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATS.map((s) => {
                const meta = SITE_STATS_META[s.key];
                const tooltip = `${meta.source}（取得: ${meta.asOf}）`;
                return (
                  <div
                    key={s.label}
                    className="rounded-lg bg-white/10 px-3 py-2.5 text-center"
                    title={tooltip}
                  >
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-green-100">{s.label}</p>
                    <p className="text-[9px] text-green-200/80">
                      {s.hint}・{meta.asOf}時点
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-green-200/80">
              ※ 出典は各統計値にカーソルを合わせると表示。
              <a
                href="https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                厚労省 職場のあんぜんサイト
              </a>
              ・
              <a
                href="https://www.mhlw.go.jp/stf/newpage_38791.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                令和5年労働災害発生状況
              </a>
            </p>

            {/* 3つのメインCTA */}
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {PAID_MODE ? (
                <>
                  <Link
                    href="/pricing#free"
                    className="rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-[#1a7a4c] hover:bg-emerald-50 transition-colors shadow"
                  >
                    無料で使ってみる →
                  </Link>
                  <Link
                    href="/contact"
                    className="rounded-lg border-2 border-white/60 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
                  >
                    受託業務のご相談 →
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-amber-400 transition-colors shadow"
                  >
                    料金プランを見る →
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="#features-section"
                    className="rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-[#1a7a4c] hover:bg-emerald-50 transition-colors shadow"
                  >
                    機能を試す →
                  </Link>
                  <Link
                    href="/contact"
                    className="rounded-lg border-2 border-white/60 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/20 transition-colors"
                  >
                    ご意見を送る →
                  </Link>
                  <Link
                    href="/leaflet"
                    className="rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-amber-400 transition-colors shadow"
                  >
                    サイトを応援する →
                  </Link>
                </>
              )}
            </div>
            {/* 無料登録3ステップ */}
            <ol className="mt-4 grid gap-2 text-[11px] leading-5 text-green-50 sm:grid-cols-3">
              <li className="rounded-md border border-white/20 bg-white/10 px-3 py-2">
                <span className="font-bold text-white">① 登録不要</span>
                <span className="ml-1 text-green-100/90">
                  {PAID_MODE ? "— 課金は明示同意した時のみ" : "— 全機能を無料で試せます"}
                </span>
              </li>
              <li className="rounded-md border border-white/20 bg-white/10 px-3 py-2">
                <span className="font-bold text-white">② 一次ソース付き</span>
                <span className="ml-1 text-green-100/90">— 厚労省・e-Govの原本リンクあり</span>
              </li>
              <li className="rounded-md border border-white/20 bg-white/10 px-3 py-2">
                <span className="font-bold text-white">③ フィードバック歓迎</span>
                <span className="ml-1 text-green-100/90">— ご意見でサイトが進化します</span>
              </li>
            </ol>
            <p className="mt-3 text-[11px] text-green-100">
              ※ ご意見・ご質問には原則3営業日以内に返信します（土日祝除く）。
            </p>
          </div>
          {/* マスコット */}
          <div className="hidden sm:flex flex-shrink-0 items-end self-end pb-1">
            <Image
              src="/mascot/mascot-chihuahua-4.png"
              alt="ANZEN AI マスコット"
              width={88}
              height={88}
              className="drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* 「こんな方に」セクション — 8カテゴリのペルソナ別入口 */}
      <PersonaEntry />

      {/* 「できること」セクション */}
      <section
        id="features-section"
        aria-labelledby="capabilities-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-300">
          できること
        </p>
        <h3 id="capabilities-heading" className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
          毎日使う5機能を、無料ですぐ試せます。
        </h3>
        <p className="mt-1 text-[11px] text-slate-500">
          法改正チェック・Eラーニング・AIリスク予測など、その他の機能は{" "}
          <span className="font-semibold text-slate-600">⌘K（または Ctrl+K）</span>{" "}
          のサイト内検索、または
          <a href="#features-secondary" className="font-semibold text-slate-600 underline">
            こちらの一覧
          </a>
          から開けます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-400/70"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {c.emoji}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{c.desc}</p>
              <span className="mt-3 text-xs font-bold text-emerald-700 group-hover:text-emerald-800 dark:text-emerald-300 dark:group-hover:text-emerald-200">
                使ってみる →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* サブ機能（二軍） — 主役5機能の補助。スペース小さくシンプルに。 */}
      <section
        id="features-secondary"
        aria-label="その他の機能"
        className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          その他の機能
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {[
            { href: "/laws", label: "📋 法改正チェック" },
            { href: "/e-learning", label: "🎓 Eラーニング・過去問" },
            { href: "/risk-prediction", label: "🛡 AIリスク予測" },
            { href: "/circulars", label: "📄 通達一覧" },
            { href: "/articles", label: "📰 解説記事" },
            { href: "/equipment-finder", label: "🛡 保護具AI" },
            { href: "/law-search", label: "🔍 条文検索" },
            { href: "/exam-quiz", label: "🧠 過去問クイズ" },
          ].map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              {f.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Claude Code × 安全 の強み */}
      <section
        aria-labelledby="strength-heading"
        className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:via-slate-800 dark:to-emerald-500/10 sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          Claude Code × 安全 の強み
        </p>
        <h3 id="strength-heading" className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
          「現場を知る人間」が「最新AIで実装する」からこそ、速くて正しい。
        </h3>
        <div className="mt-4 space-y-3">
          {STRENGTH_ITEMS.map((s, i) => (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 関連動線 — PAID_MODE で内容が切り替わる */}
      <section
        aria-labelledby="services-section-heading"
        className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-slate-800 dark:to-amber-500/10 sm:p-6"
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          {PAID_MODE ? "ANZEN AI サービス" : "ANZEN AI 研究プロジェクト"}
        </p>
        <h3 id="services-section-heading" className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
          {PAID_MODE
            ? "用途に合わせて、無料から受託まで選べます。"
            : "プロジェクトに参加するには、3つの方法があります。"}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(PAID_MODE
            ? [
                {
                  href: "/pricing",
                  title: "月額プラン（¥0〜）",
                  desc: "フリー／スタンダード¥980／プロ¥2,980。いつでもキャンセル可。",
                  cta: "プランを見る",
                  color: "bg-white border-emerald-200 hover:border-emerald-400 dark:bg-slate-800 dark:border-emerald-500/30 dark:hover:border-emerald-400/70",
                  accent: "text-emerald-700 dark:text-emerald-300",
                },
                {
                  href: "/services",
                  title: "受託業務（¥150k〜）",
                  desc: "KY・安全管理・教育・法改正通知・Claude Code 開発まで。",
                  cta: "受託メニューを見る",
                  color: "bg-white border-amber-200 hover:border-amber-400 dark:bg-slate-800 dark:border-amber-500/30 dark:hover:border-amber-400/70",
                  accent: "text-amber-700 dark:text-amber-300",
                },
                {
                  href: "/contact",
                  title: "無料相談30分",
                  desc: "課題整理から最適プラン提案まで。強引な営業は一切なし。",
                  cta: "相談を申し込む",
                  color: "bg-white border-violet-200 hover:border-violet-400 dark:bg-slate-800 dark:border-violet-500/30 dark:hover:border-violet-400/70",
                  accent: "text-violet-700 dark:text-violet-300",
                },
              ]
            : [
                {
                  href: "/stats",
                  title: "利用統計を見る",
                  desc: "公開ダッシュボードでコンテンツ規模・UU推移・AI利用を共有しています。",
                  cta: "統計を見る",
                  color: "bg-white border-emerald-200 hover:border-emerald-400 dark:bg-slate-800 dark:border-emerald-500/30 dark:hover:border-emerald-400/70",
                  accent: "text-emerald-700 dark:text-emerald-300",
                },
                {
                  href: "/contact",
                  title: "ご意見・改善提案",
                  desc: "データの誤り・追加してほしい機能・現場で使いにくい点をお知らせください。匿名でも投稿可。",
                  cta: "意見を送る",
                  color: "bg-white border-amber-200 hover:border-amber-400 dark:bg-slate-800 dark:border-amber-500/30 dark:hover:border-amber-400/70",
                  accent: "text-amber-700 dark:text-amber-300",
                },
                {
                  href: "/leaflet",
                  title: "リーフレットで応援",
                  desc: "A4両面の紹介リーフレットを配布・印刷し、プロジェクトを広めてください。",
                  cta: "リーフレットを開く",
                  color: "bg-white border-violet-200 hover:border-violet-400 dark:bg-slate-800 dark:border-violet-500/30 dark:hover:border-violet-400/70",
                  accent: "text-violet-700 dark:text-violet-300",
                },
              ]
          ).map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md ${card.color}`}
            >
              <div>
                <p className={`text-sm font-bold ${card.accent}`}>{card.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-300">{card.desc}</p>
              </div>
              <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${card.accent}`}>
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
