import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChatbotClientBridge } from "./ChatbotClientBridge";

export function ChatbotBody() {
  return (
    <PageContainer width="wide">
      <style>{`
        html.js-enabled [data-chatbot-page] .chatbot-client-enhanced {
          display: flex;
          min-height: 0;
          flex: 1 1 0%;
        }
        @media (max-width: 480px) and (max-height: 32rem) {
          body:has([data-chatbot-page]) [data-mobile-nav="bottom"] {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          body:has([data-chatbot-page] [data-chatbot-composer]:focus-within)
            [data-mobile-nav="bottom"] {
            display: none !important;
          }
        }
      `}</style>
      <section
        className="mx-auto flex min-h-0 w-full max-w-3xl flex-col"
        style={{ height: "clamp(20rem, calc(100dvh - 9rem), 52rem)" }}
        aria-labelledby="chatbot-title"
      >
        <header className="mb-2 shrink-0 px-1 sm:mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              id="chatbot-title"
              className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl"
            >
              安衛法AI
            </h1>
            <StatusBadge tone="neutral" size="sm">
              法令本文検索
            </StatusBadge>
          </div>
          <div className="mt-1 flex min-h-11 items-center gap-3">
            <p className="min-w-0 flex-1 text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
              作業や設備について、普段の言葉で質問できます。
            </p>
            <Link
              href="/about/usage-notes"
              className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline dark:text-slate-300 dark:hover:text-white"
            >
              注意事項
            </Link>
          </div>
        </header>

        <noscript>
          <form
            method="post"
            action="/api/chatbot/no-script"
            className="scroll-mb-[calc(var(--mobile-bottom-nav-h,56px)+env(safe-area-inset-bottom,0px)+1rem)] rounded-2xl border border-slate-200 bg-white p-3 pb-[calc(var(--mobile-bottom-nav-h,56px)+env(safe-area-inset-bottom,0px)+1rem)] dark:border-slate-700 dark:bg-slate-950 lg:pb-3"
          >
            <label
              htmlFor="chatbot-no-script-message"
              className="text-sm font-semibold text-slate-900 dark:text-white"
            >
              質問入力
            </label>
            <textarea
              id="chatbot-no-script-message"
              name="message"
              required
              maxLength={4000}
              rows={3}
              placeholder="作業や設備を質問"
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                個人情報は入力しない
              </p>
              <button
                type="submit"
                className="min-h-11 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
              >
                送信
              </button>
            </div>
          </form>
        </noscript>
        <div className="chatbot-client-enhanced" data-chatbot-client="">
          <Suspense fallback={<ChatbotLoadingState />}>
            <ChatbotClientBridge />
          </Suspense>
        </div>
      </section>
    </PageContainer>
  );
}

function ChatbotLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-[260px] rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
    >
      <span className="sr-only">読み込み中</span>
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none dark:bg-slate-800" />
      <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none dark:bg-slate-800" />
    </div>
  );
}
