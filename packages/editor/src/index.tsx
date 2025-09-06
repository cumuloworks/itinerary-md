import { Buffer } from 'buffer';
import './index.css';
import type { FC } from 'react';
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalErrorHandlers } from './core/errors';
import type { EditorFontsOption, GoogleFontsConfig } from './core/fonts.ts';
import { setTelemetry, type Telemetry, TelemetryContext } from './core/telemetry';
import { I18nProvider } from './i18n';
import { initializeRates } from './utils/currency';

declare global {
    interface Window {
        Buffer?: typeof Buffer;
    }
}

if (typeof window !== 'undefined') {
    registerGlobalErrorHandlers();
    initializeRates();
    window.Buffer = window.Buffer || Buffer;
}

// Lazy load the actual editor component for SSR safety
const EditorBare = lazy(() =>
    import('./components/Editor').then((module) => ({
        default: module.Editor,
    }))
);

export interface EditorProps {
    storageKey?: string;
    samplePath?: string;
    rate?: { from: string; to: string; value: number };
    /**
     * UI language. Example: "en", "ja", or locale like "ja-JP".
     * If omitted, browser language is used.
     */
    language?: string;
    /** Optional telemetry adapter for error reporting */
    telemetry?: Telemetry;
    /** Optional sans-serif fonts loader. Default: injected (DM Sans, Noto Sans JP) */
    fonts?: EditorFontsOption;
    /** Optional monospaced fonts loader. Default: injected (DM Mono) */
    monoFonts?: EditorFontsOption;
}

export const Editor: FC<EditorProps> = (props) => {
    const cleanupRef = useRef<null | (() => void)>(null);

    // Default sans fonts when no explicit option is provided
    const defaultFonts: GoogleFontsConfig = useMemo(
        () => ({
            provider: 'google',
            families: ['Noto Sans JP:wght@100..900', 'DM Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000'],
            display: 'swap',
        }),
        []
    );
    // Default mono fonts
    const defaultMonoFonts: GoogleFontsConfig = useMemo(
        () => ({
            provider: 'google',
            families: ['DM Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500'],
            display: 'swap',
        }),
        []
    );

    const effectiveFonts: EditorFontsOption = props.fonts === undefined ? defaultFonts : props.fonts;
    const effectiveMonoFonts: EditorFontsOption = props.monoFonts === undefined ? defaultMonoFonts : props.monoFonts;

    useEffect(() => {
        setTelemetry(props.telemetry);
        return () => setTelemetry(undefined);
    }, [props.telemetry]);

    // Optionally inject fonts links (sans + mono) via dynamic import to keep entry small
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let disposed = false;
        (async () => {
            const { injectFontsLinks } = await import('./core/fonts.ts');
            if (disposed) return;
            const cleanupSans = injectFontsLinks(effectiveFonts);
            const cleanupMono = injectFontsLinks(effectiveMonoFonts);
            cleanupRef.current = () => {
                cleanupSans();
                cleanupMono();
            };
        })();
        return () => {
            disposed = true;
            cleanupRef.current?.();
            cleanupRef.current = null;
        };
    }, [effectiveFonts, effectiveMonoFonts]);

    // Avoid passing telemetry down to inner component
    const { telemetry: _telemetry, fonts: _fonts, ...rest } = props as any;
    return (
        <div className="w-full h-full min-h-0 min-w-0">
            <TelemetryContext.Provider value={props.telemetry}>
                <ErrorBoundary>
                    <I18nProvider language={props.language}>
                        <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-lg p-4 border border-gray-300">Loading editor...</div>}>
                            <EditorBare {...(rest as any)} />
                        </Suspense>
                    </I18nProvider>
                </ErrorBoundary>
            </TelemetryContext.Provider>
            <Toaster />
        </div>
    );
};

export { EditorBare as EditorInner };
