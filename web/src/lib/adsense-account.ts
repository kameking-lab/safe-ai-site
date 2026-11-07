export const ADSENSE_ACCOUNT_META = "ca-pub-8751260838396451";

// The consent-gated script must use the same account as ads.txt and metadata.
export function configuredAdsensePublisherId(value: string | undefined): string | null {
  return value === ADSENSE_ACCOUNT_META ? ADSENSE_ACCOUNT_META : null;
}

export function adsenseAccountMetadata() {
  return {
    "google-adsense-account": ADSENSE_ACCOUNT_META,
  } as const;
}
