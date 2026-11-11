import { APP_STORE } from "@/lib/app-store";

export function AppStorePromoView({ className = "" }: { className?: string }) {
  return (
    <div className={`p-2.5 print:hidden ${className}`} data-app-store-promo="footer">
      <a
        href={APP_STORE.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {/* Apple公式の日本語バッジを高さ40px・余白10pxで表示する。 */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 公式SVGをそのまま表示 */}
        <img
          src="/app-store/download-on-the-app-store-ja.svg"
          alt="安全AIをApp Storeでダウンロード"
          width={109}
          height={40}
          loading="lazy"
          decoding="async"
          className="block h-10 w-auto"
        />
      </a>
    </div>
  );
}
