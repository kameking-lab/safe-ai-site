"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createKyHandoffPayload,
  writeKyHandoff,
  type KyHandoffPayload,
} from "@/lib/ky/handoff";
import { useClientReady } from "@/lib/use-client-ready";

export type KyHandoffInput = Omit<
  KyHandoffPayload,
  "version" | "createdAt" | "expiresAt"
>;

type Props = {
  handoff: KyHandoffInput;
  children: ReactNode;
  className?: string;
  prefetch?: ComponentProps<typeof Link>["prefetch"];
  onClick?: ComponentProps<typeof Link>["onClick"];
  "data-primary-action"?: string;
};

export function KyHandoffLink({
  handoff,
  children,
  className,
  prefetch = false,
  onClick,
  ...dataProps
}: Props) {
  const router = useRouter();
  const isClientReady = useClientReady();

  return (
    <Link
      href="/ky/paper"
      prefetch={prefetch}
      className={`${className ?? ""} ${isClientReady ? "" : "pointer-events-none"}`.trim()}
      data-ky-handoff-ready={String(isClientReady)}
      aria-disabled={!isClientReady || undefined}
      tabIndex={isClientReady ? undefined : -1}
      onClick={(event) => {
        onClick?.(event);
        if (
          !isClientReady ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        const staged = writeKyHandoff(createKyHandoffPayload(handoff));
        if (!staged) return;
        event.preventDefault();
        router.push("/ky/paper");
      }}
      {...dataProps}
    >
      {children}
    </Link>
  );
}
