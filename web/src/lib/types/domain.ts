export type LawRevisionCore = {
  id: string;
  title: string;
  publishedAt: string;
  revisionNumber?: string;
  category?: "労働安全衛生法" | "省令" | "通達";
  source?: {
    issuer: string;
    url?: string;
  };
  summary: string;
};

export type LawRevisionSummary = {
  threeLineSummary: [string, string, string];
  workplaceActions: string[];
  targetIndustries: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatReplyRule = {
  keywords: string[];
  response: string;
};

// API接続時に差し替えしやすいよう、UI側はこの別名を利用する。
export type LawRevision = LawRevisionCore;
export type RevisionSummary = LawRevisionSummary;
export type SummaryContent = LawRevisionSummary;
