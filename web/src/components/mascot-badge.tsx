type MascotBadgeProps = {
  size?: 32 | 48 | 96 | 192;
  variant?: "default" | "bow" | "thinking";
  className?: string;
  alt?: string;
};

const MASCOT_BADGE_SOURCE = {
  default: "/mascot/mascot-badge-64.webp",
  bow: "/mascot/mascot-bow-96.webp",
  thinking: "/mascot/mascot-thinking-192.webp",
} as const;

/**
 * 共通シェル専用の小型マスコット。
 *
 * 32〜48px のローカル画像に next/image のクライアント実装を全ページで
 * 読ませないため、実寸を固定した通常の img を使う。大型・本文ビジュアルは
 * 引き続き next/image のレスポンシブ最適化を利用する。
 */
export function MascotBadge({
  size = 32,
  variant = "default",
  className = "",
  alt = "",
}: MascotBadgeProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 小型ローカル画像の共通bundle削減を優先
    <img
      src={MASCOT_BADGE_SOURCE[variant]}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
