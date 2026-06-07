// src/i18n/LanguageContext.tsx — React context per la lingua dell'interfaccia

import React, { createContext, useContext, useState } from "react";
import { translations, type Lang, type Translations } from "./translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LangCtx>({
  lang: "it",
  setLang: () => {},
  t: translations.it,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("tennisai_lang") as Lang) || "it";
    } catch {
      return "it";
    }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("tennisai_lang", l); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): LangCtx {
  return useContext(LanguageContext);
}
