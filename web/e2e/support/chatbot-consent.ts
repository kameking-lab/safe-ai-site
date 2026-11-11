import { expect, type Page } from "@playwright/test";

// Check the real control after hydration; reload clears this in-memory choice.
export async function consentToChatbot(page: Page) {
  await expect(page.getByLabel("質問入力")).toHaveAttribute(
    "data-chatbot-hydrated",
    "true",
  );
  const consent = page.getByRole("checkbox", {
    name: /法令相談への回答生成のため/,
  });
  await consent.check();
  await expect(consent).toBeChecked();
}
