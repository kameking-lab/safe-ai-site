// NextAuth v5 設定
// 必要な環境変数:
//   AUTH_SECRET           - openssl rand -base64 32 で生成
//   AUTH_GOOGLE_ID        - Google Cloud Console から取得
//   AUTH_GOOGLE_SECRET    - Google Cloud Console から取得

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
    // JWT/セッションにplan情報を追加できる
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
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
});
