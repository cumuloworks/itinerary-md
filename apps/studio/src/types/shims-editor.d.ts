declare module '@itinerary-md/editor' {
    import type { FC } from 'react';
    export type Telemetry = {
        captureException?: (error: unknown, ctx?: Record<string, any>) => void;
        captureMessage?: (msg: string, level?: 'info' | 'warning' | 'error') => void;
    };

    export interface EditorProps {
        storageKey?: string;
        samplePath?: string;
        rate?: { from: string; to: string; value: number };
        language?: string;
        telemetry?: Telemetry;
    }

    export const Editor: FC<EditorProps>;
}

declare module '@itinerary-md/editor/index.css' {
    const content: string;
    export default content;
}
