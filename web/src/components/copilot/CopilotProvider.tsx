"use client";

/**
 * CopilotProvider holds the cross-feature SafetyContext for the 3 flagship
 * tools (/chatbot, /accidents-reports, /strategy/plan-generator).
 *
 * The provider lives in the (main) layout so every feature can read/write
 * shared state without prop drilling. State is persisted to localStorage
 * under a versioned key so the user can pick up the journey across reloads.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SAFETY_CONTEXT_MAX_CONCERNS,
  SAFETY_CONTEXT_MAX_QUERIES,
  SAFETY_CONTEXT_STORAGE_KEY,
  createEmptySafetyContext,
  normalizeSafetyContext,
  type CopilotPlanSnapshot,
  type CopilotScale,
  type CopilotStepId,
  type SafetyContextState,
} from "@/lib/copilot/types";
import type { IndustrySlug } from "@/lib/industry-slugs";
import { detectConcerns, detectFocusAreas, detectIndustry } from "@/lib/copilot/keyword-routing";
import type { MeasureCategory } from "@/types/safety-plan";

interface CopilotContextValue {
  state: SafetyContextState;
  /** Hydrated from localStorage. False until the first useEffect runs. */
  hydrated: boolean;
  setIndustry: (slug: IndustrySlug | undefined) => void;
  setScale: (scale: CopilotScale | undefined) => void;
  recordQuery: (query: string, source: CopilotStepId) => void;
  recordVisit: (source: CopilotStepId) => void;
  recordPlan: (snapshot: CopilotPlanSnapshot) => void;
  addConcerns: (concerns: string[]) => void;
  /** Convenience helper: detect industry/concerns/focus from free text and merge. */
  ingestText: (text: string, source: CopilotStepId) => {
    detectedIndustry?: IndustrySlug;
    detectedConcerns: string[];
    detectedFocus: MeasureCategory[];
  };
  reset: () => void;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SafetyContextState>(createEmptySafetyContext);
  const [hydrated, setHydrated] = useState(false);
  const skipPersistRef = useRef(true);

  // Hydrate from localStorage once on mount. SSR has no storage so initial
  // render uses the empty default — the post-hydration setState lets us
  // populate without a flash of stale UI.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAFETY_CONTEXT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSafetyContext(parsed);
        setState(normalized);
      }
    } catch {
      // ignore malformed storage; keep empty state
    } finally {
      setHydrated(true);
      skipPersistRef.current = false;
    }
  }, []);

  // Persist on every change (skip the hydration round trip).
  useEffect(() => {
    if (skipPersistRef.current) return;
    try {
      window.localStorage.setItem(SAFETY_CONTEXT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage quota or disabled — silently drop, the in-memory state
      // is still authoritative for this tab.
    }
  }, [state]);

  const setIndustry = useCallback((slug: IndustrySlug | undefined) => {
    setState((prev) => ({ ...prev, industry: slug, updatedAt: Date.now() }));
  }, []);

  const setScale = useCallback((scale: CopilotScale | undefined) => {
    setState((prev) => ({ ...prev, scale, updatedAt: Date.now() }));
  }, []);

  const recordVisit = useCallback((source: CopilotStepId) => {
    setState((prev) => ({
      ...prev,
      lastStep: source,
      progress: {
        ...prev.progress,
        visitedChatbot: prev.progress.visitedChatbot || source === "chatbot",
        visitedAccidentsReports:
          prev.progress.visitedAccidentsReports || source === "accidents-reports",
        visitedPlanGenerator:
          prev.progress.visitedPlanGenerator || source === "plan-generator",
      },
      updatedAt: Date.now(),
    }));
  }, []);

  const recordQuery = useCallback((query: string, source: CopilotStepId) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setState((prev) => {
      const next = [
        { query: trimmed.slice(0, 240), source, at: Date.now() },
        ...prev.recentQueries.filter((q) => q.query !== trimmed),
      ].slice(0, SAFETY_CONTEXT_MAX_QUERIES);
      return { ...prev, recentQueries: next, lastStep: source, updatedAt: Date.now() };
    });
  }, []);

  const recordPlan = useCallback((snapshot: CopilotPlanSnapshot) => {
    setState((prev) => ({
      ...prev,
      activePlan: { ...snapshot, generatedAt: snapshot.generatedAt ?? new Date().toISOString() },
      industry: snapshot.industry ?? prev.industry,
      scale: snapshot.scale ?? prev.scale,
      progress: { ...prev.progress, generatedPlan: true, visitedPlanGenerator: true },
      lastStep: "plan-generator",
      updatedAt: Date.now(),
    }));
  }, []);

  const addConcerns = useCallback((concerns: string[]) => {
    if (concerns.length === 0) return;
    setState((prev) => {
      const set = new Set<string>(prev.keyConcerns);
      for (const c of concerns) {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed.slice(0, 60));
      }
      const merged = Array.from(set).slice(0, SAFETY_CONTEXT_MAX_CONCERNS);
      return { ...prev, keyConcerns: merged, updatedAt: Date.now() };
    });
  }, []);

  const ingestText = useCallback(
    (text: string, source: CopilotStepId) => {
      const detectedIndustryMatch = detectIndustry(text);
      const detectedConcerns = detectConcerns(text);
      const detectedFocus = detectFocusAreas(text);

      setState((prev) => {
        // Only auto-set industry if the user has none yet — don't overwrite
        // an explicit selection from the plan generator or report page.
        const nextIndustry = prev.industry ?? detectedIndustryMatch?.slug;
        const concernSet = new Set<string>(prev.keyConcerns);
        for (const c of detectedConcerns) concernSet.add(c);
        const concerns = Array.from(concernSet).slice(0, SAFETY_CONTEXT_MAX_CONCERNS);
        const trimmed = text.trim();
        const recent =
          trimmed.length > 0
            ? [
                { query: trimmed.slice(0, 240), source, at: Date.now() },
                ...prev.recentQueries.filter((q) => q.query !== trimmed),
              ].slice(0, SAFETY_CONTEXT_MAX_QUERIES)
            : prev.recentQueries;
        return {
          ...prev,
          industry: nextIndustry,
          keyConcerns: concerns,
          recentQueries: recent,
          lastStep: source,
          progress: {
            ...prev.progress,
            visitedChatbot: prev.progress.visitedChatbot || source === "chatbot",
            visitedAccidentsReports:
              prev.progress.visitedAccidentsReports || source === "accidents-reports",
            visitedPlanGenerator:
              prev.progress.visitedPlanGenerator || source === "plan-generator",
          },
          updatedAt: Date.now(),
        };
      });

      return {
        detectedIndustry: detectedIndustryMatch?.slug,
        detectedConcerns,
        detectedFocus,
      };
    },
    [],
  );

  const reset = useCallback(() => {
    setState(createEmptySafetyContext());
  }, []);

  const value = useMemo<CopilotContextValue>(
    () => ({
      state,
      hydrated,
      setIndustry,
      setScale,
      recordQuery,
      recordVisit,
      recordPlan,
      addConcerns,
      ingestText,
      reset,
    }),
    [state, hydrated, setIndustry, setScale, recordQuery, recordVisit, recordPlan, addConcerns, ingestText, reset],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotContext);
  if (!ctx) {
    throw new Error("useCopilot must be used inside a <CopilotProvider>.");
  }
  return ctx;
}

/** Safe variant — returns null instead of throwing so it can be called from
 *  components that may render before the provider mounts (e.g. portals). */
export function useOptionalCopilot(): CopilotContextValue | null {
  return useContext(CopilotContext);
}
