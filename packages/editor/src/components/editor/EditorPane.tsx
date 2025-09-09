import type React from 'react';
import { MonacoEditor } from '@/components/MonacoEditor';

export const EditorPane: React.FC<{
    value: string;
    onChange: (next: string) => void;
    onSave: () => void;
    onCursorLineChange?: (line: number | undefined) => void;
    className?: string;
}> = ({ value, onChange, onSave, onCursorLineChange, className = '' }) => {
    return (
        <div className={`h-full min-h-0 flex flex-col ${className}`}>
            <div className="h-8 px-2 py-1 flex items-center bg-gray-100 border-b border-gray-300 font-medium text-sm text-gray-600">Editor</div>
            <div className="flex-1 min-h-0">
                <MonacoEditor value={value} onChange={onChange} onSave={onSave} onCursorLineChange={onCursorLineChange} />
            </div>
        </div>
    );
};
