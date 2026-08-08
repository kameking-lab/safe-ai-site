import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/search?q=%E5%AE%89%E8%A1%9B%E6%B3%95%E7%AC%AC61%E6%9D%A1",
  "/chatbot",
  "/chemical-ra",
  "/e-learning",
  "/signage",
  "/automation-consult",
  "/csp-missing-page-20260731",
] as const;

function scriptDirective(policy: string): string {
  return (
    policy
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("script-src ")) ?? ""
  );
}

test("development compatibility and Preview strict candidate CSP have zero violations", async ({
  page,
}) => {
  const productionServer = process.env.PLAYWRIGHT_SERVER_MODE === "production";
  const cspMessages: string[] = [];
  const pageErrors: string[] = [];
  const cspAuditIssues: string[] = [];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Audits.enable");
  cdp.on("Audits.issueAdded", ({ issue }) => {
    if (issue.code === "ContentSecurityPolicyIssue") {
      cspAuditIssues.push(JSON.stringify(issue.details));
    }
  });
  page.on("console", (message) => {
    if (/content security policy|violat(?:ed|ion)/i.test(message.text())) {
      cspMessages.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const route of ROUTES) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, route).not.toBeNull();
    const reportOnly =
      response?.headers()["content-security-policy-report-only"] ?? "";
    const enforced = response?.headers()["content-security-policy"] ?? "";

    expect(enforced, route).toContain("script-src");
    if (productionServer) {
      const enforcedScript = scriptDirective(enforced);
      const nonce = enforcedScript.match(/'nonce-([^']+)'/u)?.[1] ?? "";
      expect(reportOnly, route).toBe("");
      expect(enforcedScript, route).toContain("'strict-dynamic'");
      expect(enforcedScript, route).not.toContain("'unsafe-inline'");
      expect(enforcedScript, route).not.toContain("'unsafe-eval'");
      expect(nonce, route).not.toBe("");
      const executableScripts = await page.locator("script").evaluateAll((scripts) =>
        scripts
          .filter((script) => {
            const type = (script.getAttribute("type") ?? "").trim().toLowerCase();
            return (
              type === "" ||
              type === "module" ||
              type === "text/javascript" ||
              type === "application/javascript"
            );
          })
          .map((script) => ({
            nonce: (script as HTMLScriptElement).nonce,
            src: (script as HTMLScriptElement).src,
            sample: script.textContent?.slice(0, 80) ?? "",
          })),
      );
      expect(executableScripts.length, route).toBeGreaterThan(0);
      const inlineScripts = executableScripts.filter((script) => !script.src);
      expect(inlineScripts.length, route).toBeGreaterThan(0);
      expect(
        inlineScripts.filter((script) => script.nonce !== nonce),
        route,
      ).toEqual([]);
      const responseOrigin = new URL(response!.url()).origin;
      expect(
        executableScripts.filter((script) => {
          if (!script.src) return false;
          const source = new URL(script.src);
          return (
            source.origin !== responseOrigin ||
            !source.pathname.startsWith("/_next/static/") ||
            (script.nonce !== "" && script.nonce !== nonce)
          );
        }),
        route,
      ).toEqual([]);
    } else {
      // Next dev's framework bootstrap does not propagate request nonces.
      expect(scriptDirective(enforced), route).toContain("'unsafe-inline'");
      expect(scriptDirective(reportOnly), route).not.toContain("'strict-dynamic'");
      expect(scriptDirective(reportOnly), route).toContain("'unsafe-inline'");
      expect(scriptDirective(reportOnly), route).toContain("'unsafe-eval'");
      expect(scriptDirective(reportOnly), route).not.toContain("'nonce-");
    }
  }

  expect(pageErrors).toEqual([]);
  // This count is the promotion gate for production strict enforcement.
  expect(cspMessages).toEqual([]);
  expect(cspAuditIssues).toEqual([]);
});
