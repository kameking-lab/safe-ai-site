import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { PageContainer } from "@/components/layout";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { getNewsFeedCount, getNewsFeedUpdatedAt } from "@/lib/news-feed";

const title = "報道RSSの収集・人手確認について";
const description =
  "労働災害に関する報道RSSの収集、機械的な事前フィルター、人手確認、公開範囲、著作権への配慮を説明します。未確認の項目は公開しません。";

export const metadata: Metadata = {
  alternates: { canonical: "/about/news-feed" },
  title,
  description,
  openGraph: withSiteOpenGraph("/about/news-feed", { title, description }),
  twitter: withSiteTwitter({ title, description }),
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "不明";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

export default function NewsFeedAboutPage() {
  const count = getNewsFeedCount();
  const updatedAt = getNewsFeedUpdatedAt();

  return (
    <PageContainer>
      <TranslatedPageHeader
        titleJa={title}
        titleEn="RSS collection and human review"
        descriptionJa="自動収集と公開承認を分離した、報道フィードの透明性開示ページ"
        descriptionEn="Transparency notes for RSS collection and human review"
        iconName="Info"
        iconColor="amber"
      />

      <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          RSSの取得は自動、公開は人手確認後です
        </p>
        <p className="mt-2 text-sm leading-7 text-amber-950/90">
          外部RSSから取得した見出しは、明らかに対象外の項目を決定的なルールで除外した後、
          「確認待ち」に置きます。出典、労働災害との関連、見出しだけで誤認を招かないか、
          著作権上の掲載範囲を運営者が確認し、明示的に承認した項目だけを
          <Link href="/accidents" className="mx-1 font-bold underline">
            事故データベース
          </Link>
          に表示します。収集した見出しを外部生成AIへ送らず、AIによる自動公開もしません。
        </p>
        <p className="mt-2 text-xs text-amber-900">
          人手確認済みの公開件数: <strong>{count}</strong>件 ／ 公開一覧の更新日:{" "}
          <strong>{formatDate(updatedAt)}</strong>
        </p>
      </div>

      <section className="mt-8" aria-labelledby="feed-sources">
        <h2 id="feed-sources" className="text-lg font-bold text-slate-900">
          1. 取得する情報と出典
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          公開RSSの見出し、記事URL、配信元、配信日時だけを取得します。記事本文や画像は複製しません。
          現在の対象はNHK NEWS WEBの公開RSSと厚生労働省の報道発表RSSです。
        </p>
      </section>

      <section className="mt-8" aria-labelledby="feed-review">
        <h2 id="feed-review" className="text-lg font-bold text-slate-900">
          2. 機械的な事前整理と人手確認
        </h2>
        <ol className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
          {[
            "労働災害に関係する可能性がある見出しを、固定キーワードと除外語で抽出します。",
            "重複URL、取得済み項目、明らかに対象外の見出しを決定的なルールで除外します。",
            "残った項目は確認待ちキューへ入れます。この時点では公開しません。",
            "運営者が一次情報、関連性、誤認可能性、掲載範囲を確認します。",
            "humanReviewed と approved が明示された項目だけを公開します。判定不能時は非公開です。",
          ].map((item, index) => (
            <li key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="feed-published">
        <h2 id="feed-published" className="text-lg font-bold text-slate-900">
          3. 公開する内容
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
          {[
            "見出し、出典名、一次情報へのリンク、配信日",
            "運営者が確認した短い要約や参考分類（存在する場合）",
            "「人手確認済み」であることと、一次情報を確認する注意",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          個別出典を確認できない項目、確認待ちの項目、記事本文の再配布が必要になる項目は公開しません。
          報道項目は公表事故データや架空の学習例と混在させず、統計集計にも含めません。
        </p>
      </section>

      <section className="mt-8" aria-labelledby="feed-operation">
        <h2 id="feed-operation" className="text-lg font-bold text-slate-900">
          4. 障害時と訂正
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          RSS取得、形式検証、人手確認のいずれかが完了しない場合は公開しません。誤認につながる項目を確認した場合は、
          公開一覧から除外し、必要に応じて説明を訂正します。確認待ち件数は公開件数に含めません。
        </p>
      </section>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm leading-7 text-slate-700">
        <Radio className="mt-1 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          詳しい運用手順は
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            docs/news-feed-autonomous-operation.md
          </code>
          に記録しています。データ全体の出典は
          <Link href="/about/data-sources" className="mx-1 font-bold text-emerald-800 underline">
            データの出典
          </Link>
          をご確認ください。
        </p>
      </div>
    </PageContainer>
  );
}
