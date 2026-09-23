export const ADSENSE_ACCOUNT_META = "ca-pub-8751260838396451";

export function adsenseAccountMetadata() {
  return {
    "google-adsense-account": ADSENSE_ACCOUNT_META,
  } as const;
}
