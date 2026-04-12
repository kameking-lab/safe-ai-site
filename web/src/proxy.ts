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
  // 静的ファイルとNext.js内部ルートは除外
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
