import Image from "next/image";
import type { ReactNode } from "react";

export type ChihuahuaButtonVariant = "tools" | "consult";

const assets = {
  tools: { src: "/mascot/mascot-calculator.webp", width: 274, height: 320 },
  consult: { src: "/mascot/mascot-bow-96.webp", width: 96, height: 96 },
} as const;

/** Decorative content only: the parent keeps its native link/button and handlers. */
export function ChihuahuaButtonContent({
  children,
  variant = "consult",
  trailing,
}: {
  children: ReactNode;
  variant?: ChihuahuaButtonVariant;
  trailing?: ReactNode;
}) {
  const asset = assets[variant];
  return (
    <span data-chihuahua-button-content={variant} className="inline-flex max-w-full items-center justify-center gap-2">
      <Image
        src={asset.src}
        width={asset.width}
        height={asset.height}
        sizes="40px"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none h-10 w-10 shrink-0 object-contain"
      />
      <span className="min-w-0 text-left leading-snug [overflow-wrap:anywhere]">{children}</span>
      {trailing ? <span aria-hidden="true" className="shrink-0">{trailing}</span> : null}
    </span>
  );
}
