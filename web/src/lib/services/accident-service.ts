import { accidentCasesMock } from "@/data/mock/accident-cases";
import type { ServiceResult } from "@/lib/types/api";
import type { AccidentCase, AccidentType, AccidentWorkCategory } from "@/lib/types/domain";

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
  { value: "墜落", label: "墜落" },
  { value: "転倒", label: "転倒" },
  { value: "挟まれ", label: "挟まれ" },
  { value: "飛来落下", label: "飛来落下" },
  { value: "感電", label: "感電" },
];

const accidentCategoryOptions: { value: AccidentWorkCategory | "すべて"; label: string }[] = [
  { value: "すべて", label: "すべて" },
  { value: "高所", label: "高所" },
  { value: "電気", label: "電気" },
  { value: "足場", label: "足場" },
  { value: "重機", label: "重機" },
  { value: "一般", label: "一般" },
];

export const mockAccidentService: AccidentService = {
  getAccidentTypes() {
    return accidentTypeOptions;
  },
  getWorkCategories() {
    return accidentCategoryOptions;
  },
  getAllAccidentCases() {
    return accidentCasesMock;
  },
  async getAccidentCases(input) {
    const filterType = input?.type ?? "すべて";
    const filterCategory = input?.category ?? "すべて";
    const data = accidentCasesMock.filter((item) => {
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
