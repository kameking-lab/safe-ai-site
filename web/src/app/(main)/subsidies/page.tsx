import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, TrendingUp, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ogImageUrl } from "@/lib/og-url";
import { SubsidiesRecommender, type Subsidy } from "@/components/subsidies-recommender";

const _title = "助成金・補助金ガイド｜中小企業の安全投資ROI";
const _desc =
  "エイジフレンドリー補助金・働き方改革推進支援助成金・建退共など、労働安全投資に使える公的助成金を中小企業向けにまとめました。労災1件あたりの経済損失試算も掲載。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
};

const SUBSIDIES: Subsidy[] = [
  {
    id: "age-friendly",
    name: "エイジフレンドリー補助金",
    target: "中小企業（60歳以上を雇用 or 雇用予定）",
    amount: "上限100万円（補助率1/2〜2/3、コースにより異なる）",
    purpose: [
      "高齢労働者向けの作業環境改善（段差解消・手すり・照度アップ）",
      "重量物取扱いの機械化・リフト導入",
      "高所作業の転落防止設備",
      "コラボヘルスコース（健康診断・保健指導）",
    ],
    operator: "厚生労働省（独立行政法人労働者健康安全機構）",
    url: "https://www.mhlw.go.jp/stf/newpage_42107.html",
    note: "毎年度公募。予算到達で打切り。",
    scale_tags: ["small", "mid"],
    industry_tags: ["any"],
    region_tags: ["nationwide"],
  },
  {
    id: "hatarakikata",
    name: "働き方改革推進支援助成金",
    target: "中小企業（業種ごとの資本金・従業員数の上限あり）",
    amount: "上限250万円〜730万円（コース・達成目標により変動）",
    purpose: [
      "労働時間短縮・年休取得促進のためのコンサル費",
      "勤怠管理・労務管理ソフト導入費",
      "業務効率化のための機械・ITツール導入",
      "外部研修・社内研修費",
    ],
    operator: "厚生労働省（都道府県労働局）",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/jikan/syoukeihatten.html",
    note: "労働時間削減や年休5日以上取得などの成果目標設定が必須。",
    scale_tags: ["small", "mid"],
    industry_tags: ["any"],
    region_tags: ["nationwide"],
  },
  {
    id: "kentaikyo",
    name: "建設業退職金共済（建退共）",
    target: "建設業の元請・下請事業主",
    amount: "掛金日額320円（1日あたり）×就業日数を助成",
    purpose: [
      "建設労働者の退職金積立（現場日数に応じて証紙貼付）",
      "中小建設業者は掛金の一部が補助対象",
      "新規加入事業主には初回1年分の掛金補助（新規加入助成）",
    ],
    operator: "勤労者退職金共済機構 建退共事業本部",
    url: "https://www.kentaikyo.taisyokukin.go.jp/",
    scale_tags: ["small", "mid", "medium-large"],
    industry_tags: ["construction"],
    region_tags: ["nationwide"],
  },
  {
    id: "employment-dev",
    name: "人材開発支援助成金",
    target: "雇用保険適用事業所（中小企業優遇）",
    amount: "訓練費用の45〜75%＋賃金助成（コースによる）",
    purpose: [
      "安全衛生教育（雇入れ時・職長・特別教育）の外部講師費用",
      "技能講習（玉掛け・フォーク・小型車両系建設機械等）の受講費",
      "RST（Roudou Safety Trainer）講習の受講費",
      "eラーニング受講費（一定条件）",
    ],
    operator: "厚生労働省（都道府県労働局）",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html",
    scale_tags: ["small", "mid", "medium-large"],
    industry_tags: ["any"],
    region_tags: ["nationwide"],
  },
  {
    id: "small-biz-support",
    name: "中小企業労働環境向上助成金（業種別）",
    target: "業種別（運輸・建設・林業・介護）",
    amount: "上限50万円〜100万円（業種による）",
    purpose: [
      "運輸業の拘束時間短縮ソフト・機械導入",
      "建設業の週休2日制導入支援",
      "介護事業の腰痛予防機器（リフト等）導入",
      "林業の安全装備（チェンソー防護衣・ヘルメット）導入",
    ],
    operator: "厚生労働省 各都道府県労働局",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index_00007.html",
    note: "年度により名称・内容が変更されます。最新情報は各労働局へ。",
    scale_tags: ["small", "mid"],
    industry_tags: ["transport", "construction", "forestry", "healthcare"],
    region_tags: ["nationwide"],
  },
  {
    id: "sme-dx-2026",
    name: "中小企業省力化投資補助金",
    target: "中小企業・小規模事業者",
    amount: "上限1,000万円〜1,500万円（従業員数による）",
    purpose: [
      "カタログ掲載の省力化機器（AI画像認識・搬送ロボ等）の導入",
      "安全衛生向上に資するIoT設備投資",
      "事業場の安全管理システム（AI監視カメラ等）",
    ],
    operator: "中小企業庁",
    url: "https://www.chusho.meti.go.jp/",
    note: "安全関連と直接紐づかないものも多いため、対象製品カタログを要確認。",
    scale_tags: ["small", "mid"],
    industry_tags: ["any"],
    region_tags: ["nationwide"],
  },
  {
    id: "tokyo-ccs",
    name: "東京都 中小企業安全衛生職場環境改善事業",
    target: "東京都内の中小企業",
    amount: "上限200万円（補助率1/2）",
    purpose: [
      "墜落防止設備・安全通路の整備",
      "職場の受動喫煙防止設備（屋外喫煙所等）",
      "化学物質ばく露防止の局所排気装置導入",
    ],
    operator: "東京都産業労働局 労働環境改善担当",
    url: "https://www.hataraku.metro.tokyo.lg.jp/",
    note: "東京都内の事業所限定。年度ごとに公募要領を確認のこと。",
    scale_tags: ["small", "mid"],
    industry_tags: ["any"],
    region_tags: ["tokyo-kanto"],
  },
];

export default function SubsidiesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHeader
        title="助成金・補助金ガイド"
        description="労働安全投資に使える公的助成金と、労災1件あたりの経済損失試算"
        icon={Banknote}
        iconColor="amber"
      />

      {/* イントロ */}
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="text-sm leading-6 text-amber-900">
            <p className="font-semibold">
              中小企業経営者・安全衛生担当者の方へ
            </p>
            <p className="mt-1">
              安全衛生投資は「コスト」ではなく「補助金で取り戻せる投資」です。
              本ページでは、中小建設・製造・運輸・介護・林業の現場で使える主要な助成金と、
              労災1件の経済損失から見るROIを公開します。
              最新の公募状況は必ず公式ページをご確認ください。
            </p>
          </div>
        </div>
      </section>

      <SubsidiesRecommender subsidies={SUBSIDIES} />

      {/* ROI試算 */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          労災1件あたりの経済損失試算
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          中央労働災害防止協会・厚労省統計をベースに、中小建設業の休業4日以上災害1件を想定した試算です（目安）。
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">費目</th>
                <th className="px-4 py-2 text-left font-semibold">内容</th>
                <th className="px-4 py-2 text-right font-semibold">金額の目安</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-3 font-semibold">直接損失</td>
                <td className="px-4 py-3">休業補償・見舞金・医療費（労災保険給付分は除く）</td>
                <td className="px-4 py-3 text-right">30万〜100万円</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">間接損失</td>
                <td className="px-4 py-3">生産停止・他作業員の手待ち・再教育・事故調査</td>
                <td className="px-4 py-3 text-right">直接損失の4〜5倍</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">入札減点・指名停止</td>
                <td className="px-4 py-3">公共工事の入札資格評点マイナス、指名停止期間の受注機会損失</td>
                <td className="px-4 py-3 text-right">年間売上の5〜20%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">メリット制保険料</td>
                <td className="px-4 py-3">労災保険のメリット制による保険料上昇（最長3年）</td>
                <td className="px-4 py-3 text-right">50万〜300万円</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">レピュテーション</td>
                <td className="px-4 py-3">取引先との信頼低下・採用難・ISO認証への影響</td>
                <td className="px-4 py-3 text-right">試算困難</td>
              </tr>
              <tr className="bg-amber-50 font-bold text-slate-900">
                <td className="px-4 py-3">合計（目安）</td>
                <td className="px-4 py-3">休業4日以上災害1件の経済損失</td>
                <td className="px-4 py-3 text-right">300万〜1,500万円／件</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          出典：中央労働災害防止協会「労働災害のコスト分析」、厚労省『労働災害動向調査』等を参考に、中小建設業モデルを想定した概算。
          実際の損失は事業規模・事故類型・被災者属性により大きく変動します。
        </p>
      </section>

      {/* 相談窓口 */}
      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-base font-bold text-emerald-900">相談窓口</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
          <li>
            <span className="font-semibold">都道府県労働局 助成金センター：</span>
            各労働局「雇用環境・均等部（室）」にて受付
          </li>
          <li>
            <span className="font-semibold">建設業労働災害防止協会（建災防）：</span>
            建退共・安全大会などの助成・補助情報
          </li>
          <li>
            <span className="font-semibold">中小企業基盤整備機構（中小機構）：</span>
            省力化補助金ほか経営支援
          </li>
          <li>
            <span className="font-semibold">外国人労働者相談コーナー：</span>
            外国語対応の相談窓口（13言語対応の都道府県労働局）
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            料金プランを見る
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            導入相談をする
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        ※ 本ページの情報は2026年4月時点の公開情報をもとにしています。
        制度は頻繁に改正されます。申請前に必ず各所管庁の最新公募要領をご確認ください。
      </p>
    </main>
  );
}
