import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("KY朝礼サイネージのindex境界", () => {
  it("端末内保存状態に依存するためnoindex,followを明示する", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("/ky/morning");
  });
});
