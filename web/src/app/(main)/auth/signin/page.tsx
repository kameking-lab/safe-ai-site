import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "ログイン",
  description: "ANZEN AIにログインしてプレミアム機能を利用しましょう。",
  openGraph: {
    title: "ログイン｜ANZEN AI",
    description: "ANZEN AIにログインしてプレミアム機能を利用しましょう。",
  },
};

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <LogIn className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">ログイン</h1>
        <p className="text-sm text-slate-500 mb-8 leading-6">
          アカウントにログインして、KY用紙・チャット履歴・プレミアム機能をご利用ください。
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Googleでログイン
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 leading-5">
          ログインすることで
          <a href="/terms" className="underline hover:text-slate-600">利用規約</a>
          および
          <a href="/privacy" className="underline hover:text-slate-600">プライバシーポリシー</a>
          に同意したものとみなします。
        </p>
      </div>
    </main>
  );
}
