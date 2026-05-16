import type {
  ResidenceStatusId,
  ResidenceStatusIndex,
  ResidenceStatusRule,
} from "@/types/foreign-worker";

import {
  TECHNICAL_INTERN_1,
  TECHNICAL_INTERN_2,
  TECHNICAL_INTERN_3,
} from "./technical-intern";
import {
  SPECIFIED_SKILLED_1,
  SPECIFIED_SKILLED_2,
} from "./specified-skilled";
import { ENGINEER_HUMANITIES_INTL, SKILLED_LABOR } from "./professional";
import {
  PERMANENT_RESIDENT,
  LONG_TERM_RESIDENT,
  SPOUSE_OF_JAPANESE,
  DESIGNATED_ACTIVITIES_EMPLOYMENT,
} from "./status-based";

const ALL_RULES: ResidenceStatusRule[] = [
  TECHNICAL_INTERN_1,
  TECHNICAL_INTERN_2,
  TECHNICAL_INTERN_3,
  SPECIFIED_SKILLED_1,
  SPECIFIED_SKILLED_2,
  ENGINEER_HUMANITIES_INTL,
  SKILLED_LABOR,
  PERMANENT_RESIDENT,
  LONG_TERM_RESIDENT,
  SPOUSE_OF_JAPANESE,
  DESIGNATED_ACTIVITIES_EMPLOYMENT,
];

const BY_ID = ALL_RULES.reduce<Record<ResidenceStatusId, ResidenceStatusRule>>(
  (acc, rule) => {
    acc[rule.id] = rule;
    return acc;
  },
  {} as Record<ResidenceStatusId, ResidenceStatusRule>,
);

export const RESIDENCE_STATUS_INDEX: ResidenceStatusIndex = {
  byId: BY_ID,
  all: ALL_RULES,
};

export function getResidenceStatusRule(
  id: ResidenceStatusId,
): ResidenceStatusRule | undefined {
  return BY_ID[id];
}

export function getResidenceStatusIds(): ResidenceStatusId[] {
  return ALL_RULES.map((r) => r.id);
}
