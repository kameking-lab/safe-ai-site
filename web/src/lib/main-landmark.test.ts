import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DiversityDisabilityPage from "@/app/(main)/diversity/disability/page";
import DiversityElderlyPage from "@/app/(main)/diversity/elderly/page";
import DiversityForeignWorkersPage from "@/app/(main)/diversity/foreign-workers/page";
import DiversityLgbtqPage from "@/app/(main)/diversity/lgbtq/page";
import DiversityNonRegularPage from "@/app/(main)/diversity/non-regular/page";
import DiversityRemotePage from "@/app/(main)/diversity/remote/page";
import DiversitySogiPage from "@/app/(main)/diversity/sogi/page";
import HealthCheckupSchedulerResultPage from "@/app/(main)/health-checkup-scheduler/result/page";
import LawsBcpPage from "@/app/(main)/laws/bcp/page";
import LawsFreelanceRosaiPage from "@/app/(main)/laws/freelance-rosai/page";
import LawsGigWorkPage from "@/app/(main)/laws/gig-work/page";
import MlitResourcesPage from "@/app/(main)/resources/mlit/page";
import { AppShell } from "@/components/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const collectTsxFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });

const APP_SHELL_ROUTE_MANIFEST: ReadonlyArray<{
  pathname: string;
  Page: ComponentType;
}> = [
  { pathname: "/diversity/disability", Page: DiversityDisabilityPage },
  { pathname: "/diversity/elderly", Page: DiversityElderlyPage },
  { pathname: "/diversity/foreign-workers", Page: DiversityForeignWorkersPage },
  { pathname: "/diversity/lgbtq", Page: DiversityLgbtqPage },
  { pathname: "/diversity/non-regular", Page: DiversityNonRegularPage },
  { pathname: "/diversity/remote", Page: DiversityRemotePage },
  { pathname: "/diversity/sogi", Page: DiversitySogiPage },
  {
    pathname: "/health-checkup-scheduler/result",
    Page: HealthCheckupSchedulerResultPage,
  },
  { pathname: "/laws/bcp", Page: LawsBcpPage },
  { pathname: "/laws/freelance-rosai", Page: LawsFreelanceRosaiPage },
  { pathname: "/laws/gig-work", Page: LawsGigWorkPage },
  { pathname: "/resources/mlit", Page: MlitResourcesPage },
];

// AppShell owns the (main) group landmark; the other owners are standalone
// routes outside that group. Review any new shared owner before adding it here.
const SHARED_MAIN_OWNER_MANIFEST = [
  "src/components/app-shell.tsx",
  "src/components/ky-morning-signage.tsx",
  "src/components/signage-map/signage-map-client.tsx",
  "src/components/signage/signage-shell.tsx",
] as const;

describe("main landmark ownership", () => {
  it("keeps the sole main landmark in AppShell", () => {
    const shell = readFileSync(join(process.cwd(), "src", "components", "app-shell.tsx"), "utf8");
    expect(shell.match(/<main\b/g)).toHaveLength(1);
    expect(shell.match(/<\/main>/g)).toHaveLength(1);
  });

  it.each(APP_SHELL_ROUTE_MANIFEST)(
    "$pathname renders exactly one main landmark through AppShell",
    ({ pathname, Page }) => {
      const html = renderToStaticMarkup(
        createElement(AppShell, null, createElement(Page)),
      );
      const template = document.createElement("template");
      template.innerHTML = html;
      const landmarks = template.content.querySelectorAll("main");

      expect(landmarks, pathname).toHaveLength(1);
      expect(landmarks[0]?.id, pathname).toBe("main-content");
    },
  );

  it("requires every shared main owner to be explicitly reviewed", () => {
    const componentRoot = join(process.cwd(), "src", "components");
    const owners = collectTsxFiles(componentRoot)
      .filter((path) => /<\/?main\b/u.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"))
      .sort();

    expect(owners).toEqual([...SHARED_MAIN_OWNER_MANIFEST].sort());
  });

  it("does not declare a direct main element anywhere in the (main) route group", () => {
    const routeGroup = join(process.cwd(), "src", "app", "(main)");
    const offenders = collectTsxFiles(routeGroup)
      .filter((path) => /<\/?main\b/u.test(readFileSync(path, "utf8")))
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });
});
