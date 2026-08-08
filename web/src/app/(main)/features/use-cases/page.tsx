import type { Metadata } from "next";
import Link from "next/link";
import {
  FlaskConical,
  Factory,
  HardHat,
  HeartPulse,
  Laptop,
  Store,
  TreePine,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  alternates: { canonical: "/features/use-cases" },
  title: "業種別の使い方 | 機能紹介",
  description:
    "業種別モデルケースの提供可否を再検証しています。現在使える機能は各リンク先の状態表示で確認してください。",
  robots: { index: false, follow: true },
};

type UseCase = { title: string; problem: string; solution: string; relatedFeatures: { label: string; href: string }[] };

type Industry = {
  slug: string;
  icon: LucideIcon;
  name: string;
  hookline: string;
  cases: UseCase[];
};

const INDUSTRIES: Industry[] = [
  {
    slug: "construction",
    icon: HardHat,
    name: "建設業",
    hookline: "墜落・はさまれ・重機接触などの重篤災害が多い業種。KY・特別教育・元方安全衛生管理が要。",
    cases: [
      {
        title: "毎朝のKYを5分で",
        problem: "ベテランが現場ごと違い、KYの質にバラつきがある。",
        solution: "KYの入力・人手確認・下書き印刷を支援します。AI候補は未確認のまま承認できず、正式記録への採用は現場責任者の確認が必要です。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
          { label: "AIリスク予測", href: "/risk-prediction" },
        ],
      },
      {
        title: "フルハーネス特別教育",
        problem: "外注研修の調整が手間で、未受講者が出やすい。",
        solution: "自習用HTML教材と理解度確認を提供します。法定教育の実施、本人確認、受講時間、講師要件、修了証、正式な教育記録を代替しません。",
        relatedFeatures: [
          { label: "特別教育", href: "/education" },
        ],
      },
      {
        title: "事故事例の朝礼共有",
        problem: "類似工種の他社事故事例を入手しにくい。",
        solution: "サイト内の事故候補を検索し、公式データベースへ引き継げます。架空の学習例と一次資料照合済み事例は区別して表示します。",
        relatedFeatures: [
          { label: "事故データベース", href: "/accidents" },
          { label: "サイネージ", href: "/signage" },
        ],
      },
    ],
  },
  {
    slug: "manufacturing",
    icon: Factory,
    name: "製造業",
    hookline: "化学物質管理・はさまれ・転倒対策が中心。改正安衛法（2024年4月）の対応が急務。",
    cases: [
      {
        title: "化学物質RAを工場内で完結",
        problem: "SDS取込・GHS分類・ばく露見積もりを Excel 管理しており追跡が困難。",
        solution: "名称・CAS・作業条件の整理と簡易スクリーニングを支援します。SDS自動取込、ばく露濃度推定、CREATE-SIMPLE、監査用の確定記録を代替しません。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
          { label: "化学物質検索DB", href: "/chemical-database" },
        ],
      },
      {
        title: "新人安全教育の標準化",
        problem: "ライン別に教育内容がバラバラ、担当者が口頭で指導。",
        solution: "自習用教材と理解度確認を利用できます。個人認証、全社配信、進捗・修了管理、正式な教育記録は現在提供していません。",
        relatedFeatures: [
          { label: "Eラーニング", href: "/e-learning" },
        ],
      },
      {
        title: "助成金で導入コストをカバー",
        problem: "安全投資の予算確保が難しい。",
        solution: "助成制度の検討項目を整理し、厚生労働省・労働局の最新公募要領へつなぎます。申請可否や受給額を確定しません。",
        relatedFeatures: [
          { label: "助成金シミュレーター", href: "/subsidies/calculator" },
          { label: "年次安全衛生計画", href: "/strategy/plan-generator" },
        ],
      },
    ],
  },
  {
    slug: "healthcare",
    icon: HeartPulse,
    name: "医療・福祉",
    hookline: "腰痛・感染対策・ハラスメント対策・夜勤負荷など、人を支える人を守る視点が重要。",
    cases: [
      {
        title: "介助腰痛の予防教育",
        problem: "夜勤帯の介助で腰痛が頻発、休業災害につながる。",
        solution: "医療福祉向けEラーニングで腰痛予防・介助技術を配信。事故DBで類似事例を確認し対策に反映。",
        relatedFeatures: [
          { label: "Eラーニング", href: "/e-learning" },
          { label: "事故データベース", href: "/accidents" },
        ],
      },
      {
        title: "メンタル・カスハラ対応",
        problem: "ハラスメント対策法対応・メンタル不調の早期発見が課題。",
        solution: "メンタル・カスハラ専用コンテンツで管理職教育。安衛法上の必須項目は年次安全衛生計画で確認。",
        relatedFeatures: [
          { label: "メンタル・カスハラ", href: "/mental-health" },
          { label: "年次安全衛生計画", href: "/strategy/plan-generator" },
        ],
      },
      {
        title: "薬剤・消毒液のRA",
        problem: "消毒薬・抗がん剤など化学物質のばく露管理。",
        solution: "名称・CAS・作業条件を整理する簡易スクリーニングです。製品固有の最新SDS、公式ツール、専門家による評価と記録を別途確認します。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
        ],
      },
    ],
  },
  {
    slug: "transport",
    icon: Truck,
    name: "運輸・物流",
    hookline: "交通労働災害・荷役作業の腰痛・長時間労働対策が中心。改善基準告示の理解必須。",
    cases: [
      {
        title: "ドライバーKY",
        problem: "出庫前KYが形骸化、高齢化対応も課題。",
        solution: "運輸業プリセットKYで気象リスクと連動表示。ふりがな・大文字モードで多様な人員に対応。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
          { label: "気象リスク", href: "/risk" },
        ],
      },
      {
        title: "改善基準告示の確認",
        problem: "拘束時間・休息期間の最新基準が把握しづらい。",
        solution: "法令検索＋安衛法チャットボットで、改正内容と運用上の論点を即確認。",
        relatedFeatures: [
          { label: "法令検索", href: "/law-search" },
          { label: "安衛法チャット", href: "/chatbot" },
        ],
      },
      {
        title: "助成金活用",
        problem: "デジタコ・追加機材の投資判断。",
        solution: "助成制度と年次計画の検討項目を整理します。対象可否・金額・法的義務は公式要領と専門家が確認します。",
        relatedFeatures: [
          { label: "助成金シミュレーター", href: "/subsidies/calculator" },
        ],
      },
    ],
  },
  {
    slug: "it",
    icon: Laptop,
    name: "IT・情報通信",
    hookline: "VDT・テレワーク・メンタル不調・ストレスチェックが主要テーマ。",
    cases: [
      {
        title: "VDT・テレワーク環境整備",
        problem: "在宅環境の労務リスクとコンプラ確認。",
        solution: "年次安全衛生計画で在宅・VDT関連の必須対応を提示。資料ライブラリでガイドラインを参照。",
        relatedFeatures: [
          { label: "年次安全衛生計画", href: "/strategy/plan-generator" },
          { label: "資料ライブラリ", href: "/resources" },
        ],
      },
      {
        title: "ストレスチェック・メンタル",
        problem: "実施はしているが事後フォローが弱い。",
        solution: "メンタル・カスハラの教材を全社配信し、Eラーニングで管理職教育を標準化。",
        relatedFeatures: [
          { label: "メンタル・カスハラ", href: "/mental-health" },
          { label: "Eラーニング", href: "/e-learning" },
        ],
      },
      {
        title: "災害時BCP",
        problem: "拠点分散時の安全管理体制。",
        solution: "サイネージで選択地域の気象状態を確認できます。多拠点統合や教育進捗の一元管理は現在提供していません。",
        relatedFeatures: [
          { label: "サイネージ", href: "/signage" },
        ],
      },
    ],
  },
  {
    slug: "chemical",
    icon: FlaskConical,
    name: "化学",
    hookline: "改正安衛法（2024年4月施行）の化学物質管理が業種を問わず必須。化学業界はその先端。",
    cases: [
      {
        title: "改正安衛法に対応",
        problem: "リスクアセスメント対象物質の拡大、ばく露濃度測定の必須化。",
        solution: "化学物質RA＋検索DBで入力整理を支援。簡易スクリーニングの記録であり、そのまま提出できません。最終評価は公式CREATE-SIMPLE、製品固有の最新SDS、専門家による確認が必要です。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
          { label: "化学物質検索DB", href: "/chemical-database" },
        ],
      },
      {
        title: "現場作業者教育",
        problem: "GHS表示・SDS活用の理解が現場で浅い。",
        solution: "Eラーニングと辞書で用語学習、実物SDSと連動した教育コンテンツ。",
        relatedFeatures: [
          { label: "Eラーニング", href: "/e-learning" },
          { label: "安全用語辞書", href: "/glossary" },
        ],
      },
      {
        title: "通達フォロー",
        problem: "通達・告示の改正キャッチアップが負荷。",
        solution: "通達・法改正ページで時系列フォロー。AIチャットで運用上の論点を確認。",
        relatedFeatures: [
          { label: "通達・法改正", href: "/laws" },
          { label: "安衛法チャット", href: "/chatbot" },
        ],
      },
    ],
  },
  {
    slug: "forestry",
    icon: TreePine,
    name: "林業",
    hookline: "重篤災害発生率が産業中で高く、チェーンソー・伐木作業の特別教育が要。",
    cases: [
      {
        title: "伐木作業のKY",
        problem: "山中で電波が弱く、紙KYが定着。",
        solution: "ブラウザ内でKYを入力・下書き保存し、確認状態つきで印刷できます。署名認証、写真添付、クラウド保管を提供中とは表示しません。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
        ],
      },
      {
        title: "チェーンソー特別教育",
        problem: "従業員数が少なく集合研修が組みづらい。",
        solution: "自習用教材と理解度確認を利用できます。法定特別教育、修了証発行、監督署提出書類の完成を代替しません。",
        relatedFeatures: [
          { label: "特別教育", href: "/education" },
        ],
      },
    ],
  },
  {
    slug: "food",
    icon: Utensils,
    name: "食品製造・外食",
    hookline: "切創・転倒・腰痛・熱中症が中心。食品衛生と安全衛生の両立が課題。",
    cases: [
      {
        title: "厨房の転倒・切創対策",
        problem: "新人離職率が高く、教育に手が回らない。",
        solution: "食品向けEラーニングで安全教育を標準化、KYで朝礼5分の習慣化。",
        relatedFeatures: [
          { label: "Eラーニング", href: "/e-learning" },
          { label: "KY用紙", href: "/ky" },
        ],
      },
      {
        title: "夏場の熱中症対策",
        problem: "ピーク時の暑熱対策・WBGT管理。",
        solution: "気象リスクで日次のWBGT・暑熱警戒を表示、サイネージで現場掲示。",
        relatedFeatures: [
          { label: "気象リスク", href: "/risk" },
          { label: "サイネージ", href: "/signage" },
        ],
      },
      {
        title: "化学物質（洗浄剤）RA",
        problem: "洗浄剤・消毒液の混合事故リスク。",
        solution: "名称・CAS・作業条件を整理します。SDS自動取込や混合危険の確定判定は行わず、製品SDSと専門家の確認へつなぎます。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
        ],
      },
    ],
  },
  {
    slug: "service",
    icon: Store,
    name: "サービス業（小売・宿泊）",
    hookline: "転倒・カスハラ・腰痛・接客時のメンタル負荷が中心テーマ。",
    cases: [
      {
        title: "カスハラ対応研修",
        problem: "現場任せで対応がバラつき、離職要因にも。",
        solution: "参考コンテンツで論点を確認できます。正式な研修実施、受講者認証、修了管理を代替しません。",
        relatedFeatures: [
          { label: "メンタル・カスハラ", href: "/mental-health" },
          { label: "Eラーニング", href: "/e-learning" },
        ],
      },
      {
        title: "店舗ごとのKY・点検",
        problem: "多店舗展開で安全管理状況が見えない。",
        solution: "各端末でKYや点検項目を確認できます。店舗横断のクラウド同期、実績集計、実施率管理は現在提供していません。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
        ],
      },
      {
        title: "安全衛生委員会の運営",
        problem: "議題と前年フォローの引継ぎ漏れ。",
        solution: "安全工程打合せ書と通達・法改正情報から確認候補を整理します。法令検索は根拠候補を示し、適用判断は公式正本と人が確認します。",
        relatedFeatures: [
          { label: "安全工程打合せ書", href: "/safety-diary" },
          { label: "通達・法改正", href: "/laws" },
        ],
      },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <div className="px-4 py-6 sm:py-10">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mx-auto max-w-5xl text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/features" className="hover:text-slate-800 hover:underline">
              機能紹介
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="font-semibold text-slate-700">業種別の使い方</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mx-auto mt-4 max-w-4xl text-center">
        <p className="text-xs font-bold tracking-widest text-emerald-700">USE CASES</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
          業種別の使い方
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          建設・製造・医療福祉・運輸・IT・化学・林業・食品・サービス業の{INDUSTRIES.length}業種について、安全AIポータルをどう使うかを具体的なシナリオで紹介します。
        </p>
      </header>

      <aside
        className="mx-auto mt-6 max-w-4xl rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left text-sm leading-relaxed text-amber-950"
        aria-label="モデルケースの提供状態"
      >
        <p className="font-bold">提供可否を再検証中のモデルケースです</p>
        <p className="mt-1">
          このページは現在の利用可能機能を保証する一覧ではありません。修了証・正式な教育記録・LMSによる進捗管理・クラウド共有・SDS自動取込・ばく露推定は提供中と表示しません。各リンク先の状態表示と公式一次資料を確認してください。
        </p>
      </aside>

      {/* 業種ジャンプ */}
      <nav aria-label="業種ジャンプ" className="mx-auto mt-6 max-w-5xl">
        <div className="flex flex-wrap justify-center gap-2">
          {INDUSTRIES.map((ind) => (
            <a
              key={ind.slug}
              href={`#${ind.slug}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ind.icon className="h-4 w-4" aria-hidden="true" />
              {ind.name}
            </a>
          ))}
        </div>
      </nav>

      {/* 業種別カード */}
      <section className="mx-auto mt-10 max-w-5xl space-y-12">
        {INDUSTRIES.map((ind) => (
          <article key={ind.slug} id={ind.slug} className="scroll-mt-24">
            <header className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ind.icon className="h-8 w-8 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{ind.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{ind.hookline}</p>
                </div>
              </div>
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {ind.cases.map((useCase, idx) => (
                <div
                  key={`${ind.slug}-${idx}`}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-[11px] font-bold tracking-widest text-emerald-700">
                    シナリオ {idx + 1}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{useCase.title}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">課題</p>
                  <p className="text-sm text-slate-700">{useCase.problem}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">安全AIポータルで</p>
                  <p className="text-sm text-slate-700">{useCase.solution}</p>
                  <div className="mt-auto pt-3">
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">関連機能</p>
                    <div className="flex flex-wrap gap-1.5">
                      {useCase.relatedFeatures.map((rf) => (
                        <Link
                          key={rf.href}
                          href={rf.href}
                          className="inline-flex min-h-[44px] items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          {rf.label} →
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="mx-auto mt-12 max-w-5xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">あなたの業種は載っていましたか？</h2>
        <p className="mt-2 text-sm text-emerald-800">
          料金、モデルケース、相談受付の現在状態は業務自動化サービスページで確認できます。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/services/automation"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            相談受付の準備状況を見る →
          </Link>
          <Link
            href="/features"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            機能一覧に戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
