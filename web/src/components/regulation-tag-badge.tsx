"use client";

import {
  REGULATION_TAGS,
  type RegulationTag,
  normalizeTags,
} from "@/lib/regulation-tag-labels";

type Size = "xs" | "sm" | "md";

const SIZE_CLASS: Record<Size, string> = {
  xs: "text-[10px] px-1.5 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

export function RegulationTagBadge({
  tag,
  size = "sm",
  onClick,
  selected,
  title,
}: {
  tag: RegulationTag;
  size?: Size;
  onClick?: () => void;
  selected?: boolean;
  title?: string;
}) {
  const info = REGULATION_TAGS[tag];
  if (!info) return null;
  const base = `inline-flex items-center rounded border font-medium whitespace-nowrap ${SIZE_CLASS[size]} ${info.badgeClass}`;
  const interactive = onClick
    ? `${base} cursor-pointer hover:opacity-80 transition-opacity`
    : base;
  const ringClass = selected ? "ring-2 ring-offset-1 ring-slate-600" : "";
  const className = `${interactive} ${ringClass}`.trim();
  const label = info.shortLabel;
  const tooltip = title ?? info.fullLabel;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} title={tooltip}>
        {label}
      </button>
    );
  }
  return (
    <span className={className} title={tooltip}>
      {label}
    </span>
  );
}

/**
 * 規制タグの配列を最大 maxVisible 件まで表示、超過分は「+N」表示。
 */
export function RegulationTagBadgeList({
  tags,
  maxVisible = 5,
  size = "xs",
  onTagClick,
}: {
  tags: readonly string[] | undefined;
  maxVisible?: number;
  size?: Size;
  onTagClick?: (tag: RegulationTag) => void;
}) {
  const known = normalizeTags(tags);
  if (known.length === 0) return null;
  const visible = known.slice(0, maxVisible);
  const overflow = known.length - visible.length;
  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {visible.map((t) => (
        <RegulationTagBadge
          key={t}
          tag={t}
          size={size}
          onClick={onTagClick ? () => onTagClick(t) : undefined}
        />
      ))}
      {overflow > 0 && (
        <span
          className={`inline-flex items-center rounded border font-medium whitespace-nowrap bg-slate-100 text-slate-700 border-slate-300 ${SIZE_CLASS[size]}`}
          title={`他 ${overflow} 件: ${known.slice(maxVisible).join(", ")}`}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
