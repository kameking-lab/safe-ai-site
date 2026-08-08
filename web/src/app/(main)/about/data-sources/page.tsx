import type { Metadata } from "next";
import Link from "next/link";
import { PageJsonLd } from "@/components/page-json-ld";

const SITE = "https://www.anzen-ai-portal.jp";
const _title = "データソース一覧";
const _desc =
  "本サイトで利用している外部データの出典・更新頻度・利用条件を一覧で公開しています（気象庁、厚生労働省、国土地理院ほか）。";

export const metadata: Metadata = {
  alternates: { canonical: "/about/data-sources" },
  title: _title,
  description: _desc,
};

type Source = {
  id: string;
  name: string;
  provider: string;
  updateFreq: string;
  license: string;
  url: string;
  description: string;
  usedFor: string[];
};

const SOURCES: Source[] = [
  {
    id: "jma-warning",
    name: "気象庁 防災情報（警報・注意報JSON）",
    provider: "気象庁",
    updateFreq: "概ね15分間隔（発表時は即時）",
    license: "気象庁ホームページ コンテンツ利用ルール（出典明記で利用可）",
    url: "https://www.jma.go.jp/bosai/warning/",
    description: "府県予報区ごとの警報・注意報・特別警報のJSON公開データ。",
    usedFor: ["サイネージ地図", "サイネージダッシュボード", "リスク予測"],
  },
  {
    id: "jma-forecast",
    name: "気象庁 天気予報JSON",
    provider: "気象庁",
    updateFreq: "1日3回（5時/11時/17時）+ 随時更新",
    license: "気象庁ホームページ コンテンツ利用ルール（出典明記で利用可）",
    url: "https://www.jma.go.jp/bosai/forecast/",
    description: "都道府県予報区単位の天気・気温予報。",
    usedFor: ["サイネージ地図"],
  },
  {
    id: "jma-quake",
    name: "気象庁 地震情報",
    provider: "気象庁",
    updateFreq: "発生時即時 + 概ね15分間隔",
    license: "気象庁ホームページ コンテンツ利用ルール（出典明記で利用可）",
    url: "https://www.jma.go.jp/bosai/quake/",
    description: "震度速報・震源・各地の震度。最大震度5弱以上は速報モーダル表示。",
    usedFor: ["サイネージ地図", "地震速報モーダル"],
  },
  {
    id: "gsi-tile",
    name: "国土地理院 地図タイル（淡色地図）",
    provider: "国土交通省 国土地理院",
    updateFreq: "随時",
    license: "国土地理院コンテンツ利用規約（出典明記で利用可）",
    url: "https://maps.gsi.go.jp/development/ichiran.html",
    description: "サイネージ地図の背景タイルとして利用。",
    usedFor: ["サイネージ地図"],
  },
  {
    id: "open-meteo",
    name: "Open-Meteo Weather API",
    provider: "Open-Meteo",
    updateFreq: "1時間ごと",
    license: "CC BY 4.0（API利用は無料・商用可、出典明記）",
    url: "https://open-meteo.com/",
    description: "サイネージの時間別気温・降水量・風速の取得。",
    usedFor: ["サイネージ時間別ストリップ"],
  },
  {
    id: "mhlw",
    name: "厚生労働省 安全衛生関連オープンデータ",
    provider: "厚生労働省",
    updateFreq: "公表ベース",
    license: "政府標準利用規約 2.0（CC BY 4.0 互換）",
    url: "https://anzeninfo.mhlw.go.jp/",
    description: "労働災害統計、化学物質情報、安全衛生関連通達等。",
    usedFor: ["事故データベース", "法改正/通達ページ", "化学物質RA"],
  },
  {
    id: "labor-rss",
    name: "労働災害トレンド（GoogleニュースRSS）",
    provider: "Google News",
    updateFreq: "サーバ側で約1時間キャッシュ",
    license: "各記事元の利用条件に従う（リンクで誘導）",
    url: "https://news.google.com/",
    description: "労働災害・建設事故関連ニュースの一覧表示。",
    usedFor: ["サイネージダッシュボード"],
  },
  {
    id: "news-auto-nhk",
    name: "NHK NEWS WEB RSS（社会・経済）",
    provider: "日本放送協会",
    updateFreq: "日次（GitHub Actions cron 06:00 JST）",
    license:
      "見出しと出典URLのみ取得し、本文・画像は転載しません。掲載範囲と出典を人が確認した項目だけを公開します。",
    url: "https://www3.nhk.or.jp/rss/",
    description:
      "労働災害関連の見出しを固定ルールで事前整理し、確認待ちキューへ保存します。出典・関連性・誤認可能性を運営者が確認し、humanReviewed と approved を明示した項目だけを /accidents に公開します。外部生成AIによる自動公開は行いません。",
    usedFor: ["事故データベース（報道RSS・人手確認済みセクション）"],
  },
  {
    id: "news-auto-mhlw",
    name: "厚生労働省 報道発表資料 RSS",
    provider: "厚生労働省",
    updateFreq: "日次（GitHub Actions cron 06:00 JST）",
    license:
      "政府著作物（著作権法 13 条準拠、政府標準利用規約 2.0 / CC BY 4.0 互換）。",
    url: "https://www.mhlw.go.jp/stf/news.rdf",
    description:
      "労働安全衛生に関連する記者発表の見出しを収集し、確認待ちキューへ保存します。公開前に一次情報と関連性を人が確認します。",
    usedFor: ["事故データベース（報道RSS・人手確認済みセクション）"],
  },
];

export default function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
      <PageJsonLd
        name={_title}
        description={_desc}
        path="/about/data-sources"
        breadcrumbs={[
          { name: "ホーム", url: SITE },
          { name: "プロジェクトについて", url: `${SITE}/about` },
          { name: "データソース一覧", url: `${SITE}/about/data-sources` },
        ]}
      />
      <header className="mb-6">
        <p className="text-sm text-portal-muted">
          <Link href="/" className="underline hover:text-slate-800">
            トップ
          </Link>{" "}
          / データソース
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">データソース一覧</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          本サイトおよびサイネージ機能で利用している外部データの出典・更新頻度・利用条件を公開しています。各データの利用条件に従い、適切な出典表記を行っています。
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          運用状態の基準日: 2026-07-29 JST
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-sky-300 bg-sky-50 p-5">
        <h2 className="text-lg font-bold text-sky-950">
          取得障害・古い情報の表示方針
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-bold text-sky-950">stale</dt>
            <dd className="mt-1 leading-6 text-slate-800">
              定めた鮮度期限を超えた状態です。最新値とみなさず、公式ページや現場計測へ案内します。
            </dd>
          </div>
          <div>
            <dt className="font-bold text-sky-950">quarantine</dt>
            <dd className="mt-1 leading-6 text-slate-800">
              出典・形式・整合性の確認が終わらず、検索・自動転記・サイトマップから隔離した状態です。
            </dd>
          </div>
          <div>
            <dt className="font-bold text-sky-950">synthetic</dt>
            <dd className="mt-1 leading-6 text-slate-800">
              教育用の仮想事例です。公式事故・実在個票・公式統計と分けて表示します。
            </dd>
          </div>
          <div>
            <dt className="font-bold text-sky-950">取得不能・部分障害</dt>
            <dd className="mt-1 leading-6 text-slate-800">
              欠けた値を推測で補わず、取得不能または部分障害と表示します。「警報なし」へ置き換えません。
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-6 text-sky-950">
          AIは検索・要約・候補整理を補助しますが、情報源の公開判断や安全判断を自動承認しません。詳細な確認状態と訂正履歴は{" "}
          <Link
            href="/about/quality"
            className="font-bold underline underline-offset-4"
          >
            情報品質ページ
          </Link>
          で公開しています。
        </p>
      </section>

      <ul className="space-y-4">
        {SOURCES.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline-offset-2 hover:underline"
              >
                {s.name} →
              </a>
            </h2>
            <p className="mt-1 text-sm text-slate-600">提供：{s.provider}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.description}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-slate-500">更新頻度</dt>
                <dd className="text-slate-800">{s.updateFreq}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">利用条件</dt>
                <dd className="text-slate-800">{s.license}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">利用箇所</dt>
                <dd className="text-slate-800">{s.usedFor.join("、")}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <h2 className="text-base font-bold">免責事項</h2>
        <p className="mt-2">
          本サイトに表示する気象・地震情報は気象庁の公式データを15分間隔で取得していますが、ネットワーク状況等により遅延・取得失敗が発生する場合があります。重要な防災判断は必ず気象庁公式サイトおよび自治体の発表をご確認ください。
        </p>
      </section>
    </div>
  );
}
