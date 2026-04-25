"use client";

import Link from "next/link";
import { User, LogOut } from "lucide-react";
import { useState } from "react";

interface Props {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
      >
        <User className="h-3.5 w-3.5" />
        ログイン
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        {user.image ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 外部OAuth画像のためimg使用 */
          <img src={user.image} alt="ユーザーアイコン" className="h-5 w-5 rounded-full" />
        ) : (
          <User className="h-4 w-4 text-slate-400" />
        )}
        <span className="max-w-[80px] truncate">{user.name ?? user.email}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p>
            <div className="my-1 border-t border-slate-100" />
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              マイページ
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
            >
              プランを確認する
            </Link>
            <form
              action="/api/auth/signout"
              method="POST"
            >
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                ログアウト
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
