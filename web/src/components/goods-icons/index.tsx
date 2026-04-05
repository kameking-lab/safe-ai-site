import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number, children: React.ReactNode, props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** 保護帽（ヘルメット） */
export function HelmetIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* shell */}
      <path d="M8 28 Q8 14 24 12 Q40 14 40 28 Z" fill="#F59E0B" />
      {/* brim */}
      <rect x="4" y="27" width="40" height="5" rx="2.5" fill="#D97706" />
      {/* vent strip */}
      <rect x="22" y="13" width="4" height="14" rx="2" fill="#FDE68A" />
      {/* chin-strap hint */}
      <path d="M14 32 Q14 40 24 40 Q34 40 34 32" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>,
    props
  );
}

/** フルハーネス（墜落制止用器具） */
export function HarnessIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* body silhouette */}
      <circle cx="24" cy="10" r="5" fill="#94A3B8" />
      <rect x="20" y="15" width="8" height="18" rx="3" fill="#94A3B8" />
      {/* shoulder straps */}
      <path d="M20 17 L12 28" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 17 L36 28" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      {/* chest buckle */}
      <rect x="20" y="22" width="8" height="4" rx="2" fill="#059669" />
      {/* waist belt */}
      <rect x="10" y="33" width="28" height="4" rx="2" fill="#10B981" />
      {/* leg loops */}
      <path d="M16 37 Q14 44 20 44" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M32 37 Q34 44 28 44" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>,
    props
  );
}

/** 防毒マスク */
export function MaskIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* face piece */}
      <ellipse cx="24" cy="24" rx="16" ry="14" fill="#6B7280" />
      {/* eye lenses */}
      <ellipse cx="17" cy="20" rx="5" ry="4" fill="#BAE6FD" opacity="0.85" />
      <ellipse cx="31" cy="20" rx="5" ry="4" fill="#BAE6FD" opacity="0.85" />
      <ellipse cx="17" cy="20" rx="3" ry="2.5" fill="#7DD3FC" />
      <ellipse cx="31" cy="20" rx="3" ry="2.5" fill="#7DD3FC" />
      {/* canister */}
      <rect x="16" y="30" width="16" height="8" rx="3" fill="#4B5563" />
      {/* canister grid */}
      <line x1="20" y1="30" x2="20" y2="38" stroke="#9CA3AF" strokeWidth="1" />
      <line x1="24" y1="30" x2="24" y2="38" stroke="#9CA3AF" strokeWidth="1" />
      <line x1="28" y1="30" x2="28" y2="38" stroke="#9CA3AF" strokeWidth="1" />
      <line x1="16" y1="34" x2="32" y2="34" stroke="#9CA3AF" strokeWidth="1" />
      {/* head straps */}
      <path d="M8 20 Q6 10 14 8" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 20 Q42 10 34 8" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>,
    props
  );
}

/** 保護メガネ */
export function GlassesIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* frame */}
      <rect x="4" y="18" width="18" height="14" rx="5" fill="#3B82F6" />
      <rect x="26" y="18" width="18" height="14" rx="5" fill="#3B82F6" />
      {/* lenses */}
      <rect x="6" y="20" width="14" height="10" rx="3" fill="#BAE6FD" opacity="0.7" />
      <rect x="28" y="20" width="14" height="10" rx="3" fill="#BAE6FD" opacity="0.7" />
      {/* bridge */}
      <path d="M22 24 Q24 21 26 24" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* temples */}
      <line x1="4" y1="23" x2="1" y2="26" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="23" x2="47" y2="26" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      {/* glare */}
      <line x1="9" y1="22" x2="12" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="31" y1="22" x2="34" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </>,
    props
  );
}

/** 保護手袋 */
export function GlovesIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* palm */}
      <path d="M10 20 Q8 14 12 12 Q16 10 18 14 L18 28 Q18 36 24 36 Q30 36 30 28 L30 14 Q32 10 36 12 Q40 14 38 20 L36 32 Q34 42 24 42 Q14 42 12 32 Z" fill="#D1FAE5" />
      {/* fingers */}
      <rect x="14" y="8" width="5" height="14" rx="2.5" fill="#A7F3D0" />
      <rect x="21" y="6" width="5" height="16" rx="2.5" fill="#A7F3D0" />
      <rect x="28" y="8" width="5" height="14" rx="2.5" fill="#A7F3D0" />
      {/* thumb */}
      <path d="M10 22 Q6 18 8 14 Q10 10 14 14" fill="#A7F3D0" />
      {/* cuff */}
      <rect x="10" y="34" width="24" height="6" rx="3" fill="#6EE7B7" />
      {/* seam detail */}
      <path d="M18 36 L18 40" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 36 L24 40" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 36 L30 40" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props
  );
}

/** 安全靴 */
export function SafetyBootIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      {/* boot body */}
      <path d="M10 10 L10 34 Q10 38 16 38 L38 38 Q42 38 42 34 L42 32 Q42 28 36 28 L24 28 L24 10 Z" fill="#374151" />
      {/* toe cap steel */}
      <ellipse cx="38" cy="35" rx="6" ry="4" fill="#6B7280" />
      {/* sole */}
      <rect x="8" y="36" width="36" height="5" rx="2.5" fill="#1F2937" />
      {/* laces */}
      <line x1="14" y1="14" x2="22" y2="16" stroke="#F9FAFB" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="18" x2="22" y2="20" stroke="#F9FAFB" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="22" x2="22" y2="24" stroke="#F9FAFB" strokeWidth="1.5" strokeLinecap="round" />
      {/* ankle pad */}
      <ellipse cx="15" cy="24" rx="4" ry="5" fill="#4B5563" />
    </>,
    props
  );
}

export function MountainIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      <path d="M4 40 L16 16 L24 28 L30 20 L44 40 Z" fill="#6b8e6b" />
      <path d="M30 20 L36 12 L44 28" fill="white" opacity="0.8" />
      <circle cx="36" cy="10" r="4" fill="white" />
    </>,
    props
  );
}

export function BeeIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      <ellipse cx="24" cy="26" rx="10" ry="13" fill="#f59e0b" />
      <rect x="14" y="22" width="20" height="4" rx="2" fill="#1c1c1c" opacity="0.7" />
      <rect x="14" y="29" width="20" height="4" rx="2" fill="#1c1c1c" opacity="0.7" />
      <ellipse cx="24" cy="14" rx="5" ry="4" fill="#f59e0b" />
      <ellipse cx="14" cy="20" rx="7" ry="4" fill="white" opacity="0.7" transform="rotate(-20 14 20)" />
      <ellipse cx="34" cy="20" rx="7" ry="4" fill="white" opacity="0.7" transform="rotate(20 34 20)" />
    </>,
    props
  );
}

export function ThermometerIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      <rect x="20" y="6" width="8" height="28" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <rect x="22" y="20" width="4" height="14" rx="2" fill="#ef4444" />
      <circle cx="24" cy="36" r="6" fill="#ef4444" />
      <path d="M28 10 h4 M28 15 h3 M28 20 h4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props
  );
}

export function FirstAidIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      <rect x="6" y="6" width="36" height="36" rx="6" fill="#ef4444" />
      <rect x="20" y="12" width="8" height="24" rx="2" fill="white" />
      <rect x="12" y="20" width="24" height="8" rx="2" fill="white" />
    </>,
    props
  );
}

export function BarrierIcon({ size = 48, ...props }: IconProps) {
  return base(
    size,
    <>
      <rect x="4" y="18" width="40" height="12" rx="3" fill="#f59e0b" />
      <path d="M4 18 L16 30 M16 18 L28 30 M28 18 L40 30" stroke="#1c1c1c" strokeWidth="4" strokeLinecap="round" />
      <rect x="6" y="10" width="6" height="8" rx="1" fill="#94a3b8" />
      <rect x="36" y="10" width="6" height="8" rx="1" fill="#94a3b8" />
      <rect x="4" y="30" width="8" height="8" rx="1" fill="#94a3b8" />
      <rect x="36" y="30" width="8" height="8" rx="1" fill="#94a3b8" />
    </>,
    props
  );
}

/** カテゴリIDからアイコンコンポーネントを返すユーティリティ */
export function GoodsCategoryIcon({
  categoryId,
  size = 48,
}: {
  categoryId: string;
  size?: number;
}) {
  switch (categoryId) {
    case "fall-protection":
      return <HarnessIcon size={size} />;
    case "respiratory":
      return <MaskIcon size={size} />;
    case "head-protection":
      return <HelmetIcon size={size} />;
    case "eye-ear-protection":
      return <GlassesIcon size={size} />;
    case "hand-foot":
      return <GlovesIcon size={size} />;
    case "mountain-outdoor":
      return <MountainIcon size={size} />;
    case "harmful-organisms":
      return <BeeIcon size={size} />;
    case "heat-cold":
      return <ThermometerIcon size={size} />;
    case "first-aid":
      return <FirstAidIcon size={size} />;
    case "signs-barriers":
      return <BarrierIcon size={size} />;
    default:
      return <HelmetIcon size={size} />;
  }
}
