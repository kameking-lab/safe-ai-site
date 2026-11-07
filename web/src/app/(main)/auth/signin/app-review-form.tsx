import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { PrivacyNote } from "@/components/privacy-note";
import { APP_REVIEW_PROVIDER_ID } from "@/lib/app-review";

// Rendered only while the server-side App Review login is enabled and unexpired.
// Works without JavaScript so it also runs inside the iOS in-app browser.
export function AppReviewSignInForm({ redirectTo, failed }: { redirectTo: string; failed: boolean }) {
  async function submit(formData: FormData) {
    "use server";
    try {
      await signIn(APP_REVIEW_PROVIDER_ID, {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo,
      });
    } catch (error) {
      // Success throws Next's redirect; only a rejected sign-in is turned into a message.
      if (error instanceof AuthError) redirect(`/auth/signin?reviewError=1&callbackUrl=${encodeURIComponent(redirectTo)}`);
      throw error;
    }
  }
  return (
    <details className="mt-6 border-t border-slate-200 pt-4 text-left text-sm text-slate-700" open={failed}>
      <summary className="cursor-pointer font-semibold">App Store審査用ログイン (App Review sign-in)</summary>
      <form action={submit} className="mt-3 flex flex-col gap-3">
        <label htmlFor="app-review-username">ユーザー名 (Username)</label>
        <input id="app-review-username" name="username" type="text" autoComplete="username" autoCapitalize="none" required maxLength={64} className="rounded-lg border border-slate-300 px-3 py-2" />
        <label htmlFor="app-review-password">パスワード (Password)</label>
        <input id="app-review-password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="rounded-lg border border-slate-300 px-3 py-2" />
        <button type="submit" className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">審査用アカウントでログイン (Sign in)</button>
        {failed ? <p role="alert" className="text-red-700">ログインできませんでした。入力内容を確認し、時間をおいてお試しください。(Sign-in failed.)</p> : null}
        <PrivacyNote variant="signin" />
      </form>
    </details>
  );
}
