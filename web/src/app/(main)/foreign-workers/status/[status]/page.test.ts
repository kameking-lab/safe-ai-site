import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

describe("在留資格ガイド metadata", () => {
  it.each(["permanent-resident", "spouse-of-japanese"])(
    "%s は検索結果で用途が分かるdescriptionを持つ",
    async (status) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ status }),
      });

      expect(typeof metadata.description).toBe("string");
      expect(String(metadata.description).length).toBeGreaterThanOrEqual(35);
      expect(metadata.alternates?.canonical).toBe(
        `/foreign-workers/status/${status}`,
      );
    },
  );
});
