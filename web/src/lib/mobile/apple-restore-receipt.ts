import { Environment, InAppOwnershipType, SignedDataVerifier } from '@apple/app-store-server-library';

// Apple Root CA - G3 (https://www.apple.com/certificateauthority/).
// Host the trust anchor with the verifier so restore has no extra external API dependency.
const appleRoot = Buffer.from(`
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9v
dCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UE
CgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2
WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmlj
YXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqG
SM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxE
tX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNC
MEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0P
AQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3m
eoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkL
F1vLUagM6BgD56KyKA==
`, 'base64');

// mobile/scripts/configure-ios.rb sets the App Store bundle ID during signing.
const bundleId = 'jp.anzen-ai-portal.app';
const verifiers = [
  { environment: 'PRODUCTION', verifier: new SignedDataVerifier([appleRoot], false, Environment.PRODUCTION, bundleId, 6831079439) },
  { environment: 'SANDBOX', verifier: new SignedDataVerifier([appleRoot], false, Environment.SANDBOX, bundleId) },
] as const;

export async function verifyAppleRestoreReceipt(signedTransaction: string, productId: string) {
  for (const { environment, verifier } of verifiers) {
    const transaction = await verifier.verifyAndDecodeTransaction(signedTransaction).catch(() => null);
    if (transaction?.productId === productId && transaction.revocationDate == null
      && transaction.inAppOwnershipType === InAppOwnershipType.PURCHASED
      && transaction.transactionId && transaction.originalTransactionId && transaction.expiresDate) {
      // Current access is also checked against the authenticated RevenueCat subscriber.
      return { transactionId: transaction.transactionId, originalTransactionId: transaction.originalTransactionId,
        expiresAt: transaction.expiresDate, environment };
    }
  }
  throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
}
