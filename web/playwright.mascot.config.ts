import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "chat-mascot.spec.ts",
  projects: [{ name: "webkit-iphone", use: { ...devices["iPhone 13"] } }],
});
