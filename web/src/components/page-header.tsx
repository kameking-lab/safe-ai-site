import type { LucideIcon } from "lucide-react";

type IconColor = "emerald" | "blue" | "amber" | "red";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: IconColor;
  badge?: string;
}

const iconBgMap: Record<IconColor, string> = {
  emerald: "bg-emerald-600",
  blue: "bg-blue-600",
  amber: "bg-amber-500",
  red: "bg-red-600",
};

const badgeBgMap: Record<IconColor, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

export function PageHeader({ title, description, icon: Icon, iconColor, badge }: PageHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBgMap[iconColor]}`}
        >
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">{title}</h1>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeBgMap[iconColor]}`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-slate-500">{description}</p>
        </div>
      </div>
    </header>
  );
}
