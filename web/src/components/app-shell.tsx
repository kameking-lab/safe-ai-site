"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  ClipboardList,
  Monitor,
  GraduationCap,
  LibraryBig,
  Database,
  Scale,
  Brain,
  MessageSquare,
  ShoppingBag,
  Bell,
  Newspaper,
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
  HeartHandshake,
  ListChecks,
  Sun,
  Moon,
  Sparkles,
  HelpCircle,
  HardHat,
  Building2,
  Thermometer,
  BarChart3,
  Star,
  UserRound,
  Award,
  Gauge,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { FlagshipNav } from "@/components/flagship-nav";
import { PAID_MODE } from "@/lib/paid-mode";
import { LAW_SOURCE_COUNT } from "@/data/laws";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";
import { ShareButtons } from "@/components/share-buttons";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useFurigana } from "@/contexts/furigana-context";
import { useEasyJapanese } from "@/contexts/easy-japanese-context";

const LARGE_FONT_KEY = "large-font-enabled";
const HIGH_CONTRAST_KEY = "high-contrast-enabled";
const A11Y_HINT_DISMISSED_KEY = "a11y-hint-dismissed";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  // ISO yyyy-mm-dd. Suppresses badge once `today > badgeUntil`, so NEW does not linger past ~30 days.
  badgeUntil?: string;
  description?: string;
};

function isBadgeActive(item: NavItem): boolean {
  if (!item.badge) return false;
  if (!item.badgeUntil) return true;
  const today = new Date().toISOString().slice(0, 10);
  return today <= item.badgeUntil;
}

type NavCategory = {
  label: string;
  /** P0-021 (usability-audit-day3): カテゴリ自体の1行説明 */
  description?: string;
  items: NavItem[];
};

const PAID_SERVICE_ITEMS: NavItem[] = [
  { id: "education", label: "特別教育", href: "/education", icon: GraduationCap },
  { id: "plan-generator", label: "年次安全衛生計画", href: "/strategy/plan-generator", icon: ListChecks, badge: "NEW", badgeUntil: "2026-04-15" },
];

// P0-021 (usability-audit-day3-2026-05-24): NAV_CATEGORIES を 10 → 6 カテゴリに
// 再編。監査で「10カテゴリ40+項目で機能重複しまくり、選択肢過多」と指摘された
// 問題を解消。動詞ベース (現場で使う / 質問する / 学ぶ / 分析する / 計画する /
// 業種から) で職長語彙に合わせ、各カテゴリに 1 行説明を併記する。
// モバイル底部ナビ (MobileBottomNav.tsx) との整合 = ホーム/KY/AIチャット/日誌は
// PC でも引き続きアクセス可能 (各々「現場で使う」「質問する」配下に維持)。
// exp-06: 回帰テスト(app-shell-nav.test.ts)から被覆検証するため export。
// 「全 flagship 機能はサイドバーから到達可」の不変条件を守る。
export const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "",
    items: [
      { id: "home", label: "ホーム", href: "/", icon: Home },
      { id: "whats-new", label: "新着情報", href: "/whats-new", icon: Newspaper, badge: "NEW", badgeUntil: "2026-07-31", description: "法改正・事故速報・通達を新着順に一元表示" },
      { id: "favorites", label: "お気に入り", href: "/favorites", icon: Star, description: "保存した条文・通達" },
    ],
  },
  // exp-04 (autonomous-loop 2026-05-30): ペルソナ入口(/for/*)はトップのバンドだけでなく
  // 全ページのサイドバーからも到達できるよう、立場別の第一級ナビ群として常設する。
  {
    label: "立場から探す",
    description: "あなたの立場に合わせた実務エントリ",
    items: [
      { id: "for-construction", label: "建設業の現場", href: "/for/construction", icon: HardHat, description: "職長・元請担当・現場代理人の即実行エントリ" },
      { id: "for-solo", label: "一人親方", href: "/for/solo", icon: UserRound, description: "特別加入・一人KY・資格・熱中症を自分で回す" },
      { id: "for-manager", label: "企業の安全衛生担当者", href: "/for/manager", icon: Building2, description: "体制づくり・委員会・年次計画・規模別義務" },
      { id: "for-consultant", label: "専門家・コンサル", href: "/for/consultant", icon: Scale, description: "法令リサーチ・事故分析・顧問先支援を1画面に" },
    ],
  },
  {
    label: "現場で使う",
    description: "当日の現場業務で使う実務ツール",
    items: [
      { id: "ky-sheet", label: "KY用紙", href: "/ky/paper", icon: ClipboardList, description: "用紙ファースト・音声入力・AI危険提案で3分起票" },
      { id: "safety-diary", label: "安全工程打合せ書", href: "/safety-diary", icon: FileText, description: "元請が前日5分で作成・各社の危険対策を1枚に" },
      { id: "signage", label: "サイネージ", href: "/signage", icon: Monitor, description: "現場掲示用フルスクリーン・自動更新" },
      { id: "heat-illness", label: "熱中症対策", href: "/heat-illness-prevention", icon: Thermometer, description: "WBGT計算機・R7改正対応" },
      { id: "chemical-ra", label: "化学物質RA", href: "/chemical-ra", icon: TestTube2, description: "CREATE-SIMPLE簡易判定" },
      // exp-05: フラグシップ機能なのにサイドバー未収録だった作業環境測定を補完
      { id: "work-environment", label: "作業環境測定", href: "/work-environment-measurement", icon: Gauge, description: "A測定・B測定値から管理区分(第1〜第3)を判定・改善措置を提案" },
    ],
  },
  {
    label: "質問する",
    description: "AIが安衛法を条文番号・出典付きで回答",
    items: [
      { id: "chatbot", label: "安衛法AIチャット", href: "/chatbot", icon: MessageSquare, badge: "AI", description: `${LAW_SOURCE_COUNT}法令等を根拠条文付きで回答 (ストリーミング)` },
    ],
  },
  {
    label: "学ぶ",
    description: "法令・通達・用語・コースで体系的に学習",
    items: [
      { id: "law-search", label: "法令検索", href: "/law-search", icon: Search, description: "条文を全文検索・お気に入り保存" },
      { id: "circulars", label: "通達・判例", href: "/circulars", icon: Scale, description: "厚労省通達1069件+安全配慮義務判例30件" },
      { id: "laws", label: "法改正カレンダー", href: "/laws", icon: RefreshCw, description: "改正カレンダー・施行日カウントダウン" },
      { id: "law-hierarchy", label: "法令体系マップ", href: "/law-hierarchy", icon: LibraryBig, description: "法→政令→省令→告示の階層俯瞰" },
      { id: "glossary", label: "安全用語辞書", href: "/glossary", icon: BookMarked, description: "労働安全衛生の主要用語を五十音で引ける用語集" },
      { id: "faq", label: "FAQ 200問", href: "/faq", icon: HelpCircle, description: "法令タグ付きFAQ・コンサル監修" },
      { id: "elearning", label: "Eラーニング", href: "/e-learning", icon: GraduationCap, description: "クイズ式コース・進捗保存" },
      // exp-05: フラグシップ機能なのにサイドバー未収録だった2機能を補完
      { id: "education-certification", label: "特別教育・技能講習", href: "/education-certification", icon: Award, description: "安衛則36条の特別教育・技能講習を業種・作業から逆引き判定（根拠条文付き）" },
    ],
  },
  {
    label: "分析する",
    description: "事故・物質・メンタル・業種データから判断材料を得る",
    items: [
      { id: "accidents-reports", label: "業種別 事故分析レポート", href: "/accidents-reports", icon: BarChart3, description: "5業種5,000件超を業種別レポートで自動分析" },
      { id: "accidents", label: "事故データベース", href: "/accidents", icon: Database, description: "厚労省事例の全件検索" },
      { id: "accident-news", label: "重大災害事例", href: "/accident-news", icon: HardHat, badge: "NEW", badgeUntil: "2026-08-31", description: "死亡災害を業種・事故型・原因で類型検索（公表事実・匿名・出典付き）" },
      // exp-05: AccidentHubNav・flagshipに揃え、統計ダッシュボードもサイドバーから到達可に
      { id: "accidents-analytics", label: "事故統計ダッシュボード", href: "/accidents-analytics", icon: BarChart3, description: "事故型・業種・経年の傾向をグラフで把握" },
      { id: "chemical-database", label: "化学物質検索DB", href: "/chemical-database", icon: FlaskConical, description: `${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()}物質の詳細・基準値・安衛法規制タグ` },
      { id: "mental-health-management", label: "メンタル対策実務", href: "/mental-health-management", icon: Brain, badge: "NEW", badgeUntil: "2026-05-31", description: "事業場規模別の義務・面接指導・50人未満対応" },
      { id: "diversity", label: "多様性と安全", href: "/diversity", icon: Users2, description: "LGBTQ・障害・外国人労働者の安全配慮" },
      { id: "risk-prediction", label: "AIリスク予測", href: "/risk-prediction", icon: Brain, description: "作業内容から潜在リスクをAIが予測" },
    ],
  },
  {
    label: "計画する",
    description: "年次安全衛生計画を作成・保管・前年比較",
    items: [
      { id: "plan-generator", label: "年次安全衛生計画", href: "/strategy/plan-generator", icon: ListChecks, badge: "NEW", badgeUntil: "2026-04-15", description: "13業種×3規模・39テンプレート・過去3件保存" },
      { id: "weather-risk", label: "気象リスク", href: "/risk", icon: CloudRain, description: "警報・WBGT・拠点別表示" },
      { id: "treatment-work-balance", label: "治療と仕事の両立支援", href: "/treatment-work-balance", icon: HeartHandshake, description: "事業場の両立支援プラン策定" },
      { id: "subsidies", label: "助成金ガイド", href: "/subsidies", icon: Banknote, description: "エイジフレンドリー・人材開発支援等の試算" },
    ],
  },
  {
    label: "業種から",
    description: "業種別の課題・対策・KY例を1ページに集約",
    items: [
      // 建設業向け実務(/for/construction)は「立場から探す」へ集約（重複解消）
      { id: "industries", label: "10業種ハブ", href: "/industries", icon: Building2, description: "建設/製造/運輸/医療福祉/サービス/小売/飲食/卸売/倉庫/事務" },
      { id: "mental-health", label: "メンタル・カスハラ", href: "/mental-health", icon: Heart, description: "業種別のカスハラ・ハラスメント対策" },
    ],
  },
  ...(PAID_MODE
    ? [
        {
          label: "有料サービス",
          items: PAID_SERVICE_ITEMS,
        },
        {
          label: "アカウント",
          items: [
            { id: "pricing", label: "料金プラン", href: "/pricing", icon: CreditCard } as NavItem,
          ],
        },
      ]
    : []),
  {
    label: "プロジェクト",
    description: "運営者・お問い合わせ",
    items: [
      { id: "about", label: "研究プロジェクトについて", href: "/about", icon: Info },
      { id: "contact", label: "ご意見・改善提案", href: "/contact", icon: Mail },
      { id: "goods", label: "安全グッズ", href: "/goods", icon: ShoppingBag },
      { id: "notifications", label: "通知/配信", href: "/notifications", icon: Bell },
      { id: "features", label: "機能紹介一覧", href: "/features", icon: Sparkles, badge: "NEW", badgeUntil: "2026-04-30" },
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
  const { open: openCommandPalette } = useCommandPalette();

  // SSR/hydration対策: 初期値はfalseで統一し、マウント後にlocalStorageから読む
  const [largeFontEnabled, setLargeFontEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
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

  // モバイル初回訪問時のアクセシビリティ機能案内バナー
  // P0-2: 初期は畳んだチップだけを表示し、ファーストビュー占有を縮小する。
  // タップで詳細を展開、再タップで畳む。「閉じる」を押すと localStorage で永久非表示。
  const [a11yHintVisible, setA11yHintVisible] = useState<boolean>(false);
  const [a11yHintExpanded, setA11yHintExpanded] = useState<boolean>(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
      if (localStorage.getItem(A11Y_HINT_DISMISSED_KEY) !== "true") setA11yHintVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismissA11yHint = () => {
    setA11yHintVisible(false);
    try {
      localStorage.setItem(A11Y_HINT_DISMISSED_KEY, "true");
    } catch {
      // localStorage利用不可の場合は無視
    }
  };

  const toggleA11yHintExpanded = () => {
    setA11yHintExpanded((prev) => !prev);
  };

  const linkClass = (item: NavItem) => {
    const active = navActive(pathname, item.href);
    const base = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm";
    if (active)
      return `${base} bg-emerald-100/80 font-semibold text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200`;
    if (isBadgeActive(item))
      return `${base} font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10`;
    return `${base} text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10`;
  };

  const renderNavItems = (items: NavItem[], onClickLink?: () => void) =>
    items.map((item) => {
      const active = navActive(pathname, item.href);
      const showBadge = isBadgeActive(item);
      const Icon = item.icon;
      return (
        <Link
          key={item.id}
          href={item.href}
          className={linkClass(item)}
          onClick={onClickLink}
          // P1-B: ホバーで機能の1行説明を表示。truncate で隠れたときの保険にもなる。
          title={item.description ? `${item.label} — ${item.description}` : item.label}
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active
                ? "text-emerald-700 dark:text-emerald-300"
                : showBadge
                  ? "text-blue-500 dark:text-blue-300"
                  : "text-slate-400 dark:text-slate-500"
            }`}
          />
          <span className="flex-1 truncate">
            {item.label}
            {item.description && (
              <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">{item.description}</span>
            )}
          </span>
          {showBadge && !active && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                item.badge === "beta"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
              }`}
            >
              {item.badge === "beta" ? "β" : item.badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex min-h-full w-full bg-white shadow-sm dark:bg-slate-900 dark:shadow-black/40">
      {/* Skip to main content (a11y / WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        メインコンテンツへスキップ
      </a>
      {/* PC sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 px-3 py-5 dark:border-slate-700 dark:bg-slate-900/80 lg:flex">
        <div className="mb-4 flex items-start justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-700 dark:text-emerald-300">安全AIポータル</p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              現場の安全を、AIで変える。
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle size="sm" />
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title="ページを更新"
              aria-label="ページを更新"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <nav aria-label="サイト全体ナビゲーション" className="flex-1 space-y-4">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.label || "__top__"}>
              {cat.label && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {cat.label}
                </p>
              )}
              <div className="space-y-0.5">{renderNavItems(cat.items)}</div>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4 space-y-2 dark:border-slate-700">
          {/* アクセシビリティトグル */}
          <div className="flex flex-wrap items-center gap-1 px-1">
            <button
              type="button"
              onClick={toggleFurigana}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                furiganaEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
              title="屋外視認性（ハイコントラスト）"
              aria-pressed={highContrastEnabled}
            >
              屋外
            </button>
          </div>
          <UserMenu user={user} />
        </div>
      </aside>

      <div className="flex min-h-full flex-1 flex-col overflow-x-hidden">
        {/* Mobile header — 375px で縦積みしないように要素を絞る */}
        <div className="border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white dark:border-slate-700 dark:from-emerald-500/10 dark:to-slate-900 lg:hidden">
          <div className="flex flex-nowrap items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0 shrink">
              <p className="truncate text-[11px] font-bold tracking-wide text-emerald-700 dark:text-emerald-300">安全AIポータル</p>
              <p className="truncate text-[11px] text-slate-700 dark:text-slate-300 sm:text-xs">現場の安全を、AIで変える。</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* 検索（⌘K）— モバイルはアイコンのみ */}
              <button
                type="button"
                onClick={openCommandPalette}
                aria-label="検索を開く（Ctrl+K）"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              <ThemeToggle size="sm" />
              <UserMenu user={user} />
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-slate-800 dark:text-emerald-300 sm:px-3 sm:text-xs"
                aria-expanded={isSidebarOpen}
                aria-label="メニューを開閉"
              >
                {isSidebarOpen ? "閉じる" : "メニュー"}
              </button>
            </div>
          </div>
          {/* モバイル必須a11yトグル: ふりがな + 文字大 を常時露出（UX-021） */}
          <div className="flex items-center gap-1.5 px-3 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">表示</span>
            <button
              type="button"
              onClick={toggleFurigana}
              aria-pressed={furiganaEnabled}
              className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                furiganaEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
              title="ふりがな表示を切替"
            >
              ふりがな
            </button>
            <button
              type="button"
              onClick={toggleLargeFont}
              aria-pressed={largeFontEnabled}
              className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                largeFontEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
              title="文字を大きくする"
            >
              文字大
            </button>
            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">他はメニュー内</span>
          </div>
        </div>

        {/* モバイル初回訪問者向けアクセシビリティ案内バナー（UX-021 / P0-2） */}
        {/* 既定は畳んだチップ表示。タップで本文を展開。「閉じる」で localStorage に既読フラグを保存し以降非表示。 */}
        {a11yHintVisible && (
          <div
            role="region"
            aria-label="アクセシビリティ機能の案内"
            className="border-b border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 lg:hidden"
          >
            <div className="flex items-center gap-2 px-3 py-1.5">
              <button
                type="button"
                onClick={toggleA11yHintExpanded}
                aria-expanded={a11yHintExpanded}
                aria-controls="a11y-hint-body"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>表示モード</span>
                <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-300">
                  {a11yHintExpanded ? "▲" : "▼"}
                </span>
              </button>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                ふりがな・やさしい日本語・文字大・屋外
              </span>
              <button
                type="button"
                onClick={dismissA11yHint}
                className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                aria-label="案内バナーを閉じる"
              >
                ×
              </button>
            </div>
            {a11yHintExpanded && (
              <div
                id="a11y-hint-body"
                className="flex items-start gap-2 px-3 pb-2 text-[11px] leading-5"
              >
                <p className="flex-1">
                  「ふりがな」「やさしい日本語」「文字大」「屋外（ハイコントラスト）」の表示モードがあります。
                  ヘッダー上部または右上メニュー内で切替できます。
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mobile nav dropdown */}
        {isSidebarOpen && (
          <div className="z-20 border-b border-slate-200 bg-slate-50/95 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">
            {/* モバイル: アクセシビリティトグル（ヘッダから移設） */}
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="w-full px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                表示・入力支援
              </p>
              <button
                type="button"
                onClick={toggleFurigana}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  furiganaEnabled
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
                aria-pressed={highContrastEnabled}
              >
                屋外（ハイコントラスト）
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="ページを更新"
              >
                <RefreshCw className="inline h-3.5 w-3.5" /> 更新
              </button>
            </div>
            <nav aria-label="サイト全体ナビゲーション（モバイル）" className="space-y-3">
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.label || "__top__"}>
                  {cat.label && (
                    <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
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

        {/* Desktop top bar — ⌘K検索ヒント + 屋外モードトグルを右上に常設 */}
        <div className="hidden items-center justify-end gap-2 border-b border-slate-200 bg-white/70 px-6 py-2 backdrop-blur lg:flex">
          <button
            type="button"
            onClick={openCommandPalette}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            title="検索を開く"
            aria-label="検索 Ctrl+K"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>検索</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              Ctrl+K
            </kbd>
          </button>
          <button
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={highContrastEnabled}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              highContrastEnabled
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="屋外（ハイコントラスト）モード切替"
          >
            {highContrastEnabled ? (
              <>
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>屋外モード ON</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>屋外モード</span>
              </>
            )}
          </button>
        </div>
        <FlagshipNav />
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col scroll-mt-20 focus:outline-none">
          <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
        </main>
        <Footer />
      </div>
      <ShareButtons fixed />
    </div>
  );
}
