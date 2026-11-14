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
import { AsyncLocalStorage } from 'node:async_hooks';
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
const identityOnly = new AsyncLocalStorage<boolean>();

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

/**
 * Apple は結果を appleid.apple.com からの POST（form_post）で返す。サイトをまたぐ POST には
 * SameSite=Lax の Cookie が付かないため、戻り先（callback-url）・state・nonce が失われ、
 * アプリへ戻らずトップに着いたり InvalidCheck で失敗したりする。これらの短命な確認用
 * Cookie だけを SameSite=None; Secure にする（セッション Cookie は Lax のまま）。
 */
const httpsDeployment = process.env.VERCEL_ENV === "production" || (process.env.AUTH_URL ?? "").startsWith("https://");
const crossSite = (maxAge?: number) => ({ httpOnly: true, path: "/", secure: true, sameSite: "none" as const, ...(maxAge ? { maxAge } : {}) });
const crossSiteAuthCookies = httpsDeployment
  ? {
      callbackUrl: { name: "__Secure-authjs.callback-url", options: crossSite() },
      state: { name: "__Secure-authjs.state", options: crossSite(900) },
      nonce: { name: "__Secure-authjs.nonce", options: crossSite() },
      pkceCodeVerifier: { name: "__Secure-authjs.pkce.code_verifier", options: crossSite(900) },
    }
  : undefined;

const initialized = isAuthConfigured
  ? NextAuth({
      adapter: reviewSafeAdapter(),
      session: { strategy: "jwt" },
      providers: [
        // Google と Apple はどちらもメールの所有を確認済みで返す。同じメールなら同じ会員に
        // つなぐ（アプリで Apple、ウェブで Google のように使い分けても Pro が共通になる）。
        // 既定のままだと2つ目の方法が OAuthAccountNotLinked で失敗し「ログインできない」になる。
        ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          allowDangerousEmailAccountLinking: true,
        })] : []),
        ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET ? [Apple({
          clientId: process.env.AUTH_APPLE_ID,
          clientSecret: process.env.AUTH_APPLE_SECRET,
          allowDangerousEmailAccountLinking: true,
        })] : []),
        // Registered whenever auth is on; authorize re-checks enable/expiry on every attempt.
        Credentials({
          id: APP_REVIEW_PROVIDER_ID, name: "App Review",
          credentials: { username: { type: "text" }, password: { type: "password" } },
          authorize: (credentials, request) => authorizeAppReview(credentials, request, { db: prisma }),
        }),
      ],
      ...(crossSiteAuthCookies ? { cookies: crossSiteAuthCookies } : {}),
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
        async signIn({ user, account, profile }) {
          // The reserved review identity is reachable only through its code provider.
          if (account?.provider === APP_REVIEW_PROVIDER_ID) return user.id === APP_REVIEW_USER_ID;
          // Email linking is safe only for a verified address.
          if (account?.provider === "google" && (profile as { email_verified?: unknown } | undefined)?.email_verified === false) return false;
          return user.id !== APP_REVIEW_USER_ID && user.email?.toLowerCase() !== APP_REVIEW_EMAIL;
        },
        async session({ session, token }) {
          if (!token.sub || !session.user) return session;
          const userId = token.sub;
          const ledgerEnabled = process.env.MOBILE_LEDGER_ENABLED === 'true';
          const [member, deletion, sub, rights] = await Promise.all([
            prisma ? prisma.user.findUnique({where:{id:userId},select:{id:true}}) : true,
            prisma && ledgerEnabled ? prisma.mobileAccountDeletion.findUnique({where:{userId}}) : null,
            prisma && !ledgerEnabled && !identityOnly.getStore() ? prisma.subscription.findUnique({where:{userId}}).catch(() => {
              console.error("[auth] failed to load subscription", {operation:"load-session-subscription"});
              return null;
            }) : null,
            ledgerEnabled && !identityOnly.getStore() ? getEntitlement(userId) : null,
          ]);
          if (!member || deletion?.status === 'pending') return {...session,user:undefined} as unknown as typeof session;
          const user = session.user as typeof session.user & {id?:string;signedInAt?:string;planName?:string;status?:string};
          user.id = userId;
          if (token.signedInAt) user.signedInAt = String(token.signedInAt);
          user.planName = rights?.plan ?? sub?.planName ?? 'free';
          if (sub) user.status = sub.status;
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
export async function auth(options:{identityOnly?:boolean}={}) {
  // An invalid native credential must not fall back to a different browser-cookie account.
  if ((await headers()).get('authorization')?.startsWith('Bearer ')) return mobileAuthSession();
  return initialized ? identityOnly.run(!!options.identityOnly,()=>initialized.auth()) : noopAuth();
}
