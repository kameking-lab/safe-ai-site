import Script from 'next/script';

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;

export default function AdSenseScript({ nonce }: { nonce?: string }) {
  if (!PUB_ID) return null;

  return (
    <Script
      nonce={nonce}
      id="adsense-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`}
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
