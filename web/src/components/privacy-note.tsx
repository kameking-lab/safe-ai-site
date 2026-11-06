import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * 情報を入力・送信する直前に置く、控えめな安心表示（1か所につき1行）。
 * 3サイト（過去問AI・次の資格・安全AI）で同じ文言・同じ見た目に揃えている。
 * 根拠の説明は本文に書かず、プライバシーポリシーの #security に置く。
 * 文言を変えるときは /privacy#security の記載と事実が一致しているか確認すること。
 */
export const PRIVACY_NOTE_BASE = "不正アクセス対策済み。あなたの情報はしっかり守っています。";

export const PRIVACY_NOTE_REASONS = {
  general: "",
  signin: "パスワードはこのサイトに残りません。",
  ai: "名前や住所などは書かなくても使えます。",
  message: "いただいた内容は目的以外に使いません。",
} as const;

export type PrivacyNoteVariant = keyof typeof PRIVACY_NOTE_REASONS;

export function PrivacyNote({
  variant = "general",
  className = "",
  id,
}: {
  variant?: PrivacyNoteVariant;
  className?: string;
  id?: string;
}) {
  return (
    <p
      id={id}
      className={`flex items-start gap-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400 ${className}`.trim()}
    >
      <Lock aria-hidden="true" className="mt-[0.2rem] h-3 w-3 shrink-0" />
      <span>
        {PRIVACY_NOTE_BASE}
        {PRIVACY_NOTE_REASONS[variant]}{" "}
        <Link href="/privacy#security" prefetch={false} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          詳しく
        </Link>
      </span>
    </p>
  );
}
