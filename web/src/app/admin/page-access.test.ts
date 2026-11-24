import { expect, it, vi } from "vitest";
import AutomationConsultQueuePage from "./automation-consult-queue/page";
import AdminHealthPage from "./health/page";
import HealthCheckPage from "./health-check/page";

const access = vi.hoisted(() => ({
  denied: new Error("admin access denied"),
  listQueue: vi.fn(),
  checkServices: vi.fn(),
  fetchUsage: vi.fn(),
}));

vi.mock("@/lib/server/admin-access", () => ({
  requireAdminPageAccess: async () => { throw access.denied; },
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/automation-consult/queue", () => ({
  listAutomationConsultQueue: access.listQueue,
}));
vi.mock("@/lib/external/health", () => ({ checkAllServices: access.checkServices }));
vi.mock("@/lib/vercel-monitoring", () => ({ fetchUsageSnapshot: access.fetchUsage }));

it.each([
  ["consultation queue", AutomationConsultQueuePage, access.listQueue],
  ["external service health", AdminHealthPage, access.checkServices],
  ["usage monitoring", HealthCheckPage, access.fetchUsage],
] as const)("protects %s before reading privileged data", async (_label, render, read) => {
  await expect(render()).rejects.toBe(access.denied);
  expect(read).not.toHaveBeenCalled();
});
