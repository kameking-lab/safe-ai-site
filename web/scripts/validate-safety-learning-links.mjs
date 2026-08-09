import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const registryPath = resolve(
  process.cwd(),
  "src/data/safety-elearning/source-registry.json",
);
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const targets = [
  ...new Set(
    registry.flatMap((source) =>
      [source.sourceUrl, source.sourcePdfUrl].filter(Boolean),
    ),
  ),
];

async function verify(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "safe-ai-source-validator/1.0" },
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "safe-ai-source-validator/1.0",
          Range: "bytes=0-0",
        },
      });
    }
    return response.status === 200 || response.status === 206
      ? null
      : `${url} -> HTTP ${response.status}`;
  } catch (error) {
    return `${url} -> ${error instanceof Error ? error.name : "request failed"}`;
  } finally {
    clearTimeout(timeout);
  }
}

const failures = [];
for (let index = 0; index < targets.length; index += 6) {
  const batch = targets.slice(index, index + 6);
  const results = await Promise.all(batch.map(verify));
  failures.push(...results.filter(Boolean));
}

if (failures.length > 0) {
  console.error(`Safety learning link validation failed (${failures.length}/${targets.length})`);
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Safety learning links OK (${targets.length}/${targets.length})`);
}
