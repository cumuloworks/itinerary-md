import './index.css';
import { Buffer } from 'buffer';
import type { FC } from 'react';
import { Toaster } from 'react-hot-toast';
import { Editor as EditorBare } from './components/Editor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerGlobalErrorHandlers } from './core/errors';
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
}

export const Editor: FC<EditorProps> = (props) => {
    return (
        <div className="w-full h-full min-h-0 min-w-0">
            <ErrorBoundary>
                <EditorBare {...props} />
            </ErrorBoundary>
            <Toaster />
        </div>
    );
};

export { EditorBare as EditorInner };
