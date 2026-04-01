import { accidentCasesMock } from "@/data/mock/accident-cases";
import type { ServiceResult } from "@/lib/types/api";
import type { AccidentCase, AccidentType } from "@/lib/types/domain";

export type AccidentService = {
  getAccidentTypes: () => { value: AccidentType | "すべて"; label: string }[];
  getAllAccidentCases: () => AccidentCase[];
  getAccidentCases: (input?: {
    type?: AccidentType | "すべて";
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

export const mockAccidentService: AccidentService = {
  getAccidentTypes() {
    return accidentTypeOptions;
  },
  getAllAccidentCases() {
    return accidentCasesMock;
  },
  async getAccidentCases(input) {
    const filterType = input?.type ?? "すべて";
    const data =
      filterType === "すべて"
        ? accidentCasesMock
        : accidentCasesMock.filter((item) => item.type === filterType);
    return {
      ok: true,
      data,
    };
  },
};

export function createMockAccidentService(): AccidentService {
  return mockAccidentService;
}
