import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  upsertRecord,
  mergeRecords,
  saveChemicalRaRecord,
  getChemicalRaRecord,
  deleteChemicalRaRecord,
  createChemicalRaRecordPayload,
  inspectChemicalRaRecordPayload,
  CHEMICAL_RA_REFERENCE_RULE_VERSION,
  type ChemicalRaSavedRecord,
} from "@/lib/chemical/ra-cloud";

const mk = (raId: string, savedAt: string): ChemicalRaSavedRecord => ({
  raId,
  cas: "",
  substance: raId,
  workContent: "",
  exposureBand: "",
  payload: {},
  savedAt,
  syncState: "saved-locally",
});

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://configured.invalid");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("upsertRecord", () => {
  it("新規追加し savedAt 降順", () => {
    let list: ChemicalRaSavedRecord[] = [];
    list = upsertRecord(list, mk("a", "2026-05-01T00:00:00Z"));
    list = upsertRecord(list, mk("b", "2026-05-03T00:00:00Z"));
    expect(list.map((r) => r.raId)).toEqual(["b", "a"]);
  });

  it("同一raIdは上書き（重複しない）", () => {
    let list = [mk("a", "2026-05-01T00:00:00Z")];
    list = upsertRecord(list, mk("a", "2026-05-05T00:00:00Z"));
    expect(list).toHaveLength(1);
    expect(list[0].savedAt).toBe("2026-05-05T00:00:00Z");
  });
});

describe("mergeRecords", () => {
  it("クラウドとローカルをraIdでマージ、新しい方を採用", () => {
    const local = [mk("a", "2026-05-01T00:00:00Z"), mk("b", "2026-05-02T00:00:00Z")];
    const cloud = [mk("a", "2026-05-09T00:00:00Z"), mk("c", "2026-05-03T00:00:00Z")];
    const merged = mergeRecords(local, cloud);
    expect(merged.map((r) => r.raId)).toEqual(["a", "c", "b"]);
    expect(merged.find((r) => r.raId === "a")?.savedAt).toBe("2026-05-09T00:00:00Z"); // cloud新しい
  });

  it("空同士は空", () => {
    expect(mergeRecords([], [])).toEqual([]);
  });
});

describe("getChemicalRaRecord（台帳からの再表示・再印刷用の1件取得）", () => {
  it("保存した記録を raId で取得でき、payload と savedAt が保持される", async () => {
    const result = await saveChemicalRaRecord({
      substance: "トルエン",
      cas: "108-88-3",
      workContent: "塗装",
      exposureBand: "II",
      payload: { chemicalName: "トルエン", casNumber: "108-88-3" },
    });
    expect(result.localStatus).toBe("saved-locally");
    expect(result.cloudStatus).toBe("not-requested");
    const rec = await getChemicalRaRecord(result.raId);
    expect(rec).not.toBeNull();
    expect(rec!.substance).toBe("トルエン");
    expect((rec!.payload as { chemicalName?: string }).chemicalName).toBe("トルエン");
    expect(typeof rec!.savedAt).toBe("string");
    expect(Number.isNaN(new Date(rec!.savedAt).getTime())).toBe(false);
    await deleteChemicalRaRecord(result.raId);
  });

  it("未知の raId は null", async () => {
    expect(await getChemicalRaRecord("___missing___")).toBeNull();
    expect(await getChemicalRaRecord("  ")).toBeNull();
  });
});

describe("評価条件のimmutable snapshot", () => {
  const resultPayload = {
    chemicalName: "トルエン",
    casNumber: "108-88-3",
    assessmentNotice: "参考情報",
  };

  it("SDS・使用条件・措置・担当期限・濃度・ルール版を保存時点へ固定する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T03:04:05.000Z"));
    const mutableResult = { ...resultPayload };
    const draft = createChemicalRaRecordPayload(mutableResult, {
      workContent: "屋内塗装",
      sdsStatus: "confirmed",
      sdsIssuedOn: "2026-06-01",
      componentVersion: "製品A / 第3版",
      ventilation: "local",
      generalVentilation: "yes",
      localExhaust: "yes",
      amount: "medium",
      durationHours: "4",
      frequency: "daily",
      useTemperatureC: "25",
      dispersion: "spray",
      skinContact: "yes",
      ppeDescription: "有機ガス用防毒マスク、耐薬品手袋、保護眼鏡",
      ppeSuitability: "confirmed",
      substitution: "considered",
      existingControls: "密閉容器と局所排気を使用",
      additionalControls: "捕捉位置を作業前に点検",
      actionOwner: "化学物質管理者",
      actionDueOn: "2026-07-31",
      reassessmentOn: "2026-10-31",
      measuredConcentration: "12.5",
      measuredUnit: "ppm",
      capturedAt: "2026-07-24T03:00:00.000Z",
    });
    const result = await saveChemicalRaRecord({
      substance: "トルエン",
      cas: "108-88-3",
      workContent: "屋内塗装",
      exposureBand: "",
      payload: draft,
    });
    // 保存後に呼び出し側のresultを変更しても、保存済みpayloadは変化しない。
    mutableResult.chemicalName = "変更後";
    const saved = await getChemicalRaRecord(result.raId);
    const inspected = inspectChemicalRaRecordPayload(saved?.payload);
    expect(inspected.status).toBe("complete");
    expect(inspected.missingFields).toEqual([]);
    expect(inspected.result).toMatchObject({
      chemicalName: "トルエン",
      casNumber: "108-88-3",
    });
    expect(inspected.assessmentSnapshot).toEqual({
      schemaVersion: 1,
      basis: "reference-information-only",
      ruleVersion: CHEMICAL_RA_REFERENCE_RULE_VERSION,
      capturedAt: "2026-07-24T03:04:05.000Z",
      workContent: "屋内塗装",
      sds: {
        status: "confirmed",
        issuedOn: "2026-06-01",
        componentVersion: "製品A / 第3版",
      },
      ventilation: "local",
      engineeringControls: {
        generalVentilation: "yes",
        localExhaust: "yes",
      },
      amount: "medium",
      durationHours: 4,
      frequency: "daily",
      useTemperatureC: 25,
      dispersion: "spray",
      skinContact: "yes",
      ppe: {
        description: "有機ガス用防毒マスク、耐薬品手袋、保護眼鏡",
        suitability: "confirmed",
      },
      substitution: "considered",
      controls: {
        existing: "密閉容器と局所排気を使用",
        additional: "捕捉位置を作業前に点検",
      },
      action: {
        owner: "化学物質管理者",
        dueOn: "2026-07-31",
        reassessmentOn: "2026-10-31",
      },
      measuredConcentration: { value: "12.5", unit: "ppm" },
      completeness: "complete",
      missingFields: [],
    });
    vi.useRealTimers();
  });

  it("旧payloadを条件完全記録とせずlegacy-missingを返す", () => {
    const inspected = inspectChemicalRaRecordPayload({
      chemicalName: "旧記録",
      casNumber: "108-88-3",
    });
    expect(inspected.status).toBe("legacy-missing");
    expect(inspected.assessmentSnapshot).toBeNull();
    expect(inspected.result).toMatchObject({ chemicalName: "旧記録" });
    expect(inspected.missingFields).toEqual(
      expect.arrayContaining([
        "sds-confirmation",
        "ventilation",
        "general-ventilation",
        "local-exhaust",
        "amount",
        "duration-hours",
        "frequency",
        "use-temperature",
        "dispersion",
        "skin-contact",
        "ppe",
        "ppe-suitability",
        "substitution",
        "existing-controls",
        "additional-controls",
        "action-owner",
        "action-due-on",
        "reassessment-on",
        "measured-concentration",
        "measured-unit",
        "rule-version",
        "captured-at",
      ]),
    );
  });

  it("v2でも濃度の値だけで単位がない記録はincomplete", () => {
    const payload = createChemicalRaRecordPayload(resultPayload, {
      workContent: "屋内塗装",
      sdsStatus: "confirmed",
      sdsIssuedOn: "2026-06-01",
      componentVersion: "第3版",
      ventilation: "general",
      amount: "small",
      durationHours: 2,
      measuredConcentration: "5",
      measuredUnit: "",
      capturedAt: "2026-07-24T03:00:00.000Z",
    });
    const inspected = inspectChemicalRaRecordPayload(payload);
    expect(inspected.status).toBe("incomplete");
    expect(inspected.missingFields).toContain("measured-unit");
    expect(inspected.missingFields).not.toContain("measured-concentration");
  });

  it("SDS未確認を確認済みへ推定せず、発行日や版も欠落として残す", () => {
    const payload = createChemicalRaRecordPayload(resultPayload, {
      workContent: "洗浄",
      sdsStatus: "not-confirmed",
      ventilation: "none",
      amount: "large",
      durationHours: 1,
      measuredConcentration: "0",
      measuredUnit: "mg/m3",
      capturedAt: "2026-07-24T03:00:00.000Z",
    });
    const inspected = inspectChemicalRaRecordPayload(payload);
    expect(inspected.assessmentSnapshot?.sds.status).toBe("not-confirmed");
    expect(inspected.missingFields).toEqual(
      expect.arrayContaining([
        "sds-confirmation",
        "sds-issued-on",
        "component-version",
      ]),
    );
  });

  it("不正な温度・日付・列挙値を補完せずincompleteとして隔離する", () => {
    const payload = createChemicalRaRecordPayload(resultPayload, {
      workContent: "匿名化した洗浄作業",
      sdsStatus: "confirmed",
      sdsIssuedOn: "2026-02-30",
      componentVersion: "第1版",
      ventilation: "local",
      generalVentilation: "no",
      localExhaust: "yes",
      amount: "small",
      durationHours: 1,
      frequency: "weekly",
      useTemperatureC: "999",
      dispersion: "mist",
      skinContact: "no",
      ppeDescription: "耐薬品手袋",
      ppeSuitability: "confirmed",
      substitution: "not-applicable",
      existingControls: "密閉",
      additionalControls: "不要理由を人が確認",
      actionOwner: "担当者",
      actionDueOn: "2026-13-01",
      reassessmentOn: "invalid",
      measuredConcentration: "0",
      measuredUnit: "ppm",
      capturedAt: "2026-07-24T03:00:00.000Z",
    });
    const inspected = inspectChemicalRaRecordPayload(payload);
    expect(inspected.status).toBe("incomplete");
    expect(inspected.assessmentSnapshot?.useTemperatureC).toBeNull();
    expect(inspected.assessmentSnapshot?.sds.issuedOn).toBeNull();
    expect(inspected.assessmentSnapshot?.action).toEqual({
      owner: "担当者",
      dueOn: null,
      reassessmentOn: null,
    });
    expect(inspected.missingFields).toEqual(
      expect.arrayContaining([
        "sds-issued-on",
        "use-temperature",
        "action-due-on",
        "reassessment-on",
      ]),
    );
  });
});

describe("クラウド保存状態は実ネットワーク応答から決定する", () => {
  const input = {
    substance: "匿名化物質",
    cas: "108-88-3",
    workContent: "匿名化作業",
    exposureBand: "II",
    payload: { confirmedByHuman: true },
  };

  it("未同意ではクラウド本文を送信しない", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await saveChemicalRaRecord({ ...input, cloudConsent: false });
    expect(result).toMatchObject({
      localStatus: "saved-locally",
      cloudStatus: "not-requested",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([401, 403, 500])("HTTP %sを同期済みにしない", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    const result = await saveChemicalRaRecord({ ...input, cloudConsent: true });
    expect(result.cloudStatus).toBe("failed");
    expect((await getChemicalRaRecord(result.raId))?.syncState).toBe("failed");
  });

  it("200でもサーバー本文ok=trueがなければ同期済みにしない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await saveChemicalRaRecord({ ...input, cloudConsent: true });
    expect(result.cloudStatus).toBe("failed");
  });

  it("ネットワーク例外・offlineを同期済みにしない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const result = await saveChemicalRaRecord({ ...input, cloudConsent: true });
    expect(result.cloudStatus).toBe("failed");
  });

  it("HTTP成功かつサーバーok=trueのときだけsyncedになる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await saveChemicalRaRecord({ ...input, cloudConsent: true });
    expect(result.cloudStatus).toBe("synced");
    expect((await getChemicalRaRecord(result.raId))?.syncState).toBe("synced");
  });
});
