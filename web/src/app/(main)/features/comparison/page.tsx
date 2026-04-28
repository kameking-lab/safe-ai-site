import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "他の方法との比較 | 機能紹介 | ANZEN AI",
  description:
    "ANZEN AIと従来の安全管理ソフト・紙ベース運用を、機能・コスト・運用負荷で比較します。事実ベースで公平に整理しています。",
};

type Method = "anzen" | "legacy" | "paper";

type Row = {
  category: string;
  item: string;
  values: Record<Method, string>;
  note?: string;
};

const COMPARISON_ROWS: Row[] = [
  {
    category: "導入",
    item: "初期導入コスト",
    values: {
      anzen: "クラウド型のため低コスト",
      legacy: "サーバ・ライセンス費用がかかる",
      paper: "用紙・ファイル等の物品費のみ",
    },
  },
  {
    category: "導入",
    item: "セットアップ期間",
    values: {
      anzen: "アカウント発行で即日利用可",
      legacy: "数週間〜数ヶ月",
      paper: "即日（運用ルール整備が必要）",
    },
  },
  {
    category: "導入",
    item: "ハードウェア要件",
    values: {
      anzen: "スマホ・PC・モニターのみ",
      legacy: "専用サーバ／PCが必要な場合あり",
      paper: "プリンタ・キャビネット・ファイル",
    },
  },
  {
    category: "機能",
    item: "AIアシスタント",
    values: {
      anzen: "○ 安衛法・通達を学習したAI",
      legacy: "△ 製品により搭載／非搭載",
      paper: "× 人手のみ",
    },
  },
  {
    category: "機能",
    item: "化学物質RA（改正安衛法対応）",
    values: {
      anzen: "○ SDS取込〜記録保管まで一貫",
      legacy: "△ 専用製品があれば対応",
      paper: "△ Excel + 手作業",
    },
  },
  {
    category: "機能",
    item: "事故事例DB（厚労省データ）",
    values: {
      anzen: "○ 検索・横断分析",
      legacy: "△ 製品により付属",
      paper: "× 都度収集",
    },
  },
  {
    category: "機能",
    item: "Eラーニング・特別教育",
    values: {
      anzen: "○ 業種別カリキュラム + 修了証",
      legacy: "別途LMS製品が必要",
      paper: "集合研修・テキスト配布",
    },
  },
  {
    category: "現場運用",
    item: "KY記録",
    values: {
      anzen: "スマホで音声入力 + 署名 + PDF",
      legacy: "PC入力中心、現場往復が発生",
      paper: "手書き・押印・ファイリング",
    },
  },
  {
    category: "現場運用",
    item: "サイネージ表示",
    values: {
      anzen: "○ 自動巡回・気象連動",
      legacy: "△ 別ツールで連携",
      paper: "ホワイトボード・掲示物",
    },
  },
  {
    category: "現場運用",
    item: "多拠点・多店舗管理",
    values: {
      anzen: "LMSで一元管理",
      legacy: "拠点別ライセンス管理が必要",
      paper: "拠点ごとに独立、本部での集計が困難",
    },
  },
  {
    category: "コンプライアンス",
    item: "法改正への追従",
    values: {
      anzen: "通達・改正を即時反映",
      legacy: "バージョンアップ待ち",
      paper: "担当者による情報収集次第",
    },
  },
  {
    category: "コンプライアンス",
    item: "監査・労基対応の記録性",
    values: {
      anzen: "ログ・PDF出力で証跡化",
      legacy: "○ 製品仕様による",
      paper: "原本保管、検索性が低い",
    },
  },
  {
    category: "コスト",
    item: "ランニングコスト",
    values: {
      anzen: "サブスク（事業所規模で従量／定額）",
      legacy: "保守料 + バージョンアップ費",
      paper: "用紙・印刷・保管スペース",
    },
  },
  {
    category: "コスト",
    item: "運用工数",
    values: {
      anzen: "デジタル完結で工数削減",
      legacy: "システム管理者が必要",
      paper: "記録・保管・集計に常時工数",
    },
  },
  {
    category: "サポート",
    item: "コンサル相談",
    values: {
      anzen: "労働安全コンサルタントが直接対応",
      legacy: "別途コンサル契約が必要",
      paper: "顧問契約・スポット相談を別途",
    },
  },
];

const METHOD_META: Record<Method, { label: string; sub: string; accent: string }> = {
  anzen: {
    label: "ANZEN AI",
    sub: "クラウド型・AI搭載",
    accent: "from-emerald-500 to-emerald-700",
  },
  legacy: {
    label: "従来の安全管理ソフト",
    sub: "オンプレ／パッケージ型",
    accent: "from-slate-500 to-slate-700",
  },
  paper: {
    label: "紙ベース運用",
    sub: "Excel・紙書類・ファイリング",
    accent: "from-amber-500 to-amber-700",
  },
};

export default function ComparisonPage() {
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
          <li className="font-semibold text-slate-700">他の方法との比較</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mx-auto mt-4 max-w-4xl text-center">
        <p className="text-xs font-bold tracking-widest text-emerald-700">COMPARISON</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
          他の方法との比較
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          ANZEN AIと従来の安全管理ソフト・紙ベース運用を、機能とコストの観点で並べました。
          特定製品名は出さず、事実ベースで整理しています。検討材料としてお使いください。
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-slate-500">
          ※ 各製品・運用形態にメリット・デメリットがあり、業種規模や既存資産により最適解は異なります。本ページは一般的な傾向を示すものです。
        </p>
      </header>

      {/* 列ヘッダ */}
      <section className="mx-auto mt-8 max-w-6xl">
        <div className="hidden grid-cols-4 gap-2 md:grid">
          <div />
          {(Object.keys(METHOD_META) as Method[]).map((m) => (
            <div
              key={m}
              className={`rounded-xl bg-gradient-to-br ${METHOD_META[m].accent} p-4 text-white shadow-sm`}
            >
              <p className="text-xs font-semibold opacity-90">{METHOD_META[m].sub}</p>
              <p className="text-lg font-bold">{METHOD_META[m].label}</p>
            </div>
          ))}
        </div>

        {/* 比較表 (PC) */}
        <div className="mt-3 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-slate-500">
                  項目
                </th>
                {(Object.keys(METHOD_META) as Method[]).map((m) => (
                  <th key={m} className="border-b border-slate-200 px-4 py-2 text-left text-xs font-bold text-slate-500">
                    {METHOD_META[m].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => {
                const prevCategory = idx > 0 ? COMPARISON_ROWS[idx - 1].category : null;
                const showCategory = prevCategory !== row.category;
                return (
                  <tr key={`${row.category}-${row.item}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="border-b border-slate-100 px-4 py-3 align-top">
                      {showCategory && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                          {row.category}
                        </p>
                      )}
                      <p className="font-semibold text-slate-800">{row.item}</p>
                    </td>
                    {(Object.keys(METHOD_META) as Method[]).map((m) => (
                      <td key={m} className="border-b border-slate-100 px-4 py-3 align-top text-slate-700">
                        {row.values[m]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 比較カード (モバイル) */}
        <div className="space-y-4 md:hidden">
          {COMPARISON_ROWS.map((row) => (
            <div key={`${row.category}-${row.item}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                {row.category}
              </p>
              <p className="mt-0.5 text-base font-bold text-slate-900">{row.item}</p>
              <div className="mt-2 space-y-2 text-sm">
                {(Object.keys(METHOD_META) as Method[]).map((m) => (
                  <div key={m} className="rounded border border-slate-100 bg-slate-50 p-2">
                    <p className="text-[11px] font-bold text-slate-500">{METHOD_META[m].label}</p>
                    <p className="text-slate-800">{row.values[m]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 結論 */}
      <section className="mx-auto mt-10 max-w-5xl">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">どれを選べばよいか</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">ANZEN AIが向く場合</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
              <li>多拠点・多店舗で安全管理を一元化したい</li>
              <li>改正安衛法対応の化学物質RAが必要</li>
              <li>現場でスマホ完結のKYを回したい</li>
              <li>労働安全コンサルタント監修のツールが欲しい</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-800">従来ソフトが向く場合</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>既に大規模な基幹システム連携が前提</li>
              <li>オンプレでデータを持つ要件がある</li>
              <li>長期保守契約済みで切替コストが高い</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">紙ベースが向く場合</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
              <li>従業員数が少なく機材を増やせない</li>
              <li>法令上の最低限の記録だけで十分</li>
              <li>デジタル投資の意思決定が難しい</li>
            </ul>
            <p className="mt-2 text-[11px] text-amber-700">
              ※ いずれは少しずつデジタル化する前提が望ましい。
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-10 max-w-5xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">迷われている方へ</h2>
        <p className="mt-2 text-sm text-emerald-800">
          現状の運用と既存システムを伺った上で、コストと効果の試算をお出しします。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            無料相談を申し込む →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            料金プランを見る
          </Link>
        </div>
      </section>
    </div>
  );
}
