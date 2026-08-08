"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useOptionalTransientQueryBridge } from "./transient-query-bridge";

type TransientChemicalLinkProps = {
  query: string;
  confirmedCas?: string | null;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

type StageChemicalQuery = NonNullable<
  ReturnType<typeof useOptionalTransientQueryBridge>
>["stageChemicalQuery"];

/**
 * Chemical-query handoff that keeps a free-form name out of URLs, history,
 * storage, logs, and analytics. Modified clicks intentionally open the blank
 * destination because memory-only state cannot be shared safely across tabs.
 */
export function TransientChemicalLink({
  query,
  confirmedCas = null,
  children,
  onClick,
  ...anchorProps
}: TransientChemicalLinkProps) {
  const bridge = useOptionalTransientQueryBridge();

  if (!bridge) {
    return (
      <Link href="/chemical-ra" {...anchorProps} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <StagedChemicalLink
      query={query}
      confirmedCas={confirmedCas}
      stageChemicalQuery={bridge.stageChemicalQuery}
      onClick={onClick}
      {...anchorProps}
    >
      {children}
    </StagedChemicalLink>
  );
}

function StagedChemicalLink({
  query,
  confirmedCas,
  stageChemicalQuery,
  children,
  onClick,
  ...anchorProps
}: TransientChemicalLinkProps & {
  stageChemicalQuery: StageChemicalQuery;
}) {
  const router = useRouter();

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
    const pending = stageChemicalQuery(query, confirmedCas);
    if (!pending) return;
    event.preventDefault();
    router.push("/chemical-ra");
  };

  return (
    <Link href="/chemical-ra" {...anchorProps} onClick={handleClick}>
      {children}
    </Link>
  );
}
