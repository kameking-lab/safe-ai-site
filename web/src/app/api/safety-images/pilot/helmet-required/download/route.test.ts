import { describe, expect, it } from "vitest";
import { GET } from "./route";

function request(search: string): Request {
  return new Request(
    `http://localhost/api/safety-images/pilot/helmet-required/download?${search}`,
  );
}

describe("helmet safety image pilot download route", () => {
  it("returns a real A4 method A JPEG", async () => {
    const response = await GET(
      request("variant=a&lang=all&brand=branded&paper=A4&format=jpeg"),
    );
    const body = Buffer.from(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toContain(
      "helmet-required-a-all-branded-a4-portrait.jpg",
    );
    expect(body.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it(
    "returns the approved method B as an image-bearing A3 PDF",
    async () => {
      const response = await GET(
        request("variant=b&lang=all&brand=clean&paper=A3&format=pdf"),
      );
      const body = Buffer.from(await response.arrayBuffer());
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(body.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
      expect(body.toString("latin1")).toContain("/Subtype /Image");
    },
    15_000,
  );

  it("rejects a fabricated single-language method B", async () => {
    const response = await GET(
      request("variant=b&lang=en&brand=clean&paper=A4&format=jpeg"),
    );
    expect(response.status).toBe(400);
  });
});
