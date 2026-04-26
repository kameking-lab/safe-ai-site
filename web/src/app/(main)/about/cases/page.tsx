import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HardHat, AlertTriangle, CheckCircle2, Calendar, MapPin, User } from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";

export const metadata: Metadata = {
  title: "監修者の施工安全事例 | ANZEN AI",
  description:
    "労働安全コンサルタント（登録番号260022・土木区分）が実際に携わった5つの施工安全事例を匿名化して紹介。下水道シールド工事・鉄道近接工事・超高層再開発・首都圏高速リニューアル・地下鉄駅舎改良における安全管理の実践内容を掲載。",
  keywords: [
    "労働安全コンサルタント",
    "施工安全事例",
    "建設安全",
    "現場安全管理",
    "シールド工事",
    "鉄道近接工事",
    "高速道路工事",
  ],
  openGraph: {
    title: "監修者の施工安全事例 | ANZEN AI",
    description:
      "労働安全コンサルタント（登録番号260022）が携わった5事例。シールド・鉄道近接・超高層・高速・地下鉄工事における安全管理の実践内容。",
  },
};

type Case = {
  id: number;
  title: string;
  subtitle: string;
  period: string;
  location: string;
  role: string;
  scale: string;
  challenges: string[];
  measures: { title: string; detail: string }[];
  outcomes: string[];
  accent: "sky" | "amber" | "emerald" | "violet" | "rose";
};

const CASES: Case[] = [
  {
    id: 1,
    title: "下水道シールド工事",
    subtitle: "大深度地下における有害ガス・建機災害対策",
    period: "2018年〜2020年（約2年）",
    location: "東京都内（下水道幹線延伸工事、掘進延長 約800 m）",
    role: "現場監督・安全管理担当",
    scale: "最大作業員数 約80名／日、使用建機 シールドマシン・クレーン・搬送台車等",
    challenges: [
      "大深度地下（地表から深度 約30 m）による酸素欠乏・硫化水素発生リスク",
      "坑内での建機・人員の近接作業による挟まれ・巻き込まれリスク",
      "地表開口部を経由した第三者（歩行者・車両）への危険",
      "高湿・高温環境下での熱中症リスクと作業員の疲労蓄積",
    ],
    measures: [
      {
        title: "酸素濃度の連続監視体制構築",
        detail:
          "坑内複数箇所に連続ガス検知器を設置し、酸素濃度・硫化水素濃度をリアルタイムで地表監視盤に表示。閾値超過時の警報→退避手順をチェックシート化し、全作業員へ繰り返し周知した。",
      },
      {
        title: "建機オペレーターと監視員の信号統一",
        detail:
          "シールド工事特有の坑内狭小空間での建機誘導に際し、音声・手信号・発光合図を組み合わせた三重確認方式を標準化。月1回の坑内合同訓練で定着を確認した。",
      },
      {
        title: "第三者災害防止のための歩行者導線分離",
        detail:
          "立坑周辺に防護柵と誘導員を常時配置。クレーン揚重時間帯は歩道の一時迂回路を設け、資材搬入車両と歩行者が交差しない導線を設計した。",
      },
      {
        title: "熱中症予防プログラムの整備",
        detail:
          "坑内温度・湿度の時間帯別計測に基づき、連続作業時間の上限（45分以内）と冷却休憩の義務化を規程化。経口補水液の常備と体調確認シートを朝礼で運用した。",
      },
    ],
    outcomes: [
      "酸素欠乏・硫化水素の閾値超過を工期中に3回早期検知し、退避→換気対応を完了（いずれも無被災）",
      "工期全体（約2年）を無災害で完工",
      "竣工後、安全施工優良現場として表彰",
    ],
    accent: "sky",
  },
  {
    id: 2,
    title: "鉄道近接橋梁架替工事",
    subtitle: "列車近接リスクと夜間作業の安全管理",
    period: "2015年〜2017年（約2年）",
    location: "首都圏在来線近接（橋梁延長 約120 m、列車最近接距離 約3 m）",
    role: "安全管理担当",
    scale: "夜間作業員 最大50名、重機 クレーン2基・バックホウ1基、き電停止時間 3時間／夜",
    challenges: [
      "営業線（列車）と作業空間が数メートルしか離れていない中での架設作業",
      "き電（架線への送電）停止・接地の確認不足による感電リスク",
      "夜間作業による作業員の疲労・視認性低下",
      "重機揚重時の資材落下による線路支障リスク",
    ],
    measures: [
      {
        title: "列車見張り員配置基準の策定",
        detail:
          "最終列車通過後から始発までの間、き電停止証明書の確認→接地器取り付け→作業開始の三段手順を手順書化。列車見張り員は有資格者（鉄道会社が認定）を常時2名配置し、作業開始・中断・終了の指示権を明確化した。",
      },
      {
        title: "き電停止・接地確認手順の標準化",
        detail:
          "き電停止後、接地器取り付けを2名確認のダブルチェック方式で実施。確認記録を紙と無線で二重記録し、始発前の回収確認も同様の手順で管理した。",
      },
      {
        title: "夜間作業の照度管理と疲労対策",
        detail:
          "作業エリアの照度基準（300 lx以上）を独自設定し、照度計による実測チェックを作業前に義務化。夜間作業は連続3時間を上限とし、作業終了後の体調確認を組み込んだ。",
      },
      {
        title: "資材落下防止ネットの設置と揚重手順の整備",
        detail:
          "クレーン揚重時は線路上方に一時養生ネットを展張し、落下物が線路に達しない構造を確保。揚重前の玉掛け確認と監視員配置を手順書に明記した。",
      },
    ],
    outcomes: [
      "工事期間中、列車への支障・接触ゼロ",
      "き電停止・接地関連の手順違反ゼロ（内部安全パトロールで確認）",
      "約2年間の夜間作業を無災害で完工",
    ],
    accent: "amber",
  },
  {
    id: 3,
    title: "都心超高層複合ビル再開発工事",
    subtitle: "多工種・多業種・外国人混在現場の安全統括",
    period: "2016年〜2021年（約5年）",
    location: "東京都心部（延べ床面積 約10万㎡、地上40階・地下4階）",
    role: "安全管理担当（最繁忙期の管理対象 協力会社 約60社、延べ作業者数 約30万人工）",
    scale:
      "ピーク時 最大1,500名／日、タワークレーン6基同時稼働、外国人労働者比率 約20〜30%（中国・ベトナム・フィリピン等）",
    challenges: [
      "多工種（鉄骨・型枠・設備・仕上げ等）の作業エリア錯綜による建機・人員の接触リスク",
      "言語・文化的背景の異なる外国人労働者への安全教育の伝達精度",
      "高所作業（最大 約160 m）における墜落・飛来落下リスク",
      "タワークレーン複数同時稼働時の揚重干渉リスク",
    ],
    measures: [
      {
        title: "作業エリア別立入制限とQRコード入退場管理",
        detail:
          "各フロア・エリアごとに作業許可区分を色分けしたバリケードで区画。入退場にQRコードリーダーを用い、未教育者・未許可者の立入を物理的に制限する仕組みを構築した。",
      },
      {
        title: "多言語朝礼資料・映像マニュアルの整備",
        detail:
          "日本語・英語・中国語・ベトナム語・タガログ語の5言語対応の朝礼資料を作成。建機合図・緊急退避・救急連絡先を写真・イラスト主体の映像マニュアルにまとめ、スマートフォンで閲覧可能にした。",
      },
      {
        title: "タワークレーン稼働調整の一元化",
        detail:
          "6基のタワークレーンの稼働計画を日次で統括管理者が一元調整し、揚重干渉リスクゾーンを可視化した「クレーン稼働マップ」を全オペレーターが共有する運用を確立した。",
      },
      {
        title: "外国人労働者向け安全衛生教育の体系化",
        detail:
          "雇い入れ時教育に加え、月1回の多言語安全大会を実施。通訳付き危険体感訓練（VR・実物模型）を導入し、言語に依存しない体感的理解を促した。",
      },
    ],
    outcomes: [
      "5年間・延べ30万人工の施工において重大災害（休業4日以上）ゼロ",
      "外国人労働者起因のヒヤリハット報告件数が取り組み開始1年で約40%減少",
      "工事完了後、発注者・元請から安全管理優秀現場として表彰",
    ],
    accent: "emerald",
  },
  {
    id: 4,
    title: "首都圏高速道路床版取替工事",
    subtitle: "夜間規制内作業と飛来落下・疲労リスクの管理",
    period: "2019年〜2022年（約3年）",
    location: "首都圏高速道路（施工延長 約2.5 km、夜間全面規制による施工）",
    role: "安全・工程管理担当",
    scale: "夜間作業員 最大120名、重機 クレーン4基・床版撤去機2基、夜間規制時間 22:00〜翌6:00",
    challenges: [
      "夜間作業による作業員の疲労・集中力低下と交通規制解除前のヒューマンエラーリスク",
      "解体時の床版コンクリート片・溶接スパッタ等の一般道・高架下への飛散リスク",
      "重機・材料搬入車両と作業員の錯綜による挟まれ・轢過リスク",
      "天候（強風・降雨）変化への迅速な対応と規制延長時の交通調整",
    ],
    measures: [
      {
        title: "夜間作業前の体調確認チェックシート導入",
        detail:
          "入場時に睡眠時間・飲酒・服薬・体温の4項目を自己申告し、監督者が目視確認するチェックシートを義務化。基準に満たない場合は作業配置から外し、軽作業または帰宅の判断を行った。",
      },
      {
        title: "飛散物防止ネット・防護シートの設置基準策定",
        detail:
          "高架下の道路・歩道・民家の状況に応じた飛散物防護シートの設置基準を独自に策定。施工前に防護状態を写真記録し、作業中は飛散監視員を配置した。",
      },
      {
        title: "規制解除前の工具・材料残置確認チェックリスト",
        detail:
          "規制解除30分前から、工区を区分してチーフが資材・工具・養生材の確認を分担する「解除前確認リスト」を導入。チェック漏れの多かった箇所（排水溝内・橋梁端部）を重点確認項目に追加した。",
      },
      {
        title: "強風・降雨時の作業中断基準の明文化",
        detail:
          "風速 10 m/s以上でクレーン作業中断、20 m/s以上で全作業中断の基準を手順書に明記。気象警報の確認担当を夜間作業ごとに固定し、早期判断できる体制を整えた。",
      },
    ],
    outcomes: [
      "3年間・夜間規制 約500夜の施工を無災害で完工",
      "飛来落下による第三者被害ゼロ・道路への工具残置ゼロ",
      "体調不良による入場拒否制度が作業員の自己申告文化の定着につながり、ヒヤリハット報告件数が増加（安全文化向上の指標として評価）",
    ],
    accent: "violet",
  },
  {
    id: 5,
    title: "地下鉄駅舎改良工事",
    subtitle: "旅客営業中施工における第三者安全と感電・転落対策",
    period: "2021年〜2023年（約2年）",
    location: "首都圏地下鉄（改札コンコース・ホーム改良、営業線（第三軌条方式）隣接施工）",
    role: "安全管理担当",
    scale:
      "作業員 最大60名（終電後〜始発前の夜間施工）、一日あたり旅客通行者数 約8万人の駅での施工",
    challenges: [
      "旅客動線と作業エリアが数メートルの距離で並存する中での施工（第三者災害リスク）",
      "第三軌条（直流 750 V）への感電リスク（線路内立入時）",
      "改良工事に伴う粉塵・騒音の旅客への影響",
      "ホーム縁端・吹き抜け部での作業員の墜落・転落リスク",
    ],
    measures: [
      {
        title: "旅客・作業エリア仕切りの二重化",
        detail:
          "営業時間中は防護壁（パネル式）＋視認性の高い蛍光オレンジのフェンスで二重に仕切り、旅客が誤って作業エリアに入れない構造を確保。仮囲いの出入口は南京錠管理とし、旅客時間帯は施錠を徹底した。",
      },
      {
        title: "第三軌条感電防止の活線接近警報器導入",
        detail:
          "鉄道事業者との協議の上、線路内作業時は活線接近警報器（腕時計型）を全員装着することを協定書に明記。送電停止証明書の受領→接地器取り付け→入線許可のフローを三者（元請・鉄道会社・協力会社）で確認する手順を標準化した。",
      },
      {
        title: "粉塵抑制の集じん機一体型仮囲い設置",
        detail:
          "コンクリート斫り・研削作業は集じん機一体型の養生カバーで密閉し、微細粉塵が旅客動線に漏れない構造を採用。粉塵濃度計を旅客側に設置し、基準値（管理濃度）を超えた場合は作業を中断する規程を設けた。",
      },
      {
        title: "ホーム縁端・吹き抜け部の墜落防止強化",
        detail:
          "ホーム縁端 2 m以内での作業は安全帯の二丁掛けを義務化し、親綱設備を作業エリアごとに設置。吹き抜け部には足場板＋ネットの二重防護を施し、工事写真で安全措置を毎日記録した。",
      },
    ],
    outcomes: [
      "2年間の施工期間中、旅客への被害ゼロ・粉塵・騒音に関するクレームゼロ",
      "作業員の転落・感電ゼロ、無災害で竣工",
      "鉄道事業者から安全管理優秀工事として評価を受け、後続工事の継続受注につながった",
    ],
    accent: "rose",
  },
];

const ACCENT_STYLES = {
  sky: {
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    header: "border-sky-300 bg-sky-50",
    icon: "text-sky-600",
    challenge: "bg-sky-50 border-sky-200",
    outcome: "text-sky-700",
  },
  amber: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    header: "border-amber-300 bg-amber-50",
    icon: "text-amber-600",
    challenge: "bg-amber-50 border-amber-200",
    outcome: "text-amber-700",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    header: "border-emerald-300 bg-emerald-50",
    icon: "text-emerald-600",
    challenge: "bg-emerald-50 border-emerald-200",
    outcome: "text-emerald-700",
  },
  violet: {
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    header: "border-violet-300 bg-violet-50",
    icon: "text-violet-600",
    challenge: "bg-violet-50 border-violet-200",
    outcome: "text-violet-700",
  },
  rose: {
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    header: "border-rose-300 bg-rose-50",
    icon: "text-rose-600",
    challenge: "bg-rose-50 border-rose-200",
    outcome: "text-rose-700",
  },
} as const;

export default function CasesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/about"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          運営者情報へ戻る
        </Link>
      </div>

      <TranslatedPageHeader
        titleJa="監修者の施工安全事例"
        titleEn="Case Studies"
        descriptionJa="労働安全コンサルタント（登録番号260022）が実際に携わった施工安全管理の事例（匿名化）"
        descriptionEn="Anonymized case studies from the supervisor's field experience"
        iconName="ClipboardList"
        iconColor="amber"
      />

      <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        以下の事例はすべて監修者の実体験をもとに匿名化・抽象化したものです。
        発注者名・工事名・個人情報は記載していません。
        工事規模・対策内容・成果は実際の数値・方法に基づいています。
      </p>

      <div className="mt-6 space-y-8">
        {CASES.map((c) => {
          const s = ACCENT_STYLES[c.accent];
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* ヘッダー */}
              <div className={`border-b px-5 py-4 ${s.header}`}>
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border bg-white text-sm font-bold ${s.badge}`}
                  >
                    {c.id}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">
                      {c.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600">{c.subtitle}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className={`h-3.5 w-3.5 flex-shrink-0 ${s.icon}`} />
                    {c.period}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${s.icon}`} />
                    {c.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className={`h-3.5 w-3.5 flex-shrink-0 ${s.icon}`} />
                    {c.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <HardHat className={`h-3.5 w-3.5 flex-shrink-0 ${s.icon}`} />
                    {c.scale}
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* 直面した課題 */}
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    直面した課題
                  </h3>
                  <ul className={`rounded-lg border px-4 py-3 space-y-1.5 text-xs leading-5 text-slate-700 ${s.challenge}`}>
                    {c.challenges.map((ch, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-0.5 flex-shrink-0 text-orange-500">▸</span>
                        {ch}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 実施した対策 */}
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <HardHat className={`h-3.5 w-3.5 ${s.icon}`} />
                    実施した対策
                  </h3>
                  <div className="space-y-2.5">
                    {c.measures.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-xs font-semibold text-slate-800">
                          {i + 1}. {m.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {m.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 成果 */}
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${s.icon}`} />
                    成果・防止できた災害
                  </h3>
                  <ul className="space-y-1.5">
                    {c.outcomes.map((o, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 font-medium ${s.outcome}`}
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* フッター注記 */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-xs leading-6 text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">事例について</p>
        <p>
          本ページの事例は、監修者（労働安全コンサルタント 登録番号260022）の実務経験に基づき、
          発注者・工事名・個人情報を除外した上で記載しています。
          掲載内容は一般的な安全管理の参考情報であり、特定の企業・プロジェクトへの言及を意図するものではありません。
        </p>
        <p className="mt-2">
          コンサルティングのご相談は
          <Link href="/contact" className="mx-1 underline hover:text-slate-900">
            お問い合わせフォーム
          </Link>
          よりご連絡ください。
        </p>
      </div>
    </main>
  );
}
