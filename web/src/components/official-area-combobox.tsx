"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";
import {
  officialAreaCandidateById,
  resolveOfficialAreaQuery,
  type OfficialAreaCandidate,
} from "@/lib/area/official-area-resolver";

const INPUT_MAX = 80;

export function OfficialAreaCombobox({
  id,
  label,
  selectedAreaId,
  onSelect,
  helpText = "",
}: {
  id: string;
  label: string;
  selectedAreaId: string | null;
  onSelect: (candidate: OfficialAreaCandidate) => void;
  helpText?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedAreaId
    ? officialAreaCandidateById(selectedAreaId)
    : null;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState<string | null>(null);
  const resolution = useMemo(() => resolveOfficialAreaQuery(query), [query]);
  const candidates = resolution.candidates;

  useEffect(() => {
    const typedBeforeHydration = inputRef.current?.value.slice(0, INPUT_MAX) ?? "";
    if (!selectedAreaId) {
      if (typedBeforeHydration) {
        const timer = window.setTimeout(() => {
          setQuery(typedBeforeHydration);
          setOpen(true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const next = selectedAreaId
      ? officialAreaCandidateById(selectedAreaId)?.label
      : null;
    if (!next) return;
    const timer = window.setTimeout(() => {
      setQuery(next);
      if (inputRef.current) inputRef.current.value = next;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedAreaId]);

  const choose = (candidate: OfficialAreaCandidate) => {
    setQuery(candidate.label);
    if (inputRef.current) inputRef.current.value = candidate.label;
    setOpen(false);
    setActiveIndex(-1);
    setMessage(candidate.resolutionLabel);
    onSelect(candidate);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && candidates[activeIndex]) {
      choose(candidates[activeIndex]);
      return;
    }
    if (resolution.exact && resolution.unique) {
      choose(resolution.unique);
      return;
    }
    setOpen(true);
    setActiveIndex(-1);
    setMessage(
      candidates.length > 0
        ? "候補を選んでください。"
        : "地域を確認できません。",
    );
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && candidates.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index < candidates.length - 1 ? index + 1 : 0,
      );
      return;
    }
    if (event.key === "ArrowUp" && candidates.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        index > 0 ? index - 1 : candidates.length - 1,
      );
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <form onSubmit={submit} noValidate data-official-area-resolver="shared">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative mt-1.5 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          />
          <input
            ref={inputRef}
            id={id}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && candidates.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            maxLength={INPUT_MAX}
            defaultValue={query}
            suppressHydrationWarning
            placeholder="例：横浜 港北、大阪市北区"
            onChange={(event) => {
              setQuery(event.target.value.slice(0, INPUT_MAX));
              setOpen(Boolean(event.target.value));
              setActiveIndex(-1);
              setMessage(null);
            }}
            onFocus={() =>
              setOpen(Boolean(inputRef.current?.value ?? query))
            }
            onKeyDown={onKeyDown}
            className="min-h-12 w-full rounded-lg border border-slate-400 bg-white py-2 pl-10 pr-3 text-base text-slate-950 placeholder:text-slate-500 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-200"
          />
          {open && candidates.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="地域候補"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-slate-500 bg-white p-1 text-slate-950 shadow-xl"
            >
              {candidates.map((candidate, index) => (
                <li
                  id={`${listId}-option-${index}`}
                  key={candidate.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(candidate)}
                  className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm ${
                    activeIndex === index
                      ? "bg-sky-100 outline outline-2 outline-sky-700"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-black">{candidate.label}</span>
                  <span className="block text-xs text-slate-600">
                    {candidate.resolutionLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-lg bg-slate-900 px-4 text-sm font-black text-white focus-visible:ring-4 focus-visible:ring-sky-300"
        >
          この地域を表示
        </button>
      </div>
      {message || helpText ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-600" aria-live="polite">
          {message ?? helpText}
        </p>
      ) : null}
    </form>
  );
}
