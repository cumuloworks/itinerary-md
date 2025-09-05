declare module '@itinerary-md/editor' {
    import type { FC } from 'react';

    export interface EditorProps {
        storageKey?: string;
        samplePath?: string;
        rate?: { from: string; to: string; value: number };
        language?: string;
    }

    export const Editor: FC<EditorProps>;
}

declare module '@itinerary-md/editor/index.css' {
    const content: string;
    export default content;
}
