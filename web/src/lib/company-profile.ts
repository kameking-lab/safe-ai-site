"use client";

import { z } from "zod";

export const PROFILE_INDUSTRIES = [
  "construction",
  "manufacturing",
  "healthcare",
  "transport",
  "it",
  "forestry",
  "logistics",
  "other",
] as const;
export type ProfileIndustry = (typeof PROFILE_INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<ProfileIndustry, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  it: "IT・情報通信",
  forestry: "林業",
  logistics: "倉庫・物流",
  other: "その他",
};

export const COMPANY_SIZES = ["lt10", "10-50", "50-300", "gt300"] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const SIZE_LABELS: Record<CompanySize, string> = {
  lt10: "10名未満",
  "10-50": "10〜50名",
  "50-300": "50〜300名",
  gt300: "300名超",
};

export const companyProfileSchema = z.object({
  companyName: z.string().default(""),
  industry: z.enum(PROFILE_INDUSTRIES).default("construction"),
  size: z.enum(COMPANY_SIZES).default("10-50"),
  /** 取扱化学物質（自由入力、カンマ区切り） */
  chemicals: z.array(z.string()).default([]),
  /** 主要機械（自由入力） */
  machines: z.array(z.string()).default([]),
  /** 現場名・部署名（複数可） */
  sites: z.array(z.string()).default([]),
  /** 主要作業のキーワード（マッチング用） */
  workKeywords: z.array(z.string()).default([]),
  /** ウィザードを完了したか */
  wizardCompleted: z.boolean().default(false),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

const STORAGE_KEY = "company-profile-v1";

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: "",
  industry: "construction",
  size: "10-50",
  chemicals: [],
  machines: [],
  sites: [],
  workKeywords: [],
  wizardCompleted: false,
  updatedAt: new Date(0).toISOString(),
};

export function loadProfile(): CompanyProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = companyProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: CompanyProfile): void {
  if (typeof window === "undefined") return;
  const next = { ...profile, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("company-profile-changed", { detail: next }));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("company-profile-changed", { detail: DEFAULT_PROFILE }));
}

export function isProfileEmpty(p: CompanyProfile): boolean {
  return !p.wizardCompleted && !p.companyName && p.chemicals.length === 0 && p.sites.length === 0;
}

/** 業種キーワード（既存コンポーネントの industry filter と互換） */
const INDUSTRY_KEYWORDS: Record<ProfileIndustry, string[]> = {
  construction: ["建設", "足場", "高所", "墜落", "クレーン", "型枠", "とび"],
  manufacturing: ["製造", "機械", "プレス", "化学物質", "粉じん", "溶接"],
  healthcare: ["医療", "介護", "福祉", "感染", "腰痛"],
  transport: ["運輸", "トラック", "陸上貨物", "倉庫", "荷役", "フォーク"],
  it: ["IT", "ソフトウェア", "テレワーク", "VDT", "情報通信"],
  forestry: ["林業", "伐木", "刈払", "チェーンソー"],
  logistics: ["物流", "倉庫", "配送", "ピッキング", "フォーク"],
  other: [],
};

export function getIndustryKeywords(industry: ProfileIndustry): string[] {
  return INDUSTRY_KEYWORDS[industry] ?? [];
}

/**
 * プロファイル業種を IndustryTag (domain.ts) にマッピングする。
 * 該当が無い（it / other）場合は null。
 */
export function profileIndustryToTag(
  industry: ProfileIndustry
): "construction" | "manufacturing" | "healthcare" | "transport" | "forestry" | null {
  switch (industry) {
    case "construction":
      return "construction";
    case "manufacturing":
      return "manufacturing";
    case "healthcare":
      return "healthcare";
    case "transport":
    case "logistics":
      return "transport";
    case "forestry":
      return "forestry";
    case "it":
    case "other":
    default:
      return null;
  }
}

/** プロファイルから「自社に関連する」スコアを算出（テキスト→0..100） */
export function relevanceScore(text: string, profile: CompanyProfile): number {
  if (!text) return 0;
  let score = 0;
  const lc = text.toLowerCase();
  for (const kw of getIndustryKeywords(profile.industry)) {
    if (text.includes(kw)) score += 18;
  }
  for (const c of profile.chemicals) {
    if (c.length >= 2 && text.includes(c)) score += 22;
  }
  for (const m of profile.machines) {
    if (m.length >= 2 && (text.includes(m) || lc.includes(m.toLowerCase()))) score += 18;
  }
  for (const w of profile.workKeywords) {
    if (w.length >= 2 && text.includes(w)) score += 12;
  }
  return Math.min(100, score);
}
