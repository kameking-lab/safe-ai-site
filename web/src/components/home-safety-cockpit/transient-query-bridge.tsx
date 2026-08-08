"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type PendingChatQuestion = {
  id: string;
  question: string;
  stagedAt: number;
};

export type PendingChemicalQuery = {
  id: string;
  query: string;
  confirmedCas: string | null;
  stagedAt: number;
};

type TransientQueryBridgeValue = {
  revision: number;
  stageChatQuestion: (question: string) => PendingChatQuestion | null;
  peekChatQuestion: () => PendingChatQuestion | null;
  consumeChatQuestion: (id: string) => void;
  discardChatQuestion: (id?: string) => void;
  stageChemicalQuery: (
    query: string,
    confirmedCas?: string | null,
  ) => PendingChemicalQuery | null;
  peekChemicalQuery: () => PendingChemicalQuery | null;
  consumeChemicalQuery: (id: string) => void;
  discardChemicalQuery: (id?: string) => void;
};

const TransientQueryBridgeContext =
  createContext<TransientQueryBridgeValue | null>(null);

const MAX_TRANSIENT_QUESTION_CHARS = 4_000;
const MAX_TRANSIENT_CHEMICAL_CHARS = 120;
const MAX_TRANSIENT_AGE_MS = 2 * 60 * 1000;

/**
 * Same-tab, memory-only handoff. Raw questions and chemical queries are never
 * written to a URL, history state, web storage, console, analytics, or a
 * server-side handoff.
 */
export function TransientQueryBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pendingRef = useRef<PendingChatQuestion | null>(null);
  const pendingChemicalRef = useRef<PendingChemicalQuery | null>(null);
  const [revision, setVersion] = useState(0);

  const stageChatQuestion = useCallback(
    (rawQuestion: string): PendingChatQuestion | null => {
      const question = rawQuestion.trim();
      if (
        !question ||
        question.length > MAX_TRANSIENT_QUESTION_CHARS ||
        typeof crypto === "undefined" ||
        typeof crypto.randomUUID !== "function"
      ) {
        return null;
      }
      const pending = {
        id: crypto.randomUUID(),
        question,
        stagedAt: Date.now(),
      };
      pendingRef.current = pending;
      setVersion((value) => value + 1);
      return pending;
    },
    [],
  );

  const peekChatQuestion = useCallback((): PendingChatQuestion | null => {
    const pending = pendingRef.current;
    if (!pending) return null;
    if (Date.now() - pending.stagedAt > MAX_TRANSIENT_AGE_MS) {
      pendingRef.current = null;
      return null;
    }
    return pending;
  }, []);

  const consumeChatQuestion = useCallback((id: string) => {
    if (pendingRef.current?.id !== id) return;
    pendingRef.current = null;
    setVersion((value) => value + 1);
  }, []);

  const discardChatQuestion = useCallback((id?: string) => {
    if (id && pendingRef.current?.id !== id) return;
    pendingRef.current = null;
    setVersion((value) => value + 1);
  }, []);

  const stageChemicalQuery = useCallback(
    (
      rawQuery: string,
      rawConfirmedCas: string | null = null,
    ): PendingChemicalQuery | null => {
      const query = rawQuery.normalize("NFKC").trim();
      const confirmedCas = rawConfirmedCas?.trim() || null;
      if (
        !query ||
        query.length > MAX_TRANSIENT_CHEMICAL_CHARS ||
        (confirmedCas !== null &&
          !/^\d{2,7}-\d{2,3}-\d{1,2}$/u.test(confirmedCas)) ||
        typeof crypto === "undefined" ||
        typeof crypto.randomUUID !== "function"
      ) {
        return null;
      }
      const pending = {
        id: crypto.randomUUID(),
        query,
        confirmedCas,
        stagedAt: Date.now(),
      };
      pendingChemicalRef.current = pending;
      setVersion((value) => value + 1);
      return pending;
    },
    [],
  );

  const peekChemicalQuery = useCallback((): PendingChemicalQuery | null => {
    const pending = pendingChemicalRef.current;
    if (!pending) return null;
    if (Date.now() - pending.stagedAt > MAX_TRANSIENT_AGE_MS) {
      pendingChemicalRef.current = null;
      return null;
    }
    return pending;
  }, []);

  const consumeChemicalQuery = useCallback((id: string) => {
    if (pendingChemicalRef.current?.id !== id) return;
    pendingChemicalRef.current = null;
    setVersion((value) => value + 1);
  }, []);

  const discardChemicalQuery = useCallback((id?: string) => {
    if (id && pendingChemicalRef.current?.id !== id) return;
    pendingChemicalRef.current = null;
    setVersion((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({
      revision,
      stageChatQuestion,
      peekChatQuestion,
      consumeChatQuestion,
      discardChatQuestion,
      stageChemicalQuery,
      peekChemicalQuery,
      consumeChemicalQuery,
      discardChemicalQuery,
    }),
    [
      revision,
      consumeChatQuestion,
      discardChatQuestion,
      consumeChemicalQuery,
      discardChemicalQuery,
      peekChatQuestion,
      peekChemicalQuery,
      stageChatQuestion,
      stageChemicalQuery,
    ],
  );

  return (
    <TransientQueryBridgeContext.Provider value={value}>
      {children}
    </TransientQueryBridgeContext.Provider>
  );
}

export function useTransientQueryBridge(): TransientQueryBridgeValue {
  const value = useContext(TransientQueryBridgeContext);
  if (!value) {
    throw new Error(
      "TransientQueryBridgeProvider is required for a transient handoff.",
    );
  }
  return value;
}

/** Fixed-route fallback callers may render outside the main app layout. */
export function useOptionalTransientQueryBridge(): TransientQueryBridgeValue | null {
  return useContext(TransientQueryBridgeContext);
}
