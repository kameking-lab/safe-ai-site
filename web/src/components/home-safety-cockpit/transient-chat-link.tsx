"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { beginTransientChatNavigation } from "@/lib/transient-chat-navigation";
import { useTransientQueryBridge } from "./transient-query-bridge";

export function TransientChatLink({
  question,
  children,
  onClick,
  ...anchorProps
}: {
  question: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const router = useRouter();
  const { stageChatQuestion } = useTransientQueryBridge();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const pending = stageChatQuestion(question);
    if (pending) {
      beginTransientChatNavigation();
      router.push("/chatbot");
    }
  };

  return (
    <a
      href="/chatbot"
      data-transient-chat-handoff=""
      {...anchorProps}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
