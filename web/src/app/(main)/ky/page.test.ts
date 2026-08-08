import { beforeEach, describe, expect, it, vi } from "vitest";

const permanentRedirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ permanentRedirect }));

import KyPage from "./page";

describe("/ky safe redirect", () => {
  beforeEach(() => permanentRedirect.mockClear());

  it("keeps allowlisted preset enums", async () => {
    await KyPage({
      searchParams: Promise.resolve({
        industry: "construction",
        topic: "scaffold",
      }),
    });
    expect(permanentRedirect).toHaveBeenCalledWith(
      "/ky/paper?industry=construction&topic=scaffold",
    );
  });

  it("drops free text, payload and local diary IDs from the URL", async () => {
    await KyPage({
      searchParams: Promise.resolve({
        q: "足場上の秘密作業",
        payload: "encoded-private-data",
        fromDiary: "local-private-id",
        preset: "ladder",
      }),
    });
    expect(permanentRedirect).toHaveBeenCalledWith("/ky/paper?preset=ladder");
  });
});
