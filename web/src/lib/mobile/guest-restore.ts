import {
  billingDb, entitlementInTransaction, findAppleLedgerEntries, lockAppleReconciliation, lockMember, recordAppleGrant,
} from './billing-service';
import { appleGrantForEnvironment, fetchAppleOwnership, fetchSubscriber, subscriberSchema } from './revenuecat';
import { digest, isGuestUser } from './session';
import { verifyAppleRestoreReceipt } from './apple-restore-receipt';

/** Restore a purchase on a fresh installation only with both Apple and RevenueCat evidence. */
export async function restoreGuestStorePurchase(userId: string, token: string, appUserId: string, signedTransaction: string) {
  const db = billingDb();
  const current = await db.mobileIdentity.findUnique({ where: { userId } });
  const alias = current?.appleGuestAppUserId;
  if (!alias || current.appUserId !== appUserId) throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  const productId = process.env.REVENUECAT_IOS_PRODUCT_ID;
  if (!productId) throw new Error('ENTITLEMENT_SYNC_PENDING');
  const receipt = await verifyAppleRestoreReceipt(signedTransaction, productId);
  const subscriber = subscriberSchema.parse(await fetchSubscriber(alias));
  const originalAlias = subscriber.subscriber.original_app_user_id;
  if (!originalAlias) throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  const original = await db.mobileIdentity.findUnique({ where: { appleGuestAppUserId: originalAlias } });
  if (!original) throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');

  return db.$transaction(async tx => {
    for (const id of [...new Set([userId, original.userId])].sort()) await lockMember(tx, id);
    await lockAppleReconciliation(tx);
    const session = await tx.mobileSession.findUnique({ where: { tokenHash: digest(token) } });
    if (session?.userId !== userId || session.expiresAt <= new Date()) throw new Error('UNAUTHORIZED');
    const [stillCurrent, stillOriginal] = await Promise.all([
      tx.mobileIdentity.findUnique({ where: { appleGuestAppUserId: alias } }),
      tx.mobileIdentity.findUnique({ where: { appleGuestAppUserId: originalAlias } }),
    ]);
    if (stillCurrent?.userId !== userId || stillOriginal?.userId !== original.userId
      || !await isGuestUser(userId, tx) || !await isGuestUser(original.userId, tx)) {
      throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    }

    const aliases = [alias, originalAlias];
    const evidence = await appleGrantForEnvironment(alias, subscriber, productId, receipt.environment, aliases);
    if (!evidence) throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    const { grant } = evidence;
    const rights = await entitlementInTransaction(tx, userId, 'app');
    if (rights.plan === 'pro' && (!rights.sandbox || receipt.environment === 'SANDBOX')) return rights;
    if (rights.purchasePending && rights.purchaseSource !== 'app_store') throw new Error('PURCHASE_PENDING');
    const verified = evidence.ownership ?? await fetchAppleOwnership(alias, receipt.environment, fetch, aliases);
    const matchesLatest = verified.storeTransactionId === receipt.transactionId;
    const matchesActiveOriginal = verified.storeTransactionId === receipt.originalTransactionId && receipt.expiresAt > Date.now();
    if (verified.originalCustomerId !== originalAlias || (!matchesLatest && !matchesActiveOriginal)) {
      throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    }

    const checkedAt = new Date();
    if (grant.expiresAt <= checkedAt) throw new Error('ENTITLEMENT_SYNC_PENDING');
    const entries = await findAppleLedgerEntries(tx, userId, receipt.environment, grant, verified, checkedAt);
    const priorOwners = [entries.owner, ...entries.legacy];
    if (priorOwners.some(owner => owner && owner.userId !== original.userId && owner.userId !== userId)) {
      throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    }
    await recordAppleGrant(tx, entries, userId, grant, checkedAt);

    // RevenueCat may keep the original anonymous customer after aliasing.
    // Retain its canonical ID with the active grant so future sync targets it.
    const swapAliases = original.userId !== userId && verified.customerId === originalAlias;
    if (swapAliases) {
      await tx.mobileIdentity.update({ where: { userId: original.userId }, data: { appleGuestAppUserId: null } });
    }
    await tx.mobileIdentity.update({
      where: { userId }, data: { appleGuestAppUserId: verified.customerId, billingEnvironment: receipt.environment },
    });
    if (swapAliases) {
      await tx.mobileIdentity.update({ where: { userId: original.userId }, data: { appleGuestAppUserId: alias } });
    }
    await tx.mobilePurchaseIntent.updateMany({
      where: { userId, source: 'app_store', status: 'pending' }, data: { status: 'completed', stage: 'completed' },
    });
    return entitlementInTransaction(tx, userId, 'app');
  }, { timeout: 20000 });
}
