/**
 * Occupational safety sign taxonomy.
 *
 * Modelled on JIS Z 9101 (safety colours and safety signs for
 * industrial premises), JIS Z 9103 (safety colour general rules) and
 * JIS Z 9104 (safety sign general rules). The five top-level
 * categories follow the ISO 7010 / JIS Z 9101 grouping that is widely
 * used on Japanese worksites:
 *
 *  - prohibition  禁止  red circle with diagonal bar
 *  - warning      警告  yellow equilateral triangle, black border
 *  - mandatory    指示  blue solid circle
 *  - safe-condition 安全状態 (emergency egress, first aid) green square
 *  - fire-safety  防火  red square (fire-fighting equipment, alarms)
 *
 * Signs are catalogued as in-house SVG drawings — no JIS or
 * third-party artwork is reproduced. Each record references the
 * relevant JIS or ISO 7010 number for traceability only.
 */

/** Top-level sign category per JIS Z 9101. */
export type SignCategory =
  | "prohibition"
  | "warning"
  | "mandatory"
  | "safe-condition"
  | "fire-safety";

/** Display shape of the sign (JIS Z 9104 §5). */
export type SignShape = "circle" | "circle-bar" | "triangle" | "square";

/** Safety colour per JIS Z 9103. */
export type SafetyColor =
  /** Red 7.5R 4/15 — prohibition, fire-fighting, danger. */
  | "red"
  /** Yellow 2.5Y 8/14 — caution, warning. */
  | "yellow"
  /** Blue 2.5PB 3.5/10 — mandatory, instruction. */
  | "blue"
  /** Green 10G 4/10 — safe condition, first aid, emergency exit. */
  | "green"
  /** White N9.5 — contrast colour. */
  | "white"
  /** Black N1 — text, borders, pictograms. */
  | "black";

/** Industry classifications referenced by sign usage tables. */
export type IndustryId =
  | "construction"
  | "manufacturing"
  | "transport"
  | "healthcare"
  | "service"
  | "warehouse"
  | "chemical"
  | "agriculture";

/** How critical the sign is for a given industry. */
export type UsageRequirement =
  /** Required by law or by JIS as a baseline minimum. */
  | "required"
  /** Recommended industry standard practice. */
  | "recommended"
  /** Situational — install where the hazard exists. */
  | "situational";

/** Placement guidance for the physical sign. */
export interface PlacementGuide {
  /** Suggested mounting height range in mm (eye-level reference). */
  heightMm: { min: number; max: number };
  /** Recommended placement locations (Japanese, plain language). */
  locations: string[];
  /** Optional supporting notes (illumination, viewing distance, etc.). */
  notes?: string;
}

/** Legal anchor cited for the sign (Japanese statute). */
export interface RelatedLaw {
  /** Statute or ordinance name (e.g. "労働安全衛生規則"). */
  statute: string;
  /** Article reference (e.g. "第325条"). Optional for guidance docs. */
  article?: string;
  /** Short description of why this law applies. */
  note: string;
}

/** Industry-specific application of a sign. */
export interface IndustryApplication {
  industry: IndustryId;
  requirement: UsageRequirement;
  /** Example deployment scenarios in the industry. */
  examples: string[];
}

/** Authoritative reference for the sign artwork / definition. */
export interface SignReference {
  /** Standard or document name (e.g. "JIS Z 9101", "ISO 7010"). */
  standard: string;
  /** Specific code if available (e.g. "P002", "W001"). */
  code?: string;
  /** Free-form note. */
  note?: string;
}

/** A single safety sign record. */
export interface SafetySign {
  /** Internal identifier, kebab-case (e.g. "no-entry"). */
  id: string;
  /** Display name in Japanese. */
  name: string;
  /** English label for accessibility / search. */
  nameEn: string;
  /** Sign category per JIS Z 9101. */
  category: SignCategory;
  /** Geometric shape. */
  shape: SignShape;
  /** Primary safety colour. */
  primaryColor: SafetyColor;
  /** Secondary (contrast) colour, usually white or black. */
  contrastColor: SafetyColor;
  /** Plain-language meaning of the sign. */
  meaning: string;
  /** Where and when the sign should be used. */
  usageGuide: string;
  /** Physical placement guidance. */
  placement: PlacementGuide;
  /** Linked statutes / regulations. */
  relatedLaws: RelatedLaw[];
  /** Industry-specific deployment table. */
  industryUsage: IndustryApplication[];
  /** Source standards consulted for the sign artwork. */
  references: SignReference[];
  /** Identifier for the inline SVG pictogram component. */
  pictogramId: PictogramId;
}

/**
 * Identifiers for inline-SVG pictogram primitives.
 * Pictograms are drawn in `web/src/components/safety-sign-svg.tsx` and
 * follow JIS Z 9101 figure conventions without reproducing copyrighted
 * artwork.
 */
export type PictogramId =
  // prohibition
  | "no-entry"
  | "no-smoking"
  | "no-open-flame"
  | "no-vehicles"
  | "no-pedestrians"
  | "no-mobile-phone"
  | "no-photography"
  | "no-touching"
  | "no-running"
  | "no-water"
  | "no-eating"
  | "no-disposal"
  | "no-elevator-people"
  | "no-crane-overhead"
  | "no-climbing"
  | "no-leaning"
  | "no-passage"
  | "no-forklift"
  | "no-power"
  | "no-extinguish-water"
  | "no-cellphone-emi"
  | "no-overload"
  | "no-stacking"
  | "no-unauthorized"
  | "no-stopping"
  | "no-welding"
  | "no-grinding"
  | "no-cutting"
  | "no-modification"
  | "no-bare-hands"
  // warning
  | "warn-electric"
  | "warn-fall"
  | "warn-slip"
  | "warn-overhead"
  | "warn-hot"
  | "warn-cold"
  | "warn-corrosive"
  | "warn-toxic"
  | "warn-flammable"
  | "warn-explosive"
  | "warn-radiation"
  | "warn-laser"
  | "warn-magnetic"
  | "warn-biohazard"
  | "warn-oxygen-low"
  | "warn-asphyxiation"
  | "warn-noise"
  | "warn-vibration"
  | "warn-pinch"
  | "warn-cut"
  | "warn-forklift"
  | "warn-crane"
  | "warn-pressure"
  | "warn-machine"
  | "warn-trip"
  | "warn-dust"
  | "warn-uv"
  | "warn-cylinder"
  | "warn-construction"
  | "warn-suspended-load"
  // mandatory
  | "mand-helmet"
  | "mand-glasses"
  | "mand-mask"
  | "mand-respirator"
  | "mand-earplugs"
  | "mand-gloves"
  | "mand-boots"
  | "mand-harness"
  | "mand-vest"
  | "mand-faceshield"
  | "mand-apron"
  | "mand-wash-hands"
  | "mand-disinfect"
  | "mand-keep-clean"
  | "mand-ventilate"
  | "mand-ground"
  | "mand-lockout"
  | "mand-readsds"
  | "mand-emergency-stop"
  | "mand-pedestrian-route"
  // safe condition
  | "safe-exit-left"
  | "safe-exit-right"
  | "safe-exit-up"
  | "safe-assembly-point"
  | "safe-first-aid"
  | "safe-aed"
  | "safe-eyewash"
  | "safe-shower"
  | "safe-stretcher"
  | "safe-emergency-phone"
  | "safe-rescue-window"
  | "safe-evacuation-route"
  | "safe-emergency-light"
  | "safe-defib-room"
  | "safe-refuge-area"
  | "safe-doctor"
  | "safe-ladder"
  | "safe-safe-area"
  | "safe-resuscitation"
  | "safe-call-point-safe"
  // fire safety
  | "fire-extinguisher"
  | "fire-hose"
  | "fire-alarm"
  | "fire-phone"
  | "fire-ladder"
  | "fire-hydrant"
  | "fire-blanket"
  | "fire-axe"
  | "fire-pump"
  | "fire-assembly";
