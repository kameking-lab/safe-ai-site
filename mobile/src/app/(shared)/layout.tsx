import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { TransientQueryBridgeProvider } from '@/components/home-safety-cockpit/transient-query-bridge';
import { SharedShell } from '../../components/shared-shell';
export default function SharedLayout({ children }: { children: ReactNode }) {
  return <Suspense><TransientQueryBridgeProvider><SharedShell>{children}</SharedShell></TransientQueryBridgeProvider></Suspense>;
}
