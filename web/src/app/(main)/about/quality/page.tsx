import type { Metadata } from "next";
import Link from "next/link";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { AlertTriangle, CheckCircle2, Clock3, Database, ShieldCheck } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { getPublicSourceRegistry } from "@/data/source-registry";
import { SOURCE_REGISTRY_STATUS_LABELS } from "@/lib/evidence/types";

const TITLE = "情報品質・更新状態・訂正履歴";
const DESCRIPTION =
  "安全AIポータルの出典確認、更新状態、stale・quarantine、人手確認待ち、AI評価方法、訂正履歴、既知の制約を公開します。";
const AS_OF = "2026-08-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about/quality" },
};

const CORRECTIONS = [
  {
    date: "2026-07-29",
    area: "運用計測と相談導線",
    change:
      "明示同意後のCore Web Vitalsと自動化相談ファネルを、固定ページ分類・端末区分・粗い選択肢だけで集計する運用へ移行しました。",
    impact:
      "完全URL、検索語、氏名、メール、会社名、相談本文、受付番号、IP、正確なブラウザ情報は計測データへ保存しません。少数データから機能変更を決めません。",
  },
  {
    date: "2026-07-24",
    area: "事故データ",
    change:
      "公式事故に見えるIDを使っていたモデルケースをsynthetic専用IDへ変更し、公式個票未確認・教育用仮想事例として隔離表示しました。",
    impact:
      "当該モデルケースを公式事故情報として検索・KY・教育へ確定転記しない境界を追加しました。",
  },
  {
    date: "2026-07-24",
    area: "気象・今日の安全",
    change:
      "気象庁警報の取得不能・地域未解決・staleを「警報なし」と表示しないよう変更しました。",
    impact:
      "公式警報を確認できない場合はリスク結論を保留し、気象庁公式ページと現場計測へ案内します。",
  },
  {
    date: "2026-07-24",
    area: "法改正",
    change:
      "カスタマーハラスメント対策の改正法・指針について、公布日、施行日、告示番号の相互矛盾を一次資料に合わせて訂正しました。",
    impact:
      "施行済みと将来施行の表示を分離しました。適用判断はe-Gov・厚生労働省原文の確認が必要です。",
  },
  {
    date: "2026-07-24",
    area: "資格判定",
    change:
      "床上操作式クレーン運転技能講習と他のクレーン運転区分を混同しない条件分岐へ訂正しました。",
    impact:
      "作業条件不足・未確認ルール・quarantine対象から「必須」と結論しないようにしました。",
  },
] as const;

const LIMITATIONS = [
  "公開URLの到達確認は、文書内容を専門家が人手確認したことを意味しません。",
  "気象庁の市区町村コードを確実に対応付けられない地域では、公式警報を「未解決」として保留します。",
  "Open-Meteoの気温・風・降水は予報です。現場のWBGT、風速、濃度などの実測値を置き換えません。",
  "AI回答・AI要約・AI候補は補助です。根拠不足時は保留し、帳票確定・法的判断・作業開始には人間確認が必要です。",
  "NVDA・VoiceOverの実機検証はこのローカル監査では未実施です。自動検査の合格を実機確認済みとは表示しません。",
  "実利用時のCore Web Vitalsは収集開始直後でサンプル不足です。ページごとに100件以上または7日以上になるまで、性能変更の根拠には使いません。",
  "自動化相談のWebフォームは、provider、検証済みFrom、配送運用の全条件が整うまで表示しません。現在は利用者のメールアプリから送信する導線を使います。",
  "Search Consoleは対象サイトの外部権限付与待ちです。検索実績を取得できるまで、推測値を実績として表示しません。",
] as const;

export default function QualityPage() {
  const automationAvailability = getAutomationConsultAvailability();
  const sources = getPublicSourceRegistry();
  const counts = sources.reduce<Record<string, number>>((acc, source) => {
    acc[source.status] = (acc[source.status] ?? 0) + 1;
    return acc;
  }, {});
  const humanVerified = counts.humanVerified ?? 0;
  const urlConfirmed = counts.urlConfirmed ?? 0;
  const pending = sources.filter(
    (source) => source.status === "pending" || source.verifiedAt === null,
  ).length;
  const stale = counts.stale ?? 0;
  const quarantined = counts.quarantined ?? 0;
  const unavailable = counts.unavailable ?? 0;

  return (
    <>
      <PageJsonLd
        name={TITLE}
        description={DESCRIPTION}
        path="/about/quality"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "このサイトについて", url: "https://www.anzen-ai-portal.jp/about" },
          { name: TITLE, url: "https://www.anzen-ai-portal.jp/about/quality" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-bold tracking-wider text-emerald-700">QUALITY &amp; TRACEABILITY</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{TITLE}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
            公式一次資料を正本として尊重し、本サイトが行う整理・検索・AI支援の根拠、鮮度、限界を追跡できるようにします。
            不明値は推測で埋めず、確認待ち・stale・quarantine・取得不能として止めます。
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            このページの集計基準日: {AS_OF} JST（リアルタイム稼働保証ではありません）
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            初めて利用する方は
            <Link
              href="/safety-ai"
              className="mx-1 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-4"
            >
              安全AIとは
            </Link>
            から、今すぐ使える機能を確認できます。
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            この品質方針を採用する背景は
            <Link
              href="/about/project-story"
              className="mx-1 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-4"
            >
              このプロジェクトをつくった理由
            </Link>
            で公開しています。
          </p>
        </header>

        <section
          aria-labelledby="public-availability-title"
          className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"
        >
          <h2
            id="public-availability-title"
            className="text-xl font-bold text-emerald-950"
          >
            現在利用できる機能と確認待ちの機能
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-600 bg-white p-4">
              <h3 className="font-bold text-emerald-950">現在利用可能</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-800">
                <li>今日の現場リスク、警報・気象・WBGTの確認</li>
                <li>法令・事故検索、安衛法チャットボット</li>
                <li>化学物質リスクアセスメントの簡易スクリーニング</li>
                <li>KY用紙、工程書、資格finder、安全サイネージ</li>
                <li>安全AIの使い方・限界・一次資料への案内</li>
              </ul>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                いずれも現場測定、SDS、法令原文、社内手順と担当者の最終確認を置き換えません。
              </p>
            </div>
            <div className="rounded-xl border border-amber-700 bg-amber-50 p-4">
              <h3 className="font-bold text-amber-950">受付方法・外部確認待ち</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950">
                <li>
                  自動化相談は「{automationAvailability.label}」です。Webフォームから相談本文を送信する方式とは区別しています。
                </li>
                <li>
                  熱中症特集の中核3ページは、法務・医学・編集レビューと最終公開承認が完了するまで検索対象外です。
                </li>
              </ul>
              <p className="mt-2 text-xs leading-5 text-amber-900">
                準備中の機能を受付中・承認済みとは表示しません。熱中症ページは
                noindex,followを維持し、サイトマップから除外しています。
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="registry-status-title" className="mt-8">
          <div className="flex items-start gap-3">
            <Database className="mt-1 h-6 w-6 text-emerald-800" aria-hidden="true" />
            <div>
              <h2 id="registry-status-title" className="text-xl font-bold text-slate-950">
                公開出典レジストリの状態
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                下記は入口URLの状態です。個別の条文・通達・事故・SDSの確認状態は各レコードで別に表示します。
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["公開ソース", sources.length],
              ["内容を人手確認済み", humanVerified],
              ["URL確認済み", urlConfirmed],
              ["人手確認待ち", pending],
              ["stale", stale],
              ["quarantine / 取得不能", quarantined + unavailable],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-300 bg-white p-3">
                <dt className="text-xs font-bold text-slate-600">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>

          {humanVerified === 0 ? (
            <p role="status" className="mt-4 rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <span className="font-bold">注意:</span>{" "}
              現時点の共通レジストリは入口URL確認までで、個別文書内容を共通基準で人手確認済みとしたレコードは0件です。
              URL確認済みを内容確認済みとして表示しません。
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300">
            <table className="min-w-[52rem] w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                公開出典レジストリ。正式名称、発行主体、状態、取得日、確認日、適用先を示します。
              </caption>
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th scope="col" className="px-3 py-3 font-bold">正式名称・発行主体</th>
                  <th scope="col" className="px-3 py-3 font-bold">状態</th>
                  <th scope="col" className="px-3 py-3 font-bold">取得日 / 内容確認日</th>
                  <th scope="col" className="px-3 py-3 font-bold">適用先・注記</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-3">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center font-bold text-sky-900 underline underline-offset-4"
                      >
                        {source.officialName}
                      </a>
                      <span className="block text-xs text-slate-600">{source.publisher}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      {SOURCE_REGISTRY_STATUS_LABELS[source.status]}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block">取得: {source.retrievedAt}</span>
                      <span className="block">
                        内容確認: {source.verifiedAt ?? "未実施・確認待ち"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-semibold">{source.appliesTo.join("、")}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{source.note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="update-policy-title" className="mt-10">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 h-6 w-6 text-sky-800" aria-hidden="true" />
            <div>
              <h2 id="update-policy-title" className="text-xl font-bold text-slate-950">
                更新・障害時の扱い
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                取得頻度はデータごとに異なります。機能画面に取得時刻・対象時刻・提供元を表示し、状態を次の語で区別します。
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["current", "取得・形式・鮮度の条件を満たす。公式情報と人間確認はなお必要。"],
              ["stale", "鮮度期限を超過。安全・警報なし等の結論を止め、再取得または公式確認へ案内。"],
              ["partial failure", "一部ソースだけ取得。成功したデータと欠落したデータを分離し、全体成功と表示しない。"],
              ["offline / unavailable", "取得不能。0件、0値、安全、該当なしへ変換しない。"],
              ["quarantine", "出典・分類・形式・整合性の要件を満たさず、検索・sitemap・自動転記から除外。"],
              ["synthetic", "教育・訓練用に作成した仮想事例。公式事故や実在個票と明示的に分離し、公式件数へ混ぜない。"],
              ["human review pending", "URLや機械検査だけ完了。内容確認済み・監修済みとは表示しない。"],
            ].map(([term, description]) => (
              <div key={term} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                <dt className="font-bold text-slate-950">{term}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-700">{description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-700">
            詳細なデータ提供元と想定更新頻度は
            <Link href="/about/data-sources" className="mx-1 font-bold text-sky-900 underline underline-offset-4">
              データソース一覧
            </Link>
            を参照してください。報道由来情報の収集・公開境界は
            <Link href="/about/news-feed" className="mx-1 font-bold text-sky-900 underline underline-offset-4">
              報道RSSの収集と人手確認
            </Link>
            で確認できます。
          </p>
        </section>

        <section aria-labelledby="corrections-title" className="mt-10">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-800" aria-hidden="true" />
            <div>
              <h2 id="corrections-title" className="text-xl font-bold text-slate-950">
                訂正履歴
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                安全判断・法令判断へ影響しうる変更を、変更内容と影響範囲に分けて記録します。
              </p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {CORRECTIONS.map((correction) => (
              <li key={`${correction.date}:${correction.area}`} className="rounded-xl border border-slate-300 bg-white p-4">
                <p className="text-sm font-bold text-slate-950">
                  {correction.date} — {correction.area}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  <span className="font-semibold">変更:</span> {correction.change}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  <span className="font-semibold">影響:</span> {correction.impact}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ai-quality-title" className="mt-10 rounded-2xl border border-violet-300 bg-violet-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-violet-900" aria-hidden="true" />
            <div>
              <h2 id="ai-quality-title" className="text-xl font-bold text-violet-950">
                AI評価と承認境界
              </h2>
              <p className="mt-2 text-sm leading-6 text-violet-950">
                緊急、PII、曖昧質問、誤前提、将来施行、根拠なし、不支持引用、通信・モデル障害を独立ケースで評価します。
                retrieval件数やscoreを正答率として表示せず、引用が許可された根拠を支持しない場合は生成回答を破棄します。
              </p>
              <p className="mt-2 text-sm leading-6 text-violet-950">
                AI回答・KY候補・事故要約・帳票候補は、人間が根拠と現場条件を確認して承認するまで確定情報ではありません。
              </p>
              <Link
                href="/about/chatbot-eval"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-violet-900 px-4 py-2 text-sm font-bold text-white hover:bg-violet-950"
              >
                AI評価方法と結果の限界を見る
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="limitations-title" className="mt-10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-6 w-6 text-amber-800" aria-hidden="true" />
            <div>
              <h2 id="limitations-title" className="text-xl font-bold text-slate-950">
                既知の制約
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                未検証事項を完了済みとして扱いません。
              </p>
            </div>
          </div>
          <ul className="mt-4 list-disc space-y-2 rounded-xl border border-amber-400 bg-amber-50 p-5 pl-9 text-sm leading-6 text-amber-950">
            {LIMITATIONS.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-sky-300 bg-sky-50 p-5">
          <h2 className="text-xl font-bold text-sky-950">問題を報告する</h2>
          <p className="mt-2 text-sm leading-6 text-sky-950">
            出典切れ、法令・資格・事故・化学物質・気象の誤り、アクセシビリティ障害をお知らせください。
            相談フォームには健康情報、現場固有の秘密、第三者の個人情報を入力しないでください。
          </p>
          <Link
            href="/contact?category=data-correction"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-sky-900 px-4 py-2 text-sm font-bold text-white hover:bg-sky-950"
          >
            修正・不具合を報告
          </Link>
        </section>
      </div>
    </>
  );
}
