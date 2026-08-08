"use client";

import Link from "next/link";
import { User, LogOut } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PAID_MODE } from "@/lib/paid-mode";

type MenuUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

interface Props {
  /**
   * Providerの解決結果を上書きする場合だけ指定する。nullは明示的なゲスト表示。
   */
  user?: MenuUser | null;
}

const MenuUserContext = createContext<MenuUser | null>(null);

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length <= 500 ? value : null;
}

function readMenuUser(payload: unknown): MenuUser | null {
  if (!payload || typeof payload !== "object") return null;
  const sessionUser = (payload as { user?: unknown }).user;
  if (!sessionUser || typeof sessionUser !== "object") return null;
  const record = sessionUser as Record<string, unknown>;
  const name = asNullableString(record.name);
  const email = asNullableString(record.email);
  const image = asNullableString(record.image);
  if (!name && !email && !image) return null;
  return { name, email, image };
}

interface UserMenuSessionProviderProps {
  children: React.ReactNode;
  /**
   * server側でPreview安全モードと認証3資格情報を確認した結果だけを受け取る。
   * falseならsession endpointへ一切接続せず、明示的なゲスト表示にする。
   */
  enabled: boolean;
}

/**
 * desktop/mobileのUserMenuが同時に存在しても、session解決をAppShell単位の
 * 1回に集約する。レスポンスは表示用3項目だけをallowlistし、ログへ出さない。
 */
export function UserMenuSessionProvider({
  children,
  enabled,
}: UserMenuSessionProviderProps) {
  const [resolvedUser, setResolvedUser] = useState<MenuUser | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let active = true;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const resolveSession = () => {
      void fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: unknown) => {
          if (active) setResolvedUser(readMenuUser(payload));
        })
        .catch(() => {
          // offlineや一時障害はゲスト表示のままfail closed。
        });
    };

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(resolveSession, { timeout: 1_500 });
      } else {
        timerId = globalThis.setTimeout(resolveSession, 0);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("load", schedule);
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timerId !== null) globalThis.clearTimeout(timerId);
    };
  }, [enabled]);

  const contextValue = useMemo(() => resolvedUser, [resolvedUser]);
  return (
    <MenuUserContext.Provider value={contextValue}>
      {children}
    </MenuUserContext.Provider>
  );
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const providerUser = useContext(MenuUserContext);
  const resolvedUser = user === undefined ? providerUser : user;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!resolvedUser) {
    return (
      <Link
        href="/auth/signin"
        prefetch={false}
        className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
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
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {resolvedUser.image ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 外部OAuth画像のためimg使用 */
          <img src={resolvedUser.image} alt="ユーザーアイコン" width={20} height={20} className="h-5 w-5 rounded-full" />
        ) : (
          <User className="h-4 w-4 text-slate-400" />
        )}
        <span className="max-w-[80px] truncate">{resolvedUser.name ?? resolvedUser.email}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div role="menu" aria-orientation="vertical" className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <p className="truncate px-3 py-2 text-xs text-slate-500">{resolvedUser.email}</p>
            <div className="my-1 border-t border-slate-100" />
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              マイページ
            </Link>
            {PAID_MODE ? (
              <Link
                href="/pricing"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              >
                プランを確認する
              </Link>
            ) : null}
            <form
              action="/api/auth/signout"
              method="POST"
            >
              <button
                type="submit"
                role="menuitem"
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
