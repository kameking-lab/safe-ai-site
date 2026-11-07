import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

describe("/chemical-database/[cas] metadata", () => {
  it("uses a concise chemical title and leaves the site name to the root template", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ cas: "108-88-3" }),
    });

    expect(metadata.title).toBe("トルエン（CAS 108-88-3）｜化学物質DB");
    expect(metadata.title).not.toContain("安全AIポータル");
  });
});
