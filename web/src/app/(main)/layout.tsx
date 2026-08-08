import { AppShell } from "@/components/app-shell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Footer } from "@/components/footer";
import { DeferredMainEnhancements } from "@/components/deferred-main-enhancements";
import { TransientQueryBridgeProvider } from "@/components/home-safety-cockpit/transient-query-bridge";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransientQueryBridgeProvider>
      <AppShell
        footerSlot={<Footer />}
        // 認証情報はユーザーメニューだけで使う。全ページのserver traceへ
        // Auth/Prismaを混入させず、静的なゲスト表示後にclient側でsessionを解決する。
      >
        {children}
        <MobileBottomNav />
        <DeferredMainEnhancements />
      </AppShell>
    </TransientQueryBridgeProvider>
  );
}
