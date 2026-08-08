import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Bot,
  ClipboardCheck,
  Database,
  GraduationCap,
  MonitorUp,
  Scale,
  Search,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type ContextualAction = {
  href: string;
  label: string;
  description?: string;
  external?: boolean;
};

type ActionVisual = {
  icon: LucideIcon;
  tone: string;
  iconTone: string;
};

function actionVisual(href: string): ActionVisual {
  if (href.includes("heat-illness")) {
    return {
      icon: Sun,
      tone: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40",
      iconTone: "bg-orange-600 text-white",
    };
  }
  if (href.includes("/ky") || href.includes("safety-diary")) {
    return {
      icon: ClipboardCheck,
      tone: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40",
      iconTone: "bg-sky-700 text-white",
    };
  }
  if (href.includes("chemical")) {
    return {
      icon: Beaker,
      tone: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40",
      iconTone: "bg-teal-700 text-white",
    };
  }
  if (href.includes("law") || href.includes("chatbot")) {
    return {
      icon: Scale,
      tone: "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40",
      iconTone: "bg-indigo-700 text-white",
    };
  }
  if (href.includes("accident")) {
    return {
      icon: Database,
      tone: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
      iconTone: "bg-amber-600 text-slate-950",
    };
  }
  if (href.includes("signage")) {
    return {
      icon: MonitorUp,
      tone: "border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40",
      iconTone: "bg-cyan-700 text-white",
    };
  }
  if (href.includes("learning") || href.includes("education")) {
    return {
      icon: GraduationCap,
      tone: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
      iconTone: "bg-rose-700 text-white",
    };
  }
  if (href.includes("automation") || href.includes("safety-ai")) {
    return {
      icon: Bot,
      tone: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
      iconTone: "bg-violet-700 text-white",
    };
  }
  if (href.includes("risk")) {
    return {
      icon: ShieldCheck,
      tone: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
      iconTone: "bg-emerald-700 text-white",
    };
  }
  return {
    icon: Search,
    tone: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
    iconTone: "bg-slate-800 text-white",
  };
}

export function ContextualNextActions({
  title = "次にできること",
  actions,
}: {
  title?: string;
  actions: ContextualAction[];
}) {
  return (
    <section
      aria-labelledby="contextual-next-actions"
      className="relative overflow-hidden rounded-[1.75rem] border-2 border-slate-700 bg-slate-950 p-4 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,.9)] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl forced-colors:hidden"
        aria-hidden="true"
      />
      <div className="relative">
        <h2
          id="contextual-next-actions"
          className="text-2xl font-black tracking-tight sm:text-3xl"
        >
          {title}
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {actions.slice(0, 3).map((action) => {
            const visual = actionVisual(action.href);
            const Icon = visual.icon;
            const content = (
              <>
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${visual.iconTone}`}>
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-black leading-tight">{action.label}</span>
                  {action.description ? (
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                      {action.description}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </>
            );
            const className = `group flex min-h-24 items-center gap-3 rounded-2xl border-2 p-3 text-slate-950 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 motion-reduce:transform-none motion-reduce:transition-none dark:text-white ${visual.tone}`;
            return (
              <li key={`${action.href}-${action.label}`}>
                {action.external ? (
                  <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    href={action.href}
                    prefetch={false}
                    className={className}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
