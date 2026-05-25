import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isKyCloudEnabled,
  getDeviceId,
  cloudPushKyRecord,
  cloudPullKyRecords,
  cloudPushWorkers,
  cloudPullWorkers,
  cloudCreateSignageSession,
  cloudGetSignageSession,
  flushKyCloudQueue,
  hasPendingKyCloudSync,
  __setKyCloudTransport,
  type KyCloudTransport,
} from "@/lib/ky/storage-adapter";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { Worker } from "@/lib/ky/workers-master";

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";

const SAMPLE_WORKERS: Worker[] = [
  { id: "w1", name: "山田太郎", affiliation: "self", company: "", qualNo: "1,10", isRegular: true, hidden: false, createdAt: 1 },
];

function makeTransport(overrides: Partial<KyCloudTransport> = {}): KyCloudTransport {
  return {
    putKyRecord: vi.fn(async () => true),
    getKyRecords: vi.fn(async () => ({ latest: null, list: [] })),
    putWorkers: vi.fn(async () => true),
    getWorkers: vi.fn(async () => [] as Worker[]),
    createSignageSession: vi.fn(async () => "123456"),
    getSignageSession: vi.fn(async () => null),
    getKyRecordById: vi.fn(async () => null),
    deleteKyRecord: vi.fn(async () => true),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  process.env[ENV_URL] = "https://test.supabase.co";
  __setKyCloudTransport(makeTransport());
});

afterEach(() => {
  delete process.env[ENV_URL];
  __setKyCloudTransport(null);
  vi.restoreAllMocks();
});

describe("storage-adapter: クラウド有効判定・端末ID", () => {
  it("env が無ければ無効、あれば有効", () => {
    expect(isKyCloudEnabled()).toBe(true);
    delete process.env[ENV_URL];
    expect(isKyCloudEnabled()).toBe(false);
  });

  it("device id を生成し、再呼び出しでも安定する", () => {
    const id1 = getDeviceId();
    expect(id1).toBeTruthy();
    expect(getDeviceId()).toBe(id1);
  });
});

describe("storage-adapter: KY記録の送信（成功/失敗フォールバック）", () => {
  it("接続成功時はクラウドへ送信し、キューは空のまま", async () => {
    const t = makeTransport();
    __setKyCloudTransport(t);
    const ok = await cloudPushKyRecord(normalizeKyInstructionRecord({}));
    expect(ok).toBe(true);
    expect(t.putKyRecord).toHaveBeenCalledTimes(1);
    expect(hasPendingKyCloudSync()).toBe(false);
  });

  it("接続失敗(false)時は localStorage キューへ退避する", async () => {
    __setKyCloudTransport(makeTransport({ putKyRecord: vi.fn(async () => false) }));
    const ok = await cloudPushKyRecord(normalizeKyInstructionRecord({}));
    expect(ok).toBe(false);
    expect(hasPendingKyCloudSync()).toBe(true);
  });

  it("例外発生時も throw せず、キューへ退避する", async () => {
    __setKyCloudTransport(
      makeTransport({
        putKyRecord: vi.fn(async () => {
          throw new Error("network down");
        }),
      })
    );
    await expect(cloudPushKyRecord(normalizeKyInstructionRecord({}))).resolves.toBe(false);
    expect(hasPendingKyCloudSync()).toBe(true);
  });

  it("クラウド未設定時は送信せず false（純ローカル動作・キュー無し）", async () => {
    delete process.env[ENV_URL];
    const t = makeTransport();
    __setKyCloudTransport(t);
    const ok = await cloudPushKyRecord(normalizeKyInstructionRecord({}));
    expect(ok).toBe(false);
    expect(t.putKyRecord).not.toHaveBeenCalled();
    expect(hasPendingKyCloudSync()).toBe(false);
  });
});

describe("storage-adapter: 取得（pull）", () => {
  it("クラウドの最新KYを返す", async () => {
    const rec = normalizeKyInstructionRecord({ siteName: "現場A" });
    __setKyCloudTransport(makeTransport({ getKyRecords: vi.fn(async () => ({ latest: rec, list: [] })) }));
    const pulled = await cloudPullKyRecords();
    expect(pulled?.latest?.siteName).toBe("現場A");
  });

  it("未設定なら null", async () => {
    delete process.env[ENV_URL];
    expect(await cloudPullKyRecords()).toBeNull();
  });
});

describe("storage-adapter: 作業員マスター", () => {
  it("push 成功（device_id 付きで送信）", async () => {
    const t = makeTransport();
    __setKyCloudTransport(t);
    const ok = await cloudPushWorkers(SAMPLE_WORKERS);
    expect(ok).toBe(true);
    expect(t.putWorkers).toHaveBeenCalledWith(expect.any(String), SAMPLE_WORKERS);
  });

  it("pull が配列を返す", async () => {
    __setKyCloudTransport(makeTransport({ getWorkers: vi.fn(async () => SAMPLE_WORKERS) }));
    expect(await cloudPullWorkers()).toEqual(SAMPLE_WORKERS);
  });
});

describe("storage-adapter: 再送キュー（オフライン耐性・最新優先）", () => {
  it("退避した記録を flush で再送し、成功でキューが解消される", async () => {
    __setKyCloudTransport(makeTransport({ putKyRecord: vi.fn(async () => false) }));
    await cloudPushKyRecord(normalizeKyInstructionRecord({}));
    expect(hasPendingKyCloudSync()).toBe(true);

    const putKyRecord = vi.fn(async () => true);
    __setKyCloudTransport(makeTransport({ putKyRecord }));
    await flushKyCloudQueue();
    expect(putKyRecord).toHaveBeenCalledTimes(1);
    expect(hasPendingKyCloudSync()).toBe(false);
  });

  it("再送も失敗ならキューを保持する", async () => {
    __setKyCloudTransport(makeTransport({ putWorkers: vi.fn(async () => false) }));
    await cloudPushWorkers(SAMPLE_WORKERS);
    expect(hasPendingKyCloudSync()).toBe(true);

    __setKyCloudTransport(makeTransport({ putWorkers: vi.fn(async () => false) }));
    await flushKyCloudQueue();
    expect(hasPendingKyCloudSync()).toBe(true);
  });

  it("同種の保留は最新で上書きされる（中間状態は送らない）", async () => {
    __setKyCloudTransport(makeTransport({ putKyRecord: vi.fn(async () => false) }));
    await cloudPushKyRecord(normalizeKyInstructionRecord({ siteName: "A" }));
    await cloudPushKyRecord(normalizeKyInstructionRecord({ siteName: "B" }));

    const putKyRecord = vi.fn(async () => true);
    __setKyCloudTransport(makeTransport({ putKyRecord }));
    await flushKyCloudQueue();
    expect(putKyRecord).toHaveBeenCalledTimes(1);
    const sent = (putKyRecord.mock.calls[0] as unknown[])[1] as { siteName: string };
    expect(sent.siteName).toBe("B");
  });
});

describe("storage-adapter: サイネージ共有（Phase 6）", () => {
  it("作成でコードを返す", async () => {
    __setKyCloudTransport(makeTransport({ createSignageSession: vi.fn(async () => "654321") }));
    expect(await cloudCreateSignageSession(normalizeKyInstructionRecord({}))).toBe("654321");
  });

  it("クラウド未設定なら作成は null（共有不可）", async () => {
    delete process.env[ENV_URL];
    const t = makeTransport();
    __setKyCloudTransport(t);
    expect(await cloudCreateSignageSession(normalizeKyInstructionRecord({}))).toBeNull();
    expect(t.createSignageSession).not.toHaveBeenCalled();
  });

  it("コードからKYを取得する", async () => {
    const rec = normalizeKyInstructionRecord({ siteName: "共有現場" });
    __setKyCloudTransport(makeTransport({ getSignageSession: vi.fn(async () => rec) }));
    const got = await cloudGetSignageSession("123456");
    expect(got?.siteName).toBe("共有現場");
  });

  it("取得失敗(例外)でも throw せず null", async () => {
    __setKyCloudTransport(
      makeTransport({
        getSignageSession: vi.fn(async () => {
          throw new Error("network");
        }),
      })
    );
    await expect(cloudGetSignageSession("123456")).resolves.toBeNull();
  });
});
