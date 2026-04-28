import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "業種別の使い方 | 機能紹介 | ANZEN AI",
  description:
    "建設・製造・医療福祉・運輸・IT・化学・林業・食品・サービス業向けに、ANZEN AIの活用シナリオを紹介します。",
};

type UseCase = { title: string; problem: string; solution: string; relatedFeatures: { label: string; href: string }[] };

type Industry = {
  slug: string;
  emoji: string;
  name: string;
  hookline: string;
  cases: UseCase[];
};

const INDUSTRIES: Industry[] = [
  {
    slug: "construction",
    emoji: "🏗",
    name: "建設業",
    hookline: "墜落・はさまれ・重機接触などの重篤災害が多い業種。KY・特別教育・元方安全衛生管理が要。",
    cases: [
      {
        title: "毎朝のKYを5分で",
        problem: "ベテランが現場ごと違い、KYの質にバラつきがある。",
        solution: "業種別プリセットとAIリスク提案で、新人でも一定品質のKYが回せる。署名つきPDFで記録保管も。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
          { label: "AIリスク予測", href: "/risk-prediction" },
        ],
      },
      {
        title: "フルハーネス特別教育",
        problem: "外注研修の調整が手間で、未受講者が出やすい。",
        solution: "オンライン教材＋修了証発行で、現場ごとに受講可能。LMSで全社受講状況を一元管理。",
        relatedFeatures: [
          { label: "特別教育", href: "/education" },
          { label: "LMS", href: "/lms" },
        ],
      },
      {
        title: "事故事例の朝礼共有",
        problem: "類似工種の他社事故事例を入手しにくい。",
        solution: "事故DBから工種・起因物で検索し、サイネージで朝礼掲示。10年分の厚労省データを収録。",
        relatedFeatures: [
          { label: "事故データベース", href: "/accidents" },
          { label: "サイネージ", href: "/signage" },
        ],
      },
    ],
  },
  {
    slug: "manufacturing",
    emoji: "🏭",
    name: "製造業",
    hookline: "化学物質管理・はさまれ・転倒対策が中心。改正安衛法（2024年4月）の対応が急務。",
    cases: [
      {
        title: "化学物質RAを工場内で完結",
        problem: "SDS取込・GHS分類・ばく露見積もりを Excel 管理しており追跡が困難。",
        solution: "化学物質RA機能で SDS 取込から作業別ばく露見積もりまで一気通貫。記録は監査対応にも。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
          { label: "化学物質検索DB", href: "/chemical-database" },
        ],
      },
      {
        title: "新人安全教育の標準化",
        problem: "ライン別に教育内容がバラバラ、担当者が口頭で指導。",
        solution: "業種別Eラーニングを配信し、進捗・修了状況をLMSで管理。新人着任日から受講開始。",
        relatedFeatures: [
          { label: "Eラーニング", href: "/e-learning" },
          { label: "LMS", href: "/lms" },
        ],
      },
      {
        title: "助成金で導入コストをカバー",
        problem: "安全投資の予算確保が難しい。",
        solution: "助成金シミュレーターで、エイジフレンドリー補助金等の申請可否と試算額を即提示。",
        relatedFeatures: [
          { label: "助成金シミュレーター", href: "/subsidies/calculator" },
          { label: "コンプラ診断", href: "/wizard" },
        ],
      },
    ],
  },
  {
    slug: "healthcare",
    emoji: "🏥",
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
        solution: "メンタル・カスハラ専用コンテンツで管理職教育。安衛法上の必須項目はコンプラ診断で確認。",
        relatedFeatures: [
          { label: "メンタル・カスハラ", href: "/mental-health" },
          { label: "コンプラ診断", href: "/wizard" },
        ],
      },
      {
        title: "薬剤・消毒液のRA",
        problem: "消毒薬・抗がん剤など化学物質のばく露管理。",
        solution: "化学物質RAで SDS 取込・ばく露見積もり。改正安衛法に準拠した記録保管。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
        ],
      },
    ],
  },
  {
    slug: "transport",
    emoji: "🚛",
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
        solution: "助成金シミュレーターで対象助成金を試算、コンプラ診断で必須対応を可視化。",
        relatedFeatures: [
          { label: "助成金シミュレーター", href: "/subsidies/calculator" },
        ],
      },
    ],
  },
  {
    slug: "it",
    emoji: "💻",
    name: "IT・情報通信",
    hookline: "VDT・テレワーク・メンタル不調・ストレスチェックが主要テーマ。",
    cases: [
      {
        title: "VDT・テレワーク環境整備",
        problem: "在宅環境の労務リスクとコンプラ確認。",
        solution: "コンプラ診断で在宅・VDT関連の必須対応を提示。資料ライブラリでガイドラインを参照。",
        relatedFeatures: [
          { label: "コンプラ診断", href: "/wizard" },
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
        solution: "サイネージで拠点別の気象警報を表示。LMSで分散教育の進捗を一元管理。",
        relatedFeatures: [
          { label: "サイネージ", href: "/signage" },
          { label: "LMS", href: "/lms" },
        ],
      },
    ],
  },
  {
    slug: "chemical",
    emoji: "⚗",
    name: "化学",
    hookline: "改正安衛法（2024年4月施行）の化学物質管理が業種を問わず必須。化学業界はその先端。",
    cases: [
      {
        title: "改正安衛法 完全対応",
        problem: "リスクアセスメント対象物質の拡大、ばく露濃度測定の必須化。",
        solution: "化学物質RA＋検索DBで法令対応。記録は監査・労基対応にそのまま提出可能。",
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
    emoji: "🌲",
    name: "林業",
    hookline: "重篤災害発生率が産業中で高く、チェーンソー・伐木作業の特別教育が要。",
    cases: [
      {
        title: "伐木作業のKY",
        problem: "山中で電波が弱く、紙KYが定着。",
        solution: "オフライン入力可能なKYと業種別プリセット。署名・写真添付つきPDFで記録保管。",
        relatedFeatures: [
          { label: "KY用紙", href: "/ky" },
        ],
      },
      {
        title: "チェーンソー特別教育",
        problem: "従業員数が少なく集合研修が組みづらい。",
        solution: "オンライン特別教育で個別受講。修了証発行と監督署提出資料の準備までサポート。",
        relatedFeatures: [
          { label: "特別教育", href: "/education" },
        ],
      },
      {
        title: "クマ目撃情報",
        problem: "クマ被害が増加、労災認定例も。",
        solution: "クマ目撃マップで該当地域を確認。気象リスクと組み合わせて朝礼で共有。",
        relatedFeatures: [
          { label: "クマ目撃マップ", href: "/bear-map" },
          { label: "気象リスク", href: "/risk" },
        ],
      },
    ],
  },
  {
    slug: "food",
    emoji: "🍱",
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
        solution: "化学物質RAでSDS取込し、混合危険を含めたリスク評価を実施。",
        relatedFeatures: [
          { label: "化学物質RA", href: "/chemical-ra" },
        ],
      },
    ],
  },
  {
    slug: "service",
    emoji: "🛍",
    name: "サービス業（小売・宿泊）",
    hookline: "転倒・カスハラ・腰痛・接客時のメンタル負荷が中心テーマ。",
    cases: [
      {
        title: "カスハラ対応研修",
        problem: "現場任せで対応がバラつき、離職要因にも。",
        solution: "メンタル・カスハラ専用コンテンツで管理職・現場の双方を教育。Eラーニング修了管理。",
        relatedFeatures: [
          { label: "メンタル・カスハラ", href: "/mental-health" },
          { label: "Eラーニング", href: "/e-learning" },
        ],
      },
      {
        title: "店舗ごとのKY・点検",
        problem: "多店舗展開で安全管理状況が見えない。",
        solution: "LMSで店舗横断の点検・KY実績を一元管理。本部から実施率を可視化。",
        relatedFeatures: [
          { label: "LMS", href: "/lms" },
          { label: "KY用紙", href: "/ky" },
        ],
      },
      {
        title: "安全衛生委員会の運営",
        problem: "議題と前年フォローの引継ぎ漏れ。",
        solution: "安全衛生日誌と通達・法改正情報で議題を構築。法令検索で根拠を即提示。",
        relatedFeatures: [
          { label: "安全衛生日誌", href: "/safety-diary" },
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
          建設・製造・医療福祉・運輸・IT・化学・林業・食品・サービス業の{INDUSTRIES.length}業種について、ANZEN AIをどう使うかを具体的なシナリオで紹介します。
        </p>
      </header>

      {/* 業種ジャンプ */}
      <nav aria-label="業種ジャンプ" className="mx-auto mt-6 max-w-5xl">
        <div className="flex flex-wrap justify-center gap-2">
          {INDUSTRIES.map((ind) => (
            <a
              key={ind.slug}
              href={`#${ind.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span aria-hidden>{ind.emoji}</span>
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
                <span className="text-3xl" aria-hidden>{ind.emoji}</span>
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
                  <p className="mt-2 text-xs font-semibold text-emerald-700">ANZEN AIで</p>
                  <p className="text-sm text-slate-700">{useCase.solution}</p>
                  <div className="mt-auto pt-3">
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">関連機能</p>
                    <div className="flex flex-wrap gap-1.5">
                      {useCase.relatedFeatures.map((rf) => (
                        <Link
                          key={rf.href}
                          href={rf.href}
                          className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
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
          上記以外の業種・特殊作業についても、安全コンサルタントが個別にご相談に応じます。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            業種別の相談を送る →
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            機能一覧に戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
