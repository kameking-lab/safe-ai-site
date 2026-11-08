import type Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";

/**
 * この Stripe アカウントは過去問AIと共用。過去問AIの購入・更新イベントも安全AIの Webhook に届く。
 * 安全AIの会員（Stripe 顧客の対応表・metadata.userId）に当たらないイベントは
 * 何も変更せず「対象外」として 200 で受け流す（失敗を返し続けると Stripe が送信先を止める）。
 * 価格IDでは判定しない（同じ価格を両サービスで使っていても取り違えないため）。安全AIの購入は
 * Checkout 作成前に顧客の対応表を必ず保存するので、安全AIのイベントは必ず対応表に当たる。
 * 安全AIの会員に当たるものは従来どおり処理し、所有者の食い違いは引き続き失敗として扱う。
 */
type ScopeDb = Pick<PrismaClient, "subscription" | "user">;

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

/** true のときだけ受け流す。判断できない（顧客IDが無い等）イベントは false＝従来どおり処理する。 */
export async function isForeignStripeEvent(database: ScopeDb, event: Stripe.Event): Promise<boolean> {
  const object = event.data.object as unknown as Record<string, unknown>;
  const customer = objectId(object.customer as string | { id: string } | null | undefined);
  if (!customer) return false;
  if (await database.subscription.findUnique({ where: { stripeCustomerId: customer }, select: { userId: true } })) return false;
  const metadataUser = (object.metadata as Record<string, string> | null | undefined)?.userId;
  if (metadataUser && (await database.user.findUnique({ where: { id: metadataUser }, select: { id: true } }))) return false;
  return true;
}
