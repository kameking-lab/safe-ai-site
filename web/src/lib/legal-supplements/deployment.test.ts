import { copyFile, mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import nextConfig from "../../../next.config";
import release from "@/data/legal-supplement-release.json";

const root = process.cwd();
let temporary: string | undefined;
let restoreCwd: (() => void) | undefined;
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("SAFE_AI_LOCAL_SUPPLEMENTS", ""); vi.stubEnv("SAFE_AI_STAGING_MODE", "");
  vi.stubEnv("SAFE_AI_LEGAL_SUPPLEMENTS_DISABLED", "");
  vi.stubEnv("SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE", release.release);
});
afterEach(async () => {
  vi.unstubAllEnvs(); restoreCwd?.(); restoreCwd = undefined;
  if (temporary) await rm(temporary, { recursive: true, force: true });
  temporary = undefined;
});

it("requires exact opt-in and honors off/staging/preview even with the local flag", async () => {
  const { supplementsEnabled, supplementsRequested } = await import("./loader");
  expect(supplementsEnabled()).toBe(true);
  for (const env of [
    { NODE_ENV: "production", SAFE_AI_LOCAL_SUPPLEMENTS: "true" },
    { NODE_ENV: "production", SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE: "wrong" },
    { SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE: release.release, SAFE_AI_LEGAL_SUPPLEMENTS_DISABLED: "true" },
    { SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE: release.release, VERCEL_ENV: "preview" },
    { SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE: release.release, SAFE_AI_STAGING_MODE: " TRUE " },
  ]) expect(supplementsEnabled(env as NodeJS.ProcessEnv)).toBe(false);
  expect(supplementsRequested({ SAFE_AI_LEGAL_SUPPLEMENTS_RELEASE: "wrong" })).toBe(true);
});

it("single-flights cold reads, reuses a verified package, and disables a warm cache", async () => {
  const { loadSupplements } = await import("./loader");
  const start = performance.now();
  const datasets = await Promise.all([loadSupplements(), loadSupplements(), loadSupplements()]);
  const coldMs = performance.now() - start;
  expect(datasets[1]).toBe(datasets[0]);
  expect(datasets[2]).toBe(datasets[0]);
  const warmStart = performance.now();
  for (let i = 0; i < 10; i++) expect(await loadSupplements()).toBe(datasets[0]);
  console.log(JSON.stringify({ measurement: "supplement-loader", coldMs, warmMeanMs: (performance.now() - warmStart) / 10, packedBytes: release.packedBytes, decodedBytes: release.decodedBytes, sameDatasetFor13Loads: true }));
  vi.stubEnv("SAFE_AI_LEGAL_SUPPLEMENTS_DISABLED", "true");
  await expect(loadSupplements()).rejects.toThrow(/disabled/);
});

async function relocated() {
  temporary = await mkdtemp(resolve(tmpdir(), "safe-ai-supplement-"));
  const destination = resolve(temporary, release.file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, release.file), destination);
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(temporary);
  restoreCwd = () => cwd.mockRestore();
  return destination;
}

it("loads from a relocated app and rejects same-size corruption after warming", async () => {
  const destination = await relocated();
  const { loadSupplements, supplementFile } = await import("./loader");
  expect(supplementFile()).toBe(destination);
  const original = await readFile(destination);
  expect((await loadSupplements()).documents).toHaveLength(2187);
  const corrupted = Buffer.from(original); corrupted[100] ^= 1;
  await writeFile(`${destination}.replacement`, corrupted);
  await rename(`${destination}.replacement`, destination);
  await expect(loadSupplements()).rejects.toThrow(/hash/);
  await writeFile(destination, original);
  expect((await loadSupplements()).asOf).toBe(release.asOf);
});

it("does not serve a cached dataset when its packaged file disappears", async () => {
  const destination = await relocated();
  const { loadSupplements } = await import("./loader");
  await loadSupplements();
  await rm(destination);
  await expect(loadSupplements()).rejects.toThrow();
});

it("declares the private package for every server consumer, outside public assets", () => {
  expect(release.file).toMatch(/^src\/data\/legal-supplements\/[^/]+\.json\.gz$/);
  for (const route of ["/api/chatbot", "/api/chatbot/stream", "/api/chatbot/no-script", "/api/chatbot/local-evidence"]) {
    expect(nextConfig.outputFileTracingIncludes?.[route]).toEqual([`./${release.file}`]);
  }
});
