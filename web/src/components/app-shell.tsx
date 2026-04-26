"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  ClipboardList,
  Monitor,
  GraduationCap,
  BookOpen,
  LibraryBig,
  Database,
  Scale,
  Brain,
  MessageSquare,
  ShoppingBag,
  Bell,
  Search,
  Mail,
  CreditCard,
  Banknote,
  CloudRain,
  FileText,
  TestTube2,
  FlaskConical,
  RefreshCw,
  Info,
  BookMarked,
  Users2,
  Heart,
  Briefcase,
  Handshake,
  ListChecks,
  Building2,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { UserMenu } from "@/components/user-menu";
import { EnglishBetaBanner } from "@/components/english-beta-banner";
import { useFurigana } from "@/contexts/furigana-context";
import { useEasyJapanese } from "@/contexts/easy-japanese-context";
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type Language,
} from "@/contexts/language-context";

const LARGE_FONT_KEY = "large-font-enabled";
const HIGH_CONTRAST_KEY = "high-contrast-enabled";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
};

type NavCategory = {
  label: string;
  items: NavItem[];
};

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "",
    items: [{ id: "home", label: "ホーム", href: "/", icon: Home }],
  },
  {
    label: "マップ",
    items: [
      { id: "signage", label: "サイネージ", href: "/signage", icon: Monitor },
      { id: "weather-risk", label: "気象リスク", href: "/risk", icon: CloudRain },
    ],
  },
  {
    label: "学習",
    items: [
      { id: "elearning", label: "Eラーニング", href: "/e-learning", icon: GraduationCap },
      { id: "exam-quiz", label: "過去問", href: "/exam-quiz", icon: BookOpen },
    ],
  },
  {
    label: "法律",
    items: [
      { id: "laws", label: "法改正", href: "/laws", icon: Scale },
      { id: "law-search", label: "法令検索", href: "/law-search", icon: Search },
      { id: "chatbot", label: "法令チャット", href: "/chatbot", icon: MessageSquare, badge: "AI" },
    ],
  },
  {
    label: "現場ツール",
    items: [
      { id: "ky-sheet", label: "KY用紙", href: "/ky", icon: ClipboardList },
      { id: "risk-prediction", label: "リスク予測", href: "/risk-prediction", icon: Brain, badge: "AI" },
      { id: "safety-diary", label: "安全衛生日誌", href: "/safety-diary", icon: FileText },
    ],
  },
  {
    label: "事例・データ",
    items: [
      { id: "accidents", label: "事故データベース", href: "/accidents", icon: Database },
      { id: "chemical-ra", label: "化学物質RA", href: "/chemical-ra", icon: TestTube2, badge: "AI" },
      { id: "chemical-database", label: "化学物質検索DB", href: "/chemical-database", icon: FlaskConical, description: "50物質β" },
    ],
  },
  {
    label: "多様な働き方",
    items: [
      { id: "diversity", label: "多様性と安全", href: "/diversity", icon: Users2 },
      { id: "mental-health", label: "メンタル・カスハラ", href: "/mental-health", icon: Heart },
    ],
  },
  {
    label: "サービス",
    items: [
      { id: "services", label: "受託業務", href: "/services", icon: Briefcase },
      { id: "education", label: "特別教育", href: "/education", icon: GraduationCap },
      { id: "consulting", label: "月額顧問", href: "/consulting", icon: Handshake },
      { id: "wizard", label: "コンプラ診断", href: "/wizard", icon: ListChecks, badge: "NEW" },
      { id: "cases", label: "導入事例", href: "/cases", icon: Building2 },
    ],
  },
  {
    label: "その他",
    items: [
      { id: "lms", label: "LMS（多拠点管理）", href: "/lms", icon: LibraryBig, badge: "beta", description: "先行登録" },
      { id: "glossary", label: "安全用語辞書", href: "/glossary", icon: BookMarked },
      { id: "goods", label: "安全グッズ", href: "/goods", icon: ShoppingBag },
      { id: "pricing", label: "料金プラン", href: "/pricing", icon: CreditCard },
      { id: "subsidies", label: "助成金ガイド", href: "/subsidies", icon: Banknote },
      { id: "notifications", label: "通知/配信", href: "/notifications", icon: Bell },
      { id: "contact", label: "お問い合わせ", href: "/contact", icon: Mail },
      { id: "about", label: "運営者情報", href: "/about", icon: Info },
    ],
  },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AppShellProps {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { furiganaEnabled, toggleFurigana } = useFurigana();
  const { easyJapaneseEnabled, toggleEasyJapanese } = useEasyJapanese();
  const { language, setLanguage } = useLanguage();

  // SSR/hydration対策: マウント後にのみ localStorage 依存のUI(言語セレクタ含む)を描画
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR/hydration対策: 初期値はfalseで統一し、マウント後にlocalStorageから読む
  const [largeFontEnabled, setLargeFontEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LARGE_FONT_KEY) === "true") setLargeFontEnabled(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // largeFontEnabledの変化をhtmlクラスに反映（DOM同期のみ、setState不使用）
  useEffect(() => {
    if (largeFontEnabled) {
      document.documentElement.classList.add("large-font");
    } else {
      document.documentElement.classList.remove("large-font");
    }
  }, [largeFontEnabled]);

  const toggleLargeFont = () => {
    setLargeFontEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LARGE_FONT_KEY, String(next));
      } catch {
        // localStorage利用不可の場合は無視
      }
      return next;
    });
  };

  // SSR/hydration対策: 初期値はfalseで統一し、マウント後にlocalStorageから読む
  const [highContrastEnabled, setHighContrastEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(HIGH_CONTRAST_KEY) === "true") setHighContrastEnabled(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (highContrastEnabled) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrastEnabled]);

  const toggleHighContrast = () => {
    setHighContrastEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIGH_CONTRAST_KEY, String(next));
      } catch {
        // localStorage利用不可の場合は無視
      }
      return next;
    });
  };

  const linkClass = (item: NavItem) => {
    const active = navActive(pathname, item.href);
    const base = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm";
    if (active) return `${base} bg-emerald-100/80 font-semibold text-emerald-900`;
    if (item.badge) return `${base} font-semibold text-blue-700 hover:bg-blue-50`;
    return `${base} text-slate-700 hover:bg-emerald-50`;
  };

  const renderNavItems = (items: NavItem[], onClickLink?: () => void) =>
    items.map((item) => {
      const active = navActive(pathname, item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.id}
          href={item.href}
          className={linkClass(item)}
          onClick={onClickLink}
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active ? "text-emerald-700" : item.badge ? "text-blue-500" : "text-slate-400"
            }`}
          />
          <span className="flex-1 truncate">
            {item.label}
            {item.description && (
              <span className="ml-1 text-[10px] font-normal text-slate-400">{item.description}</span>
            )}
          </span>
          {item.badge && !active && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                item.badge === "soon"
                  ? "bg-slate-200 text-slate-500"
                  : item.badge === "beta"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {item.badge === "soon"
                ? "準備中"
                : item.badge === "beta"
                  ? "β"
                  : item.badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex min-h-full w-full bg-white shadow-sm">
      {/* PC sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 px-3 py-5 lg:flex">
        <div className="mb-4 flex items-start justify-between px-1">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-700">ANZEN AI</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              現場の安全を、AIで変える。
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            title="ページを更新"
            aria-label="ページを更新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav aria-label="サイト全体ナビゲーション" className="flex-1 space-y-4">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.label || "__top__"}>
              {cat.label && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {cat.label}
                </p>
              )}
              <div className="space-y-0.5">{renderNavItems(cat.items)}</div>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
          {/* アクセシビリティトグル */}
          <div className="flex flex-wrap items-center gap-1 px-1">
            <button
              type="button"
              onClick={toggleFurigana}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                furiganaEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="ふりがなを表示"
              aria-pressed={furiganaEnabled}
            >
              ふりがな
            </button>
            <button
              type="button"
              onClick={toggleEasyJapanese}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                easyJapaneseEnabled
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="やさしい日本語モード（専門用語を平易な表現に置き換え）"
              aria-pressed={easyJapaneseEnabled}
            >
              やさしい
            </button>
            <button
              type="button"
              onClick={toggleLargeFont}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                largeFontEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="文字を大きくする"
              aria-pressed={largeFontEnabled}
            >
              文字大
            </button>
            <button
              type="button"
              onClick={toggleHighContrast}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                highContrastEnabled
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="屋外視認性（ハイコントラスト）"
              aria-pressed={highContrastEnabled}
            >
              屋外
            </button>
            <label className="sr-only" htmlFor="app-lang-select-pc">
              言語 / Language
            </label>
            <select
              id="app-lang-select-pc"
              value={mounted ? language : "ja"}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                !mounted || language === "ja"
                  ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  : "bg-indigo-600 text-white"
              }`}
              title="言語を切り替え / Switch language"
              suppressHydrationWarning
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
          <UserMenu user={user} />
        </div>
      </aside>

      <div className="flex min-h-full flex-1 flex-col overflow-x-hidden">
        {/* Mobile header — 375px で縦積みしないように要素を絞る（a11yトグルはドロップダウン内へ移設） */}
        <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white px-3 py-3 lg:hidden">
          <div className="min-w-0 shrink">
            <p className="truncate text-[11px] font-bold tracking-wide text-emerald-700">ANZEN AI</p>
            <p className="truncate text-[11px] text-slate-700 sm:text-xs">現場の安全を、AIで変える。</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* 言語切替 — mounted が揃うまでは静的プレースホルダで hydration 安定化 */}
            <label className="sr-only" htmlFor="app-lang-select-mobile">
              言語 / Language
            </label>
            <select
              id="app-lang-select-mobile"
              value={mounted ? language : "ja"}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`min-h-[44px] max-w-[140px] truncate rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
                !mounted || language === "ja"
                  ? "border border-slate-200 bg-white text-slate-600"
                  : "bg-indigo-600 text-white"
              }`}
              title="言語を切り替え / Switch language"
              aria-label={`現在の言語: ${LANGUAGE_LABELS[mounted ? language : "ja"]}`}
              suppressHydrationWarning
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
            <UserMenu user={user} />
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm sm:px-3 sm:text-xs"
              aria-expanded={isSidebarOpen}
              aria-label="メニューを開閉"
            >
              {isSidebarOpen ? "閉じる" : "メニュー"}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {isSidebarOpen && (
          <div className="z-20 border-b border-slate-200 bg-slate-50/95 px-3 py-3 shadow-sm lg:hidden">
            {/* モバイル: アクセシビリティトグル（ヘッダから移設） */}
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
              <p className="w-full px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                表示・入力支援
              </p>
              <button
                type="button"
                onClick={toggleFurigana}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  furiganaEnabled
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
                aria-pressed={furiganaEnabled}
              >
                ふりがな
              </button>
              <button
                type="button"
                onClick={toggleEasyJapanese}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  easyJapaneseEnabled
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
                aria-pressed={easyJapaneseEnabled}
              >
                やさしい
              </button>
              <button
                type="button"
                onClick={toggleLargeFont}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  largeFontEnabled
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
                aria-pressed={largeFontEnabled}
              >
                文字大
              </button>
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  highContrastEnabled
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
                aria-pressed={highContrastEnabled}
              >
                屋外（ハイコントラスト）
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                aria-label="ページを更新"
              >
                <RefreshCw className="inline h-3.5 w-3.5" /> 更新
              </button>
            </div>
            <nav aria-label="サイト全体ナビゲーション（モバイル）" className="space-y-3">
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.label || "__top__"}>
                  {cat.label && (
                    <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {cat.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {renderNavItems(cat.items, () => setIsSidebarOpen(false))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        )}

        <EnglishBetaBanner />
        <main className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
