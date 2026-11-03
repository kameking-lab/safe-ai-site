// NextAuth v5 設定
// 必要な環境変数:
//   AUTH_SECRET           - openssl rand -base64 32 で生成
//   AUTH_GOOGLE_ID        - Google Cloud Console から取得
//   AUTH_GOOGLE_SECRET    - Google Cloud Console から取得
//   DATABASE_URL          - 省略可。設定時はPrisma経由でUser/Subscriptionを永続化

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { mobileAuthSession } from "@/lib/mobile/session";
import { getEntitlement } from "@/lib/mobile/billing-service";
import { headers } from 'next/headers';
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

// AUTH_SECRET 未設定時はスタブを返してコンソールエラーを抑制する
const noopHandler = () => new Response(null, { status: 404 });
const noopAuth = async () => null;

export const isAuthConfigured = Boolean(
  externalCredentialedServicesAllowed() &&
  process.env.AUTH_SECRET &&
  ((process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) ||
    (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET)),
);

const initialized = isAuthConfigured
  ? NextAuth({
      adapter: prisma ? PrismaAdapter(prisma) : undefined,
      session: { strategy: "jwt" },
      providers: [
        ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        })] : []),
        ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET ? [Apple({
          clientId: process.env.AUTH_APPLE_ID,
          clientSecret: process.env.AUTH_APPLE_SECRET,
        })] : []),
      ],
      pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
      },
      events: {
        async createUser({ user }) {
          if (!prisma || !user.id) return;
          try {
            await prisma.subscription.create({
              data: {
                userId: user.id,
                planName: "free",
                status: "active",
              },
            });
          } catch {
            console.error("[auth] failed to create subscription", {
              operation: "create-default-subscription",
            });
          }
        },
      },
      callbacks: {
        async session({ session, token }) {
          if (token.sub) {
            (session.user as { id?: string }).id = token.sub;
          }
          if (prisma && token.sub) {
            try {
              const sub = await prisma.subscription.findUnique({
                where: { userId: token.sub },
              });
              if (sub) {
                (
                  session.user as { planName?: string; status?: string }
                ).planName = sub.planName;
                (
                  session.user as { planName?: string; status?: string }
                ).status = sub.status;
              } else {
                (session.user as { planName?: string }).planName = "free";
              }
            } catch {
              console.error("[auth] failed to load subscription", {
                operation: "load-session-subscription",
              });
              (session.user as { planName?: string }).planName = "free";
            }
          } else {
            (session.user as { planName?: string }).planName = "free";
          }
          if (token.sub && process.env.MOBILE_LEDGER_ENABLED === 'true') {
            const rights = await getEntitlement(token.sub);
            (session.user as {planName?: string}).planName = rights.plan;
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
export async function auth() {
  // An invalid native credential must not fall back to a different browser-cookie account.
  if ((await headers()).get('authorization')?.startsWith('Bearer ')) return mobileAuthSession();
  return initialized ? initialized.auth() : noopAuth();
}
