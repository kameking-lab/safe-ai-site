import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isAuthConfigured, signIn } from "@/auth";
import { withSiteOpenGraph } from "@/lib/seo-metadata";
import { appReviewConfig } from "@/lib/app-review";
import { AppReviewSignInForm } from "./app-review-form";
import { allowedSignInCallback, NATIVE_SIGNIN_CALLBACK } from "@/lib/auth-callback";

export const metadata: Metadata = {
  title: "ログイン",
  description: "安全AIポータルにログインします。",
  alternates: { canonical: "/auth/signin" },
  robots: { index: false, follow: false },
  openGraph: withSiteOpenGraph("/auth/signin", {
    title: "ログイン",
    description: "安全AIポータルにログインします。",
  }),
};

const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  ...[0, 1, 2, 3].flatMap((i) => [`__Secure-authjs.session-token.${i}`, `authjs.session-token.${i}`]),
];

/**
 * ログインを押した時点のブラウザのセッションを捨ててから始める。
 * 残っていると Auth.js は「今のログイン中の会員」に新しい Google/Apple をつなごうとし、
 * その Google が別の会員のものだと OAuthAccountNotLinked
 * （"already associated with another user"）で失敗する（2026-11-09 本番ログで確認）。
 */
async function clearBrowserSession() {
  const jar = await cookies();
  for (const name of SESSION_COOKIES) {
    if (!jar.get(name)) continue;
    // __Secure- 付きの Cookie は Secure 属性つきでないと削除の指示も受け付けられない。
    jar.set(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: name.startsWith("__Secure-") });
  }
}

/** ログイン画面は「Googleでログイン」「Appleでサインイン」の2つのボタンと、小さな1行だけ。 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; reviewError?: string }> }) {
  const params = await searchParams;
  const requested = params.callbackUrl;
  const nativeFlow = typeof requested === "string" && NATIVE_SIGNIN_CALLBACK.test(requested);
  // 許可した戻り先（アプリへの受け渡し・Pro の購入開始）だけを使い、それ以外はトップへ。
  const redirectTo = allowedSignInCallback(requested) ?? "/";
  const appleReady = !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
  const googleReady = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const reviewReady = isAuthConfigured && appReviewConfig() !== null;
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-center text-xl font-bold text-slate-900">ログイン</h1>
      {isAuthConfigured ? (
        <div className="space-y-3">
          {googleReady ? (
            <form
              action={async () => {
                "use server";
                await clearBrowserSession();
                await signIn("google", { redirectTo }, nativeFlow ? { prompt: "select_account" } : undefined);
              }}
            >
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Googleでログイン
              </button>
            </form>
          ) : null}
          {appleReady ? (
            <form
              action={async () => {
                "use server";
                await clearBrowserSession();
                await signIn("apple", { redirectTo });
              }}
            >
              <button type="submit" className="min-h-12 w-full rounded-xl bg-black px-5 py-3 text-base font-semibold text-white">
                Appleでサインイン
              </button>
            </form>
          ) : null}
          {reviewReady ? <AppReviewSignInForm redirectTo={redirectTo} failed={params.reviewError === "1"} /> : null}
          <p className="pt-2 text-center text-[11px] leading-4 text-slate-500">
            ログインで<a href="/terms" className="underline">利用規約</a>・<a href="/privacy" className="underline">プライバシーポリシー</a>に同意したものとみなします。
          </p>
        </div>
      ) : (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-6 text-amber-900">
          現在、ログイン機能は準備中です。KY・打合せ書等は端末内保存で利用できますが、クラウド同期は行われません。
        </div>
      )}
    </div>
  );
}
