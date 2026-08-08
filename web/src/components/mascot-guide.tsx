import type { ReactNode } from "react";
import {
  Mascot,
  type MascotSize,
  type MascotVariant,
} from "@/components/mascot";

export const MASCOT_GUIDE_VARIANTS = [
  "default",
  "search",
  "learning",
  "caution",
  "success",
  "heat",
  "automation",
  "error",
  "emergency",
] as const;

export type MascotGuideVariant = (typeof MASCOT_GUIDE_VARIANTS)[number];

type GuideConfig = {
  imageVariant: MascotVariant;
  label: string;
  borderClassName: string;
  labelClassName: string;
};

const GUIDE_CONFIG = {
  default: {
    imageVariant: "pointing",
    label: "ご案内",
    borderClassName: "border-l-brand-primary",
    labelClassName: "text-brand-primary",
  },
  search: {
    imageVariant: "detective",
    label: "調べる",
    borderClassName: "border-l-semantic-info",
    labelClassName: "text-semantic-info",
  },
  learning: {
    imageVariant: "teacher",
    label: "学ぶ",
    borderClassName: "border-l-semantic-success",
    labelClassName: "text-semantic-success",
  },
  caution: {
    imageVariant: "thinking",
    label: "要確認",
    borderClassName: "border-l-semantic-caution",
    labelClassName: "text-semantic-caution",
  },
  success: {
    imageVariant: "salute",
    label: "完了",
    borderClassName: "border-l-semantic-success",
    labelClassName: "text-semantic-success",
  },
  heat: {
    imageVariant: "seasonal-summer",
    label: "夏季対策",
    borderClassName: "border-l-brand-accent",
    labelClassName: "text-brand-accent-ink",
  },
  automation: {
    imageVariant: "tablet-dx",
    label: "業務改善",
    borderClassName: "border-l-semantic-ai",
    labelClassName: "text-semantic-ai",
  },
  error: {
    imageVariant: "bow",
    label: "代替案内",
    borderClassName: "border-l-semantic-danger",
    labelClassName: "text-semantic-danger",
  },
  emergency: {
    imageVariant: "emergency-serious",
    label: "緊急時の案内",
    borderClassName: "border-l-semantic-danger",
    labelClassName: "text-semantic-danger",
  },
} as const satisfies Record<MascotGuideVariant, GuideConfig>;

type MascotGuideTitleElement = "span" | "p" | "h2" | "h3" | "h4";

export type MascotGuideProps = {
  variant?: MascotGuideVariant;
  title: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  /** Extra-dense guide for a first-view control surface. */
  micro?: boolean;
  /**
   * caution などでも表情を抑えたい場合に使用する。
   * emergency は指定値にかかわらず常に true になる。
   */
  serious?: boolean;
  /**
   * 原則は空文字のまま装飾画像として扱う。画像自体が情報を補う場合のみ、
   * 直後の案内文と重複しない代替テキストを渡す。
   */
  imageAlt?: string;
  /**
   * 既存画面の専用ポーズを引き継ぐための上書き。
   * emergency では安全上の一貫性を優先し、上書きされない。
   */
  imageVariant?: MascotVariant;
  eager?: boolean;
  titleAs?: MascotGuideTitleElement;
};

/**
 * チワワを「装飾」ではなく次の操作を示す案内役として使う共通UI。
 *
 * ページ内ではヒーロー1体、重要案内または状態表示1体を基本とし、
 * 合計2〜3体を超えて反復しない。画像の読み込み成否にかかわらず、
 * 案内文と操作は独立したDOMとして残る。
 */
export function MascotGuide({
  variant = "default",
  title,
  message,
  action,
  className = "",
  compact = false,
  micro = false,
  serious = false,
  imageAlt = "",
  imageVariant,
  eager = false,
  titleAs = "span",
}: MascotGuideProps) {
  const config = GUIDE_CONFIG[variant];
  const isEmergency = variant === "emergency";
  const isSerious = isEmergency || serious;
  const resolvedImageVariant = isSerious
    ? "emergency-serious"
    : (imageVariant ?? config.imageVariant);
  const imageSize: MascotSize = micro ? "sm" : compact ? "md" : "lg";
  const Title = titleAs;

  return (
    <div
      className={`grid min-w-0 items-center gap-3 border border-l-4 border-portal-border bg-portal-surface text-left text-foreground shadow-[var(--shadow-xs)] forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${
        micro
          ? "grid-cols-[2.5rem_minmax(0,1fr)] rounded-[var(--radius-md)] p-2 max-[339px]:gap-2 max-[339px]:p-1.5"
          : compact
          ? "grid-cols-[3rem_minmax(0,1fr)] rounded-[var(--radius-md)] p-3"
          : "grid-cols-[6rem_minmax(0,1fr)] rounded-[var(--radius-lg)] p-4"
      } ${config.borderClassName} ${className}`}
      data-mascot-guide=""
      data-mascot-variant={variant}
      data-mascot-image-variant={resolvedImageVariant}
      data-serious={isSerious ? "true" : "false"}
    >
      <div className="flex shrink-0 items-center justify-center self-start rounded-[var(--radius-md)] bg-portal-surface-emphasis p-1 forced-colors:border">
        <Mascot
          variant={resolvedImageVariant}
          size={imageSize}
          alt={imageAlt}
          eager={eager}
          sizes={micro ? "32px" : compact ? "48px" : "96px"}
          className="shrink-0"
        />
      </div>
      <div className="min-w-0 self-center text-foreground forced-colors:text-[CanvasText]">
        <span className={`block text-[11px] font-black tracking-[0.12em] ${config.labelClassName}`}>
          {config.label}
        </span>
        <Title
          className="mt-1 block text-sm font-black leading-6 text-foreground max-[339px]:leading-5 sm:text-base"
          data-content-density-text=""
        >
          {title}
        </Title>
        {message ? (
          <div className="mt-1 text-sm leading-6 text-portal-muted forced-colors:text-[CanvasText]">
            {message}
          </div>
        ) : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
