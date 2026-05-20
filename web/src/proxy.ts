// Next.js 16 プロキシ（旧 middleware）
// 認証が必要なルートを保護する
// 現在は保護ルートなし（Phase 4-3 完成時に有効化）

// AUTH_SECRET が未設定の場合は認証をスキップしてエラーを防ぐ
export function proxy() {
  if (!process.env.AUTH_SECRET) return;

  // 将来: 有料プランのみアクセス可能なルートをここで制御
  // const isPremiumRoute = req.nextUrl.pathname.startsWith("/dashboard");
  // if (isPremiumRoute && !req.auth) {
  //   return Response.redirect(new URL("/auth/signin", req.url));
  // }
  return;
}

export const config = {
  // Phase 4-3 まで保護ルート未実装のため、実在しないパスのみマッチさせて
  // Edge Function 起動を防ぐ (docs/perf/edge-isr-followup-2026-05-19.md)。
  // Phase 4-3 で /account/* や /dashboard/* を保護するときに matcher を戻す。
  matcher: ["/_proxy-disabled-until-phase-4-3/:path*"],
};
