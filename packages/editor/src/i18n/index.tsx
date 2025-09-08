import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import en from '@/i18n/en.json';
import ja from '@/i18n/ja.json';

type Dictionary = Record<string, string>;
type SupportedLang = 'en' | 'ja';

interface I18nContextValue {
    lang: SupportedLang;
    t: (key: string, vars?: Record<string, string | number>) => string;
    setLanguage: (language: string) => void;
}

const DICTS: Record<SupportedLang, Dictionary> = { en, ja } as const;

function detectBrowserLanguage(): SupportedLang {
    try {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        const lang = (nav?.language || nav?.languages?.[0] || 'en').toLowerCase();
        if (lang.startsWith('ja')) return 'ja';
        return 'en';
    } catch {
        return 'en';
    }
}

function normalizeLang(language?: string): SupportedLang {
    if (!language) return detectBrowserLanguage();
    const lower = language.toLowerCase();
    if (lower.startsWith('ja')) return 'ja';
    return 'en';
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] ?? `{${k}}`).toString());
}

const defaultLang: SupportedLang = 'en';
const noop = () => {};
const defaultValue: I18nContextValue = {
    lang: defaultLang,
    t: (key: string, vars?: Record<string, string | number>) => interpolate(DICTS[defaultLang][key] ?? key, vars),
    setLanguage: noop,
};

const I18nContext = createContext<I18nContextValue>(defaultValue);

export interface I18nProviderProps {
    language?: string;
    children: ReactNode;
}

const STORAGE_KEY = 'itinerary-md-language';

// Global state for instant translation outside React
let currentLang: SupportedLang = defaultLang;
export function tInstant(key: string, vars?: Record<string, string | number>): string {
    const dict = DICTS[currentLang] ?? DICTS.en;
    return interpolate(dict[key] ?? DICTS.en[key] ?? key, vars);
}

export function I18nProvider({ language, children }: I18nProviderProps) {
    const initialLang = useMemo<SupportedLang>(() => {
        try {
            const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
            if (stored) return normalizeLang(stored);
        } catch {}
        return normalizeLang(language);
    }, [language]);

    const [lang, setLang] = useState<SupportedLang>(initialLang);

    // Sync with prop changes when provided
    useEffect(() => {
        if (language) {
            setLang(normalizeLang(language));
        }
    }, [language]);

    // Persist to localStorage
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, lang);
        } catch {}
    }, [lang]);

    // Keep global language in sync
    useEffect(() => {
        currentLang = lang;
    }, [lang]);

    const value = useMemo<I18nContextValue>(() => {
        const dict = DICTS[lang] ?? DICTS.en;
        return {
            lang,
            t: (key: string, vars?: Record<string, string | number>) => interpolate(dict[key] ?? DICTS.en[key] ?? key, vars),
            setLanguage: (lng: string) => setLang(normalizeLang(lng)),
        };
    }, [lang]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    return useContext(I18nContext);
}
