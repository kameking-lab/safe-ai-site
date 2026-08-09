import path from "node:path";
import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

const configuredOutput = process.env.ANSWER_FIRST_PLAYWRIGHT_OUTPUT_DIR;
if (!configuredOutput || !path.isAbsolute(configuredOutput)) {
  throw new Error(
    "ANSWER_FIRST_PLAYWRIGHT_OUTPUT_DIR must be an absolute external directory",
  );
}

const repositoryRoot = path.resolve(process.cwd(), "..");
const outputDir = path.resolve(configuredOutput);
const relativeOutput = path.relative(repositoryRoot, outputDir);
if (
  relativeOutput === "" ||
  (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== "..")
) {
  throw new Error("Preview Playwright artifacts must remain outside the repository");
}

const baseUse =
  baseConfig.use && typeof baseConfig.use === "object" ? baseConfig.use : {};

export default defineConfig({
  ...baseConfig,
  outputDir,
  preserveOutput: "never",
  reporter: [["line"]],
  use: {
    ...baseUse,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
