import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, FileText, MessageSquare } from "lucide-react";

/**
 * メイン3機能 (chatbot / chemical-ra / plan-generator) の結果画面下部に共通配置する
 * 統一 CTA セクション。回答や結果を「次のアクションへ落とす」動線を統一する。
 *
 * P2 項目9 (UI/UX 2026-05-24) で追加。
 */
export function MainFeatureNextActions({
  exclude,
  contextLabel,
}: {
  /** 自機能を除外 (例: chatbot 結果画面なら "chatbot") */
  exclude?: "chatbot" | "chemical-ra" | "plan-generator" | "ky" | "diary";
  contextLabel?: string;
}) {
  const actions: Array<{
    key: string;
    href: string;
    label: string;
    desc: string;
    icon: typeof FileText;
    color: string;
  }> = [
    {
      key: "ky",
      href: "/ky",
      label: "KY用紙で実務に落とす",
      desc: "業種別プリセット・音声入力対応",
      icon: ClipboardCheck,
      color: "border-emerald-300 bg-emerald-50 text-emerald-900",
    },
    {
      key: "diary",
      href: "/safety-diary",
      label: "安全衛生日誌に記録",
      desc: "必須5項目を3〜5分で記録",
      icon: FileText,
      color: "border-sky-300 bg-sky-50 text-sky-900",
    },
    {
      key: "chatbot",
      href: "/chatbot",
      label: "法令チャットで深掘り",
      desc: "条文番号付きで自然言語回答",
      icon: MessageSquare,
      color: "border-violet-300 bg-violet-50 text-violet-900",
    },
    {
      key: "chemical-ra",
      href: "/chemical-ra",
      label: "化学物質RAを実施",
      desc: "CREATE-SIMPLE 簡易判定",
      icon: BookOpen,
      color: "border-amber-300 bg-amber-50 text-amber-900",
    },
    {
      key: "plan-generator",
      href: "/strategy/plan-generator",
      label: "年次計画に反映",
      desc: "13業種×3規模のテンプレ",
      icon: FileText,
      color: "border-rose-300 bg-rose-50 text-rose-900",
    },
  ];
  const visible = actions.filter((a) => a.key !== exclude);
  return (
    <section
      aria-labelledby="next-actions-heading"
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
    >
      <h3
        id="next-actions-heading"
        className="text-sm font-bold text-slate-800 flex items-center gap-1.5"
      >
        次のアクション
        {contextLabel && (
          <span className="text-xs font-normal text-slate-500">— {contextLabel}</span>
        )}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.key}
              href={a.href}
              className={`flex items-start gap-2 rounded-lg border-2 p-3 hover:bg-white transition-colors ${a.color}`}
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-xs opacity-80">{a.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
