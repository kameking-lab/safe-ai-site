import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { operations } = vi.hoisted(() => ({ operations: vi.fn() }));
vi.mock("@/lib/search-console/production-operations", () => ({
  runProductionSearchConsoleOperations: operations,
}));

import { GET } from "./route";

describe("Preview external-operations probe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SEARCH_CONSOLE_OPERATIONS_ENABLED", "true");
    operations.mockResolvedValue({ access: "blocked-external" });
  });

  it("returns the known blocker without retrying disabled credentials", async () => {
    vi.stubEnv("SEARCH_CONSOLE_OPERATIONS_ENABLED", "false");
    const response = await GET(
      new NextRequest(
        "https://safe-ai-site-example-kameking-labs-projects.vercel.app/api/internal/external-operations-probe",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      searchConsole: {
        access: "blocked-external",
        probe: "disabled-until-property-access",
      },
    });
    expect(operations).not.toHaveBeenCalled();
  });

  it("is available only on a query-free protected Preview URL", async () => {
    const response = await GET(
      new NextRequest(
        "https://safe-ai-site-example-kameking-labs-projects.vercel.app/api/internal/external-operations-probe",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      mode: "preview-read-only",
      productionMutations: 0,
      previewUrlsSubmitted: 0,
    });
    expect(operations).toHaveBeenCalledWith({
      allowMutations: false,
      inspectUrls: false,
    });
  });

  it("returns 404 in production, on aliases, and with query input", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(
      (
        await GET(
          new NextRequest(
            "https://www.anzen-ai-portal.jp/api/internal/external-operations-probe",
          ),
        )
      ).status,
    ).toBe(404);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(
      (
        await GET(
          new NextRequest(
            "https://safe-ai-site-example-kameking-labs-projects.vercel.app/api/internal/external-operations-probe?mode=write",
          ),
        )
      ).status,
    ).toBe(404);
    expect(operations).not.toHaveBeenCalled();
  });
});
