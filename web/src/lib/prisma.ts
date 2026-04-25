// Prismaクライアントのシングルトン。
// DATABASE_URL未設定時はnullをexportし、呼び出し側でguardする想定。
//
// 必要な環境変数:
//   DATABASE_URL - Postgres接続文字列 (Vercel Postgres等)

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | null | undefined;
}

function createClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (err) {
    console.error("[prisma] failed to instantiate client:", err);
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalThis.__prismaClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaClient = prisma;
}
