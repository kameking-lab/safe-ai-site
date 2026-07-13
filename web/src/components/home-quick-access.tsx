import Link from "next/link";
import Image from "next/image";
import { buildNewsHubItems } from "@/lib/news-hub";
import { WhatsNewTileBadge } from "@/components/whats-new-tile-badge";

/**
 * トップ最上部の「現場ですぐ使う」直接導線（exp-r8）。
 * 社長の不満「すぐ機能に行かない」への是正＝トップを開いて0スクロールで主要機能へ1タップ。
 * モバイル(390px)で3列＝主要機能がファーストビューに収まる。Heroのキャッチ/h1/統計(SEO)はこの下に温存。
 * 柱0: 「新着」タイルには前回閲覧以降の未読件数バッジ（/whats-new と同一基準）。
 * アイコンは統一タッチの生成アイコンセット（視覚刷新 2026-07-12・/icons/）。
 */
type Tool = { href: string; iconSrc: string; label: string; sub: string };

const TOOLS: Tool[] = [
  { href: "/ky/paper", iconSrc: "/icons/icon-ky.webp", label: "KY用紙", sub: "3分で起票" },
  { href: "/safety-diary", iconSrc: "/icons/icon-meeting.webp", label: "打合せ書", sub: "各社を1枚に" },
  { href: "/chemical-ra", iconSrc: "/icons/icon-chemical.webp", label: "化学物質RA", sub: "物質→記録" },
  { href: "/chatbot", iconSrc: "/icons/icon-chat.webp", label: "AIに質問", sub: "条文・出典付" },
  { href: "/accidents", iconSrc: "/icons/icon-accident.webp", label: "事故事例DB", sub: "業種で検索" },
  { href: "/laws", iconSrc: "/icons/icon-law.webp", label: "法改正", sub: "施行日・要約" },
  { href: "/signage", iconSrc: "/icons/icon-signage.webp", label: "サイネージ", sub: "朝礼掲示" },
  { href: "/court-cases", iconSrc: "/icons/icon-court.webp", label: "労災裁判例", sub: "判例＋出典" },
  { href: "/whats-new", iconSrc: "/icons/icon-new.webp", label: "新着", sub: "法改正・速報" },
  { href: "/site-records", iconSrc: "/icons/icon-records.webp", label: "現場記録", sub: "今日やること" },
];

export function HomeQuickAccess() {
  // サーバー側で新着ハブの日付列だけ取り出してバッジへ渡す（クライアントへは日付配列のみ）
  const newsDates = buildNewsHubItems().map((i) => i.date);
  return (
    <section aria-label="現場ですぐ使う主要機能" className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">現場ですぐ使う</h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">タップですぐ起動・登録不要</span>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
        {TOOLS.map((t) => (
          <li key={t.href} className="relative">
            <Link
              href={t.href}
              className="flex h-full min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-1.5 py-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-600/10 dark:border-emerald-500/30 dark:bg-slate-900"
            >
              <Image src={t.iconSrc} alt="" width={28} height={28} aria-hidden style={{ width: 28, height: 28 }} />
              <span className="text-[12px] font-bold leading-tight text-slate-800 dark:text-slate-100">{t.label}</span>
              <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{t.sub}</span>
            </Link>
            {t.href === "/whats-new" && <WhatsNewTileBadge dates={newsDates} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
