import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "P3残10件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17",
  description:
    "安全AIポータル 激辛UX/SEO監査(2026-05-17, PR #235)のP3残10件をPro plan 28日内に消化する4バッチ計画。PR #238/#241/#244/#246で2件解消済後の残余を対象。",
  robots: { index: false, follow: true },
  alternates: { canonical: null as unknown as string },
};

type FindingStatus = "open" | "resolved";

type BatchFinding = {
  id: string;
  category: string;
  title: string;
  effortHours: number;
  url: string;
  fix: string;
  dependency: string;
  status: FindingStatus;
  resolvedBy?: string;
};

type BatchStatus = "planned" | "in-progress" | "completed";

type Batch = {
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  prName: string;
  dependency: string;
  effect: string;
  findings: BatchFinding[];
  status: BatchStatus;
  completedPr?: number;
};

const RESOLVED_FINDINGS: BatchFinding[] = [
  {
    id: "UX-020",
    category: "UX-F",
    title: "言語切替 <select> が PC/モバイルで重複 — 言語機能撤去により解消",
    effortHours: 1,
    url: "全ページ",
    fix: "PR #244 で英語機能撤去 → <select> 要素自体が消滅",
    dependency: "なし",
    status: "resolved",
    resolvedBy: "#244",
  },
  {
    id: "SEO-019",
    category: "SEO-F",
    title: "/api/og CDN キャッシュヘッダ未設定 — route.tsx に設定済",
    effortHours: 2,
    url: "/api/og",
    fix: "PR #239 相当: route.tsx:112 に Cache-Control: public, max-age=86400, immutable 設定済",
    dependency: "なし",
    status: "resolved",
    resolvedBy: "#239",
  },
];

const BATCHES: Batch[] = [
  {
    number: 1,
    label: "Copy & CLS Quick Wins",
    startDate: "2026-05-21",
    endDate: "2026-05-23",
    totalHours: 5,
    prName:
      "fix(ux-p3): CTA/h1 plain language + stats bar CLS (UX-011/018/019, SEO-003)",
    dependency: "なし (即時着手可)",
    effect:
      "ファーストビューの初見ユーザー認知コスト削減・CLS 改善・略語解消。new-home-hero.tsx と app-shell.tsx の局所変更のみ。",
    status: "completed",
    findings: [
      {
        id: "UX-011",
        category: "UX-C",
        title: "メインCTA「安衛法AIに質問」が初見ユーザーには略語",
        effortHours: 1,
        url: "/",
        fix: "new-home-hero.tsx:78 を「労働安全衛生法をAIに質問」に変更",
        dependency: "なし",
        status: "resolved",
      },
      {
        id: "UX-019",
        category: "UX-F",
        title: "屋外モードトグルが PC topbar + sidebar の2箇所重複",
        effortHours: 1,
        url: "全ページ (PC)",
        fix: "app-shell.tsx モバイルヘッダーの屋外ボタンを削除、PC topbar に集約",
        dependency: "なし",
        status: "resolved",
      },
      {
        id: "SEO-003",
        category: "SEO-A",
        title: "h1「現場の安全を、AIで変える。」が検索意図ワードと不一致",
        effortHours: 1,
        url: "/",
        fix: "h1 → 「労働安全衛生のAI・DX活用ポータル」、情緒コピーはサブヘッドに格下げ",
        dependency: "なし",
        status: "resolved",
      },
      {
        id: "UX-018",
        category: "UX-E",
        title: "統計バー CLS リスク (フォントロード前後でレイアウトシフト)",
        effortHours: 2,
        url: "/",
        fix: "コンテナに min-h を付与しスケルトン確保、line-clamp-1 でソーステキスト均一化",
        dependency: "UX-011 と同ファイル → 同時対応",
        status: "resolved",
      },
    ],
  },
  {
    number: 2,
    label: "Footer Restructure",
    startDate: "2026-05-28",
    endDate: "2026-05-30",
    totalHours: 6,
    prName:
      "fix(seo-p3): footer classification + anchor-text diversity (UX-015, SEO-014)",
    dependency: "Batch 1 完了後 (footer.tsx 1回で統合処理)",
    effect:
      "Footer 信頼性向上・Google 内部リンクシグナルのロングテールカバレッジ拡大。P2 Batch 2 との footer 同時編集に注意。",
    status: "planned",
    findings: [
      {
        id: "UX-015",
        category: "UX-D",
        title: "Footer「関連データ」にKY/メンタル/外国人/用品が混在",
        effortHours: 2,
        url: "全ページフッター",
        fix: "機能(操作系) vs データ(参照系) で再分類。KY事例DB/安全用品 → 現場ツール、メンタル/外国人 → 機能ハブカラムへ",
        dependency: "SEO-014 と同ファイル → 同時対応",
        status: "open",
      },
      {
        id: "SEO-014",
        category: "SEO-D",
        title: "Footer アンカーテキスト固定で多様性不足",
        effortHours: 4,
        url: "全ページフッター",
        fix: "主要リンクを「安衛法AIチャット」→「労働安全衛生法AIチャット」等ロングテールに置換",
        dependency: "UX-015 と同ファイル → 同時対応",
        status: "open",
      },
    ],
  },
  {
    number: 3,
    label: "Alert Consolidation & Strategy Hub",
    startDate: "2026-06-04",
    endDate: "2026-06-06",
    totalHours: 5,
    prName: "fix(ux-p3): alert consolidation + strategy redirect (UX-012/014)",
    dependency: "Batch 2 完了後。UX-014 は vercel.json を触るため他 redirect PR との衝突確認",
    effect:
      "First View の CTA 数を 9→6 に削減・/strategy 孤立 URL 解消・パンくず整合。",
    status: "planned",
    findings: [
      {
        id: "UX-012",
        category: "UX-C",
        title: "HomeThreePillars 3カードの AlertGenerator 配置が CTA 過多",
        effortHours: 2,
        url: "/",
        fix: "AlertGenerator を3カード共通の1つに統合し末尾配置、または初期非表示→タップ露出",
        dependency: "なし (home-three-pillars.tsx 単独)",
        status: "open",
      },
      {
        id: "UX-014",
        category: "UX-D",
        title: "/strategy ルートが孤立 (ユーザー向けハブなし)",
        effortHours: 3,
        url: "/strategy, /strategy/plan-generator",
        fix: "/strategy を /strategy/plan-generator に 301 リダイレクト (vercel.json)。内部戦略文書は /strategy/internal に退避",
        dependency: "UX-013 (BreadcrumbList) は PR #238 解消済。本 finding は単独",
        status: "open",
      },
    ],
  },
  {
    number: 4,
    label: "Navigation Breakpoint & Thin Content",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    totalHours: 6,
    prName:
      "fix(ux-p3): sidebar tablet breakpoint + thin-content dedup (UX-023, SEO-017)",
    dependency: "Batch 3 完了後 (app-shell.tsx 大規模変更、Batch 1 UX-019 と衝突しない)",
    effect:
      "タブレット縦持ち (768×1024) でサイドバー常時表示・thin content シグナル解消。",
    status: "planned",
    findings: [
      {
        id: "UX-023",
        category: "UX-G",
        title: "Sidebar が lg (1024px) 以上でのみ表示、タブレット縦持ち体験悪",
        effortHours: 3,
        url: "全ページ (tablet 768×1024)",
        fix: "app-shell.tsx:325 aside の hidden lg:flex を hidden md:flex に変更、モバイルナビの表示条件 (≤767px) も連動調整",
        dependency: "Batch 1 UX-019 で app-shell.tsx 変更済、衝突なし",
        status: "open",
      },
      {
        id: "SEO-017",
        category: "SEO-E",
        title: "機能リスト home/footer/meta で3-4箇所ほぼ同文 (thin content)",
        effortHours: 3,
        url: "/, 全ページ Footer",
        fix: "flagship-grid h2 サブテキスト整理、footer 機能カラム縮小 (/features へ誘導)、page.tsx description をキーワード凝縮版に差し替え",
        dependency: "UX-015/SEO-014 (Batch 2 footer 改修) 完了後",
        status: "open",
      },
    ],
  },
];

function StatusBadge({ status }: { status: BatchStatus | FindingStatus }) {
  if (status === "completed" || status === "resolved") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
        完了
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        進行中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      計画中
    </span>
  );
}

export default function P3BatchPlanPage() {
  const totalHours = BATCHES.reduce((s, b) => s + b.totalHours, 0);

  return (
    <PageContainer width="wide" className="py-8 md:py-12">
      {/* Header */}
      <div
        className="mb-8 rounded-xl border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-950"
        data-batch-id="header"
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="text-2xl">🔬</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            P3残10件 段階的解消計画
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          激辛UX/SEO監査 2026-05-17 (PR #235) — P3 全12件のうち2件は先行PRで解消済。残10件を4バッチ・22hで消化する計画。
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">ベースHEAD:</span>{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">
              79ca42c
            </code>{" "}
            (PR #246 merged)
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">計画作成日:</span>{" "}
            2026-05-19
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">Pro plan期限:</span>{" "}
            2026-06-15
          </div>
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-300">合計工数:</span>{" "}
            {totalHours}h (4バッチ)
          </div>
        </div>
      </div>

      {/* Resolved findings */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
          ✅ 先行PRで解消済 (2件 / 除外)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                  ID
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                  内容
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">
                  解消PR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {RESOLVED_FINDINGS.map((f) => (
                <tr key={f.id} className="bg-green-50 dark:bg-green-950">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-green-700 dark:text-green-300">
                    {f.id}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {f.title}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status="resolved" />
                    <span className="ml-2 text-xs text-slate-500">PR {f.resolvedBy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Batches */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-200">
          4バッチ実装計画
        </h2>

        <div className="space-y-6">
          {BATCHES.map((batch) => (
            <div
              key={batch.number}
              className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
              data-batch-id={`batch-${batch.number}`}
            >
              {/* Batch header */}
              <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      {batch.number}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Batch {batch.number}: {batch.label}
                    </h3>
                    <StatusBadge status={batch.status} />
                    {batch.completedPr && (
                      <span className="text-xs text-slate-500">PR #{batch.completedPr}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {batch.startDate} 〜 {batch.endDate} ／ {batch.totalHours}h ／ {batch.findings.length}件
                  </p>
                </div>
              </div>

              {/* Batch body */}
              <div className="px-6 py-4">
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">依存関係</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{batch.dependency}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">期待効果</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{batch.effect}</p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  <span className="font-medium">PR候補名:</span>{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700">{batch.prName}</code>
                </div>

                {/* Findings table */}
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
                          ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
                          Finding
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
                          修正方針
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                          工数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {batch.findings.map((f) => (
                        <tr
                          key={f.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700"
                          data-finding-id={f.id}
                          data-status={f.status}
                        >
                          <td className="px-3 py-2 align-top">
                            <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-300">
                              {f.id}
                            </span>
                            <div className="mt-0.5 text-xs text-slate-400">{f.category}</div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{f.title}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{f.url}</div>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-400">
                            {f.fix}
                          </td>
                          <td className="px-3 py-2 text-right align-top text-xs font-medium text-slate-700 dark:text-slate-300">
                            {f.effortHours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule summary */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
          消化スケジュール
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-400">バッチ</th>
                <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-400">着手日</th>
                <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-400">完了目標</th>
                <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-400">工数</th>
                <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-400">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {BATCHES.map((b) => (
                <tr key={b.number}>
                  <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                    Batch {b.number}: {b.label}
                  </td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{b.startDate}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{b.endDate}</td>
                  <td className="py-2 text-right text-slate-700 dark:text-slate-300">{b.totalHours}h</td>
                  <td className="py-2">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                <td className="py-2 text-slate-900 dark:text-slate-100" colSpan={3}>合計 (全4バッチ完了目標: 2026-06-12)</td>
                <td className="py-2 text-right text-slate-900 dark:text-slate-100">{totalHours}h</td>
                <td className="py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Pro plan 期限 (2026-06-15) の 3 日前に全バッチ完了予定。
          P2 バッチとの footer.tsx 同時編集は週単位で調整。
        </p>
      </section>

      {/* Source links */}
      <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        監査スナップショット:{" "}
        <a href="/audits/2026-05-17-ux-seo" className="underline hover:text-slate-600">
          /audits/2026-05-17-ux-seo
        </a>{" "}
        ／ P2計画:{" "}
        <a href="/audits/p2-batch-plan" className="underline hover:text-slate-600">
          /audits/p2-batch-plan
        </a>
      </div>
    </PageContainer>
  );
}
