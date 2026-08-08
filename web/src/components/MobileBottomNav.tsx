import {
  GraduationCap,
  Home,
  LayoutGrid,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { isHeatIllnessCampaignSeason } from "@/lib/heat-illness/campaign-season";
import { AppShellNavLink } from "@/components/app-shell-nav-link";

export function getMobilePrimaryItems(date: Date) {
  const seasonal = isHeatIllnessCampaignSeason(date);
  return [
    { id: "home", label: "ホーム", href: "/", icon: Home },
    seasonal
      ? {
          id: "heat",
          label: "熱中症",
          href: "/heat-illness-prevention",
          icon: ShieldAlert,
        }
      : {
          id: "today",
          label: "今日",
          href: "/risk",
          icon: ShieldAlert,
        },
    {
      id: "law-ai",
      label: "法令AI",
      href: "/chatbot",
      icon: MessageSquareText,
    },
    {
      id: "learn",
      label: "学ぶ",
      href: "/education-certification",
      icon: GraduationCap,
    },
    { id: "menu", label: "メニュー", href: "/features", icon: LayoutGrid },
  ] as const;
}

export function MobileBottomNav({ date = new Date() }: { date?: Date } = {}) {
  const items = getMobilePrimaryItems(date);
  return (
    <nav
      aria-label="モバイル ボトムナビゲーション"
      data-mobile-nav="bottom"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full min-w-0 overflow-hidden border-t border-portal-border bg-portal-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid w-full max-w-md grid-cols-5">
        {items.map(({ id, label, href, icon: Icon }) => (
          <li key={id} className="min-w-0">
            <AppShellNavLink
              href={href}
              prefetch={false}
              data-compact-text
              className="group tap-target flex min-h-[56px] w-full min-w-0 flex-col items-center justify-center gap-[2px] px-[4px] py-[6px] text-[11px] font-bold leading-tight text-portal-muted data-[nav-active=true]:bg-portal-surface-emphasis data-[nav-active=true]:text-brand-primary"
            >
              <Icon
                className={`h-[20px] w-[20px] ${
                  id === "heat"
                    ? "text-semantic-caution"
                    : "text-brand-primary"
                }`}
                aria-hidden="true"
              />
              <span className="block w-full truncate text-center">{label}</span>
            </AppShellNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default MobileBottomNav;
