/**
 * Treatment-work balance: illness category and per-condition consideration data.
 *
 * Positioned as a workforce-management reference (not medical guidance).
 * Sources are MHLW "Guidelines on Supporting Both Treatment and Work in
 * the Workplace" (revised Reiwa 5), Japan Industrial Safety & Health
 * Association handbooks, and the Industrial Health Foundation reference set.
 * All medical judgements remain with the attending physician.
 */

export type IllnessCategory =
  | "cancer"
  | "stroke"
  | "heart-disease"
  | "diabetes"
  | "mental-health"
  | "intractable-disease";

export type SeverityLevel = "mild" | "moderate" | "severe";

export type WorkType =
  | "desk"
  | "field"
  | "driving"
  | "manufacturing"
  | "healthcare"
  | "service";

export interface IllnessCategoryMeta {
  id: IllnessCategory;
  label: string;
  shortLabel: string;
  summary: string;
  riskHighlights: string[];
  relatedLaws: string[];
}

export interface IllnessCondition {
  /** Stable slug, used in URLs only when needed. */
  id: string;
  category: IllnessCategory;
  /** Display name of the specific condition or sub-type. */
  name: string;
  /** Short one-line description of the condition for the workplace reader. */
  overview: string;
  /** Typical treatment patterns relevant for scheduling and absence. */
  treatmentPatterns: string[];
  /** Considerations on the content of work tasks. */
  workConsiderations: string[];
  /** Considerations on working hours, shift, and breaks. */
  timeConsiderations: string[];
  /** Considerations on the physical work environment. */
  environmentConsiderations: string[];
  /** How HR / line manager / occupational physician should communicate. */
  communicationPoints: string[];
  /** Free-text notes that do not fit into the four buckets above. */
  notes?: string[];
}
