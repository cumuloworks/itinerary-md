import * as Toggle from '@radix-ui/react-toggle';
import { List } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { MonacoEditor } from '@/components/MonacoEditor';
import { useI18n } from '@/i18n';
import { prefKeys, readBoolean, writeBoolean } from '@/utils/prefs';

export const EditorPane: React.FC<{
    value: string;
    onChange: (next: string) => void;
    onSave: () => void;
    onCursorLineChange?: (line: number | undefined) => void;
    className?: string;
}> = ({ value, onChange, onSave, onCursorLineChange, className = '' }) => {
    const { t } = useI18n();
    const [assistOn, setAssistOn] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return readBoolean(prefKeys.editorAssist, true);
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        writeBoolean(prefKeys.editorAssist, assistOn);
    }, [assistOn]);
    return (
        <div className={`h-full min-h-0 flex flex-col group ${className}`}>
            <div className="h-8 px-2 py-1 flex items-center justify-between bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">
                <span>Editor</span>
                <Toggle.Root
                    aria-label={t('completion.label', { state: assistOn ? t('past.on') : t('past.off') })}
                    title={assistOn ? t('completion.disable') : t('completion.enable')}
                    pressed={assistOn}
                    onPressedChange={setAssistOn}
                    className={`text-sm opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center px-1.5 h-6 rounded border ${assistOn ? 'text-white bg-gray-700 border-gray-700' : 'text-gray-600 border-gray-300 bg-white hover:bg-gray-50'}`}
                >
                    <List size={12} />
                    <span className="hidden md:inline text-xs ml-1">{t('completion.label', { state: assistOn ? t('past.on') : t('past.off') })}</span>
                </Toggle.Root>
            </div>
            <div className="flex-1 min-h-0">
                <MonacoEditor value={value} onChange={onChange} onSave={onSave} onCursorLineChange={onCursorLineChange as any} completionsEnabled={assistOn} />
            </div>
        </div>
    );
};
