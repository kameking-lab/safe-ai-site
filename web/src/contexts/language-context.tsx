"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Language = "ja" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ja",
  setLanguage: () => undefined,
});

function loadLanguage(): Language {
  if (typeof window === "undefined") return "ja";
  try {
    const stored = localStorage.getItem("language");
    if (stored === "en" || stored === "ja") return stored;
  } catch {
    // localStorage unavailable
  }
  return "ja";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("language", lang);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
