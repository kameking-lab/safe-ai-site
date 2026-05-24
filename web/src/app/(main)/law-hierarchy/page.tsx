import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, Section, Stack, Cluster } from "@/components/layout";
import { JsonLd, webPageSchema, breadcrumbSchema, dataCatalogSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SITE_URL,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import {
  LAW_HIERARCHY_NODES,
  LEVEL_LABEL,
  ROOT_LAW_ID,
  HIERARCHY_TOTALS,
  getArticleCount,
  getChildren,
  getCircularCount,
  getEGovUrl,
  type LawHierarchyNode,
} from "@/data/law-hierarchy";

const PAGE_PATH = "/law-hierarchy";
const PAGE_TITLE = "労働安全衛生法 階層構造マップ | 安全AIポータル";
const PAGE_DESC =
  "労働安全衛生法を頂点とした政令・省令・告示・通達の階層構造を一枚で俯瞰。各法令から e-Gov 公式条文・本サイトの条文検索・関連通達一覧へ直接遷移できます。";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
  alternates: { canonical: PAGE_PATH },
  title: PAGE_TITLE,
  description: PAGE_DESC,
  openGraph: withSiteOpenGraph(PAGE_PATH, {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: [
      { url: ogImageUrl(PAGE_TITLE, PAGE_DESC), width: 1200, height: 630 },
    ],
  }),
  twitter: withSiteTwitter({
    images: [ogImageUrl(PAGE_TITLE, PAGE_DESC)],
  }),
};

const LEVEL_BADGE_CLASS: Record<LawHierarchyNode["level"], string> = {
  law: "bg-rose-100 text-rose-800 ring-rose-200",
  cabinetOrder: "bg-amber-100 text-amber-800 ring-amber-200",
  ministerialOrdinance: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

const LEVEL_ACCENT_CLASS: Record<LawHierarchyNode["level"], string> = {
  law: "border-rose-200 bg-rose-50/40",
  cabinetOrder: "border-amber-200 bg-amber-50/40",
  ministerialOrdinance: "border-slate-200 bg-white",
};

function ActionLink({
  href,
  external,
  children,
  variant = "default",
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
  variant?: "default" | "primary" | "ghost";
}) {
  const base =
    "inline-flex min-h-[36px] items-center rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1";
  const variantClass =
    variant === "primary"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : variant === "ghost"
        ? "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100";
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${variantClass}`}
      >
        {children}
        <span aria-hidden className="ml-1 text-[10px]">
          ↗
        </span>
      </a>
    );
  }
  return (
    <Link href={href} className={`${base} ${variantClass}`}>
      {children}
    </Link>
  );
}

function HierarchyCard({ node }: { node: LawHierarchyNode }) {
  const eGovUrl = getEGovUrl(node.eGovLawId);
  const articleCount = getArticleCount(node.lawNameInData);
  const circularCount = getCircularCount(node.circularLawRef);
  const lawSearchHref = node.lawNameInData
    ? `/law-search?law=${encodeURIComponent(node.lawNameInData)}`
    : "/law-search";

  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-4 shadow-sm transition hover:shadow-md ${LEVEL_ACCENT_CLASS[node.level]}`}
      aria-label={node.title}
    >
      <Cluster gap="xs" wrap>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${LEVEL_BADGE_CLASS[node.level]}`}
        >
          {LEVEL_LABEL[node.level]}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {node.shortTitle}
        </span>
      </Cluster>
      <h3 className="mt-2 text-sm font-bold text-slate-900 sm:text-base">
        {node.title}
      </h3>
      <p className="mt-1 text-[11px] text-slate-500">{node.description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-700">{node.scopeNote}</p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="font-semibold text-slate-500">条文収録</dt>
          <dd className="mt-0.5 font-bold text-slate-900">
            {articleCount > 0 ? `${articleCount}条` : "未収録"}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <dt className="font-semibold text-slate-500">関連通達等</dt>
          <dd className="mt-0.5 font-bold text-slate-900">
            {circularCount > 0 ? `${circularCount}件` : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-1 flex-col justify-end">
        <Cluster gap="xs" wrap>
          {eGovUrl && (
            <ActionLink href={eGovUrl} external>
              e-Gov 公式条文
            </ActionLink>
          )}
          {articleCount > 0 && (
            <ActionLink href={lawSearchHref} variant="primary">
              条文を検索
            </ActionLink>
          )}
          {circularCount > 0 && (
            <ActionLink href="/circulars" variant="ghost">
              関連通達 {circularCount}件
            </ActionLink>
          )}
        </Cluster>
      </div>
    </article>
  );
}

function ConnectorHint({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="my-2 flex items-center gap-2 pl-2 text-[10px] font-bold uppercase tracking-widest text-slate-400"
    >
      <span className="h-px flex-1 bg-slate-200" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export default function LawHierarchyPage() {
  const rootNode = LAW_HIERARCHY_NODES.find((n) => n.id === ROOT_LAW_ID)!;
  const oshCabinetOrders = getChildren(ROOT_LAW_ID).filter(
    (n) => n.level === "cabinetOrder"
  );
  const oshOrdinances = getChildren(ROOT_LAW_ID).filter(
    (n) => n.level === "ministerialOrdinance"
  );
  const jinpaiHo = LAW_HIERARCHY_NODES.find((n) => n.id === "jinpai-ho")!;
  const jinpaiOrdinances = getChildren("jinpai-ho");

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: PAGE_TITLE,
            description: PAGE_DESC,
            url: PAGE_URL,
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "法改正情報", url: `${SITE_URL}/laws` },
            { name: "法令階層マップ", url: PAGE_URL },
          ]),
          dataCatalogSchema({
            name: "労働安全衛生法令 階層カタログ",
            description: PAGE_DESC,
            url: PAGE_URL,
            datasets: LAW_HIERARCHY_NODES.map((n) => ({
              name: n.title,
              url: getEGovUrl(n.eGovLawId) ?? `${SITE_URL}/law-search?law=${encodeURIComponent(n.title)}`,
              description: n.description,
            })),
          }),
        ]}
      />

      <PageContainer width="full" paddingY="default">
        <Stack gap="lg">
          <header className="space-y-2">
            <Cluster gap="xs" wrap>
              <Link
                href="/laws"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                ← 法改正情報に戻る
              </Link>
            </Cluster>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              労働安全衛生法 階層構造マップ
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              労働安全衛生法を頂点とした政令・省令・告示・通達の階層を一枚で俯瞰します。各カードから
              e-Gov 公式条文・本サイトの条文検索（{HIERARCHY_TOTALS.laws + HIERARCHY_TOTALS.cabinetOrders + HIERARCHY_TOTALS.ministerialOrdinances}法令対象）・関連通達一覧（{HIERARCHY_TOTALS.noticesTotal + HIERARCHY_TOTALS.announcementsTotal + HIERARCHY_TOTALS.guidelinesTotal}件収録）に直接遷移できます。
            </p>
            <Cluster gap="sm" wrap>
              <span className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200">
                法律 {HIERARCHY_TOTALS.laws}件
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                政令 {HIERARCHY_TOTALS.cabinetOrders}件
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                省令 {HIERARCHY_TOTALS.ministerialOrdinances}件
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                通達 {HIERARCHY_TOTALS.noticesTotal}件 / 告示 {HIERARCHY_TOTALS.announcementsTotal}件 / 指針 {HIERARCHY_TOTALS.guidelinesTotal}件
              </span>
            </Cluster>
          </header>

          <Section
            title="① 労働安全衛生法（法律）"
            description="国会で制定された最上位の法律。事業者責務・安全衛生管理体制・健康診断・有害物規制の根拠。"
            spacing="default"
          >
            <div className="grid grid-cols-1">
              <HierarchyCard node={rootNode} />
            </div>
          </Section>

          {oshCabinetOrders.length > 0 && (
            <>
              <ConnectorHint label="↓ 政令で具体的範囲を定義" />
              <Section
                title="② 政令（労働安全衛生法施行令）"
                description="内閣が制定し、法律の委任を受けて対象作業・規制対象物質の具体的範囲を定める。"
                spacing="default"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {oshCabinetOrders.map((n) => (
                    <HierarchyCard key={n.id} node={n} />
                  ))}
                </div>
              </Section>
            </>
          )}

          <ConnectorHint label="↓ 省令で具体的な作業基準を規定" />
          <Section
            title="③ 省令（厚生労働省令）"
            description="厚生労働省が制定し、業務種別・物質別の作業環境測定・健康診断・保護具基準等を細目で定める。"
            spacing="default"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {oshOrdinances.map((n) => (
                <HierarchyCard key={n.id} node={n} />
              ))}
            </div>
          </Section>

          <Section
            title="参考: じん肺法 系列"
            description="安衛法と並列の独立法。粉じん作業従事労働者のじん肺健康管理・健康管理手帳制度を規定。"
            spacing="default"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <HierarchyCard node={jinpaiHo} />
              {jinpaiOrdinances.map((n) => (
                <HierarchyCard key={n.id} node={n} />
              ))}
            </div>
          </Section>

          <ConnectorHint label="↓ 告示・通達・指針（行政解釈・運用ルール）" />
          <Section
            title="④ 関連告示・通達・指針"
            description="厚生労働省が発する行政解釈・運用ルール。条文だけでは読み取れない実務基準を提示。本サイトでは全件横断検索が可能。"
            spacing="default"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                href="/circulars"
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  📄 通達
                </span>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {HIERARCHY_TOTALS.noticesTotal.toLocaleString("ja-JP")}
                  <span className="ml-1 text-xs font-normal text-slate-500">件</span>
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  法令の解釈・運用方針を所管局長等が示す行政文書。
                </p>
                <p className="mt-3 text-[11px] font-semibold text-emerald-700">
                  通達一覧を開く →
                </p>
              </Link>
              <Link
                href="/circulars"
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  🏛 告示
                </span>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {HIERARCHY_TOTALS.announcementsTotal.toLocaleString("ja-JP")}
                  <span className="ml-1 text-xs font-normal text-slate-500">件</span>
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  法令の委任に基づき大臣が公示する具体的基準・物質指定等。
                </p>
                <p className="mt-3 text-[11px] font-semibold text-emerald-700">
                  告示一覧を開く →
                </p>
              </Link>
              <Link
                href="/circulars"
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  📘 指針
                </span>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {HIERARCHY_TOTALS.guidelinesTotal.toLocaleString("ja-JP")}
                  <span className="ml-1 text-xs font-normal text-slate-500">件</span>
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  リスクアセスメント等の推奨実施事項を国が示す参考基準。
                </p>
                <p className="mt-3 text-[11px] font-semibold text-emerald-700">
                  指針一覧を開く →
                </p>
              </Link>
            </div>
          </Section>

          <Section
            title="あわせて使う"
            description="階層構造を踏まえた実務的な深掘りページ。"
            spacing="default"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/law-search"
                className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-emerald-800">条文検索</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  全法令の条文を横断検索
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  条番号・キーワード・法令名で絞り込み。漢数字と算用数字は同等扱い。
                </p>
              </Link>
              <Link
                href="/circulars"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-700">通達・告示・指針</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  厚労省 行政文書 全件
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  拘束力バッジ・最終確認日付き。jaish.gr.jp 一次出典リンクあり。
                </p>
              </Link>
              <Link
                href="/circulars"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-700">通達・判例（第2層）</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  実務出典・最高裁判例
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  条文だけでは読めない行政解釈と最高裁判例 30件超。
                </p>
              </Link>
              <Link
                href="/laws"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-700">法改正情報</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  最近10年の法改正履歴
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  施行日・改正理由・関連条文へのリンク付き。
                </p>
              </Link>
              <Link
                href="/laws/glossary"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-700">法令用語集</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  公布・施行・告示・通達の違い
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  本マップを読む前提となる用語を一次出典付きで解説。
                </p>
              </Link>
              <Link
                href="/chatbot"
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-700">安衛法AIチャット</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  条文の根拠を提示する対話
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  RAGコーパス 600条文超を背景に、根拠付きで回答。
                </p>
              </Link>
            </div>
          </Section>

          <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
            ※ 階層図は労働安全衛生法・じん肺法に関連する主要な政省令を抜粋したものです。最新の条文・告示番号は必ず e-Gov 法令検索および
            厚生労働省の一次資料で確認してください。本サイトは資料の所在を整理した参考情報です。
          </p>
        </Stack>
      </PageContainer>
    </>
  );
}
