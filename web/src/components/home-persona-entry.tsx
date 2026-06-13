import Link from "next/link";
import { HardHat, UserRound, Building2, Scale, ArrowRight } from "lucide-react";

/**
 * トップページのペルソナ選択バンド。
 * 初見の訪問者が「自分の立場」から1タップで実務エントリ (/for/*) に入れるようにする。
 * 各カードは中身の伴う専用ランディングへ誘導する（thin template ではない）。
 */
type Persona = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  tags: string[];
  /** Tailwind の色トークン (border/bg/text 用) */
  ring: string;
  iconBg: string;
};

const PERSONAS: Persona[] = [
  {
    href: "/for/construction",
    icon: HardHat,
    label: "建設業の現場",
    desc: "職長・元請担当・現場代理人。足場・墜落・KY・統括管理を当日から。",
    tags: ["KY用紙", "朝礼サイネージ", "統括管理"],
    ring: "border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50",
    iconBg: "bg-emerald-600",
  },
  {
    href: "/for/solo",
    icon: UserRound,
    label: "一人親方",
    desc: "個人事業主。特別加入・一人KY・必要な資格・熱中症を自分で回す。",
    tags: ["特別加入", "一人KY", "資格判定"],
    ring: "border-orange-300 hover:border-orange-500 hover:bg-orange-50",
    iconBg: "bg-orange-600",
  },
  {
    href: "/for/manager",
    icon: Building2,
    label: "企業の安全衛生担当者",
    desc: "総務・人事。体制づくり・委員会・ストレスチェック・年次計画まで。",
    tags: ["規模別義務", "年次計画", "委員会"],
    ring: "border-sky-300 hover:border-sky-500 hover:bg-sky-50",
    iconBg: "bg-sky-600",
  },
  {
    href: "/for/consultant",
    icon: Scale,
    label: "専門家・コンサル",
    desc: "コンサル・社労士・診断士。法令リサーチ・事故分析・顧問先支援を1画面で。",
    tags: ["法令検索", "通達判例", "顧問先支援"],
    ring: "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50",
    iconBg: "bg-indigo-600",
  },
];

export function HomePersonaEntry() {
  return (
    <section aria-labelledby="home-persona-title" className="mx-auto max-w-7xl px-4 pt-6">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-emerald-700">FOR YOU</p>
          <h2 id="home-persona-title" className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
            あなたの立場から始める
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:text-sm">
            立場に合わせた実務エントリへ。迷ったら下の主要機能・3分ツアーからどうぞ。
          </p>
        </div>
      </div>
      {/* 柱0/柱3: モバイルは2列。先頭=建設業を左上(読み順1番目)に温存しつつ、
          一人親方を初手の同一行(右上)へ引き上げ＝「自分の立場」への最短到達を短縮。
          狭い2列では説明文を畳み、アイコン+役割名+タグ(機能の一目signal)で3秒スキャン可能にする。 */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                className={`group flex h-full min-h-[44px] flex-col rounded-2xl border-2 bg-white p-3 shadow-sm transition sm:p-4 ${p.ring}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full p-2 ${p.iconBg}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <p className="text-sm font-bold leading-tight text-slate-900 sm:text-base">{p.label}</p>
                </div>
                <p className="mt-2 hidden flex-1 text-xs leading-relaxed text-slate-600 sm:block sm:text-sm">{p.desc}</p>
                <div className="mt-2 flex flex-1 flex-wrap content-start gap-1 sm:flex-none">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="mt-3 inline-flex items-center gap-0.5 text-xs font-bold text-slate-700 group-hover:gap-1.5">
                  実務エントリを開く <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
