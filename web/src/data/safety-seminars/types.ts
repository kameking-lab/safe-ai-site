export type TrainingSourceType =
  | "law"
  | "statistics"
  | "government-guidance"
  | "scientific";

export type TrainingSource = {
  sourceId: string;
  sourceType: TrainingSourceType;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  checkedAt: string;
  applicableDate: string;
  finalOrPreliminary: string;
  locator: string;
  claimIds: string[];
  checksum: string;
  status: string;
};

export type TrainingClaim = {
  claimId: string;
  claimType:
    | "law-duty"
    | "administrative-recommendation"
    | "statistics"
    | "scientific"
    | "portal-proposal";
  statement: string;
  sourceIds: string[];
};

export type SlideMetric = {
  label: string;
  value: string;
  note?: string;
  tone?: "teal" | "orange" | "rose" | "sky";
};

export type SlideBar = {
  label: string;
  value: number;
  display: string;
};

export type SlideTrendPoint = {
  year: number;
  deaths: number;
  injuries: number;
};

export type SlideVisual =
  | { type: "metrics"; metrics: SlideMetric[] }
  | { type: "bars"; bars: SlideBar[]; max: number; unit: string }
  | { type: "trend"; points: SlideTrendPoint[] }
  | { type: "image"; src: string; alt: string }
  | { type: "steps"; steps: { label: string; detail: string; tone?: string }[] }
  | { type: "checklist"; items: string[] }
  | {
      type: "ky";
      image: string;
      alt: string;
      prompts: string[];
    };

export type FallPreventionSlide = {
  id: string;
  number: number;
  title: string;
  kicker: string;
  message: string;
  body: string[];
  visual: SlideVisual;
  label:
    | "導入"
    | "統計・確定値"
    | "法定義務"
    | "行政推奨"
    | "科学的知見"
    | "サイト提案"
    | "演習";
  claimIds: string[];
  narration: string;
  instructorNotes: string[];
  estimatedSeconds: number;
};

export type FallPreventionTraining = {
  id: string;
  title: string;
  subtitle: string;
  asOf: string;
  version: string;
  audience: string[];
  standardMinutes: { audioMin: number; audioMax: number; workshop: number };
  boundary: string;
  slideCount: number;
  slides: FallPreventionSlide[];
};
