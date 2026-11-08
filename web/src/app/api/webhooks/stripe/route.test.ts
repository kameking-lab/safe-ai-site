import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const constructEvent = vi.fn();
  const findUnique = vi.fn();
  const createEvent = vi.fn();
  const tx = { stripeEvent: { create: createEvent } };
  const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx));
  return {
    constructEvent,
    findUnique,
    createEvent,
    tx,
    transaction,
    checkout: vi.fn(),
    updated: vi.fn(),
    deleted: vi.fn(),
    failed: vi.fn(),
    succeeded: vi.fn(),
    subscriptionFind: vi.fn(),
    userFind: vi.fn(),
  };
});

vi.mock("stripe", () => ({
  default: class StripeStub {
    webhooks = { constructEvent: mocks.constructEvent };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeEvent: { findUnique: mocks.findUnique },
    subscription: { findUnique: mocks.subscriptionFind },
    user: { findUnique: mocks.userFind },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/stripe-webhook-handlers", () => ({
  handleCheckoutCompleted: mocks.checkout,
  handleSubscriptionUpdated: mocks.updated,
  handleSubscriptionDeleted: mocks.deleted,
  handleInvoicePaymentFailed: mocks.failed,
  handleInvoicePaymentSucceeded: mocks.succeeded,
}));

import { POST } from "./route";

const originalSecret = process.env.STRIPE_SECRET_KEY;
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function request(body = "{}", headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "stripe-signature": "synthetic-signature", ...headers },
  });
}

describe("Stripe webhook safety", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "synthetic-key-not-real";
    process.env.STRIPE_WEBHOOK_SECRET = "synthetic-webhook-secret-not-real";
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.createEvent.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) => callback(mocks.tx));
    mocks.subscriptionFind.mockResolvedValue(null);
    mocks.userFind.mockResolvedValue(null);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalSecret;
    if (originalWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it("宣言サイズが上限を超える本文を署名検証前に拒否する", async () => {
    const response = await POST(request("{}", { "content-length": String(1024 * 1024 + 1) }));
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it("署名検証エラーの内部詳細を応答へ含めない", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("internal signature parser detail");
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "署名検証失敗" });
  });

  it("更新とイベント記録を同じトランザクションで実行する", async () => {
    const object = { id: "sub_synthetic" };
    mocks.constructEvent.mockReturnValue({
      id: "evt_synthetic",
      type: "customer.subscription.updated",
      data: { object },
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.updated).toHaveBeenCalledWith(mocks.tx, object);
    expect(mocks.createEvent).toHaveBeenCalledWith({
      data: { stripeEventId: "evt_synthetic", eventType: "customer.subscription.updated" },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("並行配送のunique競合を冪等な成功として扱う", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "unhandled.synthetic",
      data: { object: {} },
    });
    mocks.transaction.mockRejectedValue({ code: "P2002" });
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ stripeEventId: "evt_duplicate" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, idempotent: true });
  });

  it("共用アカウントの過去問AIのイベントは何も変更せず200で受け流す", async () => {
    for (const [type, object] of [
      ["checkout.session.completed", { id: "cs_kakomon", mode: "subscription", customer: "cus_kakomon", subscription: "sub_kakomon", metadata: { userId: "kakomon-user" } }],
      ["customer.subscription.updated", { id: "sub_kakomon", customer: "cus_kakomon", metadata: {} }],
      ["invoice.payment_failed", { id: "in_kakomon", customer: "cus_kakomon" }],
      ["charge.refunded", { id: "ch_kakomon", customer: "cus_kakomon" }],
    ] as const) {
      mocks.constructEvent.mockReturnValue({ id: `evt_${type}`, type, data: { object } });
      const response = await POST(request());
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ received: true, ignored: "not_anzen" });
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it("安全AIの会員の顧客・会員IDに当たるイベントは従来どおり処理する（所有者の食い違いは失敗のまま）", async () => {
    const object = { id: "cs_anzen", mode: "subscription", customer: "cus_anzen", subscription: "sub_anzen", metadata: { userId: "anzen-member" } };
    mocks.constructEvent.mockReturnValue({ id: "evt_anzen", type: "checkout.session.completed", data: { object } });
    mocks.subscriptionFind.mockResolvedValueOnce({ userId: "anzen-member" });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledWith(mocks.tx, object);
    // 会員IDは安全AIのものだが顧客の対応が無い → 受け流さず、ハンドラの所有者確認に任せる
    mocks.userFind.mockResolvedValueOnce({ id: "anzen-member" });
    mocks.checkout.mockRejectedValueOnce(new Error("Stripe checkout ownership mismatch"));
    expect((await POST(request())).status).toBe(503);
  });

  it("別制約のunique競合をイベント処理済みと誤認しない", async () => {
    mocks.constructEvent.mockReturnValue({ id: "evt_unprocessed", type: "unhandled.synthetic", data: { object: {} } });
    mocks.transaction.mockRejectedValue({ code: "P2002" });
    const response = await POST(request());
    expect(response.status).toBe(503);
  });
});
