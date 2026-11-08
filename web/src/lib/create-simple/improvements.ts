/**
 * 「何をすればリスクレベルが下がるか」を、CREATE-SIMPLE と同じ計算で条件を1つずつ変えて再評価して求める。
 * 呼吸用保護具は公式の「実施レポート」と同じ補正（指定防護係数×フィットテスト）で計算する。
 */
import { assessCreateSimple, riskLevelToNumber } from "./assess";
import type {
  CsAmountLevel,
  CsAssessmentInput,
  CsAssessmentResult,
  CsConditions,
  CsRiskLevel,
  CsVentilationLevel,
  CsWorkingHours,
} from "./types";

export type CsRoute = "inhalation8h" | "inhalationShort" | "dermal" | "total" | "physical";

export const CS_ROUTE_LABEL: Record<CsRoute, string> = {
  inhalation8h: "吸入（8時間）",
  inhalationShort: "吸入（短時間）",
  dermal: "経皮吸収",
  total: "合計（吸入＋経皮）",
  physical: "危険性（爆発・火災等）",
};

export type CsSummary = Partial<Record<CsRoute, CsRiskLevel>>;

/** 成分ごとの結果から、経路ごとに最も高いリスクレベルを取る */
export function summarize(result: CsAssessmentResult): CsSummary {
  const out: CsSummary = {};
  const take = (route: CsRoute, level: CsRiskLevel | null | undefined) => {
    if (!level) return;
    const current = out[route];
    if (!current || riskLevelToNumber(level) > riskLevelToNumber(current)) out[route] = level;
  };
  for (const c of result.components) {
    if (c.inhalation.status === "ok") {
      take("inhalation8h", c.inhalation.level8h);
      take("inhalationShort", c.inhalation.levelShort);
    }
    if (c.dermal.status === "ok") take("dermal", c.dermal.level);
    if (c.total.status === "ok") take("total", c.total.level);
    if (c.physical.status === "ok") take("physical", c.physical.level);
  }
  return out;
}

export function worstLevel(summary: CsSummary): CsRiskLevel | null {
  let worst: CsRiskLevel | null = null;
  for (const level of Object.values(summary)) {
    if (level && (!worst || riskLevelToNumber(level) > riskLevelToNumber(worst))) worst = level;
  }
  return worst;
}

export type CsImprovementCategory = "ventilation" | "work" | "glove" | "fire" | "respirator";

export interface CsImprovement {
  id: string;
  category: CsImprovementCategory;
  /** 例: 「囲い式局所排気装置（制御風速を確認）にする」 */
  label: string;
  conditions: CsConditions;
  mode: "sheet" | "report";
  before: CsSummary;
  after: CsSummary;
  /** 下がる経路（上がる経路がある対策は出さない） */
  changes: Array<{ route: CsRoute; from: CsRiskLevel; to: CsRiskLevel }>;
}

const VENT_ORDER: CsVentilationLevel[] = ["A", "B", "C", "D", "E", "F"];
const VENT_LABEL: Record<CsVentilationLevel, string> = {
  A: "換気のない部屋",
  B: "全体換気",
  C: "工業的な全体換気",
  D: "外付け式局所排気装置",
  E: "囲い式局所排気装置",
  F: "密閉容器内での取扱い",
};
const HOURS: CsWorkingHours[] = [10, 8, 7, 6, 5, 4, 3, 2, 1, 0.5];
const HOURS_LABEL: Record<CsWorkingHours, string> = {
  10: "8時間超",
  8: "8時間以下",
  7: "7時間以下",
  6: "6時間以下",
  5: "5時間以下",
  4: "4時間以下",
  3: "3時間以下",
  2: "2時間以下",
  1: "1時間以下",
  0.5: "30分以下",
};

function ventCoeff(level: CsVentilationLevel, confirmed: boolean): number {
  const base = { A: 4, B: 3, C: 1, D: 0.1, E: 0.01, F: 0.001 }[level];
  if (base === 0.1 && !confirmed) return 0.5;
  if (base === 0.01 && !confirmed) return 0.1;
  return base;
}

interface Candidate {
  id: string;
  /** 同じグループの中では、軽い変更から順に並べ、前より効果が増えるものだけ残す */
  group?: string;
  category: CsImprovementCategory;
  label: string;
  conditions: CsConditions;
  mode?: "sheet" | "report";
}

function candidates(input: CsAssessmentInput): Candidate[] {
  const c = input.conditions;
  const out: Candidate[] = [];
  const currentVent = ventCoeff(c.ventilation, c.controlVelocityConfirmed);

  // 換気（工学的対策）
  if ((c.ventilation === "D" || c.ventilation === "E") && !c.controlVelocityConfirmed) {
    out.push({
      id: "control-velocity",
      group: "vent",
      category: "ventilation",
      label: "局所排気装置の制御風速を測って確認する",
      conditions: { ...c, controlVelocityConfirmed: true },
    });
  }
  for (const level of VENT_ORDER) {
    const confirmed = level === "D" || level === "E";
    if (ventCoeff(level, confirmed) >= currentVent) continue;
    out.push({
      id: `vent-${level}`,
      group: "vent",
      category: "ventilation",
      label: `${VENT_LABEL[level]}${confirmed ? "（制御風速を確認）" : ""}にする`,
      conditions: { ...c, ventilation: level, controlVelocityConfirmed: confirmed },
    });
  }

  // 作業のやり方
  if (c.spray) {
    out.push({ id: "no-spray", category: "work", label: "スプレー等の飛散しやすい作業をやめる（はけ・ローラー等に替える）", conditions: { ...c, spray: false } });
  }
  if (c.largeArea && c.productType === 1 && c.amountLevel <= 2) {
    out.push({ id: "small-area", category: "work", label: "1回に塗布する面積を 1m² 未満に分ける", conditions: { ...c, largeArea: false } });
  }
  if (c.amountLevel < 5) {
    const next = (c.amountLevel + 1) as CsAmountLevel;
    out.push({ id: "less-amount", category: "work", label: "1回の取扱量を1段階減らす（小分けにする）", conditions: { ...c, amountLevel: next } });
  }
  const hourIndex = HOURS.indexOf(c.workingHours);
  for (const h of HOURS.slice(hourIndex + 1)) {
    out.push({ id: `hours-${h}`, group: "hours", category: "work", label: `1日の作業時間を${HOURS_LABEL[h]}にする`, conditions: { ...c, workingHours: h } });
  }

  // 手袋（経皮吸収）
  if (c.glove !== "resistant") {
    out.push({
      id: "glove-basic",
      group: "glove",
      category: "glove",
      label: "耐透過性・耐浸透性の化学防護手袋を着け、基本的な教育をする",
      conditions: { ...c, glove: "resistant", gloveTraining: c.gloveTraining === "none" ? "basic" : c.gloveTraining },
    });
  }
  if (c.glove !== "resistant" || c.gloveTraining !== "thorough") {
    out.push({
      id: "glove-thorough",
      group: "glove",
      category: "glove",
      label: "耐透過性・耐浸透性の化学防護手袋を着け、使い方を十分に教育する",
      conditions: { ...c, glove: "resistant", gloveTraining: "thorough" },
    });
  }
  if (c.contactArea !== null && c.contactArea > 10) {
    out.push({ id: "contact-small", category: "glove", label: "皮膚に付く範囲を小さな飛沫程度に抑える", conditions: { ...c, contactArea: 10 } });
  }

  // 爆発・火災
  if (!c.ignitionSourceRemoved) {
    out.push({ id: "ignition", category: "fire", label: "着火源を取り除く（静電気対策・火気や高温部の排除）", conditions: { ...c, ignitionSourceRemoved: true } });
  }
  if (!c.explosiveAtmospherePrevented) {
    out.push({ id: "atmosphere", category: "fire", label: "爆発性雰囲気をつくらない（漏洩防止・換気で滞留させない）", conditions: { ...c, explosiveAtmospherePrevented: true } });
  }
  if (!c.ignitionSourceRemoved && !c.explosiveAtmospherePrevented) {
    out.push({
      id: "ignition-and-atmosphere",
      category: "fire",
      label: "着火源を取り除き、爆発性雰囲気もつくらない（両方行う）",
      conditions: { ...c, ignitionSourceRemoved: true, explosiveAtmospherePrevented: true },
    });
  }
  if (c.organicOrMetalNearby) {
    out.push({ id: "no-organic", category: "fire", label: "近くで有機物や金属を扱わない", conditions: { ...c, organicOrMetalNearby: false } });
  }
  if (c.airOrWaterContact) {
    out.push({ id: "no-air-water", category: "fire", label: "空気・水に触れない状態で扱う", conditions: { ...c, airOrWaterContact: false } });
  }
  if (c.processTemperature !== null) {
    out.push({ id: "room-temp", category: "fire", label: "室温で扱う（加温しない）", conditions: { ...c, processTemperature: null } });
  }

  // 呼吸用保護具（最後の手段。公式「実施レポート」の補正）
  if (c.productType === 1) {
    out.push({
      id: "rpe-gas-half",
      group: "rpe",
      category: "respirator",
      label: "防毒マスク（半面形）をフィットテストのうえ着用する",
      conditions: { ...c, respirator: { protectionFactor: 10, fit: "fitTest" } },
      mode: "report",
    });
    out.push({
      id: "rpe-papr-full",
      group: "rpe",
      category: "respirator",
      label: "電動ファン付き呼吸用保護具（全面形）をフィットテストのうえ着用する",
      conditions: { ...c, respirator: { protectionFactor: 1000, fit: "fitTest" } },
      mode: "report",
    });
  } else if (c.productType === 2) {
    out.push({
      id: "rpe-dust-rs2",
      group: "rpe",
      category: "respirator",
      label: "取替え式防じんマスク（半面形 RS2）をフィットテストのうえ着用する",
      conditions: { ...c, respirator: { protectionFactor: 10, fit: "fitTest" } },
      mode: "report",
    });
    out.push({
      id: "rpe-papr-s",
      group: "rpe",
      category: "respirator",
      label: "電動ファン付き呼吸用保護具（全面形 S級 PS3）をフィットテストのうえ着用する",
      conditions: { ...c, respirator: { protectionFactor: 1000, fit: "fitTest" } },
      mode: "report",
    });
  }
  return out;
}

function diff(before: CsSummary, after: CsSummary) {
  const changes: CsImprovement["changes"] = [];
  let worsened = false;
  for (const route of Object.keys(CS_ROUTE_LABEL) as CsRoute[]) {
    const b = before[route];
    const a = after[route];
    if (!b || !a) continue;
    const nb = riskLevelToNumber(b);
    const na = riskLevelToNumber(a);
    if (na < nb) changes.push({ route, from: b, to: a });
    else if (na > nb) worsened = true;
  }
  return { changes, worsened };
}

/**
 * 1つずつ条件を変えた再評価のうち、どれかの経路のリスクレベルが下がるもの。
 * 同じ分類の中では、より軽い変更で同じ効果になるものだけを残す（例: 作業時間は下がる最初の段階だけ）。
 */
export function suggestImprovements(input: CsAssessmentInput): CsImprovement[] {
  const baseMode = input.mode ?? "sheet";
  const before = summarize(assessCreateSimple({ ...input, mode: baseMode }));
  const out: CsImprovement[] = [];
  const bestInGroup = new Map<string, number>();
  for (const cand of candidates(input)) {
    const mode = cand.mode ?? baseMode;
    const after = summarize(assessCreateSimple({ ...input, conditions: cand.conditions, mode }));
    const { changes, worsened } = diff(before, after);
    if (worsened || changes.length === 0) continue;
    if (cand.group) {
      const s = score(after);
      const prev = bestInGroup.get(cand.group);
      if (prev !== undefined && s >= prev) continue;
      bestInGroup.set(cand.group, s);
    }
    out.push({ id: cand.id, category: cand.category, label: cand.label, conditions: cand.conditions, mode, before, after, changes });
  }
  return out;
}

/** 現場での手間の目安（小さいほど取り組みやすい） */
const MEASURE_COST: Record<string, number> = {
  "control-velocity": 1,
  "vent-A": 9,
  "vent-B": 1,
  "vent-C": 2,
  "vent-D": 3,
  "vent-E": 4,
  "vent-F": 6,
  "no-spray": 2,
  "small-area": 1,
  "less-amount": 3,
  "glove-basic": 1,
  "glove-thorough": 2,
  "contact-small": 3,
  ignition: 1,
  atmosphere: 2,
  "ignition-and-atmosphere": 3,
  "no-organic": 1,
  "no-air-water": 2,
  "room-temp": 2,
};

function measureCost(id: string): number {
  if (id.startsWith("hours-")) return 3;
  return MEASURE_COST[id] ?? 5;
}

function score(summary: CsSummary): number {
  return Object.values(summary).reduce((n, level) => n + riskLevelToNumber(level), 0);
}

export interface CsPlan {
  steps: CsImprovement[];
  conditions: CsConditions;
  before: CsSummary;
  after: CsSummary;
}

/**
 * 呼吸用保護具に頼らない対策を、効果の大きい順に重ねて適用した組み合わせ。
 * すべての経路がⅡ以下（長時間はⅡ-A以下）になるか、それ以上下がらなくなるまで最大5手。
 */
export function planImprovements(input: CsAssessmentInput): CsPlan | null {
  const before = summarize(assessCreateSimple(input));
  const target = (s: CsSummary) => Object.values(s).every((level) => riskLevelToNumber(level) <= 2);
  if (target(before)) return null;
  let current = input;
  let currentSummary = before;
  const steps: CsImprovement[] = [];
  for (let i = 0; i < 6; i++) {
    const options = suggestImprovements(current).filter((o) => o.category !== "respirator");
    if (options.length === 0) break;
    const worstNow = riskLevelToNumber(worstLevel(currentSummary));
    // いちばん高いレベルを下げられる対策のうち、手間の小さいものから選ぶ
    const lowering = options.filter((o) => riskLevelToNumber(worstLevel(o.after)) < worstNow);
    const pool = lowering.length > 0 ? lowering : options;
    const best = pool.reduce((a, b) => {
      const ca = measureCost(a.id);
      const cb = measureCost(b.id);
      if (cb !== ca) return cb < ca ? b : a;
      return score(b.after) < score(a.after) ? b : a;
    });
    steps.push(best);
    current = { ...current, conditions: best.conditions };
    currentSummary = best.after;
    if (target(currentSummary)) break;
  }
  if (steps.length < 2) return null;
  return { steps, conditions: current.conditions, before, after: currentSummary };
}
