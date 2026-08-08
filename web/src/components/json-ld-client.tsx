"use client";

import { useCspNonce } from "@/components/csp-nonce-context";

export function JsonLdClient({ serialized }: { serialized: string }) {
  const nonce = useCspNonce();
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
