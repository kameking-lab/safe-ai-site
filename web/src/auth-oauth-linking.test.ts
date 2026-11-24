// @vitest-environment node
import type { NextAuthConfig } from "next-auth";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SignInArgs = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["signIn"]>>[0];
const fixture = vi.hoisted(() => ({
  account: vi.fn(),
  user: vi.fn(),
  linkAccount: vi.fn(),
  createUser: vi.fn(),
  requests: new Map<string, { input: SignInArgs; linkTo?: "new" | "existing" }>(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { account: { findUnique: fixture.account }, user: { findUnique: fixture.user } } }));
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({ createUser: fixture.createUser, linkAccount: fixture.linkAccount }),
}));
vi.mock("next-auth/providers/google", () => ({ default: (options: object) => ({ id: "google", ...options }) }));
vi.mock("next-auth/providers/apple", () => ({ default: (options: object) => ({ id: "apple", ...options }) }));
vi.mock("@/lib/mobile/session", () => ({ mobileAuthSession: vi.fn() }));
vi.mock("@/lib/mobile/billing-service", () => ({ getEntitlement: vi.fn() }));
vi.mock("@/lib/server/deployment-safety", () => ({ externalCredentialedServicesAllowed: () => true }));
vi.mock("next-auth", () => ({
  default: (options: NextAuthConfig) => {
    const callback = async (request: NextRequest) => {
      const { input, linkTo } = fixture.requests.get(request.nextUrl.pathname)!;
      const decision = await options.callbacks!.signIn!(input);
      const provider = options.providers.find(item => typeof item !== "function" && item.id === input.account?.provider);
      const emailLink = provider && "allowDangerousEmailAccountLinking" in provider
        ? provider.allowDangerousEmailAccountLinking : null;
      if (linkTo && decision === true) {
        const userId = linkTo === "new"
          ? (await options.adapter!.createUser!({ id: "new-member", email: input.user.email!, emailVerified: null })).id
          : "existing-member";
        await options.adapter!.linkAccount!({ ...input.account!, type: "oidc", userId });
      }
      return Response.json({ decision, emailLink });
    };
    return { handlers: { GET: callback, POST: callback } };
  },
}));

const originalMethod = "/auth/signin?error=OAuthAccountNotLinked";
async function signIn(provider: "apple" | "google", email: string, profile = {}, method: "GET" | "POST" = "GET", linkTo?: "new" | "existing") {
  const { handlers } = await import("./auth");
  const pathname = `/api/auth/callback/${provider}/${crypto.randomUUID()}`;
  fixture.requests.set(pathname, {
    input: {
      user: { id: "unlinked-profile", email },
      account: { provider, type: "oidc", providerAccountId: "verified-subject" },
      profile,
    },
    linkTo,
  });
  return (await handlers[method](new NextRequest(`https://example.test${pathname}`))).json();
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  fixture.requests.clear();
  vi.stubEnv("AUTH_SECRET", "fixture");
  vi.stubEnv("AUTH_GOOGLE_ID", "fixture");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "fixture");
  vi.stubEnv("AUTH_APPLE_ID", "fixture");
  vi.stubEnv("AUTH_APPLE_SECRET", "fixture");
  vi.stubEnv("ADMIN_EMAILS", "");
  fixture.account.mockResolvedValue(null);
  fixture.user.mockResolvedValue({ id: "existing-member" });
  fixture.createUser.mockResolvedValue({ id: "new-member" });
});
afterEach(() => vi.unstubAllEnvs());

describe("OAuth email ownership and earlier subject links", () => {
  it.each([
    ["google", "person@example.test", { email_verified: true }],
    ["google", "person@gmail.com", {}],
    ["google", "person@gmail.com", { email_verified: false }],
    ["google", "person@example.test", { email_verified: true, hd: "other.test" }],
    ["apple", "person@gmail.com", { email_verified: "true" }],
  ] as const)("requires the original login for an existing %s email match", async (provider, email, claims) => {
    expect(await signIn(provider, email, { ...claims, email }, provider === "apple" ? "POST" : "GET"))
      .toEqual({ decision: originalMethod, emailLink: false });
  });

  it.each([["person@gmail.com", undefined], ["person@work.test", "work.test"]] as const)(
    "leaves Auth.js email linking disabled for %s even with an authoritative provider",
    async (email, hd) => {
      expect(await signIn("google", email, { email, email_verified: true, hd }))
        .toEqual({ decision: true, emailLink: false });
    },
  );

  it.each(["google", "apple"] as const)("allows a previously linked %s subject without email proof", async (provider) => {
    fixture.account.mockResolvedValue({ userId: "existing-member" });
    expect(await signIn(provider, "person@example.test", { email_verified: false }))
      .toEqual({ decision: true, emailLink: false });
    expect(fixture.account).toHaveBeenCalledWith({
      where: { provider_providerAccountId: { provider, providerAccountId: "verified-subject" } },
      select: { userId: true },
    });
  });

  it("keeps brand-new third-party signups without authorizing a later email link", async () => {
    fixture.user.mockResolvedValue(null);
    expect(await signIn("google", "person@example.test", { email: "person@example.test", email_verified: true }))
      .toEqual({ decision: true, emailLink: false });
  });

  it("allows account creation only for the user created by the same sign-in callback", async () => {
    fixture.user.mockResolvedValue(null);
    const results = await Promise.allSettled([
      signIn("google", "person@example.test", {}, "GET", "new"),
      signIn("apple", "new@example.test", {}, "POST", "existing"),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1]).toMatchObject({ status: "rejected", reason: new Error("oauth_account_link_requires_existing_login") });
    expect(fixture.linkAccount).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ userId: "new-member" }));
  });

  it("requires the original login for a configured administrator even before a member record exists", async () => {
    fixture.user.mockResolvedValue(null);
    vi.stubEnv("ADMIN_EMAILS", "admin@example.test");
    expect(await signIn("apple", "admin@example.test")).toEqual({ decision: originalMethod, emailLink: false });
  });
});
