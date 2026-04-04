import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { ServiceResult } from "@/lib/types/api";
import {
  ALL_ACCIDENT_CATEGORIES,
  ALL_ACCIDENT_TYPES,
  type AccidentCase,
  type AccidentType,
  type AccidentWorkCategory,
} from "@/lib/types/domain";

export type AccidentService = {
  getAccidentTypes: () => { value: AccidentType | "すべて"; label: string }[];
  getWorkCategories: () => { value: AccidentWorkCategory | "すべて"; label: string }[];
  getAllAccidentCases: () => AccidentCase[];
  getAccidentCases: (input?: {
    type?: AccidentType | "すべて";
    category?: AccidentWorkCategory | "すべて";
  }) => Promise<ServiceResult<AccidentCase[]>>;
};

const accidentTypeOptions: { value: AccidentType | "すべて"; label: string }[] = [
  { value: "すべて", label: "すべて" },
  ...ALL_ACCIDENT_TYPES.map((t) => ({ value: t, label: t })),
];

const accidentCategoryOptions: { value: AccidentWorkCategory | "すべて"; label: string }[] = [
  { value: "すべて", label: "すべて" },
  ...ALL_ACCIDENT_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export const mockAccidentService: AccidentService = {
  getAccidentTypes() {
    return accidentTypeOptions;
  },
  getWorkCategories() {
    return accidentCategoryOptions;
  },
  getAllAccidentCases() {
    return getAccidentCasesDataset();
  },
  async getAccidentCases(input) {
    const filterType = input?.type ?? "すべて";
    const filterCategory = input?.category ?? "すべて";
    const data = getAccidentCasesDataset().filter((item) => {
      const typeMatched = filterType === "すべて" || item.type === filterType;
      const categoryMatched = filterCategory === "すべて" || item.workCategory === filterCategory;
      return typeMatched && categoryMatched;
    });
    return {
      ok: true,
      data,
    };
  },
};

export function createMockAccidentService(): AccidentService {
  return mockAccidentService;
}
