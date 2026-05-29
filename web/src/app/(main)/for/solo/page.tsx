import type { Metadata } from "next";
import Link from "next/link";
import {
  UserRound,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Scale,
  FlaskConical,
  AlertTriangle,
  GraduationCap,
  ArrowRight,
  TestTube2,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { CONSTRUCTION_PRIORITY_CAS } from "@/lib/regulation-tag-labels";
import { MainFeatureNextActions } from "@/components/main-feature-next-actions";
import { SITE_STATS } from "@/data/site-stats";

const TITLE = "一人親方の安全衛生 — 特別加入・KY・資格・熱中症を一人で回すための実務ポータル";
const DESCRIPTION =
  "一人親方・個人事業主が、労災保険の特別加入・一人KY・必要な資格・熱中症対策・化学物質情報を一箇所で確認。雇い主がいなくても自分の安全を自分で管理するための無料ツール。労働安全衛生コンサルタント (登録番号260022) 監修の研究プロジェクト。";
const CANONICAL = "/for/solo";
const FULL_URL = "https://www.anzen-ai-portal.jp/for/solo";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: FULL_URL,
    type: "website",
    images: [{ url: ogImageUrl("一人親方の安全衛生", "特別加入・KY・資格・熱中症を一人で回す"), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// 一人親方が「自分で」回す日々のチェックポイント（確立した一般実務をルート化）
const SOLO_KY_POINTS = [
  {
    work: "高所・屋根上での作業 (一人作業)",
    hazard: "墜落・転落。声を掛ける同僚がいないため発見が遅れる",
    reduction: "フルハーネス常時使用。作業前に家族・元請へ作業場所と終了予定を連絡 (単独作業の連絡体制)",
  },
  {
    work: "電動工具・刈払機などの使用",
    hazard: "切創・飛来物・反発 (キックバック)",
    reduction: "保護具 (保護メガネ・手袋) の着用。刃の点検と回転部の養生を作業前に確認",
  },
  {
    work: "炎天下の屋外作業",
    hazard: "熱中症 (一人のため重症化に気づきにくい)",
    reduction: "WBGTを確認し、こまめな休憩・水分塩分。体調異変時の連絡先を携帯に登録",
  },
];

// 一人親方が押さえるべき制度（確立した事実のみ。具体施行内容は外部・チャットへ誘導）
const SOLO_SYSTEMS = [
  {
    title: "労災保険の特別加入",
    body: "一人親方は「労働者」ではないため労災保険は原則対象外ですが、建設業などでは特別加入制度により任意で加入できます。加入は労働局承認の特別加入団体を通じて行います。",
    cta: { label: "特別加入の対象・手続を法令チャットで確認", href: "/chatbot?q=%E4%B8%80%E4%BA%BA%E8%A6%AA%E6%96%B9%E3%81%AE%E5%8A%B4%E7%81%BD%E4%BF%9D%E9%99%BA%E7%89%B9%E5%88%A5%E5%8A%A0%E5%85%A5%E3%81%AE%E5%AF%BE%E8%B1%A1%E3%81%A8%E6%89%8B%E7%B6%9A%E3%82%92%E6%95%99%E3%81%88%E3%81%A6" },
  },
  {
    title: "個人事業者等の安全衛生対策の強化",
    body: "国は一人親方を含む個人事業者等の安全衛生対策を段階的に強化しています (注文者・元請による保護措置の対象拡大など)。最新の施行内容は法改正カレンダーでご確認ください。",
    cta: { label: "法改正カレンダーで施行状況を確認", href: "/laws" },
  },
  {
    title: "危険・有害業務に必要な資格",
    body: "一人親方でも、足場の組立て・玉掛け・有機溶剤作業などの危険有害業務では、技能講習・特別教育に相当する知識・資格が必要になる場面があります。作業から逆引きで確認できます。",
    cta: { label: "作業から必要資格を判定する", href: "/education-certification/finder" },
  },
];

const LAW_HIGHLIGHTS = [
  { law: "労災保険法 (特別加入)", topic: "一人親方等の特別加入制度", url: "/law-search?q=%E7%89%B9%E5%88%A5%E5%8A%A0%E5%85%A5" },
  { law: "安衛則 第518〜575条", topic: "墜落・転落防止 (高所作業・足場)", url: "/law-search?q=%E5%AE%89%E8%A1%9B%E5%89%87+518" },
  { law: "有機溶剤中毒予防規則", topic: "塗装・防水での溶剤暴露管理", url: "/law-search?q=%E6%9C%89%E6%A9%9F%E5%89%87" },
  { law: "石綿障害予防規則 第3条", topic: "解体・改修の事前調査 (電子報告)", url: "/law-search?q=%E7%9F%B3%E7%B6%BF%E5%89%87" },
];

const CIRCULAR_HIGHLIGHTS = [
  { title: "建設業における一人親方等の安全衛生対策", url: "/circulars?q=%E4%B8%80%E4%BA%BA%E8%A6%AA%E6%96%B9" },
  { title: "職場における熱中症予防のためのガイドライン", url: "/circulars?q=%E7%86%B1%E4%B8%AD%E7%97%87" },
  { title: "フルハーネス型墜落制止用器具に関する規制", url: "/circulars?q=%E3%83%95%E3%83%AB%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9" },
];

const CHEMICAL_CATEGORIES: Array<{
  key: "塗装系" | "解体系" | "防水系" | "溶剤系";
  label: string;
  caption: string;
}> = [
  { key: "塗装系", label: "塗装系", caption: "溶剤蒸気・有機則対応" },
  { key: "解体系", label: "解体系", caption: "石綿・鉛・重金属" },
  { key: "防水系", label: "防水系", caption: "イソシアネート・塩素系" },
  { key: "溶剤系", label: "溶剤系", caption: "特化則・有機則対象" },
];

export default function ForSoloPage() {
  return (
    <PageContainer width="full">
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url: FULL_URL,
            keywords: [
              "一人親方",
              "個人事業主",
              "労災保険",
              "特別加入",
              "安全衛生",
              "KY",
              "墜落防止",
              "熱中症",
              "特別教育",
              "技能講習",
              "労働安全衛生コンサルタント",
            ],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: "https://www.anzen-ai-portal.jp/" },
            { name: "立場から探す", url: "https://www.anzen-ai-portal.jp/" },
            { name: "一人親方", url: FULL_URL },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
          <UserRound className="h-3.5 w-3.5" />
          一人親方・個人事業主
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          自分の安全は、自分で回す。
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          雇い主や安全担当がいない一人親方でも、労災保険の特別加入・一人KY・必要な資格・熱中症対策・化学物質情報を、ここだけで確認できます。
          労働安全衛生コンサルタント (登録番号260022) 監修の無料の研究プロジェクトです。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="#today" className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">
            <ClipboardList className="h-4 w-4" /> 今日使う
          </Link>
          <Link href="#systems" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <ShieldCheck className="h-4 w-4" /> 押さえる制度
          </Link>
          <Link href="#qualifications" className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
            <GraduationCap className="h-4 w-4" /> 必要な資格
          </Link>
        </div>
      </section>

      {/* 当日使える機能 */}
      <section id="today" className="mt-10 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <ClipboardList className="h-5 w-5 text-orange-700" />
          今日の作業前に (5分)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/ky?industry=construction" className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 hover:bg-orange-100">
            <p className="font-bold text-orange-900">一人KYを作る</p>
            <p className="mt-1 text-xs text-orange-800">今日の自分の作業の危険を3分で洗い出し。音声入力対応。プリセットから選ぶだけ。</p>
            <p className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-orange-700">/ky を開く <ArrowRight className="h-3 w-3" /></p>
          </Link>
          <Link href="/heat-illness-prevention" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 hover:bg-amber-100">
            <p className="font-bold text-amber-900">熱中症リスクを確認</p>
            <p className="mt-1 text-xs text-amber-800">WBGT計算機と業種別リスク判定。令和7年の安衛則改正チェックリスト付き。</p>
            <p className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700">/heat-illness-prevention <ArrowRight className="h-3 w-3" /></p>
          </Link>
          <Link href="/chatbot" className="rounded-xl border-2 border-sky-300 bg-sky-50 p-4 hover:bg-sky-100">
            <p className="font-bold text-sky-900">法令をAIに聞く</p>
            <p className="mt-1 text-xs text-sky-800">「足場の手すりは何cm?」など、現場の疑問を条文番号・出典付きで即回答。</p>
            <p className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-sky-700">/chatbot <ArrowRight className="h-3 w-3" /></p>
          </Link>
        </div>
      </section>

      {/* 一人KYポイント */}
      <section
        id="solo-ky"
        tabIndex={-1}
        className="mt-12 scroll-mt-20 rounded-2xl border-2 border-orange-200 bg-white p-5 sm:p-7"
        aria-labelledby="solo-ky-heading"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
          <ClipboardList className="h-3.5 w-3.5" /> 一人作業のKY
        </div>
        <h2 id="solo-ky-heading" className="mt-3 text-2xl font-bold text-slate-900">
          一人だからこそ危ない、3つの作業
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          声を掛け合える仲間がいない一人作業は、異変への気づきが遅れます。代表的な作業の危険と対策をKY用紙に転記して使えます。
        </p>
        <ol className="mt-5 space-y-2.5">
          {SOLO_KY_POINTS.map((p, i) => (
            <li key={i} className="rounded-lg border border-orange-200 bg-orange-50/40 p-3">
              <p className="text-sm font-bold text-orange-900">{i + 1}. {p.work}</p>
              <p className="mt-1 text-xs text-slate-700"><span className="font-semibold text-rose-700">リスク:</span> {p.hazard}</p>
              <p className="mt-0.5 text-xs text-slate-700"><span className="font-semibold text-emerald-700">対策:</span> {p.reduction}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/ky?industry=construction" className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">
            KY用紙を作成 →
          </Link>
          <Link href="/ky-examples" className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 hover:bg-orange-50">
            KY事例 150 件を見る →
          </Link>
        </div>
      </section>

      {/* 押さえる制度 */}
      <section id="systems" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          一人親方が押さえる制度
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          雇われている労働者と立場が違うぶん、自分で確認しておくべき制度があります。施行時期など細部は必ず公的情報で最終確認してください。
        </p>
        <div id="qualifications" className="mt-4 grid gap-3 sm:grid-cols-3">
          {SOLO_SYSTEMS.map((s, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-emerald-900">{s.title}</p>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-600">{s.body}</p>
              <Link href={s.cta.href} className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:underline">
                {s.cta.label} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 法令早見 */}
      <section id="laws" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Scale className="h-5 w-5 text-violet-700" />
          一人親方の法令早見
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          現場で迷いやすい主要条文。各リンクから条文検索・通達アーカイブへ。
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {LAW_HIGHLIGHTS.map((l, i) => (
            <Link key={i} href={l.url} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-violet-300 hover:bg-slate-50">
              <p className="text-sm font-bold text-slate-900">{l.law}</p>
              <p className="mt-0.5 text-xs text-slate-600">{l.topic}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 化学物質 */}
      <section id="chemical" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <FlaskConical className="h-5 w-5 text-amber-700" />
          塗装・防水・解体で扱う物質クイック
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          一人親方が扱いやすい塗装・防水・解体・溶剤系の代表物質。クリックで詳細 (規制タグ・GHS・濃度基準) を表示。
        </p>
        <div className="mt-4 space-y-3">
          {CHEMICAL_CATEGORIES.map((cat) => {
            const items = CONSTRUCTION_PRIORITY_CAS.filter((x) => x.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <p className="text-sm font-bold text-amber-900">
                  {cat.label} <span className="text-xs font-normal text-amber-700">— {cat.caption}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((it) => (
                    <Link key={it.cas} href={`/chemical-database/${it.cas}`} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                      {it.name} <span className="font-normal text-amber-600">({it.cas})</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/chemical-ra" className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">
            <TestTube2 className="h-4 w-4" /> 化学物質RAを開始 →
          </Link>
          <Link href="/chemical-database" className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-50">
            化学物質を検索 →
          </Link>
        </div>
      </section>

      {/* 事故事例 */}
      <section id="stats" className="mt-12 scroll-mt-20 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-rose-700" />
          同じ作業の事故を、先に知る
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          厚労省データを統合した {SITE_STATS.accidents10yCount} 件の事故事例を、業種・作業・原因で検索できます。墜落・はさまれなど、一人親方に多い類型から先回りで対策を。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/accidents-reports/construction" className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            建設業の事故分析レポート →
          </Link>
          <Link href="/accidents" className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-50">
            事故データベースを検索 →
          </Link>
        </div>
      </section>

      {/* 関連通達 */}
      <section id="circulars" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Scale className="h-5 w-5 text-slate-700" />
          関連通達・ガイドライン
        </h2>
        <ul className="mt-4 space-y-2">
          {CIRCULAR_HIGHLIGHTS.map((c, i) => (
            <li key={i}>
              <Link href={c.url} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-400 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-800">{c.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 法令チャットCTA */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
        <div className="flex items-start gap-4">
          <MessageSquare className="h-8 w-8 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">「これ、自分にも義務？」を解消</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-95">
              一人親方の立場で迷いやすい義務・資格・保険を、自然な日本語で質問できます。条文番号付きで回答し、関連通達URLも自動添付します。
            </p>
            <Link href="/chatbot" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50">
              法令チャットを開く →
            </Link>
          </div>
        </div>
      </section>

      {/* 統一CTA */}
      <div className="mt-10">
        <MainFeatureNextActions contextLabel="一人親方 実務ポータル" />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        本ページは個人運営の研究プロジェクトです。特別加入の可否・手続、各制度の最新の施行内容は、所轄の労働局・労働基準監督署または特別加入団体、労働安全衛生コンサルタント (登録番号260022 含む) にご確認ください。
      </p>
    </PageContainer>
  );
}
