import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("AdSense publisher configuration", () => {
  it("keeps the public ads.txt publisher ID aligned with the documented production setting", () => {
    const adsTxt = workspaceFile("public/ads.txt");
    const envExample = workspaceFile(".env.example");
    const adsPublisher = adsTxt.match(
      /^google\.com,\s*(pub-\d+),\s*DIRECT,\s*f08c47fec0942fa0\s*$/m,
    )?.[1];
    const configuredPublisher = envExample.match(
      /^NEXT_PUBLIC_ADSENSE_PUB_ID=(ca-pub-\d+)\s*$/m,
    )?.[1];

    expect(adsPublisher).toBeTruthy();
    expect(configuredPublisher).toBe(`ca-${adsPublisher}`);
  });
});
