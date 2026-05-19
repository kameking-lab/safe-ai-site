import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth";
import { FeedbackGateModal } from "@/components/FeedbackGateModal";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CopilotProvider } from "@/components/copilot/CopilotProvider";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let user: { name?: string | null; email?: string | null; image?: string | null } | null = null;
  try {
    const session = await auth();
    user = session?.user ?? null;
  } catch {
    // AUTH_SECRET未設定など認証が利用できない場合はゲスト扱い
  }
  return (
    <CopilotProvider>
      <AppShell user={user}>
        <FeedbackGateModal />
        {children}
        <MobileBottomNav />
      </AppShell>
    </CopilotProvider>
  );
}
