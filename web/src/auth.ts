// NextAuth v5 設定
// 必要な環境変数:
//   AUTH_SECRET           - openssl rand -base64 32 で生成
//   AUTH_GOOGLE_ID        - Google Cloud Console から取得
//   AUTH_GOOGLE_SECRET    - Google Cloud Console から取得
//   AUTH_APPLE_ID / AUTH_APPLE_SECRET - Apple Services ID / client-secret JWT
//   DATABASE_URL          - 省略可。設定時はPrisma経由でUser/Subscriptionを永続化
//   APP_REVIEW_LOGIN_ENABLED / APP_REVIEW_CODE_SHA256 / APP_REVIEW_EXPIRES_AT
//                         - App Store審査用ログイン（src/lib/app-review.ts）

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import type { Adapter } from "next-auth/adapters";
import { APP_REVIEW_EMAIL, APP_REVIEW_PROVIDER_ID, APP_REVIEW_USER_ID, appReviewTokenValid, appReviewVersion, authorizeAppReview } from "@/lib/app-review";
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
    (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) ||
    process.env.APP_REVIEW_LOGIN_ENABLED === "true"),
);

// Auth.js links a new OAuth account to the signed-in user. Never let that
// attach a real Google/Apple identity to the reserved App Review member.
function reviewSafeAdapter(): Adapter | undefined {
  if (!prisma) return undefined;
  const adapter = PrismaAdapter(prisma);
  const linkAccount = adapter.linkAccount;
  if (linkAccount) adapter.linkAccount = async (account) => {
    if (account.userId === APP_REVIEW_USER_ID) throw new Error("review_account_link_forbidden");
    await linkAccount(account);
  };
  return adapter;
}

const initialized = isAuthConfigured
  ? NextAuth({
      adapter: reviewSafeAdapter(),
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
        // Registered whenever auth is on; authorize re-checks enable/expiry on every attempt.
        Credentials({
          id: APP_REVIEW_PROVIDER_ID, name: "App Review",
          credentials: { username: { type: "text" }, password: { type: "password" } },
          authorize: (credentials, request) => authorizeAppReview(credentials, request, { db: prisma }),
        }),
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
        async signIn({ user, account }) {
          // The reserved review identity is reachable only through its code provider.
          if (account?.provider === APP_REVIEW_PROVIDER_ID) return user.id === APP_REVIEW_USER_ID;
          return user.id !== APP_REVIEW_USER_ID && user.email?.toLowerCase() !== APP_REVIEW_EMAIL;
        },
        async session({ session, token }) {
          if(prisma && token.sub && !await prisma.user.findUnique({where:{id:token.sub},select:{id:true}}))return {...session,user:undefined} as unknown as typeof session;
          if(prisma && token.sub && process.env.MOBILE_LEDGER_ENABLED==='true' && (await prisma.mobileAccountDeletion.findUnique({where:{userId:token.sub}}))?.status==='pending')return {...session,user:undefined} as unknown as typeof session;
          if(token.signedInAt && session.user)(session.user as {signedInAt?:string}).signedInAt=String(token.signedInAt);
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
        async jwt({ token, user, account }) {
          if (user) {
            token.sub = user.id;
            token.signedInAt = new Date().toISOString();
            if (user.id === APP_REVIEW_USER_ID) token.reviewVersion = appReviewVersion() ?? undefined;
            if(prisma&&account?.provider==='apple'&&account.refresh_token)await prisma.account.updateMany({where:{userId:user.id,provider:'apple'},data:{refresh_token:account.refresh_token,access_token:account.access_token}});
          }
          // Disabling, expiring or rotating the review code signs the reviewer out.
          if (!appReviewTokenValid(token)) return null;
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
