import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  heatReviewImportTemplate,
  validateHeatReviewCsv,
} from "../../src/lib/heat-illness/review-import.ts";

const input = process.argv[2];
if (input === "--template") {
  process.stdout.write(`${heatReviewImportTemplate()}\n`);
} else if (!input) {
  process.stderr.write(
    "Usage: npm run audit:heat-review-import -- <review-results.csv> | --template\n",
  );
  process.exitCode = 2;
} else {
  const csv = await readFile(resolve(input), "utf8");
  const result = validateHeatReviewCsv(csv);
  // Deliberately output counts and error coordinates only. Reviewer names,
  // comments, revised copy, and sources are never echoed.
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: result.ok,
        summary: result.summary,
        errors: result.errors,
      },
      null,
      2,
    )}\n`,
  );
  if (!result.ok) process.exitCode = 1;
}
