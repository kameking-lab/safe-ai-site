"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "thinking" | "researching" | "idea";
type Feedback = { id: string; phase: Phase };

/** Timers affect only the mascot; response text never waits for an animation. */
export function useChatMascot() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const active = useRef<Feedback | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimer = useCallback(() => clearTimeout(timer.current), []);
  useEffect(() => clearTimer, [clearTimer]);

  const cancel = useCallback((id?: string) => {
    if (id && active.current?.id !== id) return;
    clearTimer();
    active.current = null;
    setFeedback(null);
  }, [clearTimer]);

  const start = useCallback((id: string) => {
    clearTimer();
    active.current = { id, phase: "thinking" };
    setFeedback(active.current);
    timer.current = setTimeout(() => {
      if (active.current?.id !== id || active.current.phase !== "thinking") return;
      active.current = { id, phase: "researching" };
      setFeedback(active.current);
    }, 2_000);
  }, [clearTimer]);

  const answer = useCallback((id: string) => {
    if (active.current?.id !== id || active.current.phase === "idea") return;
    clearTimer();
    active.current = { id, phase: "idea" };
    setFeedback(active.current);
    timer.current = setTimeout(() => cancel(id), 1_200);
  }, [cancel, clearTimer]);

  return { feedback, start, answer, cancel };
}

/** Native picture preserves animation and selects a still without downloading motion. */
export function ChatThinking({ phase }: { phase: Phase }) {
  const asset = `/mascot/chat-${phase}`;
  return <div role="status" aria-label={phase === "idea" ? "回答を表示中" : "回答を作成中"} data-chat-thinking="" data-chat-mascot={phase} className="flex justify-start py-2">
    <picture key={phase}>
      <source media="(prefers-reduced-motion: reduce)" srcSet={`${asset}-still.webp`} type="image/webp" />
      <source media="(prefers-reduced-motion: reduce)" srcSet={`${asset}-still.png`} type="image/png" />
      <source srcSet={`${asset}.webp`} type="image/webp" />
      <img src={`${asset}.gif`} alt="" width={144} height={144} decoding="sync" fetchPriority="high" className="h-36 w-36 rounded-2xl bg-white object-contain" />
    </picture>
  </div>;
}
