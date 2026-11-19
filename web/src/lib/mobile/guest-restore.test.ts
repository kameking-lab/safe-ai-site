// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  currentAlias: '$RCAnonymousID:' + 'a'.repeat(32),
  originalAlias: '$RCAnonymousID:' + 'b'.repeat(32),
  appUserId: 'fixture-devices-store-id',
  checkout: { plan: 'free', source: null },
  pro: { plan: 'pro', source: 'app_store' },
  moved: false,
  legacy: false,
  grantOwner: null as string | null,
  lockApple: vi.fn(),
  updateIdentity: vi.fn(),
  revokeGrants: vi.fn(),
  upsertGrant: vi.fn(),
  updateIntent: vi.fn(),
  verify: vi.fn(),
  fetchSubscriber: vi.fn(),
  fetchOwnership: vi.fn(),
  guest: vi.fn(),
}));

vi.mock('./apple-restore-receipt', () => ({ verifyAppleRestoreReceipt: fixtures.verify }));
vi.mock('./session', () => ({ isGuestUser: fixtures.guest, digest: (value: string) => value }));
vi.mock('./revenuecat', async importActual => ({
  ...await importActual<typeof import('./revenuecat')>(),
  fetchSubscriber: fixtures.fetchSubscriber,
  fetchAppleOwnership: fixtures.fetchOwnership,
  verifyAppleLegacyPurchase: vi.fn(async () => true),
}));
vi.mock('./billing-service', async importActual => {
  const actual = await importActual<typeof import('./billing-service')>();
  const tx = {
    mobileIdentity: {
      findUnique: async ({ where }: { where: { userId?: string; appUserId?: string; appleGuestAppUserId?: string } }) => {
        const newGuest = { userId: 'new-guest', appUserId: fixtures.appUserId,
          appleGuestAppUserId: fixtures.moved ? fixtures.originalAlias : fixtures.currentAlias };
        const oldGuest = { userId: 'old-guest', appUserId: 'original-store-id',
          appleGuestAppUserId: fixtures.moved ? fixtures.currentAlias : fixtures.originalAlias };
        return [newGuest, oldGuest].find(row => where.userId === row.userId || where.appUserId === row.appUserId
          || where.appleGuestAppUserId === row.appleGuestAppUserId) ?? null;
      },
      update: fixtures.updateIdentity,
    },
    mobileSession: { findUnique: async () => ({ userId: 'new-guest', expiresAt: new Date(Date.now() + 60000) }) },
    mobileGrant: {
      findUnique: async () => fixtures.grantOwner ? { userId: fixtures.grantOwner } : null,
      findMany: async () => fixtures.legacy ? [{ id: 'legacy', userId: 'old-guest', originalTransactionId: '100' }] : [],
      updateMany: fixtures.revokeGrants,
      upsert: fixtures.upsertGrant,
    },
    mobilePurchaseIntent: { updateMany: fixtures.updateIntent },
  };
  return {
    ...actual,
    billingDb: () => ({ ...tx, $transaction: async (run: (db: typeof tx) => Promise<unknown>) => run(tx) }),
    lockMember: async () => {},
    lockAppleReconciliation: fixtures.lockApple,
    entitlementInTransaction: async (_db: unknown, id: string) => id === fixtures.grantOwner ? fixtures.pro : fixtures.checkout,
  };
});
import { restoreGuestStorePurchase } from './guest-restore';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID', 'fixture-monthly');
  fixtures.moved = false;
  fixtures.legacy = false;
  fixtures.grantOwner = null;
  fixtures.guest.mockResolvedValue(true);
  fixtures.verify.mockResolvedValue({ transactionId: '200', originalTransactionId: '100', expiresAt: Date.now() + 86400000, environment: 'SANDBOX' });
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();
  fixtures.fetchSubscriber.mockResolvedValue({ subscriber: {
    original_app_user_id: fixtures.originalAlias,
    entitlements: { anzen_pro: { product_identifier: 'fixture-monthly', expires_date: future, purchase_date: now } },
    subscriptions: { 'fixture-monthly': {
      expires_date: future, original_purchase_date: now, store: 'app_store', is_sandbox: true, store_transaction_id: '200',
    } },
  } });
  fixtures.fetchOwnership.mockResolvedValue({
    key: 'rc:stable-subscription', storeTransactionId: '200',
    customerId: fixtures.originalAlias, originalCustomerId: fixtures.originalAlias,
  });
  fixtures.upsertGrant.mockImplementation(async () => { fixtures.grantOwner = 'new-guest'; });
  fixtures.updateIdentity.mockImplementation(async ({ where, data }) => {
    if (where.userId === 'new-guest' && data.appleGuestAppUserId === fixtures.originalAlias) fixtures.moved = true;
  });
});
afterEach(() => vi.unstubAllEnvs());

const restore = () => restoreGuestStorePurchase('new-guest', 'guest-token', fixtures.appUserId, 'signed-storekit-transaction');

it('rejects unsigned input at the Apple verifier boundary', async () => {
  const { verifyAppleRestoreReceipt } = await vi.importActual<typeof import('./apple-restore-receipt')>('./apple-restore-receipt');
  await expect(verifyAppleRestoreReceipt('forged-storekit-transaction', 'fixture-monthly')).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
});

it('restores a new renewal even before it reaches the ledger and revokes old guest grants', async () => {
  fixtures.legacy = true;
  await expect(restore()).resolves.toMatchObject({ plan: 'pro' });
  expect(fixtures.fetchOwnership).toHaveBeenCalledWith(fixtures.currentAlias, 'SANDBOX', fetch, [fixtures.currentAlias, fixtures.originalAlias]);
  expect(fixtures.lockApple).toHaveBeenCalledExactlyOnceWith(expect.anything());
  expect(fixtures.revokeGrants).toHaveBeenCalledExactlyOnceWith({
    where: { id: 'legacy', provider: 'app_store', environment: 'SANDBOX' },
    data: { revoked: true, checkedAt: expect.any(Date) },
  });
  expect(fixtures.upsertGrant).toHaveBeenCalledExactlyOnceWith({
    where: { provider_originalTransactionId_environment: { provider: 'app_store', originalTransactionId: 'rc:stable-subscription', environment: 'SANDBOX' } },
    create: expect.objectContaining({ userId: 'new-guest', expiresAt: expect.any(Date) }),
    update: expect.objectContaining({ userId: 'new-guest', revoked: false }),
  });
  expect(fixtures.updateIdentity).toHaveBeenCalledWith({
    where: { userId: 'new-guest' }, data: { appleGuestAppUserId: fixtures.originalAlias, billingEnvironment: 'SANDBOX' },
  });
  expect(fixtures.grantOwner).toBe('new-guest');
});

it('moves an existing grant once when a restore request is retried', async () => {
  fixtures.grantOwner = 'old-guest';
  await expect(restore()).resolves.toMatchObject({ plan: 'pro' });
  await expect(restore()).resolves.toMatchObject({ plan: 'pro' });
  expect(fixtures.upsertGrant).toHaveBeenCalledTimes(1);
  expect(fixtures.grantOwner).toBe('new-guest');
});

it('does not transfer on an alias alone or on a signed receipt for a different purchase', async () => {
  fixtures.verify.mockRejectedValueOnce(new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT'));
  await expect(restore()).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  expect(fixtures.fetchSubscriber).not.toHaveBeenCalled();
  fixtures.verify.mockResolvedValue({ transactionId: '300', originalTransactionId: '201', environment: 'SANDBOX' });
  await expect(restore()).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  expect(fixtures.upsertGrant).not.toHaveBeenCalled();
});

it('keeps a purchase that was already linked to a signed-in account', async () => {
  fixtures.guest.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(restore()).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  expect(fixtures.upsertGrant).not.toHaveBeenCalled();
});

it('preserves a ledger grant held by a third account even with current store evidence', async () => {
  fixtures.grantOwner = 'third-account';
  await expect(restore()).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
  expect(fixtures.revokeGrants).not.toHaveBeenCalled();
  expect(fixtures.upsertGrant).not.toHaveBeenCalled();
  expect(fixtures.grantOwner).toBe('third-account');
});
