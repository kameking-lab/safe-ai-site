"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HardHat,
  ShieldCheck,
  Eye,
  Shirt,
  Baby,
  Heart,
  DoorOpen,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";

// ── PPEデータ ──────────────────────────────────────────────────
const PPE_ITEMS = [
  {
    id: "helmet",
    icon: HardHat,
    title: "保護帽（ヘルメット）",
    color: "blue",
    sizes: ["48〜52cm（XS）", "52〜56cm（S）", "56〜60cm（M）", "60〜64cm（L）"],
    points: [
      "女性向けモデルは帽体が小型で軽量（400g以下）設計が多い",
      "インナーパッド交換可能なモデルで衛生管理しやすい",
      "ロングヘア対応：後部にポニーテール穴・収納スペース付きも",
      "JIS T 8131適合品を必ず選定",
    ],
    searchQuery: "女性用 保護帽 ヘルメット 軽量",
  },
  {
    id: "boots",
    icon: ShieldCheck,
    title: "安全靴・安全スニーカー",
    color: "emerald",
    sizes: ["22.0〜22.5cm", "23.0〜23.5cm", "24.0〜24.5cm", "25.0〜25.5cm"],
    points: [
      "女性用は踵幅・甲高が細め設計で長時間着用でも疲れにくい",
      "JIS T 8101（普通作業用〜重作業用）適合品で規格確認",
      "スニーカータイプで歩きやすく普及率が上がる",
      "静電気帯電防止タイプは電子部品・化学工場に必須",
    ],
    searchQuery: "女性用 安全靴 安全スニーカー",
  },
  {
    id: "glasses",
    icon: Eye,
    title: "保護メガネ",
    color: "violet",
    sizes: ["フリーサイズ（テンプル長調整式）", "小顔対応（フェイスサイズ50〜54mm）"],
    points: [
      "小顔対応フレームで隙間なくフィットし飛散物・液体スプラッシュを防ぐ",
      "JIS T 8147 / EN166適合品を確認",
      "普通メガネの上から装着できるオーバーグラスタイプも選択肢に",
      "長時間作業向け：軽量（20g以下）・くもり止めコート付きが快適",
    ],
    searchQuery: "女性用 保護メガネ 小顔 安全ゴーグル",
  },
  {
    id: "workwear",
    icon: Shirt,
    title: "作業着・保護服",
    color: "rose",
    sizes: ["SS（5号）", "S（7号）", "M（9号）", "L（11号）", "XL（13号）", "2XL（15号）"],
    points: [
      "女性向けは腰回り・バスト周りに余裕をもたせたパターン設計",
      "ストレッチ素材で屈伸・しゃがみ作業に対応",
      "熱中症対策：接触冷感・吸汗速乾素材が推奨される",
      "防炎作業服・化学防護服にも女性用サイズ展開あり（JIS T 8118等）",
    ],
    searchQuery: "女性用 作業着 レディース 作業服",
  },
];

// ── 法令データ ─────────────────────────────────────────────────
const LAW_SECTIONS = [
  {
    id: "restriction",
    icon: Baby,
    title: "妊娠中・産後の就業制限",
    color: "amber",
    items: [
      {
        law: "労基法 第64条の2",
        summary: "妊娠中・産後1年未満の女性は、重量物取扱い・有害業務に就かせてはならない（坑内労働も禁止）",
        detail: "重量物の制限：妊婦は継続作業8kg以上・断続12kg以上を禁止。産後1年未満は6kg・10kg。",
      },
      {
        law: "労基法 第65条第1項・2項",
        summary: "産前6週間（多胎14週）・産後8週間は休業させなければならない（産後6週は本人申請でも就業可能）",
        detail: "出産予定日前6週間は請求があれば必ず休業。産後6〜8週は医師が認めた軽易業務に限り就業可。",
      },
      {
        law: "労基法 第65条第3項",
        summary: "妊娠中の軽易業務転換を申請できる。事業主は可能な範囲で対応義務あり",
        detail: "高所・重作業・長時間立ち仕事から軽易業務への転換を本人が申請した場合、事業主は努力義務。",
      },
      {
        law: "安衛則 第36条",
        summary: "妊娠中は一定の有害業務（鉛・有機溶剤・放射線等）への従事が禁止される",
        detail: "鉛・有機溶剤・特定化学物質・電離放射線業務等は妊産婦就業禁止業務として規定。",
      },
    ],
  },
  {
    id: "nursing",
    icon: Heart,
    title: "授乳時間・育児時間",
    color: "pink",
    items: [
      {
        law: "労基法 第67条",
        summary: "生後1年未満の子を持つ女性は、1日2回・各30分以上の育児時間を請求できる",
        detail: "育児時間中は就業させてはならない。2回をまとめて1時間取得も可。使用者は賃金支払い義務なし（有給化は任意）。",
      },
      {
        law: "育介法 第23条",
        summary: "3歳未満の子を持つ労働者には短時間勤務（6時間/日）措置を講じる義務あり",
        detail: "事業主は原則として所定労働時間を1日6時間とする措置を提供しなければならない。",
      },
    ],
  },
  {
    id: "menstrual",
    icon: Heart,
    title: "月経困難症・生理休暇",
    color: "rose",
    items: [
      {
        law: "労基法 第68条",
        summary: "生理日の就業が著しく困難な女性から請求があった場合、就業させてはならない（生理休暇）",
        detail: "日数・有給/無給の別は法律に規定なし。無給でも可。請求があれば拒否できない。",
      },
      {
        law: "実務対応",
        summary: "月経困難症（子宮内膜症等）は産業医・産業保健スタッフへの相談を推奨。作業負荷軽減の配慮が望ましい",
        detail: "重量物搬送・長時間立位・高温多湿作業は症状を悪化させる場合がある。軽易業務への一時的配置換えを検討。",
      },
    ],
  },
  {
    id: "facilities",
    icon: DoorOpen,
    title: "女性トイレ・更衣室の法定要件",
    color: "teal",
    items: [
      {
        law: "安衛則 第618条",
        summary: "女性専用の便所を男性用とは区別して設けなければならない（常時10人以上の女性を使用する場合）",
        detail: "独立した場所に設置し、ドア・鍵付きの個室が原則。建設現場等の仮設トイレも同様。",
      },
      {
        law: "安衛則 第629条",
        summary: "更衣設備は男女別に設けなければならない",
        detail: "常時50人以上または常時女性30人以上の事業場では、女性専用の更衣室設置が義務。施錠できる個人ロッカーが望ましい。",
      },
      {
        law: "安衛則 第631条の2",
        summary: "休憩室は男女別の専用室、または男女が同時に使用しない措置を取ること",
        detail: "仮眠室も含む。カーテン等での簡易区切りは「措置あり」とはみなされない場合あり。",
      },
    ],
  },
];

// ── 色マップ ──────────────────────────────────────────────────
type ColorKey = "blue" | "emerald" | "violet" | "rose" | "amber" | "pink" | "teal";
const COLOR_MAP: Record<ColorKey, { icon: string; badge: string; border: string; bg: string }> = {
  blue: { icon: "text-blue-600", badge: "bg-blue-100 text-blue-700", border: "border-blue-200", bg: "bg-blue-50" },
  emerald: { icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50" },
  violet: { icon: "text-violet-600", badge: "bg-violet-100 text-violet-700", border: "border-violet-200", bg: "bg-violet-50" },
  rose: { icon: "text-rose-600", badge: "bg-rose-100 text-rose-700", border: "border-rose-200", bg: "bg-rose-50" },
  amber: { icon: "text-amber-600", badge: "bg-amber-100 text-amber-700", border: "border-amber-200", bg: "bg-amber-50" },
  pink: { icon: "text-pink-600", badge: "bg-pink-100 text-pink-700", border: "border-pink-200", bg: "bg-pink-50" },
  teal: { icon: "text-teal-600", badge: "bg-teal-100 text-teal-700", border: "border-teal-200", bg: "bg-teal-50" },
};

export default function WomenPage() {
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null);

  const toggleLaw = (id: string) => setExpandedLaw((prev) => (prev === id ? null : id));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* 戻る */}
      <Link
        href="/diversity"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        多様性と安全に戻る
      </Link>

      {/* ヘッダー */}
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">女性労働者</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          女性向け PPE・妊産婦就業ガイド
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          女性用サイズ展開のある保護具の選び方と、妊娠・産後・育児期の就業制限・配慮事項を
          労働基準法・安衛則の根拠条文付きで解説します。
        </p>
      </header>

      {/* PPEセクション */}
      <section className="mb-8" aria-labelledby="ppe-section">
        <h2 id="ppe-section" className="mb-4 text-lg font-bold text-slate-900">
          女性向け保護具（PPE）紹介
        </h2>
        <div className="space-y-4">
          {PPE_ITEMS.map((item) => {
            const Icon = item.icon;
            const c = COLOR_MAP[item.color as ColorKey];
            return (
              <div
                key={item.id}
                className={`rounded-2xl border ${c.border} ${c.bg} p-4 shadow-sm`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${c.icon}`} />
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                </div>

                {/* サイズ展開 */}
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600">主なサイズ展開</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.sizes.map((s) => (
                      <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.badge}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 選び方ポイント */}
                <ul className="mb-4 space-y-1">
                  {item.points.map((p) => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${c.icon.replace("text-", "bg-")}`} />
                      {p}
                    </li>
                  ))}
                </ul>

                {/* アフィリエイトリンク */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={amazonSearchUrl(item.searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Amazonで探す
                  </a>
                  <a
                    href={rakutenSearchUrl(item.searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-lg bg-rose-500 py-2 text-xs font-bold text-white hover:bg-rose-600"
                  >
                    <ExternalLink className="h-3 w-3" />
                    楽天で探す
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 法令セクション */}
      <section className="mb-8" aria-labelledby="law-section">
        <h2 id="law-section" className="mb-4 text-lg font-bold text-slate-900">
          妊産婦・育児期の就業ルール（法令根拠付き）
        </h2>
        <div className="space-y-4">
          {LAW_SECTIONS.map((section) => {
            const Icon = section.icon;
            const c = COLOR_MAP[section.color as ColorKey];
            return (
              <div key={section.id} className={`rounded-2xl border ${c.border} bg-white shadow-sm`}>
                <div className={`rounded-t-2xl ${c.bg} px-4 py-3`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${c.icon}`} />
                    <h3 className="font-bold text-slate-900">{section.title}</h3>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {section.items.map((item) => {
                    const key = `${section.id}-${item.law}`;
                    const open = expandedLaw === key;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleLaw(key)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                          aria-expanded={open}
                        >
                          <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.badge}`}>
                            {item.law}
                          </span>
                          <span className="flex-1 text-sm text-slate-800">{item.summary}</span>
                          {open ? (
                            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>
                        {open && (
                          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
                            {item.detail}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 相談窓口・参考リンク */}
      <section className="mb-8" aria-labelledby="refs-section">
        <h2 id="refs-section" className="mb-3 text-base font-bold text-slate-900">
          公的機関・相談窓口
        </h2>
        <ul className="space-y-2">
          {[
            {
              label: "女性の健康支援センター（厚労省）",
              href: "https://www.mhlw.go.jp/bunya/koyoukintou/josei-jitu/",
              desc: "妊娠・出産・更年期の就業支援情報",
            },
            {
              label: "都道府県労働局 雇用環境・均等部",
              href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/0000147321.html",
              desc: "マタニティハラスメント・育児休業に関する相談",
            },
            {
              label: "e-Gov 労働基準法（第64条の2〜第68条）",
              href: "https://laws.e-gov.go.jp/law/322AC0000000049#Mp-At_64_2",
              desc: "妊産婦の就業制限条文原文",
            },
          ].map((ref) => (
            <li key={ref.href}>
              <a
                href={ref.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm hover:bg-slate-100"
              >
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  {ref.label}
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{ref.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* 関連ページ */}
      <nav aria-label="関連ページ" className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold text-slate-500">関連ページ</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "安全グッズ（女性向け）", href: "/goods?filter=women" },
            { label: "多様性と安全", href: "/diversity" },
            { label: "Eラーニング", href: "/e-learning" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
