import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("/organization metadata", () => {
  it("keeps the pre-release demo out of search results while preserving link discovery", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });
});
