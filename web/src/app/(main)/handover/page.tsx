import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "引き継ぎ書 | ANZEN AI",
  robots: { index: false, follow: false },
};

const VALID_KEY = "handover2026";

const SECTIONS = [
  { id: "overview", label: "1. プロジェクト概要" },
  { id: "site-status", label: "2. 現在のサイト状態" },
  { id: "wip", label: "3. 進行中の作業" },
  { id: "docs", label: "4. ドキュメントパス" },
  { id: "tools", label: "5. 連携ツール" },
  { id: "scores", label: "6. レビュースコア推移" },
  { id: "priorities", label: "7. 直近の優先タスク" },
  { id: "rules", label: "8. 運用ルール" },
  { id: "architecture", label: "9. セミナー資料アーキテクチャ" },
  { id: "education", label: "10. /education 12 項目" },
];

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function HandoverPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.key !== VALID_KEY) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="引き継ぎ書" description="引き継ぎ書について。労働安全衛生のポータル。" path="/handover" />
      {/* ヘッダー */}
      <div className="bg-slate-800 text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">ANZEN AI 内部文書</p>
          <h1 className="text-xl font-bold leading-snug">
            セッション引き継ぎ書
          </h1>
          <p className="text-sm text-slate-300 mt-1">2026-04-21 時点</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 目次 */}
        <nav className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            目次
          </p>
          <ol className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block text-sm text-blue-600 hover:text-blue-800 py-0.5"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1. プロジェクト概要 */}
        <section id="overview">
          <SectionTitle num={1} title="プロジェクト概要" />
          <Table
            rows={[
              ["サイト名", "ANZEN AI（安全AIサイト）"],
              ["URL", "https://safe-ai-site.vercel.app"],
              ["目的", "労働安全の独立コンサルタント受注サイト（協会向けポートフォリオ兼務）"],
              ["運営表記", "ANZEN AI 運営チーム"],
              ["デプロイ", "Vercel（GitHub main ブランチ自動デプロイ）"],
              ["フロント", "Next.js App Router / TypeScript / Tailwind CSS"],
            ]}
          />
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>⚠️ 重要:</strong> 運営者の実名は絶対に出力しないこと。特商法の請求開示方式を採用済み。
          </div>
        </section>

        {/* 2. 現在のサイト状態 */}
        <section id="site-status">
          <SectionTitle num={2} title="現在のサイト状態" />
          <SubHeading>料金プラン (/pricing)</SubHeading>
          <p className="text-sm text-slate-600 mb-3">
            Free ¥0 / Standard ¥980 / Pro ¥2,980 / Custom 見積もり<br />
            「課金準備中」バッジ表示中、Stripe 未接続
          </p>
          <SubHeading>サービス (/services)</SubHeading>
          <Table
            rows={[
              ["労働安全診断", "¥198,000〜"],
              ["KY システム構築", "¥498,000〜"],
              ["Excel VBA 業務改善", "¥198,000〜"],
              ["Web 制作", "¥498,000〜"],
              ["AI 研修・セミナー", "¥298,000〜"],
              ["ドキュメント作成代行", "¥298,000〜"],
              ["Claude Code 活用支援", "個別見積"],
            ]}
          />
          <SubHeading>教育 (/education)</SubHeading>
          <p className="text-sm text-slate-600 mb-3">
            現在 21 項目表示中 → <strong>12 項目への再構成方針確定</strong><br />
            サンプル 1 件（腰痛予防）本番反映済み・激辛 Chrome レビュー待ち
          </p>
          <SubHeading>MHLW データ統合</SubHeading>
          <Table
            rows={[
              ["事故データベース（Vercel Blob）", "504,415 件"],
              ["化学物質", "3,984 件"],
              ["法令条文", "1,127 条文"],
              ["死亡災害", "4,043 件"],
              ["死亡労災（R5・建設業）", "1,389 件"],
            ]}
          />
          <div className="mt-3 p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
            R8 緊急修正完了（職長教育 11 業種、化学物質濃度基準値、熱中症 612 条の 2）<br />
            GSC 登録済み・sitemap 送信済み<br />
            チャットボット: コピー・履歴・エクスポート・共有機能を R9 実装（main マージ済み）
          </div>
        </section>

        {/* 3. 進行中の作業 */}
        <section id="wip">
          <SectionTitle num={3} title="進行中の作業" />
          <div className="space-y-2">
            {[
              { done: true, text: "/education/roudoueisei/youtsu-yobou 本番反映 — Chrome レビュー待ち" },
              { done: true, text: "Chrome R9 レビュー 10 タスク修正 — main マージ済み（SHA: ede2f1f）" },
              { done: false, text: "腰痛予防 PowerPoint サンプル（10 枚）— 作成中" },
              { done: false, text: "YAML+テンプレート方式 pptx 全自動生成 — 方針確定・未着手" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start text-sm">
                <span className={`mt-0.5 text-base leading-none ${item.done ? "text-green-600" : "text-amber-500"}`}>
                  {item.done ? "✅" : "🔄"}
                </span>
                <span className="text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ドキュメントパス */}
        <section id="docs">
          <SectionTitle num={4} title="進行中のドキュメントパス" />
          <Table
            rows={[
              ["docs/must-fix-list-2026-04-19.md", "要修正一覧"],
              ["docs/mhlw-integration-plan.md", "MHLW データ統合計画"],
              ["docs/chrome-review-fixes-*.md", "Chrome レビュー修正記録"],
              ["docs/outstanding-issues.md", "未解決課題一覧"],
              ["CLAUDE.md", "プロジェクトルール（コーディング規約等）"],
              ["HANDOFF_FROM_CURSOR.md", "Cursor からの引き継ぎ書"],
              ["AFFILIATE.md", "アフィリエイト設定"],
            ]}
          />
        </section>

        {/* 5. 連携ツール */}
        <section id="tools">
          <SectionTitle num={5} title="連携ツール" />
          <Table
            rows={[
              ["Dispatch（Cowork）", "コード実装担当、並列タスク処理"],
              ["Claude in Chrome", "実ブラウザでの独立検証（激辛レビュー担当）"],
            ]}
          />
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>使い分けサイクル:</strong><br />
            Dispatch で実装 → Chrome in Chrome で検証 → フィードバック → Dispatch で修正
          </div>
        </section>

        {/* 6. レビュースコア */}
        <section id="scores">
          <SectionTitle num={6} title="Chrome 実操作レビュースコア推移" />
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-5 divide-x divide-slate-100">
              {[
                ["R1", 2.4], ["R2", 2.2], ["R3", 3.7], ["R4", 3.9], ["R5", 2.6],
                ["R6", 2.3], ["R7", 3.7], ["R8", 2.1], ["R9", 2.7], ["R10", 2.3],
              ].map(([r, score]) => (
                <div key={r as string} className="p-3 text-center border-b border-slate-100">
                  <p className="text-xs text-slate-500">{r}</p>
                  <p className={`text-lg font-bold ${(score as number) >= 3.5 ? "text-green-600" : (score as number) >= 2.5 ? "text-amber-500" : "text-red-500"}`}>
                    {score}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">5 段階評価。3.9 が最高、2.1 が最低。直近は低めで推移中。</p>
        </section>

        {/* 7. 優先タスク */}
        <section id="priorities">
          <SectionTitle num={7} title="直近の優先タスク" />
          <ol className="space-y-3">
            {[
              { label: "腰痛予防 PowerPoint（10 枚）の完成", note: "セミナー資料量産の前提" },
              { label: "/education の 12 項目への再構成", note: "サンプルレビュー結果を受けてから量産" },
              { label: "化学物質 RA の濃度基準値データ拡充", note: "影響度 A" },
              { label: "事故 DB 業種カテゴリ 5 重重複の正規化", note: "影響度 A（R9 で API 側マップ追加済み・要検証）" },
              { label: "特商法表記の改善", note: "R9 で「個人事業主（請求により開示）」に修正済み" },
              { label: "チャットボット共有 URL の検証", note: "R9 で /chatbot/share/[id] 実装済み・要本番検証" },
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 8. 運用ルール */}
        <section id="rules">
          <SectionTitle num={8} title="運用ルール" />
          <SubHeading>コミット・デプロイ</SubHeading>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside mb-4">
            <li>コミットメッセージは<strong>英語</strong></li>
            <li>本番検証は curl で実施してから完了報告（「実装した」≠「本番反映された」）</li>
            <li>大きな方針変更はオーナーに確認</li>
          </ul>
          <SubHeading>モデル指定</SubHeading>
          <Table
            rows={[
              ["通常タスク", "Sonnet 4.6"],
              ["複雑タスク", "Opus 4.6（1M コンテキスト）または Opus 4.7"],
            ]}
          />
          <SubHeading>禁止事項</SubHeading>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
            <p>❌ 運営者の実名出力</p>
            <p>❌ 未確認の外部 API/サービス導入</p>
            <p>❌ Stripe・認証・課金の無断実装</p>
            <p>❌ 環境変数の無断追加</p>
          </div>
        </section>

        {/* 9. セミナー資料アーキテクチャ */}
        <section id="architecture">
          <SectionTitle num={9} title="採用予定のセミナー資料アーキテクチャ" />
          <div className="bg-slate-800 text-slate-100 rounded-xl p-4 font-mono text-sm overflow-x-auto">
            <p className="text-slate-400"># ファイル構成</p>
            <p>templates/seminar-template.pptx</p>
            <p className="text-slate-400 ml-4"># マスタースライドテンプレート</p>
            <p>data/seminars/*.yaml</p>
            <p className="text-slate-400 ml-4"># 12 教育分の内容定義</p>
            <p>scripts/generate-seminar-pptx.mjs</p>
            <p className="text-slate-400 ml-4"># 生成スクリプト</p>
            <br />
            <p className="text-green-400">$ npm run generate:seminars</p>
          </div>
          <p className="text-sm text-slate-600 mt-2">多言語化は YAML の翻訳フィールドで対応予定。</p>
        </section>

        {/* 10. education 12項目 */}
        <section id="education">
          <SectionTitle num={10} title="/education 12 項目の確定内容" />
          <SubHeading>特別教育（6 項目）— 安衛則 36 条</SubHeading>
          <Table
            header={["#", "教育名", "根拠条文"]}
            rows={[
              ["1", "研削といしの取替え等", "36 条 1 号"],
              ["2", "低圧電気取扱", "36 条 4 号"],
              ["3", "足場の組立て等", "36 条 39 号"],
              ["4", "フルハーネス型安全帯使用", "36 条 41 号"],
              ["5", "玉掛け（1t 未満）", "36 条 19 号"],
              ["6", "酸素欠乏危険作業", "酸欠則 12 条"],
            ]}
          />
          <SubHeading>法定教育（2 項目）</SubHeading>
          <Table
            header={["#", "教育名", "根拠条文"]}
            rows={[
              ["7", "職長等教育", "安衛法 60 条"],
              ["8", "化学物質 RA 実務教育", "安衛法 57 条の 3"],
            ]}
          />
          <SubHeading>労働衛生教育（4 項目）</SubHeading>
          <Table
            header={["#", "教育名"]}
            rows={[
              ["9", "腰痛予防"],
              ["10", "熱中症予防"],
              ["11", "振動障害予防"],
              ["12", "騒音障害防止"],
            ]}
          />
        </section>

        {/* フッター */}
        <footer className="border-t border-slate-200 pt-6 pb-10 text-center text-xs text-slate-400">
          <p>ANZEN AI 内部文書 — 2026-04-21 時点</p>
          <p className="mt-1">このページは noindex 設定されており、検索エンジンには表示されません。</p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-2xl font-black text-slate-300">{num}</span>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mt-4 mb-2">
      {children}
    </h3>
  );
}

function Table({
  rows,
  header,
}: {
  rows: string[][];
  header?: string[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        {header && (
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {header.map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2.5 ${j === 0 ? "font-medium text-slate-700 whitespace-nowrap" : "text-slate-600"}`}>
                  {cell.split("\n").map((line, k) => (
                    <span key={k} className="block">{line}</span>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
