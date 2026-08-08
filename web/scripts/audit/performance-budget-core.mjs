export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function intersectUrls(scriptMaps) {
  let intersection = null;
  for (const scripts of scriptMaps) {
    const urls = new Set(scripts.keys());
    intersection =
      intersection === null
        ? urls
        : new Set([...intersection].filter((url) => urls.has(url)));
  }
  return intersection ?? new Set();
}

/**
 * Attribute JavaScript shared by every measured route globally, then by every
 * route/run in an explicitly configured layout cohort. A chunk shared by only
 * a few pages is deliberately left route-specific.
 */
export function attributeClientScripts(scriptsByRoute, layoutCohorts = {}) {
  const routeIds = new Set(scriptsByRoute.keys());
  const cohortByRoute = new Map();
  for (const [cohortId, members] of Object.entries(layoutCohorts)) {
    if (!Array.isArray(members) || members.length < 2) {
      throw new Error(`Layout cohort ${cohortId} must contain at least two routes`);
    }
    for (const routeId of members) {
      if (!routeIds.has(routeId)) {
        throw new Error(`Layout cohort ${cohortId} references unknown route ${routeId}`);
      }
      if (cohortByRoute.has(routeId)) {
        throw new Error(`Route ${routeId} belongs to more than one layout cohort`);
      }
      cohortByRoute.set(routeId, cohortId);
    }
  }

  const allScriptMaps = [...scriptsByRoute.values()].flat();
  const commonScriptUrls = intersectUrls(allScriptMaps);
  const commonClientJsBytes = median(
    allScriptMaps.map((scripts) =>
      [...commonScriptUrls].reduce(
        (total, url) => total + (scripts.get(url) ?? 0),
        0,
      ),
    ),
  );

  const cohortActuals = {};
  const cohortSharedUrls = new Map();
  for (const [cohortId, members] of Object.entries(layoutCohorts)) {
    const scriptMaps = members.flatMap((routeId) => scriptsByRoute.get(routeId));
    const sharedUrls = new Set(
      [...intersectUrls(scriptMaps)].filter((url) => !commonScriptUrls.has(url)),
    );
    cohortSharedUrls.set(cohortId, sharedUrls);
    cohortActuals[cohortId] = {
      routes: members,
      sharedClientJsBytes: median(
        scriptMaps.map((scripts) =>
          [...sharedUrls].reduce(
            (total, url) => total + (scripts.get(url) ?? 0),
            0,
          ),
        ),
      ),
      sharedScriptUrls: [...sharedUrls],
    };
  }

  const routeSpecificJsBytes = new Map();
  for (const [routeId, scriptMaps] of scriptsByRoute) {
    const cohortUrls = cohortSharedUrls.get(cohortByRoute.get(routeId)) ?? new Set();
    routeSpecificJsBytes.set(
      routeId,
      median(
        scriptMaps.map((scripts) =>
          [...scripts].reduce(
            (total, [url, bytes]) =>
              total +
              (commonScriptUrls.has(url) || cohortUrls.has(url) ? 0 : bytes),
            0,
          ),
        ),
      ),
    );
  }

  return {
    commonClientJsBytes,
    commonScriptUrls,
    cohortActuals,
    routeSpecificJsBytes,
  };
}

function findPageBranch(tree) {
  if (!Array.isArray(tree)) return null;
  if (tree[2]?.page) return [tree];
  for (const child of Object.values(tree[1] ?? {})) {
    const branch = findPageBranch(child);
    if (branch) return [tree, ...branch];
  }
  return null;
}

async function generatedParamsForTree(loaderTree) {
  const branch = findPageBranch(loaderTree);
  if (!branch) throw new Error("Compiled app page has no page loader branch");
  let paramsList = [{}];
  for (const node of branch) {
    for (const moduleKey of ["layout", "page"]) {
      const loader = node[2]?.[moduleKey]?.[0];
      if (typeof loader !== "function") continue;
      const userland = await loader();
      if (typeof userland.generateStaticParams !== "function") continue;
      const nextParams = [];
      for (const parentParams of paramsList) {
        const generated = await userland.generateStaticParams({
          params: parentParams,
        });
        if (!Array.isArray(generated)) {
          throw new Error("generateStaticParams must return an array");
        }
        for (const params of generated) {
          nextParams.push({ ...parentParams, ...params });
        }
      }
      paramsList = nextParams;
    }
  }
  return paramsList;
}

function materializeRoute(pattern, params) {
  let complete = true;
  const route = pattern.replace(
    /\[\[\.\.\.([^\]]+)\]\]|\[\.\.\.([^\]]+)\]|\[([^\]]+)\]/g,
    (token, optionalCatchAll, catchAll, single) => {
      const name = optionalCatchAll ?? catchAll ?? single;
      const value = params[name];
      if (value === undefined && optionalCatchAll) return "";
      if (value === undefined || value === null) {
        complete = false;
        return token;
      }
      const values = Array.isArray(value) ? value : [value];
      if (!optionalCatchAll && !catchAll && values.length !== 1) {
        complete = false;
        return token;
      }
      return values.map((part) => encodeURIComponent(String(part))).join("/");
    },
  );
  return complete ? route.replace(/\/+/g, "/") || "/" : null;
}

/**
 * Rebuild the concrete App Router page inventory from the compiled build.
 * This remains stable when a nonce intentionally makes pages dynamic and the
 * prerender manifest therefore contains only technical static handlers.
 */
export async function collectBuildRouteInventory({
  appPathsManifest,
  appPathRoutesManifest,
  loadCompiledPage,
}) {
  const concreteRoutes = new Set();
  const generatedRoutesByPattern = {};
  let pageDefinitionCount = 0;
  let dynamicPageDefinitionCount = 0;

  for (const [appPath, bundlePath] of Object.entries(appPathsManifest)) {
    if (!appPath.endsWith("/page")) continue;
    const routePattern = appPathRoutesManifest[appPath];
    if (!routePattern || routePattern.startsWith("/_")) continue;
    pageDefinitionCount += 1;
    if (!/\[[^\]]+\]/.test(routePattern)) {
      concreteRoutes.add(routePattern);
      continue;
    }

    dynamicPageDefinitionCount += 1;
    const compiledPage = await loadCompiledPage(bundlePath);
    const paramsList = await generatedParamsForTree(
      compiledPage?.routeModule?.userland?.loaderTree,
    );
    let generatedCount = 0;
    for (const params of paramsList) {
      const route = materializeRoute(routePattern, params);
      if (!route) continue;
      const sizeBefore = concreteRoutes.size;
      concreteRoutes.add(route);
      if (concreteRoutes.size > sizeBefore) generatedCount += 1;
    }
    generatedRoutesByPattern[routePattern] = generatedCount;
  }

  return {
    concreteRouteCount: concreteRoutes.size,
    pageDefinitionCount,
    dynamicPageDefinitionCount,
    generatedRouteCount:
      concreteRoutes.size - (pageDefinitionCount - dynamicPageDefinitionCount),
    generatedRoutesByPattern,
  };
}
