import type { SafetySign, SignShape, PictogramId } from "@/types/safety-sign";

/**
 * Inline-SVG renderer for occupational safety signs.
 *
 * The geometry follows JIS Z 9101 category conventions (circle / circle
 * with diagonal bar / triangle / square) and JIS Z 9103 colours. The
 * pictograms are simplified, original line drawings — they convey the
 * meaning without reproducing JIS or ISO 7010 reference artwork.
 *
 * The viewBox is always 100×100 and the component is `aria-hidden`
 * because the sign name is rendered as adjacent text by the consumer.
 */

const PRIMARY_FILL: Record<string, string> = {
  red: "#D7263D",
  yellow: "#F8C300",
  blue: "#0F4C81",
  green: "#1B7F46",
  white: "#FFFFFF",
  black: "#1A1A1A",
};

const CONTRAST_FILL: Record<string, string> = {
  white: "#FFFFFF",
  black: "#1A1A1A",
  red: "#D7263D",
  yellow: "#F8C300",
  blue: "#0F4C81",
  green: "#1B7F46",
};

interface FrameProps {
  shape: SignShape;
  primary: string;
  contrast: string;
}

function Frame({ shape, primary, contrast }: FrameProps) {
  if (shape === "circle") {
    return <circle cx="50" cy="50" r="44" fill={primary} />;
  }
  if (shape === "circle-bar") {
    return (
      <>
        <circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke={primary} strokeWidth="10" />
        <line
          x1="20"
          y1="80"
          x2="80"
          y2="20"
          stroke={primary}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </>
    );
  }
  if (shape === "triangle") {
    return (
      <>
        <polygon
          points="50,8 92,86 8,86"
          fill={primary}
          stroke={contrast}
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </>
    );
  }
  // square (safe-condition, fire-safety)
  return <rect x="6" y="6" width="88" height="88" rx="6" fill={primary} />;
}

interface PictoProps {
  id: PictogramId;
  /** Colour the line art should be rendered in. */
  stroke: string;
  /** Fill colour where the pictogram has solid shapes. */
  fill: string;
}

/**
 * Pictogram primitives. Each draws inside the 100×100 viewBox roughly
 * centred at (50, 55) so it sits below the triangle apex when needed.
 * Drawings are deliberately abstract — they show the concept (a person,
 * a flame, an exit door) without copying JIS or ISO artwork.
 */
function Pictogram({ id, stroke, fill }: PictoProps) {
  const s = stroke;
  const f = fill;

  // Re-used micro-shapes
  const person = (cx: number, cy: number, sc = 1) => (
    <g>
      <circle cx={cx} cy={cy - 12 * sc} r={5 * sc} fill={s} />
      <path
        d={`M ${cx - 9 * sc} ${cy - 4 * sc} L ${cx + 9 * sc} ${cy - 4 * sc} L ${cx + 6 * sc} ${cy + 14 * sc} L ${cx - 6 * sc} ${cy + 14 * sc} Z`}
        fill={s}
      />
    </g>
  );

  const flame = (cx: number, cy: number) => (
    <path
      d={`M ${cx} ${cy - 18} C ${cx + 10} ${cy - 8}, ${cx + 12} ${cy + 6}, ${cx} ${cy + 16} C ${cx - 12} ${cy + 6}, ${cx - 10} ${cy - 8}, ${cx} ${cy - 18} Z`}
      fill={s}
    />
  );

  switch (id) {
    // ---- Prohibition ----
    case "no-entry":
      return (
        <g>
          <rect x="22" y="44" width="56" height="12" fill={s} />
        </g>
      );
    case "no-smoking":
      return (
        <g>
          <rect x="28" y="46" width="40" height="8" fill={s} />
          <path d="M40 38 Q42 32 38 26 Q42 32 44 38" stroke={s} strokeWidth={3} fill="none" />
          <path d="M52 38 Q54 32 50 26 Q54 32 56 38" stroke={s} strokeWidth={3} fill="none" />
        </g>
      );
    case "no-open-flame":
      return flame(50, 50);
    case "no-vehicles":
      return (
        <g fill={s}>
          <rect x="24" y="46" width="48" height="14" rx="3" />
          <circle cx="34" cy="64" r="5" />
          <circle cx="66" cy="64" r="5" />
        </g>
      );
    case "no-pedestrians":
      return person(50, 50);
    case "no-mobile-phone":
    case "no-cellphone-emi":
      return (
        <g fill={s}>
          <rect x="36" y="26" width="28" height="48" rx="3" />
          <rect x="40" y="32" width="20" height="30" fill={f} />
          <circle cx="50" cy="68" r="2.5" fill={f} />
        </g>
      );
    case "no-photography":
      return (
        <g fill={s}>
          <rect x="20" y="38" width="60" height="32" rx="3" />
          <circle cx="50" cy="54" r="9" fill={f} />
          <circle cx="50" cy="54" r="5" fill={s} />
          <rect x="56" y="34" width="12" height="6" />
        </g>
      );
    case "no-touching":
      return (
        <g fill={s}>
          <rect x="40" y="30" width="6" height="22" />
          <rect x="32" y="36" width="6" height="16" />
          <rect x="48" y="36" width="6" height="16" />
          <rect x="56" y="38" width="6" height="14" />
          <rect x="36" y="50" width="22" height="20" rx="2" />
        </g>
      );
    case "no-running":
      return (
        <g fill={s}>
          <circle cx="58" cy="28" r="5" />
          <path d="M40 70 L52 50 L62 52 L74 64" stroke={s} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d="M52 50 L46 38 L34 42" stroke={s} strokeWidth={5} fill="none" strokeLinecap="round" />
        </g>
      );
    case "no-water":
    case "no-extinguish-water":
      return (
        <path
          d="M50 24 C 62 40 70 52 70 62 A 20 20 0 0 1 30 62 C 30 52 38 40 50 24 Z"
          fill={s}
        />
      );
    case "no-eating":
      return (
        <g fill={s}>
          <rect x="32" y="32" width="6" height="40" />
          <rect x="60" y="32" width="6" height="40" />
          <circle cx="50" cy="52" r="14" />
          <rect x="46" y="32" width="8" height="22" />
        </g>
      );
    case "no-disposal":
      return (
        <g fill={s}>
          <path d="M30 36 H70 V44 H30 Z" />
          <path d="M34 46 H66 L62 76 H38 Z" />
        </g>
      );
    case "no-elevator-people":
      return (
        <g>
          {person(50, 52)}
          <path d="M40 32 L50 24 L60 32" stroke={s} strokeWidth={4} fill="none" />
          <path d="M40 78 L50 84 L60 78" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "no-crane-overhead":
    case "warn-suspended-load":
      return (
        <g fill={s}>
          <path d="M16 26 H84" stroke={s} strokeWidth={5} fill="none" />
          <path d="M50 26 V50" stroke={s} strokeWidth={4} fill="none" />
          <rect x="38" y="50" width="24" height="14" />
          <path d="M30 80 H70" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "no-climbing":
      return (
        <g>
          {person(50, 56, 0.9)}
          <path d="M70 30 V80" stroke={s} strokeWidth={5} fill="none" />
          <path d="M62 38 H78 M62 50 H78 M62 62 H78" stroke={s} strokeWidth={3} fill="none" />
        </g>
      );
    case "no-leaning":
      return (
        <g>
          {person(40, 50, 0.9)}
          <path d="M64 28 V76" stroke={s} strokeWidth={5} fill="none" />
        </g>
      );
    case "no-passage":
      return (
        <g fill={s}>
          <path d="M30 70 L50 30 L70 70 Z" />
          <rect x="46" y="60" width="8" height="20" />
        </g>
      );
    case "no-forklift":
    case "warn-forklift":
      return (
        <g fill={s}>
          <rect x="28" y="40" width="22" height="22" rx="2" />
          <rect x="50" y="48" width="22" height="6" />
          <rect x="56" y="54" width="14" height="12" />
          <circle cx="36" cy="68" r="5" />
          <circle cx="58" cy="68" r="5" />
        </g>
      );
    case "no-power":
      return (
        <g fill={s}>
          <path d="M46 24 L36 56 H50 L42 80 L66 46 H52 L60 24 Z" />
        </g>
      );
    case "no-overload":
      return (
        <g fill={s}>
          <rect x="22" y="48" width="56" height="6" />
          <rect x="30" y="30" width="40" height="18" />
          <rect x="22" y="58" width="56" height="14" />
        </g>
      );
    case "no-stacking":
      return (
        <g fill={s}>
          <rect x="32" y="28" width="36" height="14" />
          <rect x="32" y="44" width="36" height="14" />
          <rect x="32" y="60" width="36" height="14" />
        </g>
      );
    case "no-unauthorized":
      return (
        <g>
          {person(50, 52, 0.9)}
          <path d="M68 38 L84 38 M76 30 V46" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "no-stopping":
      return (
        <g fill={s}>
          <circle cx="50" cy="50" r="22" fill={f} stroke={s} strokeWidth={5} />
          <rect x="36" y="46" width="28" height="8" />
        </g>
      );
    case "no-welding":
      return (
        <g fill={s}>
          <path d="M24 70 L50 40 L76 70 Z" />
          <circle cx="50" cy="50" r="4" fill={f} />
        </g>
      );
    case "no-grinding":
      return (
        <g fill={s}>
          <circle cx="42" cy="52" r="16" />
          <rect x="56" y="48" width="20" height="8" />
        </g>
      );
    case "no-cutting":
      return (
        <g fill={s}>
          <rect x="26" y="48" width="42" height="6" />
          <path d="M68 42 L80 51 L68 60 Z" />
        </g>
      );
    case "no-modification":
      return (
        <g fill={s}>
          <rect x="36" y="40" width="28" height="24" rx="3" />
          <circle cx="50" cy="52" r="6" fill={f} />
          <rect x="48" y="32" width="4" height="10" />
          <rect x="48" y="62" width="4" height="10" />
        </g>
      );
    case "no-bare-hands":
      return (
        <g fill={s}>
          <path d="M40 30 V58 L36 64 V76 H64 V62 L70 56 V36 H64 V52 H60 V30 H56 V52 H52 V28 H48 V52 H44 V30 Z" />
        </g>
      );
    // ---- Warning ----
    case "warn-electric":
      return (
        <path
          d="M52 18 L34 52 H48 L42 80 L68 44 H52 L60 18 Z"
          fill={s}
        />
      );
    case "warn-fall":
      return (
        <g>
          {person(40, 58, 0.9)}
          <path d="M62 72 L82 72" stroke={s} strokeWidth={4} fill="none" />
          <path d="M64 64 L74 76 M74 64 L64 76" stroke={s} strokeWidth={3} fill="none" />
        </g>
      );
    case "warn-slip":
      return (
        <g fill={s}>
          <path d="M30 68 H70" stroke={s} strokeWidth={4} fill="none" />
          <path d="M40 56 C 50 50 60 50 64 60 L 56 64 Z" />
          <path d="M52 36 L48 50" stroke={s} strokeWidth={3} fill="none" />
        </g>
      );
    case "warn-overhead":
      return (
        <g fill={s}>
          <rect x="20" y="28" width="60" height="8" />
          {person(50, 60, 0.85)}
        </g>
      );
    case "warn-hot":
      return (
        <g>
          {flame(40, 50)}
          {flame(58, 56)}
        </g>
      );
    case "warn-cold":
      return (
        <g stroke={s} strokeWidth={3.5} fill="none">
          <path d="M50 26 V78 M30 36 L70 68 M30 68 L70 36" />
          <path d="M44 30 L50 36 L56 30 M44 74 L50 68 L56 74" />
        </g>
      );
    case "warn-corrosive":
      return (
        <g fill={s}>
          <rect x="20" y="60" width="60" height="6" />
          <path d="M30 38 L46 56" stroke={s} strokeWidth={5} fill="none" />
          <circle cx="32" cy="42" r="6" />
          <path d="M58 40 L66 52" stroke={s} strokeWidth={4} fill="none" />
          <path d="M40 64 L46 70 M50 64 L56 70 M60 64 L66 70" stroke={s} strokeWidth={3} />
        </g>
      );
    case "warn-toxic":
      return (
        <g fill={s}>
          <circle cx="50" cy="46" r="16" />
          <circle cx="44" cy="44" r="3" fill={f} />
          <circle cx="56" cy="44" r="3" fill={f} />
          <path d="M44 54 Q50 50 56 54" stroke={f} strokeWidth={2.5} fill="none" />
          <rect x="40" y="62" width="20" height="6" />
        </g>
      );
    case "warn-flammable":
      return flame(50, 52);
    case "warn-explosive":
      return (
        <g fill={s}>
          <path d="M50 24 L58 40 L74 36 L66 50 L82 56 L66 60 L72 76 L56 68 L50 80 L44 68 L28 76 L34 60 L20 56 L34 50 L26 36 L42 40 Z" />
        </g>
      );
    case "warn-radiation":
      return (
        <g fill={s}>
          <circle cx="50" cy="52" r="6" />
          <path d="M50 16 A 36 36 0 0 1 81 70 L 60 60 A 14 14 0 0 0 50 38 Z" />
          <path d="M19 70 A 36 36 0 0 1 50 16 L 50 38 A 14 14 0 0 0 40 60 Z" transform="rotate(120 50 52)" />
          <path d="M19 70 A 36 36 0 0 1 50 16 L 50 38 A 14 14 0 0 0 40 60 Z" transform="rotate(240 50 52)" />
        </g>
      );
    case "warn-laser":
      return (
        <g fill={s} stroke={s} strokeWidth={3}>
          <circle cx="28" cy="52" r="4" />
          <path d="M28 52 L76 52 M76 52 L66 46 M76 52 L66 58" fill="none" />
        </g>
      );
    case "warn-magnetic":
      return (
        <g fill={s}>
          <path d="M20 70 V32 H40 V58 H60 V32 H80 V70 H60 V58 H40 V70 Z" />
        </g>
      );
    case "warn-biohazard":
      return (
        <g fill={s} stroke={s} strokeWidth={3}>
          <circle cx="50" cy="50" r="6" fill={f} />
          <circle cx="50" cy="30" r="12" fill="none" />
          <circle cx="32" cy="62" r="12" fill="none" />
          <circle cx="68" cy="62" r="12" fill="none" />
        </g>
      );
    case "warn-oxygen-low":
    case "warn-asphyxiation":
      return (
        <g>
          <text x="50" y="58" fontSize="32" fontWeight="700" textAnchor="middle" fill={s}>
            O₂
          </text>
        </g>
      );
    case "warn-noise":
      return (
        <g fill={s}>
          <path d="M28 44 H42 L58 30 V74 L42 60 H28 Z" />
          <path d="M66 38 Q76 50 66 66" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "warn-vibration":
      return (
        <g stroke={s} strokeWidth={4} fill="none">
          <path d="M22 50 L34 36 L46 64 L58 36 L70 64 L78 50" />
        </g>
      );
    case "warn-pinch":
      return (
        <g fill={s}>
          <circle cx="34" cy="50" r="10" />
          <circle cx="66" cy="50" r="10" />
          <rect x="42" y="46" width="16" height="8" />
        </g>
      );
    case "warn-cut":
      return (
        <g fill={s}>
          <path d="M22 56 L78 36" stroke={s} strokeWidth={5} fill="none" />
          <rect x="22" y="56" width="20" height="6" />
        </g>
      );
    case "warn-crane":
      return (
        <g fill={s}>
          <path d="M22 30 H78" stroke={s} strokeWidth={5} fill="none" />
          <path d="M40 30 V70 H60 V30" stroke={s} strokeWidth={4} fill="none" />
          <rect x="44" y="60" width="12" height="12" />
        </g>
      );
    case "warn-pressure":
      return (
        <g fill={s} stroke={s} strokeWidth={3}>
          <rect x="34" y="36" width="32" height="40" rx="4" fill="none" />
          <path d="M50 36 V20" />
          <circle cx="50" cy="16" r="4" fill={s} />
        </g>
      );
    case "warn-machine":
      return (
        <g fill={s}>
          <circle cx="50" cy="52" r="14" />
          <circle cx="50" cy="52" r="5" fill={f} />
          <rect x="48" y="20" width="4" height="14" />
          <rect x="48" y="70" width="4" height="14" />
          <rect x="20" y="50" width="14" height="4" />
          <rect x="66" y="50" width="14" height="4" />
        </g>
      );
    case "warn-trip":
      return (
        <g fill={s}>
          <rect x="20" y="68" width="60" height="6" />
          <rect x="20" y="60" width="22" height="8" />
          {person(60, 50, 0.85)}
        </g>
      );
    case "warn-dust":
      return (
        <g fill={s}>
          {[20, 32, 44, 56, 68].map((x, i) => (
            <circle key={x} cx={x + 6} cy={36 + (i % 2) * 10} r={3 + (i % 3)} />
          ))}
          {[26, 40, 54, 68].map((x, i) => (
            <circle key={`b${x}`} cx={x + 4} cy={62 + ((i + 1) % 2) * 8} r={2.5 + (i % 2)} />
          ))}
        </g>
      );
    case "warn-uv":
      return (
        <g fill={s}>
          <circle cx="50" cy="50" r="10" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
            <rect
              key={d}
              x="48"
              y="22"
              width="4"
              height="10"
              transform={`rotate(${d} 50 50)`}
            />
          ))}
        </g>
      );
    case "warn-cylinder":
      return (
        <g fill={s}>
          <rect x="40" y="20" width="20" height="60" rx="6" />
          <rect x="46" y="14" width="8" height="8" fill={s} />
        </g>
      );
    case "warn-construction":
      return (
        <g fill={s}>
          <path d="M26 70 L74 70 L62 40 H38 Z" />
          <rect x="44" y="20" width="12" height="20" />
        </g>
      );
    // ---- Mandatory ----
    case "mand-helmet":
      return (
        <g fill={f}>
          <path d="M24 60 H76 V52 C 76 36 64 26 50 26 C 36 26 24 36 24 52 Z" />
          <rect x="22" y="58" width="56" height="6" />
        </g>
      );
    case "mand-glasses":
      return (
        <g fill={f}>
          <rect x="20" y="44" width="24" height="16" rx="6" />
          <rect x="56" y="44" width="24" height="16" rx="6" />
          <rect x="44" y="50" width="12" height="4" />
        </g>
      );
    case "mand-mask":
      return (
        <g fill={f}>
          <path d="M26 38 Q50 30 74 38 L70 66 Q50 78 30 66 Z" />
          <path d="M26 38 L18 50 L28 56" stroke={f} strokeWidth={4} fill="none" />
          <path d="M74 38 L82 50 L72 56" stroke={f} strokeWidth={4} fill="none" />
        </g>
      );
    case "mand-respirator":
      return (
        <g fill={f}>
          <path d="M30 36 H70 V58 Q 50 80 30 58 Z" />
          <circle cx="50" cy="50" r="6" fill={s} />
        </g>
      );
    case "mand-earplugs":
      return (
        <g fill={f}>
          <path d="M36 30 Q22 50 36 70 L46 64 Q34 50 46 36 Z" />
          <path d="M64 30 Q78 50 64 70 L54 64 Q66 50 54 36 Z" />
        </g>
      );
    case "mand-gloves":
      return (
        <g fill={f}>
          <path d="M34 30 V58 L28 64 V78 H66 V62 L72 56 V36 H64 V50 H58 V30 H52 V50 H46 V28 H40 V50 H34 Z" />
        </g>
      );
    case "mand-boots":
      return (
        <g fill={f}>
          <path d="M30 30 H50 V60 L70 60 V74 H30 Z" />
        </g>
      );
    case "mand-harness":
      return (
        <g fill={f}>
          <circle cx="50" cy="28" r="6" />
          <path d="M34 40 L66 40 L62 78 L50 70 L38 78 Z" />
          <rect x="40" y="46" width="20" height="4" fill={s} />
        </g>
      );
    case "mand-vest":
      return (
        <g fill={f}>
          <path d="M30 30 L40 26 L50 30 L60 26 L70 30 L66 78 H34 Z" />
          <rect x="34" y="46" width="32" height="6" fill={s} />
        </g>
      );
    case "mand-faceshield":
      return (
        <g fill={f}>
          <circle cx="50" cy="44" r="14" />
          <path d="M28 50 H72 V70 H28 Z" fillOpacity="0.6" />
        </g>
      );
    case "mand-apron":
      return (
        <g fill={f}>
          <path d="M34 28 L66 28 L62 40 L70 80 L30 80 L38 40 Z" />
        </g>
      );
    case "mand-wash-hands":
      return (
        <g fill={f}>
          <path d="M30 70 H70 V76 H30 Z" />
          <path d="M40 36 V62 H60 V40 H54 V56 H50 V36 H46 V56 H42 V36 Z" />
          <circle cx="36" cy="36" r="2.5" />
          <circle cx="40" cy="30" r="2" />
        </g>
      );
    case "mand-disinfect":
      return (
        <g fill={f}>
          <rect x="42" y="26" width="16" height="40" rx="4" />
          <rect x="46" y="20" width="8" height="8" />
          <path d="M24 74 L50 70 L76 74" stroke={f} strokeWidth={4} fill="none" />
        </g>
      );
    case "mand-keep-clean":
      return (
        <g fill={f}>
          <rect x="22" y="62" width="56" height="6" />
          <rect x="30" y="36" width="14" height="26" />
          <rect x="48" y="44" width="14" height="18" />
          <rect x="64" y="30" width="12" height="32" />
        </g>
      );
    case "mand-ventilate":
      return (
        <g fill={f}>
          <rect x="22" y="22" width="56" height="56" rx="3" fill="none" stroke={f} strokeWidth={4} />
          <path d="M34 44 H66 M34 56 H66" stroke={f} strokeWidth={3} />
        </g>
      );
    case "mand-ground":
      return (
        <g fill={f} stroke={f} strokeWidth={3}>
          <path d="M50 22 V52" />
          <path d="M28 56 H72 M34 64 H66 M42 72 H58" />
        </g>
      );
    case "mand-lockout":
      return (
        <g fill={f}>
          <rect x="32" y="46" width="36" height="30" rx="4" />
          <path d="M40 46 V34 A 10 10 0 0 1 60 34 V46" stroke={f} strokeWidth={4} fill="none" />
        </g>
      );
    case "mand-readsds":
      return (
        <g fill={f}>
          <rect x="28" y="22" width="44" height="56" rx="3" />
          <rect x="34" y="32" width="32" height="3" fill={s} />
          <rect x="34" y="40" width="28" height="3" fill={s} />
          <rect x="34" y="48" width="32" height="3" fill={s} />
          <rect x="34" y="56" width="22" height="3" fill={s} />
        </g>
      );
    case "mand-emergency-stop":
      return (
        <g fill={f}>
          <circle cx="50" cy="52" r="22" />
          <text x="50" y="58" fontSize="14" fontWeight="700" textAnchor="middle" fill={s}>
            STOP
          </text>
        </g>
      );
    case "mand-pedestrian-route":
      return (
        <g>
          {person(36, 52, 1)}
          <path d="M56 72 L80 72 L72 64 M80 72 L72 80" stroke={f} strokeWidth={4} fill="none" />
        </g>
      );
    // ---- Safe condition ----
    case "safe-exit-left":
      return (
        <g fill={f}>
          <rect x="48" y="30" width="34" height="44" />
          {person(60, 52, 0.85)}
          <path d="M40 52 L20 52 M26 44 L18 52 L26 60" stroke={f} strokeWidth={5} fill="none" />
        </g>
      );
    case "safe-exit-right":
      return (
        <g fill={f}>
          <rect x="18" y="30" width="34" height="44" />
          {person(30, 52, 0.85)}
          <path d="M58 52 L80 52 M72 44 L80 52 L72 60" stroke={f} strokeWidth={5} fill="none" />
        </g>
      );
    case "safe-exit-up":
      return (
        <g fill={f}>
          <rect x="33" y="46" width="34" height="36" />
          {person(50, 64, 0.85)}
          <path d="M50 38 L50 18 M40 24 L50 14 L60 24" stroke={f} strokeWidth={5} fill="none" />
        </g>
      );
    case "safe-assembly-point":
      return (
        <g fill={f}>
          {person(34, 50, 0.85)}
          {person(50, 56, 0.95)}
          {person(66, 50, 0.85)}
          <path d="M50 70 V82" stroke={f} strokeWidth={3} />
        </g>
      );
    case "safe-first-aid":
      return (
        <g fill={f}>
          <rect x="22" y="34" width="56" height="44" rx="6" />
          <rect x="44" y="42" width="12" height="28" fill={s} />
          <rect x="32" y="50" width="36" height="12" fill={s} />
        </g>
      );
    case "safe-aed":
      return (
        <g fill={f}>
          <rect x="22" y="34" width="56" height="40" rx="4" />
          <path d="M26 52 L36 52 L42 38 L52 66 L58 52 L74 52" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "safe-eyewash":
      return (
        <g fill={f}>
          <ellipse cx="50" cy="48" rx="22" ry="10" />
          <circle cx="50" cy="48" r="5" fill={s} />
          <path d="M50 60 V76" stroke={f} strokeWidth={4} />
          <path d="M40 76 H60" stroke={f} strokeWidth={4} />
        </g>
      );
    case "safe-shower":
      return (
        <g fill={f}>
          <circle cx="50" cy="30" r="6" />
          <rect x="46" y="34" width="8" height="8" />
          <path d="M30 50 H70 V46 H30 Z" />
          <path d="M34 56 V72 M44 56 V76 M54 56 V72 M64 56 V76" stroke={f} strokeWidth={3} />
        </g>
      );
    case "safe-stretcher":
      return (
        <g fill={f}>
          <rect x="18" y="56" width="64" height="10" rx="3" />
          <rect x="22" y="48" width="56" height="6" />
          {person(50, 40, 0.7)}
        </g>
      );
    case "safe-emergency-phone":
      return (
        <g fill={f}>
          <path d="M26 36 Q 36 28 50 28 Q 64 28 74 36 L 70 46 L 60 44 L 56 52 Q 50 56 44 52 L 40 44 L 30 46 Z" />
          <text x="50" y="76" fontSize="14" fontWeight="700" textAnchor="middle" fill={f}>
            SOS
          </text>
        </g>
      );
    case "safe-rescue-window":
      return (
        <g fill="none" stroke={f} strokeWidth={5}>
          <rect x="26" y="26" width="48" height="48" />
          <path d="M50 26 V74 M26 50 H74" />
          <path d="M30 30 L46 46" />
        </g>
      );
    case "safe-evacuation-route":
      return (
        <g fill={f}>
          {person(34, 52, 0.85)}
          <path d="M52 52 L80 52 M72 44 L80 52 L72 60" stroke={f} strokeWidth={5} fill="none" />
          <rect x="18" y="74" width="64" height="6" />
        </g>
      );
    case "safe-emergency-light":
      return (
        <g fill={f}>
          <path d="M50 16 L60 36 H40 Z" />
          <rect x="44" y="36" width="12" height="34" />
          <path d="M20 76 H80" stroke={f} strokeWidth={5} />
        </g>
      );
    case "safe-defib-room":
      return (
        <g fill={f}>
          <rect x="26" y="26" width="48" height="48" rx="4" />
          <path d="M30 50 L40 50 L46 38 L54 64 L60 50 L70 50" stroke={s} strokeWidth={4} fill="none" />
        </g>
      );
    case "safe-refuge-area":
      return (
        <g fill={f}>
          <rect x="24" y="44" width="52" height="34" rx="4" />
          {person(50, 60, 0.9)}
          <path d="M30 44 V32 H70 V44" stroke={f} strokeWidth={4} fill="none" />
        </g>
      );
    case "safe-doctor":
      return (
        <g fill={f}>
          {person(50, 48, 1)}
          <rect x="42" y="60" width="16" height="14" fill={s} />
          <rect x="46" y="62" width="8" height="10" fill={f} />
          <rect x="48" y="64" width="4" height="6" fill={s} />
        </g>
      );
    case "safe-ladder":
      return (
        <g stroke={f} strokeWidth={4} fill="none">
          <path d="M36 22 V78 M64 22 V78" />
          <path d="M36 32 H64 M36 44 H64 M36 56 H64 M36 68 H64" />
        </g>
      );
    case "safe-safe-area":
      return (
        <g fill={f}>
          <circle cx="50" cy="50" r="22" fill="none" stroke={f} strokeWidth={4} />
          <path d="M40 50 L48 58 L62 42" stroke={f} strokeWidth={5} fill="none" />
        </g>
      );
    case "safe-resuscitation":
      return (
        <g fill={f}>
          <path d="M50 28 C 36 28 28 38 28 50 C 28 64 50 78 50 78 C 50 78 72 64 72 50 C 72 38 64 28 50 28 Z" />
          <text x="50" y="58" fontSize="18" fontWeight="700" textAnchor="middle" fill={s}>
            CPR
          </text>
        </g>
      );
    case "safe-call-point-safe":
      return (
        <g fill={f}>
          <rect x="34" y="30" width="32" height="44" rx="4" />
          <circle cx="50" cy="48" r="8" fill={s} />
          <rect x="42" y="64" width="16" height="4" fill={s} />
        </g>
      );
    // ---- Fire safety ----
    case "fire-extinguisher":
      return (
        <g fill={f}>
          <rect x="40" y="36" width="20" height="38" rx="3" />
          <rect x="44" y="26" width="12" height="10" />
          <path d="M30 30 L44 32" stroke={f} strokeWidth={3} />
          <path d="M30 30 L34 34" stroke={f} strokeWidth={3} />
        </g>
      );
    case "fire-hose":
      return (
        <g fill="none" stroke={f} strokeWidth={5}>
          <circle cx="50" cy="50" r="18" />
          <circle cx="50" cy="50" r="6" />
          <path d="M68 60 L80 70" />
        </g>
      );
    case "fire-alarm":
      return (
        <g fill={f}>
          <rect x="34" y="28" width="32" height="48" rx="4" />
          <circle cx="50" cy="52" r="8" fill={s} />
        </g>
      );
    case "fire-phone":
      return (
        <g fill={f}>
          <path d="M26 36 Q 36 28 50 28 Q 64 28 74 36 L 70 46 L 60 44 L 56 52 Q 50 56 44 52 L 40 44 L 30 46 Z" />
          <text x="50" y="76" fontSize="14" fontWeight="700" textAnchor="middle" fill={f}>
            119
          </text>
        </g>
      );
    case "fire-ladder":
      return (
        <g stroke={f} strokeWidth={4} fill="none">
          <path d="M30 22 L66 78" />
          <path d="M40 28 L52 22 M48 38 L58 32 M56 48 L66 42 M62 60 L74 52" />
        </g>
      );
    case "fire-hydrant":
      return (
        <g fill={f}>
          <rect x="42" y="40" width="16" height="34" rx="3" />
          <rect x="36" y="34" width="28" height="8" />
          <rect x="46" y="28" width="8" height="8" />
          <path d="M60 50 L74 50" stroke={f} strokeWidth={4} />
        </g>
      );
    case "fire-blanket":
      return (
        <g fill={f}>
          <rect x="24" y="32" width="52" height="42" rx="3" />
          <path d="M30 38 L70 38 M30 46 L70 46 M30 54 L70 54 M30 62 L70 62" stroke={s} strokeWidth={2} />
        </g>
      );
    case "fire-axe":
      return (
        <g fill={f}>
          <rect x="32" y="68" width="44" height="6" rx="2" transform="rotate(-30 50 70)" />
          <path d="M22 30 L40 22 L48 32 L34 44 Z" />
        </g>
      );
    case "fire-pump":
      return (
        <g fill={f}>
          <circle cx="50" cy="52" r="18" />
          <circle cx="50" cy="52" r="6" fill={s} />
          <rect x="48" y="20" width="4" height="14" />
          <path d="M30 70 L70 70" stroke={f} strokeWidth={4} />
        </g>
      );
    case "fire-assembly":
      return (
        <g fill={f}>
          {person(38, 52, 0.85)}
          {person(50, 56, 0.95)}
          {person(62, 52, 0.85)}
          <text x="50" y="80" fontSize="12" fontWeight="700" textAnchor="middle" fill={f}>
            FIRE
          </text>
        </g>
      );
    default:
      return (
        <circle cx="50" cy="50" r="6" fill={s} />
      );
  }
}

export interface SafetySignSvgProps {
  sign: SafetySign;
  /** Pixel size of the rendered SVG (square). Defaults to 96. */
  size?: number;
  className?: string;
  title?: string;
}

export function SafetySignSvg({ sign, size = 96, className, title }: SafetySignSvgProps) {
  const primary = PRIMARY_FILL[sign.primaryColor] ?? "#1A1A1A";
  const contrast = CONTRAST_FILL[sign.contrastColor] ?? "#FFFFFF";

  // Warning triangles use black pictograms; the other categories use the
  // contrast colour (typically white). For prohibition signs the
  // pictogram sits on a white field inside the red ring, so it should be
  // drawn in black.
  const pictoStroke =
    sign.category === "prohibition"
      ? "#1A1A1A"
      : sign.category === "warning"
        ? "#1A1A1A"
        : contrast;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <Frame shape={sign.shape} primary={primary} contrast={contrast} />
      <Pictogram id={sign.pictogramId} stroke={pictoStroke} fill={pictoStroke} />
    </svg>
  );
}
