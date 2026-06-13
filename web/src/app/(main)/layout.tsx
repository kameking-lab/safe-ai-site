import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth";
import { FeedbackGateModal } from "@/components/FeedbackGateModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";
import { UserMenu } from "@/components/user-menu";

// C-1: layout 直下で await auth() すると (main) 全ページの静的プリレンダーが
// app/loading.tsx 境界ごとサスペンドし、「スケルトン先行ペイント→本文スワップ」が
// 静的HTMLに焼き込まれて LCP 遅延・間欠 CLS の根因になっていた。
// 認証結果はヘッダーのユーザーメニューでしか使わないため、同寸フォールバック
// （ゲスト表示＝静的ページの焼き込み内容と同一）付きの極小 Suspense スロットに
// 隔離し、シェル全体は初回フラッシュで確定させる。
async function UserMenuSlot() {
  let user: { name?: string | null; email?: string | null; image?: string | null } | null = null;
  try {
    const session = await auth();
    user = session?.user ?? null;
  } catch {
    // AUTH_SECRET未設定など認証が利用できない場合はゲスト扱い
  }
  return <UserMenu user={user} />;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CopilotProvider>
      <AppShell
        userSlot={
          <Suspense fallback={<UserMenu user={null} />}>
            <UserMenuSlot />
          </Suspense>
        }
      >
        <FeedbackGateModal />
        {children}
        <MobileBottomNav />
      </AppShell>
    </CopilotProvider>
  );
}
