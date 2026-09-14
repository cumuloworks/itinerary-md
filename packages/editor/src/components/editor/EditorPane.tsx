import { List } from 'lucide-react';
import { Toggle } from 'radix-ui';
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
    <div className={`group flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex h-8 items-center justify-between border-b border-gray-300 bg-gray-100 px-2 py-1 text-sm font-medium text-gray-600">
        <span>Editor</span>
        <Toggle.Root
          aria-label={t('completion.label', {
            state: assistOn ? t('past.on') : t('past.off'),
          })}
          title={assistOn ? t('completion.disable') : t('completion.enable')}
          pressed={assistOn}
          onPressedChange={setAssistOn}
          className={`inline-flex h-6 items-center justify-center rounded border px-1.5 text-sm opacity-0 transition-opacity group-hover:opacity-100 ${assistOn ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          <List size={12} />
          <span className="ml-1 hidden text-xs md:inline">
            {t('completion.label', {
              state: assistOn ? t('past.on') : t('past.off'),
            })}
          </span>
        </Toggle.Root>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoEditor
          value={value}
          onChange={onChange}
          onSave={onSave}
          onCursorLineChange={onCursorLineChange as any}
          completionsEnabled={assistOn}
        />
      </div>
    </div>
  );
};
