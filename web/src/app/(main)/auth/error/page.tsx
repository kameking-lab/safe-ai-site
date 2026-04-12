import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "ログインエラー",
  openGraph: {
    title: "ログインエラー｜ANZEN AI",
  },
};

export default function AuthErrorPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">ログインに失敗しました</h1>
        <p className="text-sm text-slate-500 mb-6 leading-6">
          認証に失敗しました。もう一度お試しください。
        </p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          ログインに戻る
        </Link>
      </div>
    </main>
  );
}
