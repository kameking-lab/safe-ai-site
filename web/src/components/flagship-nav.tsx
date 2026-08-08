import {
  AlertTriangle,
  FlaskConical,
  GraduationCap,
  MessageSquareText,
  Newspaper,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { isHeatIllnessCampaignSeason } from "@/lib/heat-illness/campaign-season";
import { AppShellNavLink } from "@/components/app-shell-nav-link";

type PrimaryNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  heat?: boolean;
  prefetch: false;
};

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  {
    label: "今日の安全",
    href: "/risk",
    icon: AlertTriangle,
    heat: true,
    prefetch: false,
  },
  {
    label: "法令AI",
    href: "/chatbot",
    icon: MessageSquareText,
    prefetch: false,
  },
  {
    label: "化学物質",
    href: "/chemical-ra",
    icon: FlaskConical,
    prefetch: false,
  },
  {
    label: "事故・法改正",
    href: "/whats-new",
    icon: Newspaper,
    prefetch: false,
  },
  {
    label: "学ぶ・資格",
    href: "/education-certification",
    icon: GraduationCap,
    prefetch: false,
  },
  {
    label: "KYT・実務",
    href: "/training/visual-ky",
    icon: Sparkles,
    prefetch: false,
  },
  {
    label: "自動化相談",
    href: "/services/automation",
    icon: Workflow,
    prefetch: false,
  },
];

export function FlagshipNav() {
  const summer = isHeatIllnessCampaignSeason(new Date());
  return (
    <nav
      aria-label="主要機能ナビゲーション"
      data-primary-navigation
      className="hidden border-b border-portal-border bg-portal-surface dark:bg-portal-surface lg:block"
    >
      <ul className="mx-auto grid max-w-7xl grid-cols-7 gap-1 px-4 py-1.5">
        {PRIMARY_NAV.map(({ label, href, icon: Icon, heat, prefetch }) => (
          <li key={label} className="min-w-0">
            <AppShellNavLink
              href={href}
              prefetch={prefetch}
              className="group flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2 text-center text-xs font-extrabold text-brand-secondary hover:bg-portal-surface-emphasis hover:text-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 data-[nav-active=true]:bg-portal-surface-emphasis data-[nav-active=true]:text-brand-primary dark:text-slate-100"
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  heat && summer
                    ? "text-brand-accent"
                    : "text-brand-primary"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
              {heat && summer ? (
                <span className="portal-light-ink rounded-full bg-brand-accent px-1.5 py-0.5 text-[9px] font-black text-slate-950 forced-colors:border">
                  夏季
                </span>
              ) : null}
            </AppShellNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
