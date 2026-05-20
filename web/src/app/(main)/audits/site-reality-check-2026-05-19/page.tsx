import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "本番実態と現況レポートの齟齬検証 2026-05-19 — メイン3機能/SEO/表記の本番curl実測",
  description:
    "現況レポート(/audits/site-status-2026-05-19、コード解析ベース)が本番(www.anzen-ai-portal.jp)に意図通り反映されているかをcurl実測で全件機械検証した結果。意図通り18件/部分反映4件/未反映0件/認識違い5件の差分を記録。",
  alternates: {
    canonical: "https://www.anzen-ai-portal.jp/audits/site-reality-check-2026-05-19",
  },
  openGraph: {
    title: "本番実態と現況レポートの齟齬検証 2026-05-19",
    description:
      "メイン3機能・SafetyContext・SEO・JSON-LD・表記乖離・未着手領域・モバイル表示を本番curl実測で機械検証した齟齬レポート。",
    url: "https://www.anzen-ai-portal.jp/audits/site-reality-check-2026-05-19",
    type: "article",
    publishedTime: "2026-05-20T00:00:00Z",
  },
  robots: { index: true, follow: true },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "Report",
  name: "本番実態と現況レポート(2026-05-19)の齟齬検証",
  description:
    "現況レポート(/audits/site-status-2026-05-19、PR #251)が本番(www.anzen-ai-portal.jp)に意図通り反映されているかをcurl実測で全件機械検証した結果。意図通り反映/部分反映/未反映/認識違いの4分類で差分を記録。",
  datePublished: "2026-05-20",
  author: {
    "@type": "Organization",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/about",
  },
  url: "https://www.anzen-ai-portal.jp/audits/site-reality-check-2026-05-19",
  inLanguage: "ja",
  about: [
    { "@type": "Thing", name: "現況レポートと本番実態の差分検証" },
    { "@type": "Thing", name: "本番curl実測" },
    { "@type": "Thing", name: "SEO実装の本番検証" },
  ],
};

type Stat = { label: string; value: string };
type Diff = { id: string; cat: "意図通り反映" | "部分反映" | "未反映" | "認識違い"; title: string };

const STATS: Stat[] = [
  { label: "調査日", value: "2026-05-20" },
  { label: "対象レポート", value: "site-status-2026-05-19" },
  { label: "本番HEAD", value: "af69510" },
  { label: "検証URL", value: "30本+" },
  { label: "意図通り", value: "18件" },
  { label: "認識違い", value: "5件" },
];

const DIFFS: Diff[] = [
  { id: "D-001", cat: "認識違い", title: "業種別ページのh2構成が7セクションではなく9セクション、ラベルも一部不一致" },
  { id: "D-002", cat: "認識違い", title: "業種別ページの表示件数がレポート記載値と2桁乖離(建設66,713→実1,670等)" },
  { id: "D-003", cat: "認識違い", title: "504,413/292件/66,713等の内部数値はユーザー向け表示に1件も出ていない" },
  { id: "D-004", cat: "認識違い", title: "sitemap_index.xml(アンダースコア)は404、本番表記はsitemap-index.xml(ハイフン)" },
  { id: "D-005", cat: "認識違い", title: "/chemicals URLは本番に存在せず/chemical-databaseが正規" },
  { id: "D-006", cat: "部分反映", title: "sitemap総URL数2,498でレポート推定2,800〜3,500を下回る" },
  { id: "D-007", cat: "部分反映", title: "chatbot SSR「読み込み中」の影響範囲はレポート記載より小さい(3回出現/UIは148KB SSR)" },
  { id: "D-008", cat: "部分反映", title: "「50法令体制」表記は本番ゼロ、「33法令以上」が43回(統一済みだがズレ未解消)" },
  { id: "D-009", cat: "部分反映", title: "/admin/ugc/reviewはHTTP 200だが画面はforbidden/unauthorized文字列を含む" },
];

function categoryBadge(cat: Diff["cat"]) {
  const cls =
    cat === "認識違い"
      ? "bg-red-100 text-red-800 border-red-300"
      : cat === "部分反映"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : cat === "未反映"
          ? "bg-orange-100 text-orange-800 border-orange-300"
          : "bg-emerald-100 text-emerald-800 border-emerald-300";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {cat}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4" data-section={id}>
      <h2 id={`${id}-heading`} className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3" data-subsection={id}>
      <h3 id={`${id}-heading`} className="text-base font-bold text-slate-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>;
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <dt className="w-28 shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

export default function SiteRealityCheck20260519() {
  return (
    <PageContainer width="narrow" className="space-y-12 py-10">
      <JsonLd schema={schema} />

      {/* Header */}
      <header className="space-y-4" data-section="header">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Site Reality Check
        </p>
        <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl" data-h1>
          本番実態と現況レポート(2026-05-19)の齟齬検証
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          現況レポート(<a href="/audits/site-status-2026-05-19" className="underline">/audits/site-status-2026-05-19</a>、コード解析ベース)が
          本番(<a href="https://www.anzen-ai-portal.jp" className="underline">www.anzen-ai-portal.jp</a>)に意図通り反映されているかを、
          curl による本番HTML/レスポンスヘッダ取得と grep ベースの差分抽出で機械検証した結果を記録します。
          検証目的のため実装変更は行っていません。詳細データは
          <a href="https://github.com/kameking-lab/safe-ai-site/blob/main/docs/site-reality-check-2026-05-19/report.md" className="underline">docs/site-reality-check-2026-05-19/report.md</a>に格納。
        </p>
        <dl className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="text-[10px] font-semibold text-slate-500">{s.label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{s.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Section 1: 3 features */}
      <Section id="features" title="1. メイン3機能 reality check">

        <SubSection id="chatbot" title="1.1 /chatbot 判定:ほぼ一致">
          <Prose>
            <p>
              title「安衛法AIチャットボット｜33法令以上を根拠条文付きで即答(無料)｜安全AIポータル」、
              canonical https://www.anzen-ai-portal.jp/chatbot、 meta description が33法令を明示。
              JSON-LD 3ブロックに BreadcrumbList / WebApplication / QAPage / WebPage / WebSite / Organization 等を含む。
              /accidents-reports と /strategy/plan-generator への href が SSR HTML に存在。
              「安全Copilot」が SSR HTML に3回出現し、 Copilot UI のアウトラインは SSR で表示。
            </p>
            <p>
              <strong>部分齟齬:</strong>
              レポートは「SSR時の初期表示が『読み込み中』のみで FCP 遅延(UX-017)」と記載するが、
              本番 SSR HTML は147KBあり「安衛法AIチャットボット」が26回・「読み込み中」は3回のみ。
              チャット UI 骨格は SSR で表示されており、UX-017 が指している実態は局所的なものに留まる可能性。
              localStorage キー safety-context-v1 は SSR HTML に出現しないが、これは仕様通り。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="accidents-reports" title="1.2 /accidents-reports 判定:重大乖離">
          <Prose>
            <p>
              ハブと5業種ランディング(construction/manufacturing/transport/healthcare/service) すべて HTTP 200、
              ISR 配信(x-vercel-cache=HIT)で稼働。
              業種別ページの JSON-LD に Dataset 型を含む(レポート「webPage/breadcrumb/dataset の3層」を確認)。
              「5,000件超」フレーズはハブで18回、/chatbot で1回、5業種ページにはなし。
            </p>
            <p>
              <strong>h2構成の乖離:</strong>
              レポートは各業種ページが「事故型ランキング/原因Top10/月別季節性/年次推移/業種特有パターン/推奨対策チェックリスト/関連法令」の7セクションと記載。
              本番 /accidents-reports/construction の実 h2 は「サマリ」「事故の型 Top 10」「原因 Top 10」「時間帯・事業所規模」「月別 発生傾向と季節性」「年次推移と前年同期比較」「他業種と比較」「次のアクション」「安全Copilot:次のステップ」の9つで構成。
              「業種特有パターン」「推奨対策チェックリスト」「関連法令」というセクション見出しは本番 HTML に存在しない。
            </p>
            <p>
              <strong>件数表示の乖離:</strong>
              レポートは5業種について建設66,713件・製造115,601件・運輸66,650件・医療22,707件・サービス34,436件と記載。
              これらの数字は本番のいかなるページにも一切出現しない。
              本番の各業種ページに表示される最大の「件数」値は construction 1,670件・manufacturing 926件・transport 710件・healthcare 97件・service 1,168件で、レポート記載値より2桁少ない。
              504,413件・306,107件・292件もどの本番ページにも出現しない。
            </p>
            <p>
              <strong>compare クエリURL残存:</strong>
              本番 sitemap.xml に compare 系のクエリ4本(construction,manufacturing 等)が掲載されていることを確認。SEO-008 の課題は本番でも維持。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="plan-generator" title="1.3 /strategy/plan-generator 判定:ほぼ一致">
          <Prose>
            <p>
              title「年次安全衛生計画 業種別 ジェネレーター｜10業種×3規模・無料・PDF｜安全AIポータル」、 canonical 一致。
              JSON-LD 4ブロックに WebApplication / BreadcrumbList / WebPage / EntryPoint / SearchAction を含む。
              本文に「10業種」17回、「3規模」8回、「業種」52回、「建設業」「製造業」「年度」「重点取組」が出現。
              ?industry=construction&focus=fall 付きアクセスでも HTTP 200・本体サイズ同一で、prefill は client 側で URL パラメータを解釈する仕様と整合。
              /strategy 親ルートは HTTP 200 だが「月商100万円戦略 V3 内部文書」というオーナー向け別目的ドキュメント。
              /strategy/plan-generator への301リダイレクトは未実装(UX-014と一致)。
            </p>
          </Prose>
        </SubSection>
      </Section>

      {/* Section 2 */}
      <Section id="copilot" title="2. SafetyContext 3機能連携 reality check">
        <Prose>
          <p>
            判定:ほぼ一致(SSR 観測可能範囲では仕様通り)。
            /chatbot / /accidents-reports / /strategy/plan-generator / /accidents-reports/construction のいずれも
            SSR HTML 内に「安全Copilot」が3〜5回出現し、CopilotNextSteps コンポーネントは SSR でアウトラインを出力。
            localStorage キー「safety-context-v1」は SSR HTML に出現しないが、これは仕様通り(クライアント側で初期化されるキー)。
            3機能間の相互リンクは静的 href として存在し、業種コンテキストに応じた動的URL生成は SSR では検出不能(JS 実行が必要)。
          </p>
        </Prose>
      </Section>

      {/* Section 3 */}
      <Section id="seo" title="3. SEO実装 reality check">
        <SubSection id="robots" title="3.1 robots.txt 判定:完全一致">
          <Prose>
            <p>
              AIクローラー17種(GPTBot / ChatGPT-User / OAI-SearchBot / Claude-Web / ClaudeBot / anthropic-ai /
              Bytespider / Amazonbot / PerplexityBot / YouBot / CCBot / FacebookBot / ImgProxy / Diffbot /
              omgili / omgilibot / facebookexternalhit) を Disallow: / でブロック。
              全クローラー向け Disallow パターン8件(/admin/ /api/ /auth/ /dev/ /handover /lms /api-docs /dpa) 確認。
              Sitemap 行は https://www.anzen-ai-portal.jp/sitemap-index.xml(ハイフン)を指定。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="sitemap" title="3.2 sitemap 判定:部分一致">
          <Prose>
            <p>
              sitemap-index.xml(ハイフン)は HTTP 200。子4本(sitemap.xml / sitemap-articles.xml / sitemap-circulars.xml / sitemap-equipment.xml)を列挙。
              sitemap_index.xml(アンダースコア)は HTTP 404(キャッシュHIT)。
              子4本の URL 数(<code>&lt;loc&gt;</code> 行数) は sitemap.xml 2,413 / articles 31 / circulars 15 / equipment 39 で、合計 2,498。
              レポート推定2,800〜3,500件より下振れ。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="headers" title="3.3 30URL ヘッダ実測 判定:ほぼ意図通り">
          <Prose>
            <p>
              PR #239 で導入された /audits/* の s-maxage=86400 が本番で実際に返却されることを確認。
              <code>/audits/site-status-2026-05-19</code>・<code>/audits/p2-batch-plan</code>・<code>/audits/p3-batch-plan</code>・
              <code>/audits/post-2week-regression</code>・<code>/audits/review-dashboard</code> すべて Cache-Control: public, s-maxage=86400, stale-while-revalidate=3600 を返却。
              メイン3機能とハブ系は ISR 配信で x-vercel-cache=HIT を維持。
              /strategy(認証ゲート) と /accidents-reports/compare(動的)は private, no-cache。
              /news は 308 → /accidents の意図的リダイレクト。
            </p>
            <p>
              <strong>検出された問題:</strong>
              <code>/chemicals</code> は HTTP 404。本番で実在するのは <code>/chemical-database</code>(200)と <code>/chemical-ra</code>(200)。
              レポートには URL パスは明示されていないが、外部読者が「化学物質ページ」を想像すると /chemicals を叩いて 404 を踏みうる。
            </p>
          </Prose>
        </SubSection>
      </Section>

      {/* Section 4 */}
      <Section id="jsonld" title="4. 構造化データ本番検証">
        <Prose>
          <p>
            判定:ほぼ意図通り反映。各ページの JSON-LD ブロックを SSR HTML から抽出した結果:
            <code>/chatbot</code> は QAPage / WebApplication / BreadcrumbList / Offer 等を含む3ブロック、
            <code>/accidents-reports</code> ハブは Article / ItemList / WebApplication / Offer 等を含む3ブロック、
            <code>/strategy/plan-generator</code> は WebApplication / BreadcrumbList 等4ブロック、
            <code>/accidents-reports/{"{construction|manufacturing|transport|healthcare|service}"}</code> はすべて Dataset 型を含む3ブロックを出力。
            メイン3機能の WebApplication 出力、業種別ページの Dataset 出力、全機能の BreadcrumbList 出力を確認。
            FlagshipGrid ItemList Schema(SEO-010)・/exam-quiz CourseList/Quiz Schema(SEO-011)は SSR HTML から確認できず、未実装である旨レポートと一致。
          </p>
        </Prose>
      </Section>

      {/* Section 5 */}
      <Section id="text-gaps" title="5. 表記乖離の完全マップ">
        <Prose>
          <p>
            「5,000件超」は chatbot 1回・accidents-reports ハブ18回、5業種個別ページ・ホーム・plan-generator は0回。
            「33法令以上」は chatbot 27回・accidents-reports 1回・plan-generator 1回・業種別5ページ各3回(計43回)。
            「50法令」「50法令体制」はどのページにも0回。レポート §6.3「『33法令以上』vs実装『50法令体制』のズレ」は本番で完全に未解消。
          </p>
          <p>
            内部数値は1件もユーザー向け表示に出ていない:
            504,413 / 292件 / 66,713 / 115,601 / 66,650 / 22,707 / 34,436 / 1,069件 / 1,046件 はすべて0件。
            「ANZEN AI」(大文字)も主要5ページに0件で、F-003 の指摘箇所(レポート時点で6箇所残存) は少なくともメイン導線上は姿を消している。
          </p>
        </Prose>
      </Section>

      {/* Section 6 */}
      <Section id="unexplored" title="6. 未着手領域(§6.5)の本番実態">
        <Prose>
          <p>
            <strong>/notifications:</strong> 200 OK、title「安全情報 通知・メール配信設定」を返しページ実体は存在。
            レポート「機能が存在しない」は表現が強すぎる可能性で、 SSR HTML だけでは機能稼働状況は判別不能。
          </p>
          <p>
            <strong>サブスク課金:</strong> ホーム HTML に Stripe 関連の CTA は出現せず、課金 UI は表示されていない。
            NEXT_PUBLIC_PAID_MODE=false が効いている状態。
          </p>
          <p>
            <strong>/ky(KY用紙):</strong> 200 OK、title「KY用紙 作成ツール｜危険予知活動」。
            本文に「音声」が8回・「PDF」が2回出現するが、機能完全稼働かは別途検証要。
          </p>
          <p>
            <strong>/e-learning:</strong> 200 OK、title「安全衛生 Eラーニング 教育コンテンツ」。
            本文に「編集」「エディタ」「管理画面」の出現は確認できず、編集UI 未実装と整合。
          </p>
          <p>
            <strong>/chemicals:</strong> 404。本番で実在するのは /chemical-database(200) と /chemical-ra(200)。
          </p>
          <p>
            <strong>/api/chatbot:</strong> Cache-Control: public, max-age=0 で CDN キャッシュなし。F-005 のとおり未実装が本番で確認。
          </p>
        </Prose>
      </Section>

      {/* Section 7 */}
      <Section id="mobile" title="7. モバイル表示の機械検証">
        <Prose>
          <p>
            判定:SSR は UA 非依存。レスポンシブは CSS のみで実装。
            iPhone Safari の User-Agent を偽装した /chatbot 取得は デスクトップ取得とまったく同じバイト数(147,214 bytes)を返却。
            meta viewport は width=device-width, initial-scale=1 を確認。ホーム HTML 内に srcset を持つ img は0件で、レスポンシブ画像最適化は未導入。
            本番 HTML 内のサイドバー要素は lg ブレークポイントで切り替わる Tailwind クラス(lg:flex lg:translate-x-0 等) を維持。レポート §5「P3 Batch 4 UX-023」未着手と整合。
          </p>
        </Prose>
      </Section>

      {/* Section 8 */}
      <Section id="summary-diff" title="8. レポート §2-6 との総合差分">
        <Prose>
          <p>
            意図通り反映 18件・部分反映 4件・未反映 0件・認識違い 5件。
            主な認識違いは(1)業種別ページの h2 構成と件数表示が現況レポート §2.2 と乖離している点、
            (2)504,413 / 66,713 等の内部数値がユーザー向け表示に1件も出ていない点、
            (3)sitemap_index.xml(アンダースコア)は404 で本番表記は sitemap-index.xml(ハイフン)である点、
            (4)/chemicals URL は本番に存在せず /chemical-database が正規である点。
          </p>
          <ul className="space-y-2" data-diffs-list>
            {DIFFS.map((d) => (
              <li
                key={d.id}
                data-diff-id={d.id}
                data-diff-cat={d.cat}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <code className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-slate-700">{d.id}</code>
                {categoryBadge(d.cat)}
                <span className="text-slate-700">{d.title}</span>
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      {/* Section 9 */}
      <Section id="fixes" title="9. 致命的乖離による修正">
        <Prose>
          <p>
            判定:なし。本Dispatchで検出された乖離はいずれも次のいずれかに該当し、検証目的の最小修正には該当しないと判定した。
            業種別ページの h2 構成・件数表記の乖離は「レポート §2.2 がコード解析時に拾い損ねた可能性」または「より新しい改修反映前のスナップショットを記載した可能性」が原因で、本番のユーザー体験は機能しており毀損なし。
            F-002 / F-007 / F-005 は回帰監査(F-001〜F-011)で既知のチケットで、回帰監査側の対応領域。
            /chemicals 404 はレポート未記載 URL でユーザーへの公開リンクで /chemicals を出している箇所は本検証では確認できず。修正対象なし、変更ファイル数 0。
          </p>
        </Prose>
      </Section>

      {/* Section 10 */}
      <Section id="top3" title="10. 次に判断材料にすべき最重要発見トップ3">
        <Prose>
          <ol className="list-decimal space-y-2 pl-5 marker:text-slate-400">
            <li>
              /accidents-reports/{"{業種}"}ページの h2 構成と件数表示が現況レポート §2.2 と著しく乖離。
              レポートは7セクション+建設66,713件等を記載したが、本番は9セクション+建設1,670件等で表示。
              次の判断者は「レポートの認識を本番に合わせて修正する」か「本番を強化して内部数値を可視化する」かの方針決定が必要。
            </li>
            <li>
              F-002(ハードコード認証鍵)は 2026-05-19 時点で本番で実際に動作しており、curl で /api/admin/health?key=&lt;旧固定鍵&gt; を叩くと
              Gemini / Stripe / Supabase / GA4 / GSC 等10サービスの configured 状態・fallback 動作・circuit breaker 状態を含む詳細 JSON を返却していた。
              security/f002-admin-health-auth で ADMIN_HEALTH_KEY 環境変数化済み。Vercel 本番に新値を設定し旧鍵は廃止する手順が残っている。
            </li>
            <li>
              レポート §6.3 が指摘していた「33法令以上 vs 50法令体制」のズレは本番で完全に未解消で、
              主要9ページに「50法令」表記は0件、「33法令以上」が43回。逆に内部数値はユーザー向け表示に1件も出ていない。
              「タイトル/description と実装の乖離」という問題提起は本番でも全く動いていないため、 P3 Batch 1 以降のコピー修正タスクの起点として最優先で扱える。
            </li>
          </ol>
        </Prose>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-6">
        <dl className="space-y-1 text-xs">
          <KeyVal label="調査日" value="2026-05-20" />
          <KeyVal label="調査HEAD" value="af69510 (origin/main)" />
          <KeyVal label="調査手法" value="本番URL30本+への curl 実測、grep ベースの差分抽出" />
          <KeyVal label="対象レポート" value="/audits/site-status-2026-05-19 (PR #251)" />
          <KeyVal label="生データ" value="docs/site-reality-check-2026-05-19/report.md, raw/robots.txt, raw/sitemap-index.xml" />
        </dl>
      </footer>
    </PageContainer>
  );
}
