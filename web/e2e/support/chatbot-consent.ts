import { expect, type Page } from "@playwright/test";

// Sending authorizes the request; verify the notice instead of an extra opt-in.
export async function consentToChatbot(page: Page) {
  await expect(page.getByLabel("質問入力")).toHaveAttribute(
    "data-chatbot-hydrated",
    "true",
  );
  await expect(page.locator("[data-ai-processing-note]")).toContainText("Google Gemini");
  await expect(page.locator("[data-ai-processing-note] a")).toHaveAttribute("href", "/privacy#external-services");
  await expect(page.getByRole("checkbox", { name: /法令相談への回答生成のため/ })).toHaveCount(0);
}
