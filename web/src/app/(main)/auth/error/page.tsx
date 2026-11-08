import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { authErrorCode, type AuthErrorCode } from "@/lib/auth-callback";

export const metadata: Metadata = {
  title: "ログインエラー",
  robots: { index: false },
  openGraph: {
    title: "ログインエラー",
  },
};

const REASONS: Partial<Record<AuthErrorCode, string>> = {
  OAuthAccountNotLinked: "このメールアドレスは別のログイン方法（Google または Apple）で登録済みです。最初に使った方法でログインしてください。",
  AccessDenied: "ログインが許可されませんでした。別のアカウントでお試しください。",
  Configuration: "ログイン設定の確認が必要です（サーバー側）。時間をおいてお試しください。",
  InvalidCheck: "ログインの途中で確認情報が失われました。同じ画面からもう一度お試しください。",
  OAuthCallbackError: "ログイン先から戻る途中で失敗しました。もう一度お試しください。",
  CallbackRouteError: "ログイン先から戻る途中で失敗しました。もう一度お試しください。",
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const code = authErrorCode((await searchParams).error);
  const reason = (code && REASONS[code]) ?? "認証に失敗しました。もう一度お試しください。";
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">ログインに失敗しました</h1>
        <p className="text-sm text-slate-600 mb-2 leading-6">{reason}</p>
        {code ? <p className="mb-6 text-xs text-slate-400">理由コード: {code}</p> : <div className="mb-6" />}
        <Link
          href="/auth/signin"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          ログインに戻る
        </Link>
      </div>
    </div>
  );
}
