import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VoiceLang } from "@/lib/voice";

const LANG_KEY = "nv_lang";

interface LanguageContextValue {
  lang: VoiceLang;
  setLang: (l: VoiceLang) => void;
  /** Choose the right string for the active language. */
  pick: (en: string, kn?: string, hi?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<VoiceLang>(() => {
    if (typeof window === "undefined") return "en-IN";
    const saved = localStorage.getItem(LANG_KEY) as VoiceLang | null;
    if (saved === "en-IN" || saved === "kn-IN" || saved === "hi-IN") return saved;
    return "en-IN";
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  const setLang = useCallback((l: VoiceLang) => setLangState(l), []);

  const pick = useCallback(
    (en: string, kn?: string, hi?: string) => {
      if (lang === "kn-IN") return kn ?? en;
      if (lang === "hi-IN") return hi ?? en;
      return en;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, pick }), [lang, setLang, pick]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Defensive default — keeps storybook / standalone mounts working.
    return {
      lang: "en-IN",
      setLang: () => {},
      pick: (en) => en,
    };
  }
  return ctx;
}
