// @vitest-environment node
import { Environment, InAppOwnershipType, SignedDataVerifier } from '@apple/app-store-server-library';
import { afterEach, expect, it, vi } from 'vitest';
import { verifyAppleRestoreReceipt } from './apple-restore-receipt';

afterEach(() => vi.restoreAllMocks());

it('uses the signed iOS bundle ID for production and sandbox transactions', async () => {
  const verify = vi.spyOn(SignedDataVerifier.prototype, 'verifyAndDecodeTransaction');
  const expiresDate = Date.now() + 60000;
  verify.mockRejectedValueOnce(new Error('sandbox transaction')).mockResolvedValueOnce({
    productId: 'fixture-monthly', transactionId: '200', originalTransactionId: '100', expiresDate,
    inAppOwnershipType: InAppOwnershipType.PURCHASED,
  });
  await expect(verifyAppleRestoreReceipt('signed-transaction', 'fixture-monthly')).resolves.toMatchObject({
    transactionId: '200', originalTransactionId: '100', expiresAt: expiresDate, environment: 'SANDBOX',
  });
  expect(verify.mock.contexts[0]).toMatchObject({
    bundleId: 'jp.anzen-ai-portal.app', appAppleId: 6831079439, environment: Environment.PRODUCTION,
  });
  expect(verify.mock.contexts[1]).toMatchObject({
    bundleId: 'jp.anzen-ai-portal.app', environment: Environment.SANDBOX,
  });
});
