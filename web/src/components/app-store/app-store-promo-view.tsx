import { APP_STORE } from "@/lib/app-store";

export type AppStorePromoVariant = "card" | "footer";

const AVATAR = "/app-store/chihuahua-96.webp";

function Avatar({ size, className }: { size: number; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- 小型ローカル画像。MascotBadge と同じく next/image のクライアント実装を読ませない
  return <img src={AVATAR} alt="" width={size} height={size} loading="lazy" decoding="async" className={className} />;
}

export function AppStorePromoView({ variant, className = "" }: { variant: AppStorePromoVariant; className?: string }) {
  if (variant === "footer") {
    return (
      <p className={`flex items-center gap-2 ${className}`} data-app-store-promo="footer">
        <Avatar size={24} className="h-6 w-6 shrink-0 rounded-full" />
        <a href={APP_STORE.url} target="_blank" rel="noopener noreferrer" className="footer-legal-link">
          安全AIはiPhoneアプリでも使えます — App Storeでダウンロード
        </a>
      </p>
    );
  }

  return (
    <a
      href={APP_STORE.url}
      target="_blank"
      rel="noopener noreferrer"
      data-app-store-promo="card"
      className={`mx-auto flex w-full max-w-md items-center gap-3 rounded-full border border-[#19251F]/20 bg-white px-3 py-2 text-sm text-[#19251F] shadow-sm hover:bg-[#f3f6ef] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332] ${className}`}
    >
      <Avatar size={40} className="h-10 w-10 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block font-bold">iPhoneアプリでも使えます</span>
        <span className="block text-xs text-[#19251F]/75">App Storeでダウンロード</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-[#19251F]/60">›</span>
    </a>
  );
}
