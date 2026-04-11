"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppLanguage, getDir, translate } from "@/lib/i18n";

type LanguageContextType = {
  language: AppLanguage;
  dir: "ltr" | "rtl";
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);

  const dir = useMemo(() => getDir(language), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.body.setAttribute("data-dir", dir);
    document.body.setAttribute("data-language", language);
  }, [language, dir]);

  const value = useMemo(
    () => ({
      language,
      dir,
      setLanguage,
      t: (key: string) => translate(language, key),
    }),
    [language, dir]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}