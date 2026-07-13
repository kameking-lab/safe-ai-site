import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { PageContainer } from "@/components/layout";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import {
  getNewsFeedCount,
  getNewsFeedUpdatedAt,
} from "@/lib/news-feed";

const _title = "報道・自動収集の運用について";
const _desc =
  "/accidents の「報道・自動収集」セクションは、NHK NEWS WEB および厚労省記者発表の RSS から労働災害関連の見出しを AI が自動収集・自動判定・自動公開しています。人的レビューは行われていません。";

export const metadata: Metadata = {
  alternates: { canonical: "/about/news-feed" },
  title: _title,
  description: _desc,
  openGraph: withSiteOpenGraph("/about/news-feed", {
    title: _title,
    description: _desc,
  }),
  twitter: withSiteTwitter({ title: _title, description: _desc }),
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function NewsFeedAboutPage() {
  const count = getNewsFeedCount();
  const updatedAt = getNewsFeedUpdatedAt();

  return (
    <PageContainer>
      <TranslatedPageHeader
        titleJa="報道・自動収集の運用について"
        titleEn="Autonomous News-Feed Operation"
        descriptionJa="完全自動運用（人的レビューなし）の透明性開示ページ"
        descriptionEn="Transparency disclosure for the fully autonomous news pipeline"
        iconName="Info"
        iconColor="amber"
      />

      <div className="mt-4 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 sm:p-5">
        <p className="text-sm font-bold text-orange-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          本セクションは <strong>完全自動運用</strong> です
        </p>
        <p className="mt-2 text-[13px] text-orange-900/90">
          <Link href="/accidents" className="underline">
            /accidents
          </Link>{" "}
          の「報道・自動収集（AI判定ゲート通過）」セクションは、
          外部 RSS から労働災害関連の見出しを自動取得し、Gemini 2.5 Flash による
          自動判定を経て、基準を満たした見出しのみを自動公開しています。
          公開前後を通じて編集者・運営者による人的レビューは一切行っていません。
        </p>
        <p className="mt-2 text-[12px] text-orange-900/80">
          現在の収録件数: <strong>{count}</strong> 件 ／ 最終更新:{" "}
          <strong>{formatDate(updatedAt)}</strong>
        </p>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">1. 取得ソース</h2>
        <p className="mt-2 text-sm text-slate-700">
          再配信可否が明確な公的・公開 RSS のみを対象としています。
          商用契約が必要な通信社（共同通信・時事通信）および
          再配信禁止が明示されているデータベース（厚労省「職場のあんぜんサイト」事故事例等）は
          対象外です。
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <strong>NHK NEWS WEB RSS</strong>（社会・経済カテゴリ）— 見出しと出典URLのみ取得。
            原文本文は転載しません。
          </li>
          <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <strong>厚生労働省 報道発表資料 RSS</strong> — 政府著作物
            （著作権法 13 条準拠、政府標準利用規約 2.0 / CC BY 4.0 互換）。
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">2. AI 自動判定ゲート</h2>
        <p className="mt-2 text-sm text-slate-700">
          各見出しを Gemini 2.5 Flash に渡し、4 つのスコアで評価します。
          <strong>すべての基準を満たした見出しのみ自動公開</strong>、
          1 つでも基準外なら自動却下します。
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
          <li>
            <strong>労災関連性 (relevance) ≥ 70</strong> — 業務中の負傷・死亡、
            労基署立入、化学物質ばく露等が高スコア
          </li>
          <li>
            <strong>著作権リスク (copyrightRisk) ≤ 30</strong> — 引用法 32 条の
            要件（主従関係・必要最小限・出典明示）が満たせるか
          </li>
          <li>
            <strong>誤情報リスク (misinformationRisk) ≤ 30</strong> — 一次ソースの
            特定可能性、公的機関・信頼できる報道か
          </li>
          <li>
            <strong>重複度 (duplication) ≤ 50</strong> — 既存の事故事例 DB
            （収録 5,000 件超）と内容的に重複していないか
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">
          3. 著作権法 32 条との関係（引用要件）
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          掲載するのは <strong>見出し</strong> + <strong>出典URL（クリックで原典へ）</strong> +
          <strong> AI が独自に生成した 50 字以内の要約</strong> のみで、
          原文本文の逐語転載は行いません。引用法 32 条の主従関係においては
          AI 独自要約 + サイト独自コンテンツが「主」、見出しの引用が「従」となる
          構造を意図的に保っています。
        </p>
        <p className="mt-2 text-sm text-slate-700">
          ヨミウリ・オンライン見出し事件知財高裁判決（平 17.10.6）の趣旨に鑑み、
          系統的・反復的な大量集約は不法行為と判断され得るため、収録上限を
          200 件（最新分のみ）に絞り、見出しは元 URL への誘導を必須としています。
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">4. 集計対象外の扱い</h2>
        <p className="mt-2 text-sm text-slate-700">
          本セクションの見出しは{" "}
          <Link href="/accidents-analytics" className="text-emerald-700 underline">
            /accidents-analytics
          </Link>{" "}
          の 25 軸統計には<strong>含まれません</strong>。理由は、見出し級の情報のみで
          業種・重症度・年齢・都道府県等の構造化フィールドが揃わないためです。
          件数のみは /accidents 上で別途表示しています。
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">5. 想定される誤判定と対応</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          <li>
            <strong>誤承認</strong>（労災と無関係な見出しが通過）: 重複度・関連性の
            両軸でガードしているが、見出しが曖昧な場合に発生し得る。
            運用ログ（rejected/index.json）を月次で分析し、閾値を再調整。
          </li>
          <li>
            <strong>誤却下</strong>（労災関連の重要報道が却下）:
            集計より見落としによる損失の方が小さいと判断（誤情報リスク回避優先）。
            運用ログから誤却下パターンを抽出し、キーワードフィルタを補強。
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">6. 運用</h2>
        <p className="mt-2 text-sm text-slate-700">
          毎日 06:00 JST に GitHub Actions の cron で実行されます
          (<code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">.github/workflows/news-feed-daily.yml</code>)。
          失敗時は GitHub Actions の失敗通知のみが発火し、UI には影響しません
          （既存の収録分は維持）。詳細な運用手順は{" "}
          <a
            href="https://github.com/kameking-lab/safe-ai-site/blob/main/docs/news-feed-autonomous-operation.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            docs/news-feed-autonomous-operation.md
          </a>{" "}
          を参照。
        </p>
      </section>

      <p className="mt-6 text-[11px] text-slate-500">
        本ページは{" "}
        <Link href="/about" className="underline">
          /about
        </Link>{" "}
        ・{" "}
        <Link href="/about/data-sources" className="underline">
          /about/data-sources
        </Link>{" "}
        とあわせて、本サイトのデータ収集・公開プロセスの透明性を担保するためのものです。
      </p>
    </PageContainer>
  );
}
