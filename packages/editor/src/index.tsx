import { Buffer } from 'buffer';
import './index.css';
import type { FC } from 'react';
import { Toaster } from 'react-hot-toast';
import { Editor as EditorBare } from './components/Editor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalErrorHandlers } from './core/errors';
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

export interface EditorProps {
    storageKey?: string;
    samplePath?: string;
    rate?: { from: string; to: string; value: number };
    /**
     * UI language. Example: "en", "ja", or locale like "ja-JP".
     * If omitted, browser language is used.
     */
    language?: string;
}

export const Editor: FC<EditorProps> = (props) => {
    return (
        <div className="w-full h-full min-h-0 min-w-0">
            <ErrorBoundary>
                <I18nProvider language={props.language}>
                    <EditorBare {...props} />
                </I18nProvider>
            </ErrorBoundary>
            <Toaster />
        </div>
    );
};

export { EditorBare as EditorInner };
