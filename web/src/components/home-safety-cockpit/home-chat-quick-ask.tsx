"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { beginTransientChatNavigation } from "@/lib/transient-chat-navigation";
import { useTransientQueryBridge } from "./transient-query-bridge";
import type { HomeSafetyState } from "./home-types";

const CHAT_INPUT_MAX = 4_000;

function normalizeQuestion(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, CHAT_INPUT_MAX);
}

function ChatQuickAsk({
  onSafetyStateChange,
}: {
  onSafetyStateChange: (state: HomeSafetyState) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { stageChatQuestion } = useTransientQueryBridge();
  const [question, setQuestion] = useState("");
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "emergency" | "privacy" | "error";
    message: string;
  } | null>(null);

  const warmSafetyBoundary = () => {
    router.prefetch("/chatbot");
    void import("@/lib/ai-outbound-safety").catch(() => {
      // Submission repeats this import and fails closed if it is unavailable.
    });
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalized = normalizeQuestion(question);
    if (!normalized) {
      setNotice({ kind: "error", message: "質問を入力してください。" });
      inputRef.current?.focus();
      return;
    }
    if (!navigator.onLine) {
      setNotice({
        kind: "error",
        message:
          "安全確認を完了できないため送信していません。通信回復後に再試行してください。",
      });
      inputRef.current?.focus();
      return;
    }
    setChecking(true);
    setNotice(null);
    try {
      const { inspectAiOutbound } = await import("@/lib/ai-outbound-safety");
      const decision = inspectAiOutbound({
        purpose: "home-chat-quick-ask",
        texts: [normalized],
        consent: true,
        maxChars: CHAT_INPUT_MAX,
        contextPolicy: "approved-server-corpus",
      });
      if (!decision.allowed) {
        if (decision.reason === "emergency") {
          setQuestion("");
          setNotice({ kind: "emergency", message: decision.message });
          onSafetyStateChange("emergency");
        } else {
          setNotice({ kind: "privacy", message: decision.message });
          onSafetyStateChange("normal");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
        return;
      }
      if (!stageChatQuestion(normalized)) {
        setNotice({
          kind: "error",
          message:
            "このタブ内で受け渡しできません。チャットページを開いて質問してください。",
        });
        return;
      }
      onSafetyStateChange("normal");
      void import("@/lib/home-cockpit-telemetry")
        .then(({ trackHomeCockpitEvent }) => {
          trackHomeCockpitEvent("home_chat_start", {
            action_type: "chat",
            destination_route_template: "/chatbot",
          });
        })
        .catch(() => undefined);
      beginTransientChatNavigation();
      router.push("/chatbot");
    } catch {
      setNotice({
        kind: "error",
        message:
          "安全確認を完了できないため送信していません。法令検索またはe-Gov公式資料を利用してください。",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      aria-label="安衛法AIへ質問"
      className="min-w-0 text-sky-950"
      data-home-chat-quick-ask=""
    >
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="home-chat-question" className="sr-only">
          安衛法AIへの質問
        </label>
        <textarea
          ref={inputRef}
          id="home-chat-question"
          rows={2}
          maxLength={CHAT_INPUT_MAX}
          value={question}
          onFocus={warmSafetyBoundary}
          onChange={(event) => {
            setQuestion(event.target.value.slice(0, CHAT_INPUT_MAX));
            setNotice(null);
            onSafetyStateChange("normal");
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="例：フルハーネスの特別教育は必要？"
          className="min-h-[4.5rem] w-full resize-none rounded-lg border-2 border-sky-700 bg-white px-3 py-2 text-base text-slate-950 placeholder:text-slate-500 focus:ring-4 focus:ring-sky-300"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold">法令本文検索</span>
          <button
            type="submit"
            disabled={checking || !question.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-sky-800 px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
          >
            {checking ? "安全確認中" : "質問する"}
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-4">個人情報は入力しない。</p>
      </form>

      {notice?.kind === "emergency" ? (
        <div
          role="alert"
          className="mt-2 rounded-xl border-2 border-rose-700 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-950"
          data-home-chat-emergency=""
        >
          <p>{notice.message}</p>
          <p className="mt-2">
            大量出血時は、可能なら手袋等を使い、清潔な布やガーゼを傷口へ当てて直接圧迫止血を続け、救急隊の指示に従ってください。
          </p>
        </div>
      ) : null}
      {notice?.kind === "privacy" ? (
        <div
          role="alert"
          className="mt-2 rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-950"
          data-home-chat-privacy=""
        >
          <p>{notice.message}</p>
          <p className="mt-1">
            匿名化例：「山田太郎さん」→「作業者A」、「○○病の診断」→「配慮が必要な体調条件」。
          </p>
        </div>
      ) : null}
      {notice?.kind === "error" ? (
        <div
          role="alert"
          className="mt-2 rounded-xl border border-slate-500 bg-white p-3 text-xs font-bold leading-5"
        >
          <p>{notice.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="/law-search" className="underline">
              法令検索
            </a>
            <a
              href="https://laws.e-gov.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              e-Gov公式資料
            </a>
          </div>
        </div>
      ) : null}
      <noscript>
        <style>{`[data-home-chat-quick-ask] form { display: none !important; }`}</style>
        <p className="mt-2">
          <a href="/chatbot" className="font-bold underline">
            安衛法AIで質問する
          </a>
        </p>
      </noscript>
    </section>
  );
}

export function HomeDirectChatClient() {
  const [safetyState, setSafetyState] = useState<HomeSafetyState>("normal");
  return (
    <div data-home-chat-safety-state={safetyState}>
      <ChatQuickAsk onSafetyStateChange={setSafetyState} />
    </div>
  );
}
