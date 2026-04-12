// NextAuth v5 設定
// 必要な環境変数:
//   AUTH_SECRET           - openssl rand -base64 32 で生成
//   AUTH_GOOGLE_ID        - Google Cloud Console から取得
//   AUTH_GOOGLE_SECRET    - Google Cloud Console から取得

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// AUTH_SECRET 未設定時はスタブを返してコンソールエラーを抑制する
const noopHandler = () => new Response(null, { status: 404 });
const noopAuth = async () => null;

const initialized = process.env.AUTH_SECRET
  ? NextAuth({
      providers: [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ],
      pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
      },
      callbacks: {
        // サブスクリプション状態はStripe webhookで付与する想定
        async session({ session, token }) {
          if (token.sub) {
            (session.user as { id?: string }).id = token.sub;
          }
          return session;
        },
        async jwt({ token, user }) {
          if (user) {
            token.sub = user.id;
          }
          return token;
        },
      },
    })
  : null;

export const handlers = initialized?.handlers ?? {
  GET: noopHandler,
  POST: noopHandler,
};
export const signIn = initialized?.signIn ?? noopAuth;
export const signOut = initialized?.signOut ?? noopAuth;
export const auth = initialized?.auth ?? noopAuth;
