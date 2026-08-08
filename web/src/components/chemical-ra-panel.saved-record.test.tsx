import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChemicalRaPanel } from "./chemical-ra-panel";
import { createChemicalRaRecordPayload } from "@/lib/chemical/ra-cloud";
import { TransientQueryBridgeProvider } from "@/components/home-safety-cockpit/transient-query-bridge";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const STORE_KEY = "safe-ai:chemical-ra-records:v1";

function renderPanel() {
  return render(
    <TransientQueryBridgeProvider>
      <ChemicalRaPanel />
    </TransientQueryBridgeProvider>,
  );
}

function safeResult(chemicalName = "トルエン") {
  return {
    chemicalName,
    casNumber: "108-88-3",
    ghsHazards: [],
    ppeRecommendations: [],
    safetyMeasures: [],
    emergencyMeasures: [],
    regulatoryNotes: [],
    aiStatus: "disabled_for_safety" as const,
    assessmentStatus: "unavailable" as const,
    assessmentNotice: "公式SDSと公式ツールで確認してください。",
  };
}

function seed(payload: unknown, raId: string) {
  window.localStorage.setItem(
    STORE_KEY,
    JSON.stringify([
      {
        raId,
        cas: "108-88-3",
        substance: "トルエン",
        workContent: "旧作業メモ",
        exposureBand: "",
        payload,
        savedAt: "2026-07-24T03:04:05.000Z",
        syncState: "saved-locally",
      },
    ]),
  );
  window.history.replaceState(
    {},
    "",
    `/chemical-ra?raId=${encodeURIComponent(raId)}`,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "insufficient", tags: [] }),
    }),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/chemical-ra");
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChemicalRaPanel 保存記録の条件復元", () => {
  it("旧payloadは保存時条件を復元できると表示しない", async () => {
    seed(safeResult(), "legacy-ra");
    renderPanel();
    expect(
      await screen.findByText(
        "旧形式のため、保存時の評価条件を復元できません",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/この記録を条件まで再現した原本とは扱わず/),
    ).toBeTruthy();
    expect(screen.getByText("判定値")).toBeTruthy();
    expect(screen.getByText("未算出")).toBeTruthy();
    expect(screen.queryByText("自動リスク判定は行っていません")).toBeNull();
    expect(screen.queryByText(/公的データ限定モード/)).toBeNull();
  });

  it("v2 snapshotからSDS・換気・量・時間・濃度・単位を復元する", async () => {
    const payload = createChemicalRaRecordPayload(safeResult(), {
      workContent: "屋内塗装",
      sdsStatus: "confirmed",
      sdsIssuedOn: "2026-06-01",
      componentVersion: "製品A / 第3版",
      ventilation: "local",
      generalVentilation: "yes",
      localExhaust: "yes",
      amount: "medium",
      durationHours: 4,
      frequency: "daily",
      useTemperatureC: 25,
      dispersion: "vapor",
      skinContact: "no",
      ppeDescription: "有機ガス用防毒マスク、耐溶剤手袋",
      ppeSuitability: "confirmed",
      substitution: "considered",
      existingControls: "密閉容器で小分け",
      additionalControls: "局所排気の点検記録",
      actionOwner: "化学物質管理者",
      actionDueOn: "2026-07-30",
      reassessmentOn: "2026-08-31",
      measuredConcentration: "12.5",
      measuredUnit: "ppm",
      capturedAt: "2026-07-24T03:04:05.000Z",
    });
    seed(payload, "snapshot-ra");
    renderPanel();

    expect(
      await screen.findByText(
        /保存時のSDS確認状況・作業条件・測定値・単位・記録ルール版を復元しています/,
      ),
    ).toBeTruthy();
    await waitFor(() => {
      expect(
        (screen.getByLabelText("SDS確認状況") as HTMLSelectElement).value,
      ).toBe("confirmed");
      expect(
        (screen.getByLabelText("SDS発行日") as HTMLInputElement).value,
      ).toBe("2026-06-01");
      expect(
        (screen.getByLabelText("成分・製品版") as HTMLInputElement).value,
      ).toBe("製品A / 第3版");
      expect((screen.getByLabelText("換気") as HTMLSelectElement).value).toBe(
        "local",
      );
      expect(
        (screen.getByLabelText("取扱量") as HTMLSelectElement).value,
      ).toBe("medium");
      expect(
        (screen.getByLabelText("作業時間（時間/日）") as HTMLInputElement)
          .value,
      ).toBe("4");
      expect(
        (screen.getByLabelText("作業頻度") as HTMLSelectElement).value,
      ).toBe("daily");
      expect(
        (screen.getByLabelText("保護具の適合性") as HTMLSelectElement).value,
      ).toBe("confirmed");
      expect(
        (screen.getByLabelText("測定濃度の数値") as HTMLInputElement).value,
      ).toBe("12.5");
      expect((screen.getByLabelText("単位") as HTMLSelectElement).value).toBe(
        "ppm",
      );
    });
  });
});
