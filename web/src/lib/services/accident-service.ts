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
  getAllAccidentCases: () => Promise<AccidentCase[]>;
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

// C-1（モバイル実速度の構造是正）: 事故データセット（生 約340KB）を静的 import すると
// service-factory 経由で /accidents・/laws のページバンドルに同梱され LCP を悪化させる。
// 一覧の取得は元々非同期APIなので、データ本体は呼び出し時に dynamic import で遅延取得する。
async function loadDataset(): Promise<AccidentCase[]> {
  const mod = await import("@/data/mock/accident-cases");
  return mod.getAccidentCasesDataset();
}

export const mockAccidentService: AccidentService = {
  getAccidentTypes() {
    return accidentTypeOptions;
  },
  getWorkCategories() {
    return accidentCategoryOptions;
  },
  async getAllAccidentCases() {
    return loadDataset();
  },
  async getAccidentCases(input) {
    const filterType = input?.type ?? "すべて";
    const filterCategory = input?.category ?? "すべて";
    const dataset = await loadDataset();
    const data = dataset.filter((item) => {
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
