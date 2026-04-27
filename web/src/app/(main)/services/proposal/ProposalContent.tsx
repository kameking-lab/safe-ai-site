"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Building,
  Factory,
  CheckCircle2,
  Printer,
  Mail,
  ExternalLink,
  Calendar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type PlanId = "small" | "mid" | "large";

interface PlanSpec {
  id: PlanId;
  badge: string;
  scale: string;
  title: string;
  monthly: string;
  setup: string;
  paymentLink: string;
  description: string;
  features: string[];
  recommended: string[];
  schedule: { phase: string; weeks: string; deliverables: string }[];
  Icon: typeof Building;
  accent: {
    border: string;
    bg: string;
    btn: string;
    text: string;
    badge: string;
  };
}

const PLANS: PlanSpec[] = [
  {
    id: "small",
    badge: "スターター",
    scale: "中小企業（〜50名）",
    title: "スターター・プラン",
    monthly: "¥80,000 / 月",
    setup: "初期費用 ¥150,000",
    // TODO: 本番のStripe Payment Linkに差し替え
    paymentLink: "https://buy.stripe.com/PLACEHOLDER_STARTER",
    description:
      "個人事業主・一人親方・中小事業者向け。KY・教育・法改正通知の3点セットで、現場の安全管理を一気にデジタル化します。",
    features: [
      "ANZEN AI 全機能（Pro相当）アカウント 10名分",
      "KYデジタル化テンプレート（業種別1種）",
      "法改正通知（メール／月次レポート）",
      "特別教育 年2回（オンライン・最大20名）",
      "月1回 オンライン顧問（30分）",
      "メール／チャット相談（営業日24時間以内回答）",
    ],
    recommended: [
      "従業員10〜50名の建設・製造・運輸事業者",
      "安全担当者が兼任で時間を取れない",
      "まずは小さく始めて効果を見たい",
    ],
    schedule: [
      { phase: "Phase 1", weeks: "1〜2週", deliverables: "現状ヒアリング／KYテンプレート設計／アカウント発行" },
      { phase: "Phase 2", weeks: "3〜4週", deliverables: "現場テスト運用／フィードバック反映" },
      { phase: "Phase 3", weeks: "5週以降", deliverables: "本格運用／月次レビュー開始" },
    ],
    Icon: Building,
    accent: {
      border: "border-emerald-300",
      bg: "from-emerald-50 to-white",
      btn: "bg-emerald-600 hover:bg-emerald-700",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800",
    },
  },
  {
    id: "mid",
    badge: "スタンダード",
    scale: "中規模企業（50〜300名）",
    title: "スタンダード・プラン",
    monthly: "¥150,000 / 月",
    setup: "初期費用 ¥400,000",
    // TODO: 本番のStripe Payment Linkに差し替え
    paymentLink: "https://buy.stripe.com/PLACEHOLDER_STANDARD",
    description:
      "複数現場・複数支店を抱える中規模企業向け。安全管理業務の自動化と化学物質RAまで含めた、本格運用パッケージ。",
    features: [
      "ANZEN AI 全機能 アカウント 50名分",
      "KYデジタル化（業種別3種＋現場別カスタム）",
      "安全管理業務の自動化（VBA／Webアプリ）",
      "化学物質リスクアセスメント体制構築（〜30物質）",
      "特別教育 年6回（オンライン・対面選択可）",
      "月2回 オンライン顧問（60分）／緊急対応窓口",
      "法改正通知＋社内通達テンプレ自動生成",
    ],
    recommended: [
      "従業員50〜300名・複数現場／支店あり",
      "化学物質を扱う製造・建設業",
      "安全担当者を専任で配置している",
    ],
    schedule: [
      { phase: "Phase 1", weeks: "1〜3週", deliverables: "全社業務フロー診断／優先順位付け" },
      { phase: "Phase 2", weeks: "4〜8週", deliverables: "KY・自動化ツール開発／化学物質DB整備" },
      { phase: "Phase 3", weeks: "9〜12週", deliverables: "全社展開／教育実施／運用定着支援" },
      { phase: "継続", weeks: "13週〜", deliverables: "月次顧問／改正対応／改善PDCA" },
    ],
    Icon: Building2,
    accent: {
      border: "border-sky-400",
      bg: "from-sky-50 to-white",
      btn: "bg-sky-600 hover:bg-sky-700",
      text: "text-sky-700",
      badge: "bg-sky-100 text-sky-800",
    },
  },
  {
    id: "large",
    badge: "エンタープライズ",
    scale: "大手企業（300名以上）",
    title: "エンタープライズ・プラン",
    monthly: "¥250,000 / 月〜",
    setup: "初期費用 ¥1,000,000〜",
    // TODO: 本番のStripe Payment Linkに差し替え
    paymentLink: "https://buy.stripe.com/PLACEHOLDER_ENTERPRISE",
    description:
      "300名以上の大手企業・グループ会社向け。SSO・専用環境・SLA保証付きで、全社安全管理プラットフォームとして導入できます。",
    features: [
      "ANZEN AI 全機能 アカウント無制限（グループ会社含む）",
      "専用環境（VPC／オンプレ可）／SSO・IP制限",
      "業種別KY＋多現場ロールアウト（10現場以上）",
      "化学物質RA・SDS自動取り込み（〜500物質）",
      "Claude Code 活用 業務システム開発（年4本まで）",
      "特別教育 無制限／講師派遣／RST・安全大会講演",
      "月4回 顧問（オンライン＋現地訪問）／SLA 99.5%",
      "法改正・通達の影響評価レポート（月次）",
    ],
    recommended: [
      "従業員300名以上のゼネコン・大手製造業",
      "グループ会社／全国展開／海外拠点あり",
      "監査対応・ESG開示まで含めて整備したい",
    ],
    schedule: [
      { phase: "Phase 1", weeks: "1〜4週", deliverables: "全社診断／要件定義／セキュリティ要件確定" },
      { phase: "Phase 2", weeks: "5〜12週", deliverables: "専用環境構築／SSO連携／パイロット部門展開" },
      { phase: "Phase 3", weeks: "13〜24週", deliverables: "全社ロールアウト／管理者教育／監査対応" },
      { phase: "継続", weeks: "25週〜", deliverables: "月次顧問／継続開発／年次監査支援" },
    ],
    Icon: Factory,
    accent: {
      border: "border-violet-400",
      bg: "from-violet-50 to-white",
      btn: "bg-violet-600 hover:bg-violet-700",
      text: "text-violet-700",
      badge: "bg-violet-100 text-violet-800",
    },
  },
];

const COMMON_ITEMS = [
  "労働安全コンサルタント（登録番号260022・土木区分）が監修・直接担当",
  "業務委託契約書に「成果物の知的財産権帰属」「ソースコード引渡条項」を明記",
  "助成金（人材開発支援助成金・業務改善助成金・エイジフレンドリー補助金）申請サポート対応",
  "全プラン Cal.com にて無料相談30分を予約可能",
];

export function ProposalContent() {
  const [selected, setSelected] = useState<PlanId>("mid");

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  const currentPlan = PLANS.find((p) => p.id === selected) ?? PLANS[1];
  const PlanIcon = currentPlan.Icon;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      {/* 操作バー（印刷時非表示） */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            Enterprise Proposal Templates
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            法人向け 提案書テンプレート（3プラン）
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            ANZEN AI の法人向け導入プランを提案書フォーマットでまとめました。プランを選択して
            「PDF出力」ボタンから印刷ダイアログ → PDF保存できます。
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          PDF出力（印刷）
        </button>
      </div>

      {/* プラン選択タブ（印刷時非表示） */}
      <div className="mb-6 flex flex-wrap gap-2 print:hidden" role="tablist">
        {PLANS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(p.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                active
                  ? `${p.accent.border} bg-white shadow-sm ${p.accent.text}`
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
              }`}
            >
              {p.badge}・{p.scale}
            </button>
          );
        })}
      </div>

      {/* 提案書本体 */}
      <article className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:shadow-none">
        {/* ヘッダー */}
        <header
          className={`rounded-xl border ${currentPlan.accent.border} bg-gradient-to-br ${currentPlan.accent.bg} p-6`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <PlanIcon className={`h-7 w-7 ${currentPlan.accent.text}`} />
            </div>
            <div className="flex-1">
              <span
                className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${currentPlan.accent.badge}`}
              >
                {currentPlan.badge}・{currentPlan.scale}
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                {currentPlan.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{currentPlan.description}</p>
              <div className="mt-4 flex flex-wrap items-baseline gap-4">
                <p className={`text-3xl font-bold ${currentPlan.accent.text}`}>
                  {currentPlan.monthly}
                </p>
                <p className="text-sm font-semibold text-slate-600">{currentPlan.setup}</p>
              </div>
            </div>
          </div>
        </header>

        {/* 提案先 */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            ご提案先
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">御社名</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                ＿＿＿＿＿＿＿＿＿＿＿＿＿＿ 御中
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">提案日</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {new Date().toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </section>

        {/* 主要機能 */}
        <section>
          <h3 className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3 text-lg font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            ご提供範囲
          </h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {currentPlan.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-slate-800"
              >
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${currentPlan.accent.text}`} />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* 推奨ターゲット */}
        <section>
          <h3 className="flex items-center gap-2 border-l-4 border-sky-500 pl-3 text-lg font-bold text-slate-900">
            <Building2 className="h-5 w-5 text-sky-600" />
            こんな企業様におすすめ
          </h3>
          <ul className="mt-4 space-y-2">
            {currentPlan.recommended.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm leading-6 text-slate-800">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${currentPlan.accent.text} bg-current`} />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* スケジュール */}
        <section>
          <h3 className="flex items-center gap-2 border-l-4 border-amber-500 pl-3 text-lg font-bold text-slate-900">
            <Calendar className="h-5 w-5 text-amber-600" />
            導入スケジュール
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">フェーズ</th>
                  <th className="py-2 pr-4">期間</th>
                  <th className="py-2">主な成果物</th>
                </tr>
              </thead>
              <tbody>
                {currentPlan.schedule.map((s) => (
                  <tr key={s.phase} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-bold text-slate-900">{s.phase}</td>
                    <td className="py-3 pr-4 text-slate-700">{s.weeks}</td>
                    <td className="py-3 text-slate-700">{s.deliverables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 共通条件 */}
        <section>
          <h3 className="flex items-center gap-2 border-l-4 border-violet-500 pl-3 text-lg font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
            共通条件・品質保証
          </h3>
          <ul className="mt-4 space-y-2">
            {COMMON_ITEMS.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-sm leading-6 text-slate-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                {c}
              </li>
            ))}
          </ul>
        </section>

        {/* 価格と決済 */}
        <section className={`rounded-xl border ${currentPlan.accent.border} p-6`}>
          <h3 className="text-lg font-bold text-slate-900">お見積り</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">月額顧問料</p>
              <p className={`mt-1 text-2xl font-bold ${currentPlan.accent.text}`}>
                {currentPlan.monthly}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">初期費用</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{currentPlan.setup}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            ※ 価格は税抜目安。要件・対象人数・現場数により変動します。年間契約・複数プラン併用での割引あり。
          </p>
          <div className="mt-4 flex flex-wrap gap-3 print:hidden">
            <a
              href={currentPlan.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-xl ${currentPlan.accent.btn} px-5 py-3 text-sm font-bold text-white shadow-sm`}
            >
              Stripeで決済する
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href={`/enterprise/contact?plan=${currentPlan.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:border-emerald-400"
            >
              <Mail className="h-4 w-4" />
              先に無料相談したい
            </Link>
          </div>
        </section>

        {/* フッター */}
        <footer className="border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500">
          <p>ANZEN AI（運営：労働安全コンサルタント事務所）</p>
          <p>監修：労働安全コンサルタント 登録番号260022（土木区分）</p>
          <p>本提案書は概算見積です。正式見積は無料相談（30分）後に2〜3営業日以内にお送りします。</p>
        </footer>
      </article>

      {/* 全プラン比較表 */}
      <section className="mt-10 print:hidden">
        <h2 className="text-lg font-bold text-slate-900">3プラン比較</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                <th className="px-3 py-2">項目</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-3 py-2">
                    {p.badge}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs font-semibold text-slate-500">対象規模</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-sm font-bold text-slate-900">
                    {p.scale}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs font-semibold text-slate-500">月額</td>
                {PLANS.map((p) => (
                  <td key={p.id} className={`px-3 py-2 text-sm font-bold ${p.accent.text}`}>
                    {p.monthly}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-3 py-2 text-xs font-semibold text-slate-500">初期費用</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-sm text-slate-700">
                    {p.setup}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default ProposalContent;
