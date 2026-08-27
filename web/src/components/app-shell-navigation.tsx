import type { LucideIcon } from "lucide-react";
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
  Compass,
  LayoutGrid,
  Calculator,
  Workflow,
  Images,
} from "lucide-react";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";
import { PAID_MODE } from "@/lib/paid-mode";
import { SITE_STATS } from "@/data/site-stats";
import { AppShellNavLink } from "@/components/app-shell-nav-link";
import { getMobilePrimaryItems } from "@/components/MobileBottomNav";

export type AppShellNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeUntil?: string;
  description?: string;
};

export type AppShellNavCategory = {
  label: string;
  description?: string;
  items: AppShellNavItem[];
};

function isBadgeActive(item: AppShellNavItem): boolean {
  if (!item.badge) return false;
  if (!item.badgeUntil) return true;
  const today = new Date().toISOString().slice(0, 10);
  return today <= item.badgeUntil;
}

const PAID_SERVICE_ITEMS: AppShellNavItem[] = [
  {
    id: "education",
    label: "特別教育",
    href: "/education",
    icon: GraduationCap,
  },
  {
    id: "plan-generator",
    label: "年次安全衛生計画",
    href: "/strategy/plan-generator",
    icon: ListChecks,
    badge: "NEW",
    badgeUntil: "2026-04-15",
  },
];

/**
 * Server Component側に置く全体ナビ登録簿。
 *
 * 大きな説明文と40超のアイコンを全ページのclient module graphへ入れず、
 * SSR HTMLとJavaScript無効時の到達性は維持する。
 */
export const NAV_CATEGORIES: AppShellNavCategory[] = [
  {
    label: "",
    items: [
      { id: "home", label: "ホーム", href: "/", icon: Home },
      {
        id: "safety-ai",
        label: "安全AIとは",
        href: "/safety-ai",
        icon: Info,
        description: "初めての方向けの短い案内",
      },
      {
        id: "whats-new",
        label: "新着情報",
        href: "/whats-new",
        icon: Newspaper,
        badge: "NEW",
        badgeUntil: "2026-07-31",
        description: "法改正・事故速報・通達を新着順に一元表示",
      },
      {
        id: "favorites",
        label: "お気に入り",
        href: "/favorites",
        icon: Star,
        description: "保存した条文・通達",
      },
    ],
  },
  {
    label: "立場から探す",
    description: "あなたの立場に合わせた実務エントリ",
    items: [
      {
        id: "for-construction",
        label: "建設業の現場",
        href: "/for/construction",
        icon: HardHat,
        description: "職長・元請担当・現場代理人の即実行エントリ",
      },
      {
        id: "for-solo",
        label: "一人親方",
        href: "/for/solo",
        icon: UserRound,
        description: "特別加入・一人KY・資格・熱中症を自分で回す",
      },
      {
        id: "for-manager",
        label: "企業の安全衛生担当者",
        href: "/for/manager",
        icon: Building2,
        description: "体制づくり・委員会・年次計画・規模別義務",
      },
      {
        id: "for-consultant",
        label: "専門家・コンサル",
        href: "/for/consultant",
        icon: Scale,
        description: "法令リサーチ・事故分析・顧問先支援を1画面に",
      },
    ],
  },
  {
    label: "現場で使う",
    description: "当日の現場業務で使う実務ツール",
    items: [
      {
        id: "ky-sheet",
        label: "KY用紙",
        href: "/ky/paper",
        icon: ClipboardList,
        description: "用紙ファースト・音声入力・AI危険提案で3分起票",
      },
      {
        id: "safety-diary",
        label: "安全工程打合せ書",
        href: "/safety-diary",
        icon: FileText,
        description: "各社の作業・危険対策・指示を1枚に整理",
      },
      {
        id: "signage",
        label: "サイネージ",
        href: "/signage",
        icon: Monitor,
        description: "現場掲示用フルスクリーン・自動更新",
      },
      {
        id: "safety-image-library",
        label: "安全画像倉庫",
        href: "/materials/safety-images",
        icon: Images,
        badge: "NEW",
        badgeUntil: "2026-10-31",
        description: "安全看板ライブラリを準備中",
      },
      {
        id: "heat-illness",
        label: "熱中症対策",
        href: "/heat-illness-prevention",
        icon: Thermometer,
        description: "WBGT計算機・R7改正対応",
      },
      {
        id: "chemical-ra",
        label: "化学物質RA",
        href: "/chemical-ra",
        icon: TestTube2,
        description: "公式情報を照合し、リスク評価に必要な根拠を確認",
      },
      {
        id: "work-environment",
        label: "作業環境測定",
        href: "/work-environment-measurement",
        icon: Gauge,
        description:
          "A測定・B測定値から管理区分(第1〜第3)を判定・改善措置を提案",
      },
      {
        id: "construction-calculators",
        label: "建設計算ツール",
        href: "/tools/construction-calculators",
        icon: Calculator,
        badge: "NEW",
        badgeUntil: "2026-10-31",
        description: "数量・勾配・座標を概算。構造・安全の可否は判定しません",
      },
    ],
  },
  {
    label: "質問する",
    description: "作業条件から法令本文と公式根拠を確認",
    items: [
      {
        id: "chatbot",
        label: "安衛法AIチャット",
        href: "/chatbot",
        icon: MessageSquare,
        badge: "根拠検索",
        description:
          "普段の言葉で質問し、法令本文から結論と公式原文を確認。条件が足りない場合は一つずつ確認",
      },
    ],
  },
  {
    label: "学ぶ",
    description: "法令・通達・用語・コースで体系的に学習",
    items: [
      {
        id: "law-navi",
        label: "法令ナビ",
        href: "/law-navi",
        icon: Compass,
        description: `分野・現場ことばから安衛法の原文条文へ最短到達（全文含め${SITE_STATS.lawNaviTotalArticleCount}件超を収載）`,
      },
      {
        id: "law-search",
        label: "法令検索",
        href: "/law-search",
        icon: Search,
        description: "条文だけを全文検索・お気に入り保存",
      },
      {
        id: "search",
        label: "サイト内横断検索",
        href: "/search",
        icon: LayoutGrid,
        description: "事故・通達・化学物質・現場ことばまでサイト全体を横断検索",
      },
      {
        id: "circulars",
        label: "通達・判例",
        href: "/circulars",
        icon: Scale,
        description: "通達・裁判例を出典状態と法的位置付けを確認しながら検索",
      },
      {
        id: "laws",
        label: "法改正カレンダー",
        href: "/laws",
        icon: RefreshCw,
        description: "改正カレンダー・施行日カウントダウン",
      },
      {
        id: "law-hierarchy",
        label: "法令体系マップ",
        href: "/law-hierarchy",
        icon: LibraryBig,
        description: "法→政令→省令→告示の階層俯瞰",
      },
      {
        id: "glossary",
        label: "安全用語辞書",
        href: "/glossary",
        icon: BookMarked,
        description: "労働安全衛生の主要用語を五十音で引ける用語集",
      },
      {
        id: "faq",
        label: "FAQ 200問",
        href: "/faq",
        icon: HelpCircle,
        description: "法令タグ付きFAQ。回答ごとに原典と適用条件を確認",
      },
      {
        id: "elearning",
        label: "Eラーニング",
        href: "/e-learning",
        icon: GraduationCap,
        description: "根拠付きクイズ・保存なし",
      },
      {
        id: "education-certification",
        label: "特別教育・技能講習",
        href: "/education-certification",
        icon: Award,
        description: "制度区分を分け、作業条件から候補と不足情報を確認",
      },
    ],
  },
  {
    label: "分析する",
    description: "事故・物質・メンタル・業種データから判断材料を得る",
    items: [
      {
        id: "accidents-reports",
        label: "業種別 事故分析レポート",
        href: "/accidents-reports",
        icon: BarChart3,
        description: "公開事故情報・編集済み事例等を由来別に区別して分析",
      },
      {
        id: "accidents",
        label: "事故データベース",
        href: "/accidents",
        icon: Database,
        description: "公式・編集済み・モデル事例を区別して収録範囲内を検索",
      },
      {
        id: "accident-news",
        label: "重大災害事例",
        href: "/accident-news",
        icon: HardHat,
        badge: "NEW",
        badgeUntil: "2026-08-31",
        description:
          "死亡災害を業種・事故型・起因物分類で検索（匿名・データセット単位の出典）",
      },
      {
        id: "court-cases",
        label: "労災裁判例",
        href: "/court-cases",
        icon: Scale,
        badge: "NEW",
        badgeUntil: "2026-08-31",
        description:
          "安全配慮義務・過失相殺・元請責任の重要確定判例を要旨＋出典で解説",
      },
      {
        id: "accidents-analytics",
        label: "事故統計ダッシュボード",
        href: "/accidents-analytics",
        icon: BarChart3,
        description: "事故型・業種・経年の傾向をグラフで把握",
      },
      {
        id: "chemical-database",
        label: "化学物質検索DB",
        href: "/chemical-database",
        icon: FlaskConical,
        description: `${SITE_STATS.mhlwMergedChemicalCount}物質の詳細・基準値・安衛法規制タグ`,
      },
      {
        id: "mental-health-management",
        label: "メンタル対策実務",
        href: "/mental-health-management",
        icon: Brain,
        badge: "NEW",
        badgeUntil: "2026-05-31",
        description: "事業場規模別の義務・面接指導・50人未満対応",
      },
      {
        id: "diversity",
        label: "多様性と安全",
        href: "/diversity",
        icon: Users2,
        description: "LGBTQ・障害・外国人労働者の安全配慮",
      },
      {
        id: "risk-prediction",
        label: "AIリスク予測",
        href: "/risk-prediction",
        icon: Brain,
        description: "作業内容から潜在リスクをAIが予測",
      },
    ],
  },
  {
    label: "計画する",
    description: "年次安全衛生計画を作成・保管・前年比較",
    items: [
      {
        id: "plan-generator",
        label: "年次安全衛生計画",
        href: "/strategy/plan-generator",
        icon: ListChecks,
        badge: "NEW",
        badgeUntil: "2026-04-15",
        description: "13業種×3規模・39テンプレート・過去3件保存",
      },
      {
        id: "weather-risk",
        label: "気象リスク",
        href: "/risk",
        icon: CloudRain,
        description: "警報・WBGT・拠点別表示",
      },
      {
        id: "treatment-work-balance",
        label: "治療と仕事の両立支援",
        href: "/treatment-work-balance",
        icon: HeartHandshake,
        description: "事業場の両立支援プラン策定",
      },
      {
        id: "subsidies",
        label: "助成金ガイド",
        href: "/subsidies",
        icon: Banknote,
        description: "エイジフレンドリー・人材開発支援等の試算",
      },
    ],
  },
  {
    label: "業種から",
    description: "業種別の課題・対策・KY例を1ページに集約",
    items: [
      {
        id: "industries",
        label: "10業種ハブ",
        href: "/industries",
        icon: Building2,
        description:
          "建設/製造/運輸/医療福祉/サービス/小売/飲食/卸売/倉庫/事務",
      },
      {
        id: "mental-health",
        label: "メンタル・カスハラ",
        href: "/mental-health",
        icon: Heart,
        description: "業種別のカスハラ・ハラスメント対策",
      },
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
            {
              id: "pricing",
              label: "料金プラン",
              href: "/pricing",
              icon: CreditCard,
            },
          ],
        },
      ]
    : []),
  {
    label: "相談・制作",
    description: "自動化、講習、資料作成を小さな業務から相談",
    items: [
      {
        id: "automation-consult",
        label: "業務自動化の内容・料金",
        href: "/services/automation",
        icon: Workflow,
        description:
          "Excel・定型業務の自動化、AI活用、講習・研修、資料・手順書作成",
      },
    ],
  },
  {
    label: "プロジェクト",
    description: "編集方針・お問い合わせ",
    items: [
      {
        id: "about",
        label: "サイトについて",
        href: "/about",
        icon: Info,
      },
      {
        id: "project-policy",
        label: "プロジェクト・編集方針",
        href: "/about/project-story",
        icon: ClipboardList,
      },
      {
        id: "contact",
        label: "ご意見・改善提案",
        href: "/contact",
        icon: Mail,
      },
      {
        id: "goods",
        label: "安全グッズ",
        href: "/goods",
        icon: ShoppingBag,
      },
      {
        id: "notifications",
        label: "通知/配信",
        href: "/notifications",
        icon: Bell,
      },
      {
        id: "features",
        label: "機能紹介一覧",
        href: "/features",
        icon: Sparkles,
        badge: "NEW",
        badgeUntil: "2026-04-30",
      },
    ],
  },
];

const COMPACT_NAV_CATEGORIES: AppShellNavCategory[] = [
  {
    label: "今日と現場",
    items: [
      {
        id: "weather-risk",
        label: "今日の安全",
        href: "/risk",
        icon: CloudRain,
      },
      {
        id: "heat-illness",
        label: "熱中症対策",
        href: "/heat-illness-prevention",
        icon: Thermometer,
      },
      {
        id: "ky-sheet",
        label: "KY用紙",
        href: "/ky/paper",
        icon: ClipboardList,
      },
      {
        id: "signage",
        label: "サイネージ",
        href: "/signage",
        icon: Monitor,
      },
      {
        id: "safety-image-library",
        label: "安全画像倉庫",
        href: "/materials/safety-images",
        icon: Images,
      },
      {
        id: "construction-calculators",
        label: "建設計算ツール",
        href: "/tools/construction-calculators",
        icon: Calculator,
      },
    ],
  },
  {
    label: "法令と事故",
    items: [
      {
        id: "chatbot",
        label: "安衛法AI",
        href: "/chatbot",
        icon: MessageSquare,
      },
      {
        id: "law-search",
        label: "法令検索",
        href: "/law-search",
        icon: Search,
      },
      {
        id: "chemical-ra",
        label: "化学物質RA",
        href: "/chemical-ra",
        icon: FlaskConical,
      },
      {
        id: "laws",
        label: "法改正",
        href: "/laws",
        icon: RefreshCw,
      },
      {
        id: "accident-news",
        label: "労災事故",
        href: "/accident-news",
        icon: Newspaper,
      },
    ],
  },
  {
    label: "学ぶ・相談する",
    items: [
      {
        id: "visual-ky",
        label: "5分ビジュアルKYT",
        href: "/training/visual-ky",
        icon: Sparkles,
      },
      {
        id: "education-certification",
        label: "教育・資格",
        href: "/education-certification",
        icon: GraduationCap,
      },
      {
        id: "automation-consult",
        label: "自動化相談",
        href: "/services/automation",
        icon: Workflow,
      },
      {
        id: "safety-ai",
        label: "安全AIとは",
        href: "/safety-ai",
        icon: Info,
      },
      {
        id: "search",
        label: "サイト内検索",
        href: "/search",
        icon: Search,
      },
      {
        id: "features",
        label: "全機能一覧",
        href: "/features",
        icon: LayoutGrid,
      },
    ],
  },
];

const DESKTOP_PRIMARY_HREFS = new Set<string>();
const MOBILE_HEADER_PRIMARY_HREFS = ["/search"] as const;

export function getAppShellNavigationCategories(
  position: "desktop" | "mobile",
  date: Date = new Date(),
): AppShellNavCategory[] {
  const repeatedPrimaryHrefs =
    position === "desktop"
      ? DESKTOP_PRIMARY_HREFS
      : new Set([
          ...getMobilePrimaryItems(date).map((item) => item.href),
          ...MOBILE_HEADER_PRIMARY_HREFS,
        ]);
  return COMPACT_NAV_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        !(position === "mobile" && item.id === "safety-image-library") &&
        isPublicRouteAvailable(item.href) &&
        !repeatedPrimaryHrefs.has(item.href),
    ),
  })).filter((category) => category.items.length > 0);
}

function navLinkClass(showBadge: boolean): string {
  const base =
    "group flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm data-[nav-active=true]:bg-portal-surface-emphasis data-[nav-active=true]:font-semibold data-[nav-active=true]:text-brand-primary";
  return showBadge
    ? `${base} font-semibold text-brand-secondary hover:bg-portal-surface-emphasis dark:text-slate-100`
    : `${base} font-medium text-slate-700 hover:bg-portal-surface-emphasis dark:text-slate-200`;
}

export function AppShellNavigation({
  position,
  automationHref = "/services/automation",
}: {
  position: "desktop" | "mobile";
  automationHref?: "/services/automation" | "/contact/automation-email";
}) {
  const categories = getAppShellNavigationCategories(position).map(
    (category) => ({
      ...category,
      items: category.items.map((item) =>
        item.id === "automation-consult"
          ? { ...item, href: automationHref }
          : item,
      ),
    }),
  );

  return (
    <nav
      aria-label={
        position === "desktop"
          ? "サイト全体ナビゲーション"
          : "サイト全体ナビゲーション（モバイル）"
      }
      className={position === "desktop" ? "flex-1 space-y-4" : "space-y-3"}
    >
      {categories.map((category) => (
        <div key={category.label || "__top__"}>
          {category.label ? (
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {category.label}
            </p>
          ) : null}
          <div className="space-y-0.5">
            {category.items.map((item) => {
              const showBadge = isBadgeActive(item);
              const content = (
                <>
                  <span className="flex-1 truncate">
                    {item.label}
                    {item.description ? (
                      <span className="ml-1 text-[10px] font-normal text-slate-600 dark:text-slate-300">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  {showBadge ? (
                    <span className="portal-badge px-1.5 py-0.5 text-[10px]">
                      {item.badge === "beta" ? "β" : item.badge}
                    </span>
                  ) : null}
                </>
              );
              if (item.id === "automation-consult") {
                return (
                  <AppShellNavLink
                    key={item.id}
                    href={item.href}
                    prefetch={false}
                    data-automation-cta-position={
                      position === "desktop" ? "global_nav" : "mobile_nav"
                    }
                    className={navLinkClass(showBadge)}
                    title={item.description ? `${item.label} — ${item.description}` : undefined}
                  >
                    {content}
                  </AppShellNavLink>
                );
              }
              return (
                <AppShellNavLink
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  className={navLinkClass(showBadge)}
                  title={item.description ? `${item.label} — ${item.description}` : undefined}
                >
                  {content}
                </AppShellNavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
